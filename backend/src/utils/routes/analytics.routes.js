const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/dashboard', analyticsController.getDashboard);
router.get('/daily', analyticsController.getDaily);
router.get('/weekly', analyticsController.getWeekly);
router.get('/monthly', analyticsController.getMonthly);
router.get('/productivity', analyticsController.getProductivityTrend);
router.get('/categories', analyticsController.getCategoryBreakdown);
router.get('/export', analyticsController.exportData);

module.exports = router;
