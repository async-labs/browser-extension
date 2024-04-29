import mongoose from 'mongoose';

export interface ISummaryDocument extends mongoose.Document {
  userId: string;
  createdAt: Date;
  jobId: string;
  jobDbId: string;
  applicantId: string;
  applicantFullName: string,
  applicantContactInfo: {
    email: string,
    phone: string,
  },
  resumeId: string;
  wholeContent: string;
  truncatedContent: string;

  responseText: string;

  error?: string;
  status: string;
}

interface ISummaryModel extends mongoose.Model<ISummaryDocument> {
  createSummary(doc): Promise<ISummaryDocument>;
}

class summaryClass extends mongoose.Model {
  public static async createSummary(doc) {
    return this.create({
      createdAt: new Date(),
      ...doc
    });
  }
}

export const summarieschema = new mongoose.Schema<ISummaryDocument, ISummaryModel>({
  userId: { type: String },
  createdAt: { type: Date },
  jobId: { type: String },
  jobDbId: { type: String },
  applicantId: { type: String },
  applicantFullName: { type: String },
  applicantContactInfo: { type: Object },
  resumeId: { type: String },
  wholeContent: { type: String },
  truncatedContent: { type: String },

  responseText: { type: String },

  error: { type: String },
  status: { type: String },
});

summarieschema.loadClass(summaryClass);

const summary = mongoose.model<ISummaryDocument, ISummaryModel>('summaries', summarieschema);

export default summary;