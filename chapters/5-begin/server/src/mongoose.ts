import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

let connection;

export const connectToDatabase = async (): Promise<void> => {
  if (connection?.readyState === 1) {
    console.log('Already connected to the database');
    return;
  }

  try {
    connection = await mongoose.connect(process.env.MONGO_URL, {});
    console.log('Successfully connected to the database');
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (connection?.readyState !== 1) {
    console.log('Not connected to the database');
    return;
  }

  try {
    await mongoose.disconnect();
    console.log('Successfully disconnected from the database');
  } catch (error) {
    console.error('Error disconnecting from the database:', error);
  }
};
