const { PrismaClient } = require('@prisma/client');
const { logError, logPerformance } = require('../server/utils/logger');

class DatabaseManager {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async connect() {
    if (this.isConnected && this.prisma) {
      return this.prisma;
    }

    try {
      console.log('🔗 Connecting to database...');
      const start = Date.now();

      // Create Prisma client with enhanced configuration
      this.prisma = new PrismaClient({
        log: this.getLogLevel(),
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL
          }
        }
      });

      // Test the connection
      await this.prisma.$connect();

      // Verify database health
      await this.healthCheck();

      this.isConnected = true;
      this.connectionRetries = 0;

      const duration = Date.now() - start;
      logPerformance('database_connection', duration);

      console.log('✅ Database connected successfully');
      return this.prisma;

    } catch (error) {
      logError(error, { context: 'database_connection' });

      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`🔄 Retrying database connection (${this.connectionRetries}/${this.maxRetries})...`);

        await this.delay(this.retryDelay * this.connectionRetries);
        return this.connect();
      }

      throw new Error(`Failed to connect to database after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      // Simple query to verify connection
      await this.prisma.$queryRaw`SELECT 1 as health_check`;

      // Check if main tables exist
      const result = await this.prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'trades', 'portfolios')
      `;

      if (result.length === 0) {
        console.warn('⚠️ Database tables may not be migrated');
      }

      return true;
    } catch (error) {
      logError(error, { context: 'database_health_check' });
      throw error;
    }
  }

  async disconnect() {
    if (this.prisma && this.isConnected) {
      try {
        console.log('🔌 Disconnecting from database...');
        await this.prisma.$disconnect();
        this.isConnected = false;
        console.log('✅ Database disconnected');
      } catch (error) {
        logError(error, { context: 'database_disconnect' });
        throw error;
      }
    }
  }

  async reconnect() {
    await this.disconnect();
    return this.connect();
  }

  getClient() {
    if (!this.isConnected || !this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  getLogLevel() {
    const nodeEnv = process.env.NODE_ENV;
    const debugSql = process.env.DEBUG_SQL === 'true';

    if (debugSql) {
      return ['query', 'info', 'warn', 'error'];
    }

    if (nodeEnv === 'development') {
      return ['error', 'warn'];
    }

    return ['error'];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Transaction helper with retry logic
  async transaction(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        const result = await this.prisma.$transaction(fn, {
          timeout: options.timeout || 10000,
          isolationLevel: options.isolationLevel
        });

        const duration = Date.now() - start;
        logPerformance('database_transaction', duration, { attempt });

        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.code === 'P2002' || // Unique constraint violation
            error.code === 'P2025' || // Record not found
            attempt === maxRetries) {
          break;
        }

        console.warn(`Transaction attempt ${attempt} failed, retrying...`);
        await this.delay(retryDelay * attempt);
      }
    }

    logError(lastError, { context: 'database_transaction', attempts: maxRetries });
    throw lastError;
  }
}

// Global database manager instance
const globalForDatabase = globalThis;
const dbManager = globalForDatabase.dbManager || new DatabaseManager();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.dbManager = dbManager;
}

// Graceful shutdown handling
let shutdownHandlerAttached = false;

if (!shutdownHandlerAttached) {
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Disconnecting database...`);
    try {
      await dbManager.disconnect();
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('beforeExit', gracefulShutdown);

  shutdownHandlerAttached = true;
}

// Export both the manager and a direct client for backward compatibility
module.exports = dbManager.getClient.bind(dbManager);
module.exports.manager = dbManager;
module.exports.connect = dbManager.connect.bind(dbManager);
module.exports.disconnect = dbManager.disconnect.bind(dbManager);
module.exports.transaction = dbManager.transaction.bind(dbManager);