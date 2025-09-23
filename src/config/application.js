const environmentConfig = require('./environment');

class ApplicationConfig {
  constructor() {
    this.settings = {};
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return this.settings;

    try {
      // Load environment configuration first
      const envConfig = environmentConfig.load();

      // Application-wide settings derived from environment
      this.settings = {
        // Server configuration
        server: {
          port: envConfig.PORT,
          environment: envConfig.NODE_ENV,
          host: envConfig.HOST || 'localhost',
          trustProxy: envConfig.TRUST_PROXY === 'true',
          sessionTimeout: envConfig.SESSION_TIMEOUT,
          requestTimeout: 30000,
          maxRequestSize: '10mb'
        },

        // Database configuration
        database: {
          url: envConfig.POSTGRES_URL,
          ssl: envConfig.NODE_ENV === 'production',
          poolSize: parseInt(envConfig.DB_POOL_SIZE || '10'),
          timeout: parseInt(envConfig.DB_TIMEOUT || '30000'),
          retryAttempts: parseInt(envConfig.DB_RETRY_ATTEMPTS || '3'),
          retryDelay: parseInt(envConfig.DB_RETRY_DELAY || '1000')
        },

        // Authentication configuration
        auth: {
          jwtSecret: envConfig.JWT_SECRET,
          jwtExpiration: envConfig.JWT_EXPIRATION || '7d',
          passwordMinLength: 8,
          maxLoginAttempts: 5,
          lockoutDuration: 15 * 60 * 1000, // 15 minutes
          adminEmails: (envConfig.ADMIN_EMAILS || '').split(',').filter(Boolean)
        },

        // Email configuration
        email: {
          host: envConfig.EMAIL_HOST,
          port: envConfig.EMAIL_PORT,
          secure: envConfig.EMAIL_PORT == 465,
          user: envConfig.EMAIL_USER,
          password: envConfig.EMAIL_PASS,
          from: envConfig.EMAIL_FROM || envConfig.EMAIL_USER,
          replyTo: envConfig.EMAIL_REPLY_TO,
          templates: {
            magicLink: {
              subject: 'Your Bitcoin Education Login Link',
              expiresIn: '15m'
            }
          }
        },

        // API configuration
        api: {
          coingecko: {
            apiKey: envConfig.COINGECKO_API_KEY,
            baseUrl: 'https://api.coingecko.com/api/v3',
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            rateLimitPerMinute: envConfig.COINGECKO_API_KEY ? 500 : 50
          }
        },

        // Price service configuration
        pricing: {
          updateInterval: envConfig.PRICE_UPDATE_INTERVAL,
          cacheTTL: 60000, // 1 minute
          fallbackTimeout: 5000,
          supportedAssets: [
            'bitcoin', 'ethereum', 'litecoin', 'bitcoin-cash',
            'cardano', 'polkadot', 'chainlink', 'stellar',
            'dogecoin', 'ripple'
          ]
        },

        // Portfolio configuration
        portfolio: {
          maxAssets: 50,
          minTradeAmount: 0.00000001, // 1 satoshi
          maxTradeAmount: 100, // 100 BTC
          conversionCooldown: 24 * 60 * 60 * 1000, // 24 hours
          portfolioBaseline: 100000000 // 1 BTC in satoshis
        },

        // Security configuration
        security: {
          rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: envConfig.NODE_ENV === 'production' ? 100 : 1000,
            skipSuccessfulRequests: false
          },
          cors: {
            origin: envConfig.NODE_ENV === 'production'
              ? [envConfig.FRONTEND_URL].filter(Boolean)
              : true,
            credentials: true,
            maxAge: 86400 // 24 hours
          },
          helmet: {
            contentSecurityPolicy: envConfig.NODE_ENV === 'production',
            crossOriginEmbedderPolicy: false,
            hsts: {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true
            }
          }
        },

        // Logging configuration
        logging: {
          level: envConfig.LOG_LEVEL || (envConfig.NODE_ENV === 'production' ? 'info' : 'debug'),
          format: envConfig.LOG_FORMAT || 'json',
          destination: envConfig.LOG_DESTINATION || 'console',
          enableMetrics: envConfig.ENABLE_METRICS === 'true',
          sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'session']
        },

        // Feature flags
        features: {
          enableMetrics: envConfig.ENABLE_METRICS === 'true',
          enableCaching: envConfig.ENABLE_CACHING !== 'false',
          enableMockData: envConfig.ENABLE_MOCK_DATA === 'true',
          enableDebugRoutes: envConfig.NODE_ENV === 'development',
          enableSwagger: envConfig.ENABLE_SWAGGER === 'true',
          maintenanceMode: envConfig.MAINTENANCE_MODE === 'true'
        },

        // Development configuration
        development: {
          hotReload: envConfig.NODE_ENV === 'development',
          mockDelay: parseInt(envConfig.MOCK_DELAY || '0'),
          debugSql: envConfig.DEBUG_SQL === 'true',
          enablePlaywright: envConfig.NODE_ENV === 'development'
        }
      };

      // Validate critical settings
      this.validateSettings();

      this.isInitialized = true;
      console.log('✅ Application configuration loaded successfully');

      return this.settings;

    } catch (error) {
      console.error('❌ Failed to initialize application configuration:', error);
      throw error;
    }
  }

  validateSettings() {
    const { server, database, auth } = this.settings;

    // Validate server settings
    if (!server.port || server.port < 1 || server.port > 65535) {
      throw new Error('Invalid server port configuration');
    }

    // Validate database settings
    if (!database.url) {
      throw new Error('Database URL is required');
    }

    // Validate auth settings
    if (!auth.jwtSecret || auth.jwtSecret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    // Validate admin emails format
    auth.adminEmails.forEach(email => {
      if (email && !this.isValidEmail(email)) {
        throw new Error(`Invalid admin email format: ${email}`);
      }
    });
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get(path) {
    if (!this.isInitialized) {
      throw new Error('Application configuration not initialized');
    }

    return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
  }

  isDevelopment() {
    return this.get('server.environment') === 'development';
  }

  isProduction() {
    return this.get('server.environment') === 'production';
  }

  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`) === true;
  }

  getAdminEmails() {
    return this.get('auth.adminEmails') || [];
  }

  getDatabaseConfig() {
    return this.get('database');
  }

  getServerConfig() {
    return this.get('server');
  }

  getSecurityConfig() {
    return this.get('security');
  }
}

// Export singleton instance
const applicationConfig = new ApplicationConfig();

module.exports = applicationConfig;