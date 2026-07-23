const Task = require('../models/Task');
const Habit = require('../models/Habit');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { parseTimeOnDate, addMinutes, startOfDay } = require('../utils/dateHelpers');

class SchedulerService {
  async generateOptimalSchedule(userId, date, constraints) {
    const dayStart = startOfDay(date);

    const tasks = await Task.find({
      userId,
      scheduledDate: dayStart,
      status: { $in: ['pending', 'in_progress'] },
    }).sort({ priority: -1, deadline: 1 });

    const habits = await Habit.find({ userId, isActive: true });
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const timeBlocks = [];
    const dayEnd = this.getEndOfDay(dayStart, user.profile.workHours.end);

    for (const block of constraints.fixedBlocks || []) {
      timeBlocks.push({
        startTime: parseTimeOnDate(dayStart, block.start),
        endTime: parseTimeOnDate(dayStart, block.end),
        title: block.title,
        type: 'work',
        isFixed: true,
        energyLevel: 'medium',
      });
    }

    const prioritizedTasks = this.prioritizeTasks(tasks, constraints);
    let cursor = timeBlocks.length
      ? new Date(Math.max(...timeBlocks.map((b) => b.endTime.getTime())))
      : parseTimeOnDate(dayStart, user.profile.workHours.start);

    for (const task of prioritizedTasks) {
      const duration = task.estimatedDuration || 30;
      const slotEnd = addMinutes(cursor, duration);
      if (slotEnd > dayEnd) break;

      timeBlocks.push({
        startTime: cursor,
        endTime: slotEnd,
        title: task.title,
        type: task.category,
        taskId: task._id,
        energyLevel: task.aiSuggestions?.energyLevelRequired || 'medium',
        isFixed: false,
      });

      cursor = slotEnd;

      const breakAfter = task.aiSuggestions?.suggestedBreakAfter;
      if (breakAfter) {
        const breakEnd = addMinutes(cursor, breakAfter);
        if (breakEnd <= dayEnd) {
          timeBlocks.push({ startTime: cursor, endTime: breakEnd, title: 'Break', type: 'break', isFixed: false });
          cursor = breakEnd;
        }
      }
    }

    for (const habit of habits) {
      if (habit.reminderTime) {
        const reminderTime = parseTimeOnDate(dayStart, habit.reminderTime);
        timeBlocks.push({
          startTime: reminderTime,
          endTime: addMinutes(reminderTime, 5),
          title: `Habit: ${habit.name}`,
          type: 'personal',
          isFixed: false,
        });
      }
    }

    timeBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return Schedule.findOneAndUpdate(
      { userId, date: dayStart },
      {
        userId,
        date: dayStart,
        timeBlocks,
        metrics: this.calculateMetrics(timeBlocks),
        generatedBy: 'ai',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  prioritizeTasks(tasks, constraints) {
    return [...tasks].sort((a, b) => this.calculateTaskScore(b, constraints) - this.calculateTaskScore(a, constraints));
  }

  calculateTaskScore(task, constraints) {
    let score = 0;
    const priorityWeights = { urgent: 40, high: 30, medium: 20, low: 10 };
    score += priorityWeights[task.priority] || 0;

    if (task.deadline) {
      const hoursUntil = (new Date(task.deadline).getTime() - Date.now()) / 3600000;
      if (hoursUntil < 24) score += 30;
      else if (hoursUntil < 72) score += 20;
      else if (hoursUntil < 168) score += 10;
    }

    if (task.aiSuggestions?.energyLevelRequired === constraints.energyLevel) score += 20;

    const history = task.completionHistory || [];
    if (history.length > 0) {
      score += (history.filter((h) => h.quality >= 3).length / history.length) * 10;
    }

    return score;
  }

  buildEnergyMap(energyLevel, hours) {
    const map = new Map();
    for (let i = 0; i < hours; i++) {
      let hourEnergy = energyLevel;
      if (energyLevel === 'high') {
        if (i < 3) hourEnergy = 'high';
        else if (i < 5) hourEnergy = 'medium';
        else if (i === 5) hourEnergy = 'low';
        else hourEnergy = 'medium';
      } else if (energyLevel === 'medium') {
        if (i < 2) hourEnergy = 'medium';
        else if (i < 4) hourEnergy = 'high';
        else hourEnergy = 'medium';
      } else {
        hourEnergy = 'low';
        if (i === 1 || i === 4) hourEnergy = 'medium';
      }
      map.set(i, hourEnergy);
    }
    return map;
  }

  getEndOfDay(date, workEndTime) {
    return parseTimeOnDate(date, workEndTime);
  }

  calculateMetrics(timeBlocks) {
    const hoursByType = {};
    let total = 0;
    for (const block of timeBlocks) {
      const hours = (block.endTime.getTime() - block.startTime.getTime()) / 3600000;
      hoursByType[block.type] = (hoursByType[block.type] || 0) + hours;
      total += hours;
    }
    return {
      totalPlannedHours: round2(total),
      workHours: round2(hoursByType.work || 0),
      studyHours: round2(hoursByType.study || 0),
      breakHours: round2(hoursByType.break || 0),
      healthHours: round2(hoursByType.exercise || 0),
      personalHours: round2(hoursByType.personal || 0),
      completionRate: 0,
    };
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { SchedulerService };
