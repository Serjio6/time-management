const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      socket.join(`user:${userId}`);
      logger.debug(`Socket connected for user ${userId}`);

      socket.on('focus:start', (data) => this.handleFocusStart(userId, data));
      socket.on('focus:end', (data) => this.handleFocusEnd(userId, data));
      socket.on('task:update', (data) => this.broadcastToUser(userId, 'task:updated', data));
      socket.on('schedule:adjust', (data) => this.handleScheduleAdjustment(userId, data));
      socket.on('habit:complete', (data) => this.handleHabitCompletion(userId, data));

      socket.on('disconnect', () => logger.debug(`Socket disconnected for user ${userId}`));
    });
  }

  handleFocusStart(userId, data) {
    this.broadcastToUser(userId, 'focus:started', data);
  }

  handleFocusEnd(userId, data) {
    this.broadcastToUser(userId, 'focus:ended', data);
  }

  handleScheduleAdjustment(userId, data) {
    this.broadcastToUser(userId, 'schedule:adjusted', data);
  }

  handleHabitCompletion(userId, data) {
    this.broadcastToUser(userId, 'habit:completed', data);
  }

  broadcastToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  sendNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }
}

module.exports = { SocketService };
