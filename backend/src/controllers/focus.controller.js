const FocusSession = require('../models/FocusSession');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { getWeekRange, getMonthRange, startOfDay, endOfDay } = require('../utils/dateHelpers');

exports.startSession = asyncHandler(async (req, res) => {
  const session = await FocusSession.create({
    ...req.body,
    userId: req.userId,
    startedAt: new Date(),
  });
  res.status(201).json({ success: true, data: session });
});

exports.endSession = asyncHandler(async (req, res) => {
  const { selfRating, flowStateAchieved, productivityEstimate } = req.body;
  const session = await FocusSession.findOne({ _id: req.params.id, userId: req.userId });
  if (!session) throw new ApiError(404, 'Focus session not found');

  session.endedAt = new Date();
  session.actualDuration = Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000);
  session.quality = {
    selfRating,
    flowStateAchieved,
    productivityEstimate,
    focusScore: computeFocusScore(session),
  };
  await session.save();

  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'stats.totalFocusHours': session.actualDuration / 60 },
  });

  res.json({ success: true, data: session });
});

exports.logInterruption = asyncHandler(async (req, res) => {
  const { type, duration } = req.body;
  const session = await FocusSession.findOne({ _id: req.params.id, userId: req.userId });
  if (!session) throw new ApiError(404, 'Focus session not found');

  session.interruptions.push({ type, duration, timestamp: new Date(), handled: true });
  await session.save();

  res.json({ success: true, data: session });
});

exports.getStats = asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query;
  const now = new Date();
  let range;
  if (period === 'week') range = getWeekRange(now);
  else if (period === 'month') range = getMonthRange(now);
  else range = { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now) };

  const sessions = await FocusSession.find({
    userId: req.userId,
    startedAt: { $gte: range.start, $lte: range.end },
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  const flowStateCount = sessions.filter((s) => s.quality?.flowStateAchieved).length;

  res.json({
    success: true,
    data: {
      period,
      totalSessions: sessions.length,
      totalFocusMinutes: totalMinutes,
      averageSessionLength: sessions.length ? Math.round(totalMinutes / sessions.length) : 0,
      flowStateCount,
      totalInterruptions: sessions.reduce((sum, s) => sum + (s.interruptions?.length || 0), 0),
    },
  });
});

function computeFocusScore(session) {
  const interruptionPenalty = (session.interruptions?.length || 0) * 5;
  const completionRatio = session.plannedDuration ? Math.min(1, session.actualDuration / session.plannedDuration) : 1;
  return Math.max(0, Math.round(completionRatio * 100 - interruptionPenalty));
}
