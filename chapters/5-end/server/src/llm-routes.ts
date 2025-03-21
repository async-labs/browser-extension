import { OpenAI } from "openai";

import * as dotenv from "dotenv";

import Jobs, { IJobDocument } from "./models/jobs";
import Summaries from "./models/summaries";
import Users, { IUserDocument } from "./models/users";
import { requireLogin, routeErrorHandling } from "./utils";

import { extractPdf } from "./textract";
import template from "lodash/template";
import { prompts, templatePrompts } from "./models/prompts";

import * as aws from "aws-sdk";
import * as pathModule from "path";

dotenv.config();

const { CHATGPT_MODEL, OPENAI_API_KEY } = process.env;

aws.config.update({
  region: process.env.AWS_REGION_ZONE,
  accessKeyId: process.env.AWS_ACCESSKEYID,
  secretAccessKey: process.env.AWS_SECRETACCESSKEY,
});

const s3 = new aws.S3({ apiVersion: "latest" });

async function signRequestForUpload({ fileName, fileType, userId, applicantId, resumeId, jobId }) {
  const fileExt = pathModule.extname(fileName);
  const fileNameWithoutExtension = pathModule.basename(fileName, fileExt);

  const randomString20 = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);

  const key = `user-${userId}/job-${jobId}/applicant-${applicantId}/resume-${resumeId}/${randomString20}/${fileNameWithoutExtension}${fileExt}`;

  // summary ACL
  const params: any = {
    Bucket: process.env.BUCKET_FOR_CANDIDATES,
    Key: key,
    Expires: 300, // 5 minutes, sufficient for uploading
    ContentType: fileType,
  };

  return new Promise((resolve, reject) => {
    s3.getSignedUrl("putObject", params, (err, data) => {
      const returnedDataFromS3 = {
        signedRequest: data,
        path: key as string,
        url: `https://${process.env.BUCKET_FOR_CANDIDATES}.s3.amazonaws.com/${key}`,
      };

      if (err) {
        reject(err);
      } else {
        resolve(returnedDataFromS3);
      }
    });
  });
}

interface IPrompt {
  promptName: string;
  chatGptModel: string;
  system: string;
  user: string;
}

const fetchGPT = async (prompt: IPrompt, templateVariables: any): Promise<string> => {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const userPrompt = template(prompt.user)(templateVariables);
  const systemPrompt = template(prompt.system)(templateVariables);

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: userPrompt,
    },
  ];

  let model = prompt.chatGptModel || CHATGPT_MODEL || "gpt-4";
  const temperature = 0;

  const completion = await openai.chat.completions.create({
    model,
    temperature,
    messages,
  });

  return completion.choices[0].message?.content || "";
};

const evaluate = async ({
  resumeContent,
  jobDetailText,
  jobTitle,
  educationLevel,
  jobSkills,
}: {
  resumeContent: string;
  jobDetailText: string;
  jobTitle: string;
  educationLevel: string;
  jobSkills: string;
}): Promise<string> => {
  const prompt = prompts["summary-default"];

  let systemPrompt = prompt.system;
  let userPrompt = prompt.user;

  let prompTexts = "";
  let exampleResponses = "";
  let index = 0;

  for (const bp of templatePrompts) {
    index++;

    prompTexts = `${prompTexts}
      ${index}) ${bp.promptText || ""}
    `;

    exampleResponses = `${exampleResponses}

      ${index}) ${bp.exampleResponse || ""}
    `;
  }

  systemPrompt = systemPrompt.replace("{{ prompts }}", prompTexts);
  userPrompt = userPrompt.replace("{{ prompts }}", exampleResponses);

  try {
    const text = await fetchGPT(
      {
        ...prompt,
        system: systemPrompt,
        user: userPrompt,
      },
      {
        jobDetailText,
        jobTitle,
        resumeContent,
        educationLevel,
        jobSkills,
      }
    );

    return text;
  } catch (e) {
    console.error("Error during evaluate ==========", e.response ? e.response.data.error.message : e);

    return "Summary was not generated due to error: " + `${e.response ? e.response.data.error.message : e}`;
  }
};

type SummaryArgs = {
  user: IUserDocument;
  job: IJobDocument;
  req: any;
  res: any;
};

