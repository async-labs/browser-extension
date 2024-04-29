import mongoose from 'mongoose';

export interface IJobDocument extends mongoose.Document {
  userId: string;
  jobId: string;
  status: string;
  statusError?: string;
  jobDetailText: string;
  jobTitle: string;
  educationLevel: string;
  jobSkills: string;
  responseText?: string;
}

interface IJobModel extends mongoose.Model<IJobDocument> {
  createJob(doc): Promise<IJobDocument>;
}

class JobClass extends mongoose.Model {
  public static async createJob(doc) {
    return this.create({
      ...doc
    });
  }
}

export const JobSchema = new mongoose.Schema<IJobDocument, IJobModel>({
  userId: { type: String },
  jobId: { type: String },
  status: { type: String },
  statusError: { type: String },
  jobDetailText: { type: String },
  jobTitle: { type: String },
  educationLevel: { type: String },
  jobSkills: { type: String },
  responseText: { type: String },
});

JobSchema.loadClass(JobClass);

const Job = mongoose.model<IJobDocument, IJobModel>('jobs', JobSchema);

export default Job;