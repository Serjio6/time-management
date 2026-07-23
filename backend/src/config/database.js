const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDatabase() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

    return mongoose.connection;
  } catch (err) {
    logger.error('MongoDB connection failed', err);
    process.exit(1);
  }
}

module.exports = { connectDatabase };
