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

function waitFor16Seconds() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('ok');
    }, 1000); // 1 second in milliseconds
  });
}

export const extractPdf = async (url: string) => {
  // const content = await parsePdf(url);

  await waitFor16Seconds();

  const content = `
  Gabrielle-Anne Salud\nSan Diego, California II (619) 278-9013 II gabbysalud@gmail.com\nEXPERIENCE\nPetDx, San Diego - Clinical Laboratory Technician /\nMARCH 2022 - APRIL 2023\nDetermines the acceptability of specimens for testing according to established criteria\nManually extracts cell-free and genomic DNA from fractionated blood and tissue\nsamples while ensuring viability and integrity throughout the test process\nAnalyzes extracted sample quality through automated gel electrophoresis and\nfluorometry\nFragments and constructs Illumina NGS sequencing libraries from extracted cell-free\nand genomic DNA\nPerforms library multiplexing and Whole Genome Sequencing on the Illumina NovaSeq\n6000 Sequencing System\nMonitors and assesses laboratory cleaning efficiency by swipe testing laboratory and\nequipment surfaces monthly via qPCR\nAssists with other essential laboratory activities, including reagent qualification,\ninventory management, procedure writing, preventive maintenance, inspection\npreparation, assay validation, and troubleshooting investigations\nBiocept, San Diego - Clinical Laboratory Assistant /\nJULY 2020 - MARCH 2022\nAccessioned and processed incoming laboratory specimen in a high volume setting\nContributed to the validation and phase-in of COVID-19/Flu clinical assay\nManually extracted RNA from human plasma and cerebrospinal fluid for cancer\nmutation screening\nPerformed automated TNA isolation on QiaSymphony instrument for cancer mutation\nscreening\nResponsible for reconciliation and troubleshooting of samples that did not adhere to\nrequired criteria\nAdhered to BSL2 requirements and regulations\nCleaned company-wide COVID-19 database for streamlined use and functionality\nCreated laboratory technician tasklist for all shifts for efficient workflow\nCoal Point Oil Reserve, Santa Barbara - Laboratory Researcher Intern\nSEPTEMBER 2019 - JUNE 2020\nAcquired water samples from various bodies of water\nAnalyzed water samples for varying debris and organisms\nIdentified and quantified different water invertebrates\nQuantified and interpreted data to report trends and similarities\nSterilized and arranged lab equipment for proper use\nSUHi Foundation, San Diego - Data Entry Specialist\nJUNE 2018-SEPTEMBER 2018\nReconnected with alumni who received scholarships to gather data\nCompiled information database to track college and post-collegiate activities\nComposed articles that discusses scholar spotlights and organization specialties\nCategorized data to monitor any trends within specific scholarships\nEDUCATION\nUniversity of California - Santa Barbara\nEnvironmental Sciences\nSEPTEMBER 2016 - JUNE 2020\nLABORATORY SKILLS\nInstrument Familiarity: Centrifuges, microfuges, vacufuges, vortexers, mixers, ovens, sonicators,\nthermocyclers, vacuum manifolds\nHamilton Microlab Star\nQuantStudio 5 and 7 Flex\nKingFisher Flex\nTecan Plate Reader Infinite Pro\nQIASymphony\nEPmotion\nep96XL\nAgilent TapeStation\nIllumina NovaSeq 6000 Sequencing System\nlon Chef Systems and lon Torrent Semiconductor\nSequencer\nAutomatic and Manual Pipetting\nReagent and Buffer Preparation and\nHazardous Waste/Substance Disposal\nQualification\nBiosafety Cabinet/Fume Hood Use\nPaperwork Upkeep and Good\nInstrument Maintenance, Calibration,\nDocumentation Practice\nand Validation\nADDITIONAL SKILLS\nTagalog and English\nSoft skills: Communication, independence, team-oriented, highly organized, exceedingly efficient\nHard skills: MS Office, Google Workspace, articulate record-keeping, quality control, LIMS use and\nnavigation
  `;

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