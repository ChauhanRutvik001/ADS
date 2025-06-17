const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
  }

  if (err.code === '23514') { // PostgreSQL check violation
    statusCode = 400;
    message = 'Invalid data format';
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Rate limiting errors
  if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
  }

  // AI Service errors
  if (err.name === 'AIServiceError') {
    statusCode = 502;
    message = 'AI service unavailable';
  }

  // Redis errors
  if (err.name === 'RedisError') {
    statusCode = 503;
    message = 'Cache service unavailable';
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Database service unavailable';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
  }

  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    }
  };

  // Add request ID for tracking if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
