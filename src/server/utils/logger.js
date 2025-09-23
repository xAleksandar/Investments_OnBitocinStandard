const { sanitizeForLogging } = require('./serializers');

// Simple logger with different levels
class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    this.currentLevel = process.env.LOG_LEVEL ||
                       (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedMeta = sanitizeForLogging(meta);

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...sanitizedMeta
    };

    return JSON.stringify(logEntry);
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }
}

const logger = new Logger();

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    logger[level]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    });
  });

  next();
}

// Error logging helper
function logError(error, context = {}) {
  logger.error('Application error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
}

// Performance logging
function logPerformance(operation, duration, metadata = {}) {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level]('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
}

module.exports = {
  logger,
  requestLogger,
  logError,
  logPerformance
};