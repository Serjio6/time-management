const Schedule = require('../models/Schedule');
const { SchedulerService } = require('../services/scheduler.service');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');
const { startOfDay } = require('../utils/dateHelpers');

const scheduler = new SchedulerService();

exports.getSchedule = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = { userId: req.userId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startOfDay(startDate);
    if (endDate) query.date.$lte = startOfDay(endDate);
  }
  const schedules = await Schedule.find(query).sort({ date: 1 });
  res.json({ success: true, data: schedules });
});

exports.generateSchedule = asyncHandler(async (req, res) => {
  const { date, availableHours, energyLevel, priorities, deadlines, constraints } = req.body;

  const schedule = await scheduler.generateOptimalSchedule(req.userId, new Date(date), {
    availableHours,
    energyLevel,
    priorities,
    deadlines: (deadlines || []).map((d) => new Date(d)),
    fixedBlocks: constraints?.fixedBlocks || [],
    preferredBreakTimes: constraints?.preferredBreakTimes || [],
  });

  res.status(201).json({ success: true, data: schedule });
});

exports.updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!schedule) throw new ApiError(404, 'Schedule not found');
  res.json({ success: true, data: schedule });
});

exports.adjustSchedule = asyncHandler(async (req, res) => {
  const { blockId, newStartTime, newEndTime, reason } = req.body;
  const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.userId });
  if (!schedule) throw new ApiError(404, 'Schedule not found');

  const block = schedule.timeBlocks.id(blockId);
  if (!block) throw new ApiError(404, 'Time block not found');

  block.adjustments.push({
    reason,
    originalStartTime: block.startTime,
    newStartTime: new Date(newStartTime),
    adjustedBy: 'user',
  });
  block.startTime = new Date(newStartTime);
  if (newEndTime) block.endTime = new Date(newEndTime);

  await schedule.save();
  res.json({ success: true, data: schedule });
});

exports.completeBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.body;
  const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.userId });
  if (!schedule) throw new ApiError(404, 'Schedule not found');

  const block = schedule.timeBlocks.id(blockId);
  if (!block) throw new ApiError(404, 'Time block not found');

  block.isCompleted = true;
  block.completedAt = new Date();
  await schedule.save();

  res.json({ success: true, data: schedule });
});
