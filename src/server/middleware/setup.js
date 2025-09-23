const { bigIntSerializer } = require('../utils/serializers');
const { requestLogger } = require('../utils/logger');

function setupMiddleware(app) {
  // BigInt serialization middleware - must be early in the chain
  app.use(bigIntSerializer);

  // Request logging middleware
  app.use(requestLogger);

  // Request timeout middleware
  app.use((req, res, next) => {
    req.setTimeout(30000, () => {
      const err = new Error('Request timeout');
      err.status = 408;
      next(err);
    });
    next();
  });

  // Request size limit middleware
  app.use((req, res, next) => {
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Request entity too large' });
    }
    next();
  });

  // Rate limiting for production
  if (process.env.NODE_ENV === 'production') {
    const rateLimit = require('express-rate-limit');

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use('/api/', limiter);
  }

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  console.log('✅ Custom middleware configured');
}

module.exports = { setupMiddleware };