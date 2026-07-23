const OpenAI = require('openai');
const logger = require('../utils/logger');

if (!process.env.OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY is not set — AI features will fail until configured.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = openai;
