const ChatConversation = require('../models/ChatConversation');
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Schedule = require('../models/Schedule');
const { AIService } = require('../services/ai.service');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { startOfDay } = require('../utils/dateHelpers');

const aiService = new AIService();

exports.sendMessage = asyncHandler(async (req, res) => {
  const { message, conversationId, context } = req.body;

  let conversation = conversationId ? await ChatConversation.findOne({ _id: conversationId, userId: req.userId }) : null;
  if (!conversation) {
    conversation = await ChatConversation.create({
      userId: req.userId,
      title: message.slice(0, 60),
      type: 'general',
      messages: [],
    });
  }

  const today = startOfDay(new Date());
  const [currentTasks, habits, goals, todaySchedule] = await Promise.all([
    Task.find({ userId: req.userId, scheduledDate: today }),
    Habit.find({ userId: req.userId, isActive: true }),
    Goal.find({ userId: req.userId, status: 'active' }),
    Schedule.findOne({ userId: req.userId, date: today }),
  ]);

  const aiContext = {
    user: req.user,
    currentTasks,
    todaySchedule,
    habits,
    goals,
    recentAnalytics: null,
    conversationHistory: conversation.messages,
    ...context,
  };

  conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });

  const aiResponse = await aiService.processMessage(message, aiContext);

  conversation.messages.push({
    role: 'assistant',
    content: aiResponse.message,
    timestamp: new Date(),
    aiMetadata: { model: aiResponse.model, tokensUsed: aiResponse.tokensUsed, actions: aiResponse.actions },
  });
  conversation.contextTokens = (conversation.contextTokens || 0) + aiResponse.tokensUsed;
  await conversation.save();

  res.json({
    success: true,
    data: {
      message: aiResponse.message,
      actions: aiResponse.actions,
      conversationId: conversation._id,
      tokensUsed: aiResponse.tokensUsed,
    },
  });
});

exports.listConversations = asyncHandler(async (req, res) => {
  const conversations = await ChatConversation.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .select('title type createdAt updatedAt');
  res.json({ success: true, data: conversations });
});

exports.getConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  res.json({ success: true, data: conversation });
});

exports.deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  res.json({ success: true, data: { id: req.params.id } });
});

exports.rateResponse = asyncHandler(async (req, res) => {
  const { messageId, helpful, rating } = req.body;
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.userId });
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const message = conversation.messages.id(messageId);
  if (!message) throw new ApiError(404, 'Message not found');

  message.userFeedback = { helpful, rating };
  await conversation.save();

  res.json({ success: true, data: conversation });
});
