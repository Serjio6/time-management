const cron = require('node-cron');
const Habit = require('../models/Habit');
const logger = require('../utils/logger');

/**
 * Runs every minute and fires reminders for habits whose reminderTime
 * ("HH:mm") matches the current minute. `notificationService` is injected
 * from app.js so this job can reuse the same push/socket wiring.
 */
function startHabitReminderJob(notificationService) {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const dueHabits = await Habit.find({ isActive: true, reminderTime: hhmm });
    for (const habit of dueHabits) {
      try {
        await notificationService.notify(
          habit.userId,
          { title: 'Habit reminder', body: habit.name, type: 'habit_reminder', habitId: habit._id },
          ['push', 'in_app']
        );
      } catch (err) {
        logger.error(`Habit reminder failed for habit ${habit._id}`, err.message);
      }
    }
  });
}

module.exports = { startHabitReminderJob };
