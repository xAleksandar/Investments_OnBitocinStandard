// Environment configuration management
// Centralizes environment variable handling and validation

const REQUIRED_ENV_VARS = [
    'POSTGRES_URL',
    'JWT_SECRET'
];

const OPTIONAL_ENV_VARS = {
    PORT: 3000,
    NODE_ENV: 'development',
    ADMIN_EMAILS: '',
    EMAIL_HOST: '',
    EMAIL_PORT: 587,
    EMAIL_USER: '',
    EMAIL_PASS: '',
    COINGECKO_API_KEY: '', // Optional for higher rate limits
    PRICE_UPDATE_INTERVAL: 60000, // 1 minute default
    SESSION_TIMEOUT: 86400000 // 24 hours default
};

class EnvironmentConfig {
    constructor() {
        this.config = {};
        this.isLoaded = false;
    }

    /**
     * Load and validate environment configuration
     */
    load() {
        try {
            // Load required variables
            REQUIRED_ENV_VARS.forEach(key => {
                const value = process.env[key];
                if (!value) {
                    throw new Error(`Required environment variable ${key} is not set`);
                }
                this.config[key] = value;
            });

            // Load optional variables with defaults
            Object.entries(OPTIONAL_ENV_VARS).forEach(([key, defaultValue]) => {
                const value = process.env[key];

                // Type conversion based on default value type
                if (typeof defaultValue === 'number') {
                    this.config[key] = value ? parseInt(value, 10) : defaultValue;
                } else if (typeof defaultValue === 'boolean') {
                    this.config[key] = value ? value.toLowerCase() === 'true' : defaultValue;
                } else {
                    this.config[key] = value || defaultValue;
                }
            });

            // Process admin emails
            if (this.config.ADMIN_EMAILS) {
                this.config.ADMIN_EMAILS_ARRAY = this.config.ADMIN_EMAILS
                    .split(',')
                    .map(email => email.trim())
                    .filter(email => email.length > 0);
            } else {
                this.config.ADMIN_EMAILS_ARRAY = [];
            }

            // Validate configuration
            this.validate();

            this.isLoaded = true;
            console.log('Environment configuration loaded successfully');

            return this.config;

        } catch (error) {
            console.error('Failed to load environment configuration:', error);
            throw error;
        }
    }

    /**
     * Validate configuration values
     */
    validate() {
        // Validate PORT
        if (this.config.PORT < 1 || this.config.PORT > 65535) {
            throw new Error('PORT must be between 1 and 65535');
        }

        // Validate NODE_ENV
        const validEnvironments = ['development', 'production', 'test'];
        if (!validEnvironments.includes(this.config.NODE_ENV)) {
            console.warn(`NODE_ENV "${this.config.NODE_ENV}" is not standard. Expected: ${validEnvironments.join(', ')}`);
        }

        // Validate PostgreSQL URL format
        if (!this.config.POSTGRES_URL.startsWith('postgresql://') && !this.config.POSTGRES_URL.startsWith('postgres://')) {
            throw new Error('POSTGRES_URL must be a valid PostgreSQL connection string');
        }

        // Validate JWT secret length
        if (this.config.JWT_SECRET.length < 32) {
            throw new Error('JWT_SECRET must be at least 32 characters long for security');
        }

        // Validate email configuration if provided
        if (this.config.EMAIL_HOST && !this.config.EMAIL_USER) {
            console.warn('EMAIL_HOST provided but EMAIL_USER is missing - email functionality may not work');
        }

        // Validate intervals
        if (this.config.PRICE_UPDATE_INTERVAL < 10000) {
            console.warn('PRICE_UPDATE_INTERVAL is very short, may cause rate limiting');
        }
    }

    /**
     * Get configuration value
     */
    get(key) {
        if (!this.isLoaded) {
            throw new Error('Environment configuration not loaded. Call load() first.');
        }
        return this.config[key];
    }

    /**
     * Check if we're in development mode
     */
    isDevelopment() {
        return this.get('NODE_ENV') === 'development';
    }

    /**
     * Check if we're in production mode
     */
    isProduction() {
        return this.get('NODE_ENV') === 'production';
    }

    /**
     * Check if we're in test mode
     */
    isTest() {
        return this.get('NODE_ENV') === 'test';
    }

    /**
     * Check if user is admin
     */
    isAdminEmail(email) {
        if (!email) return false;
        return this.get('ADMIN_EMAILS_ARRAY').includes(email.toLowerCase());
    }

    /**
     * Get email configuration
     */
    getEmailConfig() {
        return {
            host: this.get('EMAIL_HOST'),
            port: this.get('EMAIL_PORT'),
            user: this.get('EMAIL_USER'),
            pass: this.get('EMAIL_PASS'),
            enabled: !!(this.get('EMAIL_HOST') && this.get('EMAIL_USER'))
        };
    }

    /**
     * Get database configuration
     */
    getDatabaseConfig() {
        return {
            url: this.get('POSTGRES_URL'),
            ssl: this.isProduction()
        };
    }

    /**
     * Get all configuration (for debugging)
     */
    getAll() {
        if (!this.isLoaded) {
            throw new Error('Environment configuration not loaded');
        }

        // Return config without sensitive data
        const safeCopy = { ...this.config };
        delete safeCopy.JWT_SECRET;
        delete safeCopy.POSTGRES_URL;
        delete safeCopy.EMAIL_PASS;
        delete safeCopy.COINGECKO_API_KEY;

        return safeCopy;
    }
}

// Create singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;