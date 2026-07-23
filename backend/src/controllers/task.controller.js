const Task = require('../models/Task');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');

exports.listTasks = asyncHandler(async (req, res) => {
  const { status, category, priority, date, search, page = 1, limit = 50 } = req.query;
  const query = { userId: req.userId };

  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    query.scheduledDate = d;
  }
  if (search) query.$text = { $search: search };

  const tasks = await Task.find(query)
    .sort({ scheduledDate: 1, priority: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Task.countDocuments(query);

  res.json({ success: true, data: tasks, meta: { total, page: Number(page), limit: Number(limit) } });
});

exports.createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({ ...req.body, userId: req.userId });
  res.status(201).json({ success: true, data: task });
});

exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: { id: req.params.id } });
});

exports.completeTask = asyncHandler(async (req, res) => {
  const { actualDuration, quality } = req.body;
  const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
  if (!task) throw new ApiError(404, 'Task not found');

  task.status = 'completed';
  task.completedAt = new Date();
  if (actualDuration != null) task.actualDuration = actualDuration;
  task.completionHistory.push({ date: new Date(), duration: actualDuration, quality });

  await task.save();
  res.json({ success: true, data: task });
});

exports.skipTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status: 'skipped' },
    { new: true }
  );
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: task });
});

exports.bulkOperation = asyncHandler(async (req, res) => {
  const { operation, taskIds, updates } = req.body;
  if (!operation || !Array.isArray(taskIds) || !taskIds.length) {
    throw new ApiError(400, 'operation and taskIds[] are required');
  }

  let result;
  if (operation === 'delete') {
    result = await Task.deleteMany({ _id: { $in: taskIds }, userId: req.userId });
  } else if (operation === 'update') {
    result = await Task.updateMany({ _id: { $in: taskIds }, userId: req.userId }, updates || {});
  } else {
    throw new ApiError(400, `Unsupported bulk operation: ${operation}`);
  }

  res.json({ success: true, data: result });
});
