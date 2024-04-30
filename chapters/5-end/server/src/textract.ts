import * as aws from 'aws-sdk';

import * as dotenv from 'dotenv';

dotenv.config();

aws.config.update({
  region: process.env.AWS_REGION_ZONE,
  accessKeyId: process.env.AWS_ACCESSKEYID,
  secretAccessKey: process.env.AWS_SECRETACCESSKEY,
});

export const parsePdf = async (url: string): Promise<string> => {
  const objKey = url.split('amazonaws.com/')[1];

  let blocks = await analyzeDocument(objKey);

  return getText(blocks);
};

export const extractPdf = async (url: string) => {
  const content = await parsePdf(url);

  return {
    wholeContent: content,
    truncatedContent: content.slice(0, 11000)
  };
}

const textract = new aws.Textract({ apiVersion: 'latest' });

async function startDocumentAnalysis(fileName: string) {
  console.log('startDocumentAnalysis fileName', fileName);
  const params = {
    DocumentLocation: {
      S3Object: {
        Bucket: process.env.BUCKET_FOR_CANDIDATES,
        Name: fileName,
      },
    },
    FeatureTypes: ['TABLES'],
  };

  return new Promise<aws.Textract.StartDocumentAnalysisResponse>((resolve, reject) => {
    textract.startDocumentAnalysis(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function getDocumentAnalysis(jobId: string) {
  const res = await textract.getDocumentAnalysis({ JobId: jobId }).promise();
  const responses: aws.Textract.GetDocumentAnalysisResponse[] = [res];
  let nextToken = res.NextToken;
  while (nextToken) {
    const res2 = await textract
      .getDocumentAnalysis({ JobId: jobId, NextToken: nextToken })
      .promise();
    responses.push(res2);

    nextToken = res2.NextToken;
  }

  return responses;
}

async function analyzeDocument(fileName: string, verbose = false) {
  if (verbose) {
    console.log('Starting analysis');
  }

  const jobId = (await startDocumentAnalysis(fileName)).JobId;

  if (!jobId) {
    throw new Error('no job id returned');
  }

  let count = 0;

  while (true) {
    if (verbose) {
      console.info('waiting 1 second');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    count++;
    const jobResponses = await getDocumentAnalysis(jobId);

    const jobStatus = jobResponses[0].JobStatus;
    if (verbose) {
      console.info('job status:', jobStatus);
    }

    if (jobStatus === 'SUCCEEDED') {
      const blocks: aws.Textract.Block[] = [];
      for (const jobRes of jobResponses) {
        if (jobRes.JobStatus === 'SUCCEEDED' && jobRes.Blocks) {
          blocks.push(...jobRes.Blocks);
        }
      }

      return blocks;
    } else if (jobStatus !== 'IN_PROGRESS') {
      throw new Error(`Job failed; id: ${jobId}, status: ${jobStatus}`);
    }

    if (count > 180) {
      throw new Error(`Job timed out; id: ${jobId}. Waited for ${count} seconds`);
    }
  }
}

async function getText(blocks: aws.Textract.Block[]) {
  const lines: string[] = [];
  for (const block of blocks || []) {
    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
    }
  }
  return lines.join('\n');
}