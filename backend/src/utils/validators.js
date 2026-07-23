const Joi = require('joi');

const objectId = () => Joi.string().hex().length(24);

const schemas = {
  createTask: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().allow('', null).max(2000),
    category: Joi.string().valid('work', 'study', 'personal', 'health', 'other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    scheduledDate: Joi.date(),
    scheduledStartTime: Joi.date(),
    scheduledEndTime: Joi.date(),
    estimatedDuration: Joi.number().min(1).max(1440),
    deadline: Joi.date(),
    tags: Joi.array().items(Joi.string().max(30)),
    subtasks: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        completed: Joi.boolean(),
      })
    ),
    recurrence: Joi.object({
      isRecurring: Joi.boolean(),
      frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'custom'),
      interval: Joi.number(),
      daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
      endDate: Joi.date(),
      occurrences: Joi.number(),
    }),
  }),

  updateTask: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    description: Joi.string().allow('', null).max(2000),
    category: Joi.string().valid('work', 'study', 'personal', 'health', 'other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'skipped', 'rescheduled'),
    scheduledDate: Joi.date(),
    scheduledStartTime: Joi.date(),
    scheduledEndTime: Joi.date(),
    estimatedDuration: Joi.number().min(1).max(1440),
    actualDuration: Joi.number().min(0),
    deadline: Joi.date(),
    tags: Joi.array().items(Joi.string().max(30)),
  }).min(1),

  generateSchedule: Joi.object({
    date: Joi.date().required(),
    availableHours: Joi.number().min(1).max(24).required(),
    energyLevel: Joi.string().valid('high', 'medium', 'low').required(),
    priorities: Joi.array().items(Joi.string()),
    deadlines: Joi.array().items(Joi.date()),
    constraints: Joi.object({
      fixedBlocks: Joi.array().items(
        Joi.object({
          start: Joi.string().required(),
          end: Joi.string().required(),
          title: Joi.string().required(),
        })
      ),
      preferredBreakTimes: Joi.array().items(Joi.string()),
    }),
  }),

  createHabit: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    description: Joi.string().allow('', null).max(1000),
    category: Joi.string().valid('health', 'learning', 'productivity', 'mindfulness', 'social', 'creative'),
    icon: Joi.string(),
    color: Joi.string(),
    frequency: Joi.object({
      type: Joi.string().valid('daily', 'specific_days', 'times_per_week', 'times_per_month'),
      daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
      timesPerWeek: Joi.number(),
      timesPerMonth: Joi.number(),
    }),
    targetDuration: Joi.number(),
    reminderTime: Joi.string(),
  }),

  createGoal: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().allow('', null).max(2000),
    type: Joi.string().valid('short_term', 'long_term', 'life_goal'),
    category: Joi.string(),
    startDate: Joi.date(),
    targetDate: Joi.date(),
    milestones: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow('', null),
        targetDate: Joi.date(),
        order: Joi.number(),
      })
    ),
    motivation: Joi.object({
      why: Joi.string().allow('', null),
      vision: Joi.string().allow('', null),
      rewards: Joi.array().items(Joi.string()),
    }),
  }),

  startFocusSession: Joi.object({
    type: Joi.string().valid('pomodoro', 'deep_work', 'flow_state', 'custom').required(),
    plannedDuration: Joi.number().min(1).required(),
    taskId: objectId(),
    taskTitle: Joi.string(),
    category: Joi.string(),
    environment: Joi.object({
      device: Joi.string(),
      location: Joi.string(),
      noiseLevel: Joi.string(),
      timeOfDay: Joi.string(),
    }),
  }),

  chatMessage: Joi.object({
    message: Joi.string().trim().min(1).max(4000).required(),
    conversationId: Joi.string().allow(null, ''),
    context: Joi.object({
      currentTasks: Joi.array().items(Joi.string()),
      energyLevel: Joi.string().valid('high', 'medium', 'low'),
      location: Joi.string(),
    }),
  }),
};

module.exports = { schemas, objectId };
