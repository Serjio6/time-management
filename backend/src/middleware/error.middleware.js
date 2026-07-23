const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

function notFoundMiddleware(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Wraps an async controller so thrown/rejected errors reach errorMiddleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorMiddleware, notFoundMiddleware, ApiError, asyncHandler };
