const openai = require('../config/openai');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { SchedulerService } = require('./scheduler.service');

const scheduler = new SchedulerService();

class AIService {
  async processMessage(userMessage, context) {
    const systemPrompt = this.buildSystemPrompt(context);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.formatConversationHistory(context.conversationHistory),
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      tools: this.getAvailableTools(),
      tool_choice: 'auto',
    });

    const response = completion.choices[0].message;
    const actions = [];

    if (response.tool_calls) {
      for (const toolCall of response.tool_calls) {
        try {
          actions.push(await this.executeToolCall(toolCall, context));
        } catch (err) {
          logger.error('Tool call failed', err);
          actions.push({ type: 'error', payload: { tool: toolCall.function.name, message: err.message } });
        }
      }
    }

    return {
      message: response.content || '',
      actions,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
    };
  }

  buildSystemPrompt(context) {
    const { user, currentTasks, habits, goals } = context;
    return `You are FlowState AI, an intelligent Time Management Coach.

USER: ${user.displayName || 'User'}
Productivity: ${user.stats?.productivityLevel ?? 1}/100
Streak: ${user.stats?.currentStreak ?? 0} days
Focus Hours: ${user.stats?.totalFocusHours ?? 0}
Work Hours: ${user.profile?.workHours?.start ?? '09:00'} - ${user.profile?.workHours?.end ?? '17:00'}

TODAY: ${currentTasks?.length ?? 0} tasks, ${(habits || []).filter((h) => h.isActive).length} habits, ${(goals || []).filter((g) => g.status === 'active').length} goals

RULES:
- Be encouraging, never judgmental
- Consistency over perfection
- Adapt to energy levels
- Use emojis sparingly
- Ask clarifying questions
- Celebrate small wins
- Suggest breaking tasks if overwhelmed
- Recommend the "2-minute rule" for small tasks`;
  }

  formatConversationHistory(history = []) {
    return history.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  }

  getAvailableTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'create_schedule',
          description: 'Generate an optimized daily schedule for the user',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              availableHours: { type: 'number' },
              energyLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['date', 'availableHours', 'energyLevel'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task for the user',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              category: { type: 'string', enum: ['work', 'study', 'personal', 'health'] },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              deadline: { type: 'string' },
              estimatedDuration: { type: 'number' },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'suggest_break',
          description: 'Suggest the user take a break',
          parameters: {
            type: 'object',
            properties: {
              duration: { type: 'number' },
              type: { type: 'string', enum: ['short', 'long', 'walk', 'meditation'] },
              reason: { type: 'string' },
            },
          },
        },
      },
    ];
  }

  async executeToolCall(toolCall, context) {
    const args = JSON.parse(toolCall.function.arguments || '{}');
    switch (toolCall.function.name) {
      case 'create_schedule':
        return this.handleCreateSchedule(args, context);
      case 'create_task':
        return this.handleCreateTask(args, context);
      case 'suggest_break':
        return { type: 'suggest_break', payload: args };
      default:
        return { type: 'unknown', payload: args };
    }
  }

  async handleCreateSchedule(args, context) {
    const schedule = await scheduler.generateOptimalSchedule(context.user._id, new Date(args.date), {
      availableHours: args.availableHours,
      energyLevel: args.energyLevel,
      fixedBlocks: [],
      deadlines: [],
    });
    return { type: 'create_schedule', payload: { scheduleId: schedule._id, date: args.date } };
  }

  async handleCreateTask(args, context) {
    const task = await Task.create({
      userId: context.user._id,
      title: args.title,
      category: args.category || 'personal',
      priority: args.priority || 'medium',
      deadline: args.deadline ? new Date(args.deadline) : undefined,
      estimatedDuration: args.estimatedDuration,
    });
    return { type: 'create_task', payload: { taskId: task._id, title: task.title } };
  }
}

module.exports = { AIService };
