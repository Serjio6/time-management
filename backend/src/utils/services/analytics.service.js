const Task = require('../models/Task');
const FocusSession = require('../models/FocusSession');
const Habit = require('../models/Habit');
const AnalyticsDaily = require('../models/AnalyticsDaily');
const { startOfDay, endOfDay, getWeekRange, getMonthRange } = require('../utils/dateHelpers');

class AnalyticsService {
  async computeDailyAnalytics(userId, date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [tasks, sessions, habits] = await Promise.all([
      Task.find({ userId, scheduledDate: dayStart }),
      FocusSession.find({ userId, startedAt: { $gte: dayStart, $lte: dayEnd } }),
      Habit.find({ userId, isActive: true }),
    ]);

    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const skippedTasks = tasks.filter((t) => t.status === 'skipped');
    const rescheduledTasks = tasks.filter((t) => t.status === 'rescheduled');
    const overdueTasks = tasks.filter((t) => t.deadline && t.deadline < new Date() && t.status !== 'completed');

    const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const flowStateCount = sessions.filter((s) => s.quality?.flowStateAchieved).length;
    const interruptionCount = sessions.reduce((sum, s) => sum + (s.interruptions?.length || 0), 0);

    const habitsCompletedToday = habits.filter((h) =>
      h.completions.some((c) => c.completed && startOfDay(c.date).getTime() === dayStart.getTime())
    );

    const taskCompletionScore = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0;
    const focusQualityScore = sessions.length
      ? (sessions.reduce((sum, s) => sum + (s.quality?.focusScore || 0), 0) / sessions.length)
      : 0;
    const consistencyScore = habits.length ? (habitsCompletedToday.length / habits.length) * 100 : 0;
    const timeManagementScore = Math.max(0, 100 - overdueTasks.length * 10);

    const overall = Math.round(
      taskCompletionScore * 0.35 + focusQualityScore * 0.25 + consistencyScore * 0.2 + timeManagementScore * 0.2
    );

    const doc = await AnalyticsDaily.findOneAndUpdate(
      { userId, date: dayStart },
      {
        userId,
        date: dayStart,
        productivityScore: {
          overall,
          breakdown: {
            taskCompletion: Math.round(taskCompletionScore),
            focusQuality: Math.round(focusQualityScore),
            timeManagement: Math.round(timeManagementScore),
            consistency: Math.round(consistencyScore),
          },
        },
        tasks: {
          total: tasks.length,
          completed: completedTasks.length,
          skipped: skippedTasks.length,
          rescheduled: rescheduledTasks.length,
          overdue: overdueTasks.length,
          averageCompletionTime: average(completedTasks.map((t) => t.actualDuration).filter(Boolean)),
        },
        focus: {
          totalSessions: sessions.length,
          totalFocusMinutes,
          averageSessionLength: sessions.length ? Math.round(totalFocusMinutes / sessions.length) : 0,
          flowStateCount,
          interruptionCount,
        },
        habits: {
          total: habits.length,
          completed: habitsCompletedToday.length,
          completionRate: habits.length ? Math.round((habitsCompletedToday.length / habits.length) * 100) : 0,
          streakMaintained: habitsCompletedToday.length === habits.length && habits.length > 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return doc;
  }

  async getDashboardSummary(userId) {
    const today = new Date();
    const daily = await this.computeDailyAnalytics(userId, today);
    const { start: weekStart, end: weekEnd } = getWeekRange(today);
    const weekly = await AnalyticsDaily.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).sort({ date: 1 });
    return { today: daily, week: weekly };
  }

  async getRange(userId, start, end) {
    return AnalyticsDaily.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
  }

  async getMonthly(userId, date) {
    const { start, end } = getMonthRange(date);
    return this.getRange(userId, start, end);
  }
}

function average(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

module.exports = { AnalyticsService };
