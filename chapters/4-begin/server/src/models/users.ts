import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import sha256 from 'sha256';
import mongoose from 'mongoose';
import getEmailTemplate from './email-templates';
import sendEmail from '../aws-ses';

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const sendAuthEmail = async (template: string, email: string, token: string) => {
  const emailTemplate = await getEmailTemplate(template, { token });

  try {
    await sendEmail({
      from: `AI-recruiter <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
      to: [email],
      subject: emailTemplate.subject,
      body: emailTemplate.message,
    });
  } catch (err) {
    console.log('Email sending error:', err);
  }
}

export interface IUserDocument extends mongoose.Document {
  createdAt: Date;
  email: string,
  password?: string,
  registrationToken?: string,
  registrationTokenExpires?: Date;
  isVerified: boolean,
}

interface IUserModel extends mongoose.Model<IUserDocument> {
  publicFields(): string[];

  generateToken(): { token: string; expires: Date };
  register(email: string): Promise<IUserDocument[]>;

  checkPassword(password: string): void;
  generateToken(): { token: string; expires: Date };

  confirmToken(token: string, type?: string): Promise<string>;

  setPassword(args: {
    password: string;
    passwordConfirmation: string;
    token: string;
  }): Promise<string>;

  createJWTToken(_user: IUserDocument, secret: string): Promise<string>
  comparePassword(password: string, userPassword: string): Promise<string>
  login(args: { email: string; password: string; }): Promise<string>
}

class UserClass extends mongoose.Model {
  public static publicFields(): string[] {
    return [
      '_id',
      'email',
    ];
  }

  public static async generateToken() {
    const buffer = await crypto.randomBytes(20);
    const token = buffer.toString('hex');

    return {
      token,
      expires: Date.now() + 86400000
    };
  }

  public static async register(email: string) {
    if (!isValidEmail(email)) {
      throw new Error('Invalid email');
    }

    const prev = await this.find({ email }).countDocuments();

    if (prev > 0) {
      throw new Error('Prompt already exists');
    }

    const { token, expires } = await User.generateToken();

    await sendAuthEmail('registration', email, token);

    return this.create({
      createdAt: new Date(),
      email,
      isVerified: false,
      registrationToken: token,
      registrationTokenExpires: expires,
    });
  }

  public static checkPassword(password: string) {
    if (!password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)) {
      throw new Error(
        'Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters'
      );
    }
  }

  public static generatePassword(password: string) {
    const hashPassword = sha256(password);

    return bcrypt.hash(hashPassword, 10);
  }

  public static async confirmToken(token: string, type='registration') {
    const user = await this.findOne({
      [type === 'registration' ? 'registrationToken' : 'resetPasswordToken']: token,
      [type === 'registration' ? 'registrationTokenExpires' : 'resetPasswordExpires']: {
        $gt: Date.now()
      }
    });

    if (!user || !token) {
      throw new Error('Token is invalid or has expired');
    }

    return user._id;
  }

  public static async setPassword({
    token,
    password,
    passwordConfirmation,
  }: {
    password: string;
    passwordConfirmation: string;
    token: string;
  }) {
    const userId = await this.confirmToken(token);

    if (password === '') {
      throw new Error('Password can not be empty');
    }

    if (password !== passwordConfirmation) {
      throw new Error('Password does not match');
    }

    this.checkPassword(password);

    await this.updateOne(
      { _id: userId },
      {
        $set: {
          password: await this.generatePassword(password),
          isVerified: true,
          registrationToken: null,
          registrationTokenExpires: null
        }
      }
    );

    return userId;
  }

  public static async createJWTToken(_user: IUserDocument, secret: string) {
    const user = { _id: _user._id, email: _user.email };

    return await jwt.sign({ user }, secret, { expiresIn: '90d' });
  }

  public static comparePassword(password: string, userPassword: string) {
    const hashPassword = sha256(password);

    return bcrypt.compare(hashPassword, userPassword);
  }

  public static async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    email = (email || '').toLowerCase().trim();
    password = (password || '').trim();

    const user = await this.findOne({ email });

    if (!user || !user.password) {
      throw new Error('Invalid login');
    }

    const valid = await this.comparePassword(password, user.password);

    if (!valid) {
      throw new Error('Invalid login');
    }

    return await this.createJWTToken(
      user,
      process.env.JWT_TOKEN_SECRET || ''
    );
  }
}

const UserSchemaDefs = {
  createdAt: { type: Date },
  email: { type: String },
  password: { type: String },
  registrationToken: { type: String },
  registrationTokenExpires: { type: Date },
  isVerified: { type: Boolean },
};

export const UserSchema = new mongoose.Schema<IUserDocument, IUserModel>(UserSchemaDefs);

UserSchema.loadClass(UserClass);

const User = mongoose.model<IUserDocument, IUserModel>('users', UserSchema);

export default User;