// Base service class providing common functionality for all services
// Provides consistent error handling, logging, and lifecycle management

class BaseService {
    constructor(name) {
        this.name = name || this.constructor.name;
        this.isInitialized = false;
        this.isDestroyed = false;
        this.dependencies = new Map();
        this.eventHandlers = new Map();

        // Bind common methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.log = this.log.bind(this);
        this.error = this.error.bind(this);
    }

    /**
     * Initialize the service
     * Override this method in subclasses
     */
    async init() {
        if (this.isInitialized) {
            this.log('Service already initialized');
            return;
        }

        this.log('Initializing service...');

        try {
            await this.onInit();
            this.isInitialized = true;
            this.log('Service initialized successfully');
        } catch (error) {
            this.error('Failed to initialize service:', error);
            throw error;
        }
    }

    /**
     * Override this method for custom initialization logic
     */
    async onInit() {
        // Override in subclasses
    }

    /**
     * Destroy the service and clean up resources
     */
    async destroy() {
        if (this.isDestroyed) {
            this.log('Service already destroyed');
            return;
        }

        this.log('Destroying service...');

        try {
            await this.onDestroy();
            this.clearEventHandlers();
            this.dependencies.clear();
            this.isDestroyed = true;
            this.isInitialized = false;
            this.log('Service destroyed successfully');
        } catch (error) {
            this.error('Error during service destruction:', error);
            throw error;
        }
    }

    /**
     * Override this method for custom cleanup logic
     */
    async onDestroy() {
        // Override in subclasses
    }

    /**
     * Add a dependency to this service
     */
    addDependency(name, service) {
        if (!service) {
            throw new Error(`Cannot add null dependency: ${name}`);
        }

        this.dependencies.set(name, service);
        this.log(`Added dependency: ${name}`);
    }

    /**
     * Get a dependency by name
     */
    getDependency(name) {
        const dependency = this.dependencies.get(name);
        if (!dependency) {
            throw new Error(`Dependency not found: ${name}`);
        }
        return dependency;
    }

    /**
     * Check if a dependency exists
     */
    hasDependency(name) {
        return this.dependencies.has(name);
    }

    /**
     * Add event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to all handlers
     */
    emit(event, ...args) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    this.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear all event handlers
     */
    clearEventHandlers() {
        this.eventHandlers.clear();
    }

    /**
     * Check service state
     */
    checkState() {
        if (this.isDestroyed) {
            throw new Error(`Service ${this.name} has been destroyed`);
        }
        if (!this.isInitialized) {
            throw new Error(`Service ${this.name} is not initialized`);
        }
    }

    /**
     * Safe method execution with state checking
     */
    async safeExecute(methodName, fn) {
        try {
            this.checkState();
            return await fn();
        } catch (error) {
            this.error(`Error in ${methodName}:`, error);
            throw error;
        }
    }

    /**
     * Logging with service name prefix
     */
    log(...args) {
        console.log(`[${this.name}]`, ...args);
    }

    /**
     * Error logging with service name prefix
     */
    error(...args) {
        console.error(`[${this.name}]`, ...args);
    }

    /**
     * Warning logging with service name prefix
     */
    warn(...args) {
        console.warn(`[${this.name}]`, ...args);
    }

    /**
     * Debug logging (only in development)
     */
    debug(...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${this.name}]`, ...args);
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            name: this.name,
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            dependencyCount: this.dependencies.size,
            eventHandlerCount: Array.from(this.eventHandlers.values())
                .reduce((total, handlers) => total + handlers.length, 0)
        };
    }

    /**
     * Validate dependencies are met
     */
    validateDependencies(requiredDependencies = []) {
        const missing = requiredDependencies.filter(dep => !this.hasDependency(dep));
        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }
    }

    /**
     * Create a timeout that's automatically cleared on destroy
     */
    setTimeout(fn, delay) {
        const timeoutId = setTimeout(fn, delay);

        // Store for cleanup
        if (!this.timeouts) {
            this.timeouts = new Set();
        }
        this.timeouts.add(timeoutId);

        // Return wrapped clearTimeout
        return () => {
            clearTimeout(timeoutId);
            if (this.timeouts) {
                this.timeouts.delete(timeoutId);
            }
        };
    }

    /**
     * Create an interval that's automatically cleared on destroy
     */
    setInterval(fn, interval) {
        const intervalId = setInterval(fn, interval);

        // Store for cleanup
        if (!this.intervals) {
            this.intervals = new Set();
        }
        this.intervals.add(intervalId);

        // Return wrapped clearInterval
        return () => {
            clearInterval(intervalId);
            if (this.intervals) {
                this.intervals.delete(intervalId);
            }
        };
    }

    /**
     * Override onDestroy to clean up timers
     */
    async onDestroy() {
        // Clear all timeouts
        if (this.timeouts) {
            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts.clear();
        }

        // Clear all intervals
        if (this.intervals) {
            this.intervals.forEach(intervalId => clearInterval(intervalId));
            this.intervals.clear();
        }
    }
}

module.exports = BaseService;