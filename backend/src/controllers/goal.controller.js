const openai = require('../config/openai');
const Goal = require('../models/Goal');
const { ApiError, asyncHandler } = require('../middleware/error.middleware');

exports.listGoals = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { userId: req.userId };
  if (status) query.status = status;
  const goals = await Goal.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: goals });
});

exports.createGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.create({
    ...req.body,
    userId: req.userId,
    progress: { current: 0, milestonesCompleted: 0, totalMilestones: (req.body.milestones || []).length },
  });
  res.status(201).json({ success: true, data: goal });
});

exports.getGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) throw new ApiError(404, 'Goal not found');
  res.json({ success: true, data: goal });
});

exports.updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!goal) throw new ApiError(404, 'Goal not found');
  res.json({ success: true, data: goal });
});

exports.deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!goal) throw new ApiError(404, 'Goal not found');
  res.json({ success: true, data: { id: req.params.id } });
});

exports.completeMilestone = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) throw new ApiError(404, 'Goal not found');

  const milestone = goal.milestones.id(req.params.milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  milestone.completed = true;
  milestone.completedAt = new Date();
  goal.progress.milestonesCompleted = goal.milestones.filter((m) => m.completed).length;
  goal.progress.current = goal.progress.totalMilestones
    ? Math.round((goal.progress.milestonesCompleted / goal.progress.totalMilestones) * 100)
    : 0;

  if (goal.progress.milestonesCompleted === goal.progress.totalMilestones && goal.progress.totalMilestones > 0) {
    goal.status = 'completed';
    goal.completedAt = new Date();
  }

  await goal.save();
  res.json({ success: true, data: goal });
});

exports.generateAiRoadmap = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) throw new ApiError(404, 'Goal not found');

  const prompt = `Create a study/execution roadmap for this goal. Respond as strict JSON with keys:
suggestedWeeklyHours (number), optimalStudyOrder (string array), recommendedResources (string array), estimatedCompletionDate (ISO date string).

Goal: "${goal.title}"
Description: "${goal.description || 'N/A'}"
Type: ${goal.type}
Target date: ${goal.targetDate || 'unspecified'}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const roadmap = JSON.parse(completion.choices[0].message.content);
  goal.aiRoadmap = {
    suggestedWeeklyHours: roadmap.suggestedWeeklyHours,
    optimalStudyOrder: roadmap.optimalStudyOrder,
    recommendedResources: roadmap.recommendedResources,
    estimatedCompletionDate: roadmap.estimatedCompletionDate ? new Date(roadmap.estimatedCompletionDate) : undefined,
  };
  await goal.save();

  res.json({ success: true, data: goal });
});
