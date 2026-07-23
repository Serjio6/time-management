const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['work', 'study', 'personal', 'health', 'other'],
      default: 'personal',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'rescheduled'],
      default: 'pending',
      index: true,
    },
    scheduledDate: Date,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    estimatedDuration: Number, // minutes
    actualDuration: Number, // minutes
    deadline: { type: Date, index: true },

    recurrence: {
      isRecurring: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
      interval: Number,
      daysOfWeek: [Number], // 0-6
      endDate: Date,
      occurrences: Number,
    },

    aiSuggestions: {
      optimalTimeOfDay: String,
      energyLevelRequired: { type: String, enum: ['low', 'medium', 'high'] },
      suggestedBreakAfter: Number,
      focusScore: Number,
    },

    completionHistory: [
      {
        date: Date,
        duration: Number,
        quality: Number,
        _id: false,
      },
    ],

    subtasks: [
      {
        title: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],

    tags: [String],
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    completedAt: Date,
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, scheduledDate: -1 });
taskSchema.index({ userId: 1, status: 1, priority: -1 });
taskSchema.index({ userId: 1, deadline: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Task', taskSchema);
