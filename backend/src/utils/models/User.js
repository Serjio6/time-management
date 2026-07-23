const mongoose = require('mongoose');
const { Schema } = mongoose;

const badgeSchema = new Schema(
  {
    badgeId: String,
    earnedAt: { type: Date, default: Date.now },
    name: String,
    icon: String,
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    displayName: { type: String, trim: true },
    avatarUrl: { type: String, default: null },

    profile: {
      timezone: { type: String, default: 'UTC' },
      workHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
      },
      preferredBreakDuration: { type: Number, default: 15 },
      pomodoroSettings: {
        focusDuration: { type: Number, default: 25 },
        shortBreak: { type: Number, default: 5 },
        longBreak: { type: Number, default: 15 },
        longBreakInterval: { type: Number, default: 4 },
      },
      notificationPreferences: {
        taskReminders: { type: Boolean, default: true },
        focusReminders: { type: Boolean, default: true },
        breakReminders: { type: Boolean, default: true },
        motivationalMessages: { type: Boolean, default: true },
        quietHours: {
          enabled: { type: Boolean, default: false },
          start: { type: String, default: '22:00' },
          end: { type: String, default: '07:00' },
        },
      },
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
    },

    stats: {
      productivityLevel: { type: Number, default: 1, min: 1, max: 100 },
      totalFocusHours: { type: Number, default: 0 },
      totalTasksCompleted: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      achievementBadges: [badgeSchema],
    },

    aiContext: {
      conversationStyle: { type: String, default: 'motivating' },
      lastEnergyLevel: String,
      commonTaskPatterns: [String],
      productivityTrend: String,
    },

    integrations: {
      googleCalendar: {
        connected: { type: Boolean, default: false },
        accessToken: String, // stored encrypted via utils/encryption
        refreshToken: String, // stored encrypted via utils/encryption
        syncEnabled: { type: Boolean, default: false },
        lastSyncAt: Date,
      },
    },

    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ lastActiveAt: -1 });

// Never leak encrypted tokens or internal fields to API responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if (ret.integrations?.googleCalendar) {
      delete ret.integrations.googleCalendar.accessToken;
      delete ret.integrations.googleCalendar.refreshToken;
    }
    delete ret.firebaseUid;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
