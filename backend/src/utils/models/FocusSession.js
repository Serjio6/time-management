const mongoose = require('mongoose');
const { Schema } = mongoose;

const focusSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['pomodoro', 'deep_work', 'flow_state', 'custom'], required: true },
    plannedDuration: Number,
    actualDuration: Number,
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    taskTitle: String,
    category: String,

    interruptions: [
      {
        type: { type: String, enum: ['notification', 'self_distracted', 'external', 'break_needed'] },
        timestamp: { type: Date, default: Date.now },
        duration: Number,
        handled: { type: Boolean, default: false },
        _id: false,
      },
    ],

    quality: {
      selfRating: Number,
      focusScore: Number,
      flowStateAchieved: Boolean,
      productivityEstimate: Number,
    },

    environment: {
      device: String,
      location: String,
      noiseLevel: String,
      timeOfDay: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
