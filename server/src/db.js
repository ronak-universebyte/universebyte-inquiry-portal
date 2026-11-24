import mongoose from 'mongoose';
import { config } from './config.js';

let isConnecting = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    while (mongoose.connection.readyState !== 1 && isConnecting) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return mongoose.connection;
  }

  isConnecting = true;
  const uri = config.mongodbUri;

  if (!uri) {
    isConnecting = false;
    const err = new Error('MONGODB_URI environment variable is missing.');
    console.error('Database connection error:', err.message);
    throw err;
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
    isConnecting = false;
    return conn.connection;
  } catch (error) {
    isConnecting = false;
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

export default mongoose;
