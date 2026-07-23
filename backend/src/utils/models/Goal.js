const mongoose = require('mongoose');
const { Schema } = mongoose;

const milestoneSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  targetDate: Date,
  completed: { type: Boolean, default: false },
  completedAt: Date,
  order: Number,
  linkedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
});

const goalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ['short_term', 'long_term', 'life_goal'] },
    category: String,
    startDate: Date,
    targetDate: Date,
    completedAt: Date,

    progress: {
      current: { type: Number, default: 0 },
      milestonesCompleted: { type: Number, default: 0 },
      totalMilestones: { type: Number, default: 0 },
    },

    milestones: [milestoneSchema],

    aiRoadmap: {
      suggestedWeeklyHours: Number,
      optimalStudyOrder: [String],
      recommendedResources: [String],
      estimatedCompletionDate: Date,
    },

    motivation: {
      why: String,
      vision: String,
      rewards: [String],
    },

    status: { type: String, enum: ['active', 'paused', 'completed', 'abandoned'], default: 'active', index: true },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
