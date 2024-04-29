import * as _ from 'lodash';
import * as mongoose from 'mongoose';

interface EmailTemplateDocument extends mongoose.Document {
  name: string;
  subject: string;
  message: string;
}

const EmailTemplate = mongoose.model<EmailTemplateDocument>(
  'emailTemplates',
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  }),
);

export async function insertEmailTemplates() {
  const templates = [
    {
      name: 'registration',
      subject: 'AI-cruiter registration',
      message: `
        <p>
          To register your account at AI-cruiter, click the following verification link: <a href="https://workinbiotech.com/ai-cruiter?verification-token=<%= token %>">Click here to verify</a>
        </p>
        `,
    },
  ];

  for (const t of templates) {
    const et = await EmailTemplate.findOne({ name: t.name }).setOptions({ lean: true });
    const message = t.message.replace(/\n/g, '').replace(/[ ]+/g, ' ').trim();

    if (!et) {
      await EmailTemplate.create(Object.assign({}, t, { message }));
    } else if (et.subject !== t.subject || et.message !== message) {
      await EmailTemplate.updateOne({ _id: et._id }, { $set: { message, subject: t.subject } }).exec();
    }
  }
}

export default async function getEmailTemplate(name: string, params?: any) {
  await insertEmailTemplates();

  const et = await EmailTemplate.findOne({ name }).setOptions({ lean: true });

  if (!et) {
    throw new Error('Email Template is not found in database.');
  }

  return {
    message: _.template(et.message)(params),
    subject: _.template(et.subject)(params),
  };
}
