const Habit = require('../models/Habit');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { isSameDay } = require('../utils/dateHelpers');

exports.listHabits = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  const query = { userId: req.userId };
  if (isActive !== undefined) query.isActive = isActive === 'true';
  const habits = await Habit.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: habits });
});

exports.createHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.create({ ...req.body, userId: req.userId });
  res.status(201).json({ success: true, data: habit });
});

exports.getHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
  if (!habit) throw new ApiError(404, 'Habit not found');
  res.json({ success: true, data: habit });
});

exports.updateHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!habit) throw new ApiError(404, 'Habit not found');
  res.json({ success: true, data: habit });
});

exports.deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!habit) throw new ApiError(404, 'Habit not found');
  res.json({ success: true, data: { id: req.params.id } });
});

exports.completeHabit = asyncHandler(async (req, res) => {
  const { duration, notes, mood } = req.body;
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
  if (!habit) throw new ApiError(404, 'Habit not found');

  const today = new Date();
  const alreadyDoneToday = habit.completions.some((c) => c.completed && isSameDay(c.date, today));
  if (alreadyDoneToday) throw new ApiError(409, 'Habit already completed today');

  habit.completions.push({ date: today, completed: true, duration, notes, mood });
  habit.totalCompletions += 1;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const doneYesterday = habit.completions.some((c) => c.completed && isSameDay(c.date, yesterday));
  habit.currentStreak = doneYesterday || habit.currentStreak === 0 ? habit.currentStreak + 1 : 1;
  habit.longestStreak = Math.max(habit.longestStreak, habit.currentStreak);

  await habit.save();
  res.json({ success: true, data: habit });
});

exports.getStreakLeaderboard = asyncHandler(async (req, res) => {
  const habits = await Habit.find({ userId: req.userId, isActive: true })
    .sort({ currentStreak: -1 })
    .select('name icon color currentStreak longestStreak');
  res.json({ success: true, data: habits });
});
