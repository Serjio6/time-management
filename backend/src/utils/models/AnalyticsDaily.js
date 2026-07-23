const mongoose = require('mongoose');
const { Schema } = mongoose;

const analyticsDailySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },

    productivityScore: {
      overall: Number,
      breakdown: {
        taskCompletion: Number,
        focusQuality: Number,
        timeManagement: Number,
        consistency: Number,
      },
    },

    timeSpent: {
      total: Number,
      byCategory: {
        work: { type: Number, default: 0 },
        study: { type: Number, default: 0 },
        health: { type: Number, default: 0 },
        personal: { type: Number, default: 0 },
        breaks: { type: Number, default: 0 },
      },
      byHour: [Number],
    },

    tasks: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      rescheduled: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      averageCompletionTime: Number,
    },

    focus: {
      totalSessions: { type: Number, default: 0 },
      totalFocusMinutes: { type: Number, default: 0 },
      averageSessionLength: Number,
      flowStateCount: { type: Number, default: 0 },
      interruptionCount: { type: Number, default: 0 },
    },

    habits: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      completionRate: Number,
      streakMaintained: Boolean,
    },

    aiInsights: {
      patterns: [String],
      suggestions: [String],
      moodCorrelation: String,
      energyPattern: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsDailySchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('AnalyticsDaily', analyticsDailySchema);
