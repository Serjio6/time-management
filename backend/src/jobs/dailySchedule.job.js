const cron = require('node-cron');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { SchedulerService } = require('../services/scheduler.service');
const { startOfDay } = require('../utils/dateHelpers');
const logger = require('../utils/logger');

const scheduler = new SchedulerService();

/**
 * Runs every night at 05:00 server time and pre-generates a draft schedule
 * for any active user who doesn't already have one for today. Users can
 * still regenerate via POST /api/schedule/generate.
 */
function startDailyScheduleJob() {
  cron.schedule('0 5 * * *', async () => {
    logger.info('Running daily schedule generation job');
    const today = startOfDay(new Date());

    const activeUsers = await User.find({
      lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    }).select('_id profile');

    for (const user of activeUsers) {
      try {
        const existing = await Schedule.findOne({ userId: user._id, date: today });
        if (existing) continue;

        await scheduler.generateOptimalSchedule(user._id, today, {
          availableHours: 8,
          energyLevel: 'medium',
          fixedBlocks: [],
          deadlines: [],
        });
      } catch (err) {
        logger.error(`Daily schedule generation failed for user ${user._id}`, err.message);
      }
    }

    logger.info(`Daily schedule generation complete for ${activeUsers.length} users`);
  });
}

module.exports = { startDailyScheduleJob };
