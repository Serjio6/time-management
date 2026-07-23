require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

const { authMiddleware } = require('./middleware/auth.middleware');
const { apiLimiter, aiLimiter } = require('./middleware/rateLimit.middleware');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const habitRoutes = require('./routes/habit.routes');
const goalRoutes = require('./routes/goal.routes');
const focusRoutes = require('./routes/focus.routes');
const chatRoutes = require('./routes/chat.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const userRoutes = require('./routes/user.routes');

const { SocketService } = require('./services/socket.service');
const { NotificationService } = require('./services/notification.service');
const { startDailyScheduleJob } = require('./jobs/dailySchedule.job');
const { startHabitReminderJob } = require('./jobs/habitReminder.job');
const { startAnalyticsAggregationJob } = require('./jobs/analyticsAggregation.job');

function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // Health check (no auth, no rate limit — used by Docker/K8s probes)
  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/chat/', aiLimiter);

  // Public auth routes (register/login issue the session token themselves)
  app.use('/api/auth', authRoutes);

  // Everything below requires a valid session
  app.use('/api', authMiddleware);

  app.use('/api/tasks', taskRoutes);
  app.use('/api/schedule', scheduleRoutes);
  app.use('/api/habits', habitRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/focus', focusRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/user', userRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

async function start() {
  await connectDatabase();

  try {
    await connectRedis();
  } catch (err) {
    logger.warn('Redis connection failed — continuing without cache/session store', err.message);
  }

  const app = createApp();
  const server = http.createServer(app);

  const socketService = new SocketService(server);
  const notificationService = new NotificationService(null, socketService);

  startDailyScheduleJob();
  startHabitReminderJob(notificationService);
  startAnalyticsAggregationJob();

  const port = process.env.PORT || 3000;
  server.listen(port, () => logger.info(`FlowState AI backend listening on port ${port}`));

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', err);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start };
