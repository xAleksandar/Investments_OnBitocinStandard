const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./src/server/utils/error-handlers');
const { setupMiddleware } = require('./src/server/middleware/setup');
const { setupRoutes } = require('./src/server/routes');
const dbManager = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function createServer() {
  console.log(`🚀 Starting server in ${NODE_ENV} mode...`);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false
  }));

  // Request logging
  if (NODE_ENV === 'development') {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('short'));
  }

  // Basic middleware
  app.use(cors({
    origin: NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Custom middleware setup
  setupMiddleware(app);

  // Static files
  app.use(express.static('public', {
    maxAge: NODE_ENV === 'production' ? '1y' : 0
  }));

  // Serve modular client code
  app.use('/src', express.static('src', {
    maxAge: NODE_ENV === 'production' ? '1y' : 0
  }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV
    });
  });

  // API routes
  setupRoutes(app);

  // Frontend fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.includes('.') && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    // Initialize database connection
    await dbManager.connect();
    console.log('✅ Database connected successfully');

    // Create and configure the Express app
    await createServer();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async (err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }

        console.log('🚪 HTTP server closed');

        try {
          await dbManager.disconnect();
          console.log('🗄️ Database disconnected');
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (dbError) {
          console.error('❌ Error disconnecting database:', dbError);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, createServer, startServer };
