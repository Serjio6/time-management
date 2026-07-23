const webpush = require('web-push');
const logger = require('../utils/logger');

// Configure VAPID if keys are present (push notifications are optional).
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'support@flowstate.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const MOTIVATIONAL_MESSAGES = [
  "You're doing great! Keep the momentum going!",
  'Small steps every day lead to big achievements.',
  'Remember: progress, not perfection.',
  'Your future self will thank you for this focus session.',
];

class NotificationService {
  constructor(pushSubscriptionModel, socketService) {
    this.PushSubscription = pushSubscriptionModel;
    this.socketService = socketService;
  }

  async sendPushNotification(userId, notification) {
    if (!this.PushSubscription) {
      logger.debug('Push subscriptions not configured, skipping push send');
      return;
    }
    const subscriptions = await this.PushSubscription.find({ userId });
    await Promise.allSettled(
      subscriptions.map((sub) => webpush.sendNotification(sub.toObject(), JSON.stringify(notification)))
    );
  }

  async sendInAppNotification(userId, notification) {
    this.socketService?.sendNotification(userId, notification);
  }

  async notify(userId, notification, channels = ['in_app']) {
    if (channels.includes('push')) await this.sendPushNotification(userId, notification);
    if (channels.includes('in_app')) await this.sendInAppNotification(userId, notification);
  }

  async sendMotivationalMessage(userId) {
    const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    await this.notify(userId, { title: 'FlowState AI', body: message, type: 'motivational' }, ['in_app']);
  }

  async sendTaskReminder(userId, task) {
    await this.notify(
      userId,
      { title: 'Upcoming task', body: `"${task.title}" starts in 15 minutes`, type: 'task_reminder', taskId: task._id },
      ['push', 'in_app']
    );
  }

  async sendBreakReminder(userId) {
    await this.notify(userId, { title: 'Time for a break', body: "You've been focused for 90 minutes — stretch it out.", type: 'break_reminder' }, ['push', 'in_app']);
  }

  async sendDeadlineAlert(userId, task) {
    await this.notify(
      userId,
      { title: 'Deadline approaching', body: `"${task.title}" is due within 24 hours`, type: 'deadline_alert', taskId: task._id },
      ['push', 'in_app']
    );
  }

  async sendStreakAlert(userId, habit) {
    await this.notify(
      userId,
      { title: 'Streak milestone! 🔥', body: `${habit.name}: ${habit.currentStreak}-day streak`, type: 'streak_alert' },
      ['push', 'in_app']
    );
  }
}

module.exports = { NotificationService, MOTIVATIONAL_MESSAGES };
