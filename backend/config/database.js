const mongoose = require('mongoose');

// Cache the connection across Vercel cold starts
let isConnected = false;

const connectDB = async () => {
  // If already connected (e.g. warm Vercel instance), skip re-connecting
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coderev', {
      serverSelectionTimeoutMS: 10000, // 10s — longer for Atlas cold start
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.error('MongoDB connection error:', error.message);
    // On Vercel, do NOT exit — let the request fail gracefully with a 500
    // instead of crashing the whole process
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error; // re-throw so callers know DB is unavailable
  }
};

module.exports = connectDB;
