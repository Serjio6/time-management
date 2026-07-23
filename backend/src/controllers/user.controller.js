const User = require('../models/User');
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Schedule = require('../models/Schedule');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');

exports.getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, { $set: { profile: req.body } }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});

exports.getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.stats });
});

exports.getBadges = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.stats.achievementBadges });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const allowed = ['notificationPreferences', 'theme', 'timezone', 'workHours', 'pomodoroSettings', 'preferredBreakDuration'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[`profile.${key}`] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});

exports.createBackup = asyncHandler(async (req, res) => {
  const [tasks, habits, goals, schedules] = await Promise.all([
    Task.find({ userId: req.userId }).lean(),
    Habit.find({ userId: req.userId }).lean(),
    Goal.find({ userId: req.userId }).lean(),
    Schedule.find({ userId: req.userId }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: req.user,
      tasks,
      habits,
      goals,
      schedules,
    },
  });
});

exports.restoreBackup = asyncHandler(async (req, res) => {
  const { tasks = [], habits = [], goals = [] } = req.body;
  if (!Array.isArray(tasks) || !Array.isArray(habits) || !Array.isArray(goals)) {
    throw new ApiError(400, 'Backup payload must include tasks[], habits[], goals[] arrays');
  }

  const strip = (docs) => docs.map(({ _id, userId, createdAt, updatedAt, ...rest }) => ({ ...rest, userId: req.userId }));

  const [insertedTasks, insertedHabits, insertedGoals] = await Promise.all([
    tasks.length ? Task.insertMany(strip(tasks)) : [],
    habits.length ? Habit.insertMany(strip(habits)) : [],
    goals.length ? Goal.insertMany(strip(goals)) : [],
  ]);

  res.json({
    success: true,
    data: { tasksRestored: insertedTasks.length, habitsRestored: insertedHabits.length, goalsRestored: insertedGoals.length },
  });
});
