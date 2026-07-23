const mongoose = require('mongoose');
const { Schema } = mongoose;

const habitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    category: {
      type: String,
      enum: ['health', 'learning', 'productivity', 'mindfulness', 'social', 'creative'],
    },
    icon: String,
    color: String,

    frequency: {
      type: { type: String, enum: ['daily', 'specific_days', 'times_per_week', 'times_per_month'] },
      daysOfWeek: [Number],
      timesPerWeek: Number,
      timesPerMonth: Number,
    },

    targetDuration: Number,
    reminderTime: String,
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },

    completions: [
      {
        date: { type: Date, required: true },
        completed: { type: Boolean, default: true },
        duration: Number,
        notes: String,
        mood: String,
        _id: false,
      },
    ],

    aiInsights: {
      bestTimeOfDay: String,
      consistencyScore: Number,
      predictedDropOffRisk: { type: String, enum: ['low', 'medium', 'high'] },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Habit', habitSchema);
