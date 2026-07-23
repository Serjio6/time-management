const mongoose = require('mongoose');
const { Schema } = mongoose;

const timeBlockSchema = new Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  type: {
    type: String,
    enum: ['work', 'study', 'break', 'exercise', 'meal', 'personal', 'sleep', 'commute'],
    required: true,
  },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  title: String,
  description: String,
  isFixed: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  energyLevel: { type: String, enum: ['low', 'medium', 'high'] },
  adjustments: [
    {
      reason: String,
      originalStartTime: Date,
      newStartTime: Date,
      adjustedAt: { type: Date, default: Date.now },
      adjustedBy: { type: String, enum: ['ai', 'user'] },
      _id: false,
    },
  ],
});

const scheduleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    generatedBy: { type: String, enum: ['ai', 'manual', 'template'], default: 'ai' },
    generationPrompt: String,

    timeBlocks: [timeBlockSchema],

    metrics: {
      totalPlannedHours: Number,
      workHours: Number,
      studyHours: Number,
      breakHours: Number,
      healthHours: Number,
      personalHours: Number,
      completionRate: Number,
    },

    userFeedback: {
      satisfaction: Number,
      energyLevelMatch: Boolean,
      comments: String,
    },
  },
  { timestamps: true }
);

scheduleSchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
