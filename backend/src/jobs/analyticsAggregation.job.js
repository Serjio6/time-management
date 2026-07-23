const cron = require('node-cron');
const User = require('../models/User');
const { AnalyticsService } = require('../services/analytics.service');
const { addDays } = require('../utils/dateHelpers');
const logger = require('../utils/logger');

const analyticsService = new AnalyticsService();

/**
 * Runs just after midnight to aggregate the previous day's analytics for
 * every active user, so /api/analytics/* reads are served from
 * pre-computed documents instead of recomputing on every request.
 */
function startAnalyticsAggregationJob() {
  cron.schedule('10 0 * * *', async () => {
    logger.info('Running analytics aggregation job');
    const yesterday = addDays(new Date(), -1);

    const activeUsers = await User.find({
      lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    }).select('_id');

    for (const user of activeUsers) {
      try {
        await analyticsService.computeDailyAnalytics(user._id, yesterday);
      } catch (err) {
        logger.error(`Analytics aggregation failed for user ${user._id}`, err.message);
      }
    }

    logger.info(`Analytics aggregation complete for ${activeUsers.length} users`);
  });
}

module.exports = { startAnalyticsAggregationJob };
