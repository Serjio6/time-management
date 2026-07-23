const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  aiMetadata: {
    model: String,
    tokensUsed: Number,
    intent: String,
    actions: [{ type: { type: String }, payload: Schema.Types.Mixed, _id: false }],
  },
  userFeedback: {
    helpful: Boolean,
    rating: Number,
  },
});

const chatConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: String,
    type: {
      type: String,
      enum: ['planning', 'coaching', 'task_help', 'motivation', 'general'],
      default: 'general',
    },

    messages: [messageSchema],

    contextSummary: String,
    contextTokens: Number,
    actionsTaken: [
      {
        type: { type: String },
        description: String,
        timestamp: { type: Date, default: Date.now },
        success: Boolean,
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

chatConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