const generateSummary = async ({ user, job, req, res }: SummaryArgs) => {
  const params = req.body;
  const userId = user._id;

  const { s3Url, jobId, applicantId, applicantFullName, applicantContactInfo, resumeId } = params;

  if (
    (await Summaries.find({
      userId,
      jobId,
      status: "startedProcessing",
    }).countDocuments()) > 0
  ) {
    return res.json({ message: "Not finished previous evaluation" });
  }

  const selector = { userId, jobId, applicantId };

  const doc = {
    userId,
    jobId,
    jobDbId: job._id,
    applicantId,
    applicantFullName,
    applicantContactInfo,
    resumeId,
    status: "startedProcessing",
  };

  if ((await Summaries.find(selector).countDocuments()) === 0) {
    await Summaries.createSummary(doc);
  } else {
    await Summaries.updateOne(selector, { $set: doc });
  }

  const summary = await Summaries.findOne(selector);

  const { wholeContent, truncatedContent } = await extractPdf(s3Url);

  await Summaries.updateOne({ _id: summary._id }, { $set: { wholeContent, truncatedContent } });

  const updatedSummary = await Summaries.findOne({ _id: summary._id });

  const resumeContent = updatedSummary.truncatedContent;
  const jobDetailText = job.jobDetailText;

  const text = await evaluate({
    resumeContent,
    jobDetailText,
    jobTitle: job.jobTitle,
    educationLevel: job.educationLevel,
    jobSkills: job.jobSkills,
  });

  const array = text.split(/\r?\n|\r|\n/g);
  const reasoning = array[array.length - 1];

  if (reasoning) {
    const setDoc: any = {
      status: "evaluated",
      error: "",
    };

    await Summaries.updateOne({ _id: summary._id }, { $set: { ...setDoc, responseText: text } });
  }
};

const save = async (req, res, next) => {
  await requireLogin(req, res, next);

  const params = req.body;

  const userId = req.user ? req.user._id : "";

  const user = await Users.findOne({ _id: userId });

  const { action, jobId, applicantId, error } = params;

  let returnResult: any = { message: "success" };

  let job: IJobDocument = await Jobs.findOne({ userId, jobId }).lean();

  if (!job) {
    job = await Jobs.createJob({
      userId,
      jobId,
      status: "parsed",
      statusError: "",
    });
  }

  if (action === "summary-error") {
    const selector = { userId, jobId, applicantId };
    const summaryErrorDoc = { userId, jobId, applicantId, error, status: "" };

    if ((await Summaries.find(selector).countDocuments()) === 0) {
      await Summaries.createSummary(summaryErrorDoc);
    } else {
      await Summaries.updateOne(selector, { $set: summaryErrorDoc });
    }
  }

  if (action === "summary") {
    const selector = { userId, jobId, applicantId };

    try {
      await generateSummary({ user, job, req, res });
    } catch (e) {
      await Summaries.updateOne(selector, { $set: { status: "evaluated", responseText: e.message } });
    }
  }

  return res.json(returnResult);
};

export default (app) => {
  app.post(
    "/get-summary-status",
    routeErrorHandling(async (req, res, next) => {
      await requireLogin(req, res, next);

      const params = req.body;

      const { jobId, applicantId } = params;

      const response = await Summaries.findOne({
        jobId,
        applicantId,
        userId: req.user._id,
      });

      return res.json(response);
    })
  );

  app.post("/save", routeErrorHandling(save));

  app.post(
    "/signurl",
    routeErrorHandling(async (req, res, next) => {
      await requireLogin(req, res, next);

      const params = req.body;

      const { applicantId, resumeId, jobId } = params;

      const response = await signRequestForUpload({
        fileName: "resume.pdf",
        fileType: "application/pdf",
        userId: req.user._id,
        applicantId,
        resumeId,
        jobId: jobId,
      });

      return res.json(response);
    })
  );

  app.get(
    "/prev-results",
    routeErrorHandling(async (req, res, next) => {
      await requireLogin(req, res, next);

      const { jobId } = req.query;

      const summaries: any[] = await Summaries.find({ userId: req.user._id, jobId }).lean();

      return res.json(summaries);
    })
  );

  app.post(
    "/save-job-detail",
    routeErrorHandling(async (req, res, next) => {
      await requireLogin(req, res, next);

      const userId = req.user ? req.user._id : "";

      const { ats, jobId, jobDetailText, jobDetailLink, jobLocation, jobTitle } = req.body;

      const selector = { userId, jobId };
      let job: IJobDocument = await Jobs.findOne(selector).lean();

      const doc = {
        jobDetailText,
        jobDetailLink,
        jobLocation,
        jobTitle,
      };

      if (job) {
        await Jobs.updateOne(selector, { $set: doc });
      } else {
        job = await Jobs.createJob({ ...selector, ...doc, ats });
      }

      return res.json({ status: "ok" });
    })
  );

  app.post("/save", routeErrorHandling(save));
};
