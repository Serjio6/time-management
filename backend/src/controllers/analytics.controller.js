const { Parser } = require('json2csv');
const { AnalyticsService } = require('../services/analytics.service');
const AnalyticsDaily = require('../models/AnalyticsDaily');
const { asyncHandler } = require('../middleware/error.middleware');
const { getWeekRange, getMonthRange, startOfDay } = require('../utils/dateHelpers');

const analyticsService = new AnalyticsService();

exports.getDashboard = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getDashboardSummary(req.userId);
  res.json({ success: true, data: summary });
});

exports.getDaily = asyncHandler(async (req, res) => {
  const { date, days = 7 } = req.query;
  const end = date ? new Date(date) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Number(days) + 1);

  const data = await analyticsService.getRange(req.userId, startOfDay(start), startOfDay(end));
  res.json({ success: true, data });
});

exports.getWeekly = asyncHandler(async (req, res) => {
  const { start, end } = getWeekRange(new Date());
  const data = await analyticsService.getRange(req.userId, start, end);
  res.json({ success: true, data });
});

exports.getMonthly = asyncHandler(async (req, res) => {
  const data = await analyticsService.getMonthly(req.userId, new Date());
  res.json({ success: true, data });
});

exports.getProductivityTrend = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Number(days));

  const data = await AnalyticsDaily.find({ userId: req.userId, date: { $gte: start, $lte: end } })
    .sort({ date: 1 })
    .select('date productivityScore.overall');

  res.json({ success: true, data });
});

exports.getCategoryBreakdown = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Number(days));

  const data = await AnalyticsDaily.find({ userId: req.userId, date: { $gte: start, $lte: end } }).select(
    'date timeSpent.byCategory'
  );

  res.json({ success: true, data });
});

exports.exportData = asyncHandler(async (req, res) => {
  const { format = 'json', days = 30 } = req.query;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Number(days));

  const data = await AnalyticsDaily.find({ userId: req.userId, date: { $gte: start, $lte: end } }).lean();

  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('flowstate-analytics.csv');
    return res.send(csv);
  }

  res.json({ success: true, data });
});
