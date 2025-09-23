// Main Application Orchestrator - Streamlined BitcoinApp Class
// Replaces the monolithic 5,583-line BitcoinGame class
// Focuses only on coordination, initialization, and service management

class BitcoinApp {
    constructor() {
        // Core services - will be initialized in init()
        this.router = null;
        this.apiClient = null;
        this.authService = null;
        this.portfolioService = null;
        this.priceService = null;
        this.notificationService = null;

        // Application state
        this.currentPage = null;
        this.user = null;
        this.isInitialized = false;

        // Bind methods for event handlers
        this.handleRouteChange = this.handleRouteChange.bind(this);
        this.handlePriceUpdate = this.handlePriceUpdate.bind(this);
        this.handleAuthChange = this.handleAuthChange.bind(this);
    }

    /**
     * Initialize the application
     * Sets up all services and starts the application
     */
    async init() {
        try {
            console.log('Initializing Bitcoin Education App...');

            // Initialize services in dependency order
            await this.initServices();
            await this.initAuthentication();
            await this.initRouter();
            await this.initGlobalComponents();
            await this.startBackgroundServices();

            this.isInitialized = true;
            console.log('Application initialized successfully');

            // Navigate to initial route
            this.router.navigate(window.location.hash || '#home');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize all core services
     */
    async initServices() {
        // Initialize services that will be injected from external modules
        // These will be loaded dynamically as the modules are created
        console.log('Services initialization placeholder - will connect to modular services');
    }

    /**
     * Initialize authentication and user state
     */
    async initAuthentication() {
        console.log('Authentication initialization placeholder');
        // Will connect to AuthService once created
    }

    /**
     * Initialize routing system
     */
    async initRouter() {
        console.log('Router initialization placeholder');
        // Will connect to Router service once created
    }

    /**
     * Initialize global UI components
     */
    async initGlobalComponents() {
        console.log('Global components initialization placeholder');
        // Will initialize navigation, notifications, etc.
    }

    /**
     * Start background services like price updates
     */
    async startBackgroundServices() {
        console.log('Background services initialization placeholder');
        // Will start price monitoring, etc.
    }

    /**
     * Handle route changes and page navigation
     */
    async handleRouteChange(route, params = {}) {
        if (!this.isInitialized) {
            console.warn('Application not yet initialized, queueing route change');
            return;
        }

        try {
            // Clean up current page
            if (this.currentPage && typeof this.currentPage.destroy === 'function') {
                this.currentPage.destroy();
            }

            // Navigate to new page
            await this.showPage(route, params);

        } catch (error) {
            console.error('Error handling route change:', error);
            this.handleNavigationError(error, route);
        }
    }

    /**
     * Show a specific page
     */
    async showPage(pageName, params = {}) {
        console.log(`Navigating to page: ${pageName}`);

        // This will be implemented to load and show page components
        // For now, delegate to legacy BitcoinGame if it exists
        if (window.game && typeof window.game.showPage === 'function') {
            return window.game.showPage(pageName);
        }

        console.log(`Page ${pageName} will be handled by new page components`);
    }

    /**
     * Handle price updates from price service
     */
    handlePriceUpdate(prices) {
        if (this.currentPage && typeof this.currentPage.updatePrices === 'function') {
            this.currentPage.updatePrices(prices);
        }

        // Broadcast to global components that might need price updates
        this.broadcastGlobalUpdate('prices', prices);
    }

    /**
     * Handle authentication state changes
     */
    handleAuthChange(user) {
        this.user = user;

        // Update global UI state
        this.updateAuthenticationUI(user);

        // Notify current page of auth change
        if (this.currentPage && typeof this.currentPage.updateAuth === 'function') {
            this.currentPage.updateAuth(user);
        }

        this.broadcastGlobalUpdate('auth', user);
    }

    /**
     * Update global UI elements for authentication
     */
    updateAuthenticationUI(user) {
        // Will update navigation, user menu, etc.
        console.log('Updating authentication UI for user:', user?.email || 'anonymous');
    }

    /**
     * Broadcast updates to global components
     */
    broadcastGlobalUpdate(type, data) {
        const event = new CustomEvent(`app:${type}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('Application initialization failed:', error);

        // Show user-friendly error message
        const errorHtml = `
            <div class="error-container">
                <h2>Application Error</h2>
                <p>Failed to initialize the application. Please refresh the page.</p>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    Refresh Page
                </button>
            </div>
        `;

        document.body.innerHTML = errorHtml;
    }

    /**
     * Handle navigation errors
     */
    handleNavigationError(error, route) {
        console.error(`Navigation error for route ${route}:`, error);

        // Try to navigate to home page as fallback
        if (route !== 'home') {
            this.handleRouteChange('home');
        }
    }

    /**
     * Cleanup method for application shutdown
     */
    destroy() {
        if (this.currentPage && typeof this.currentPage.destroy === 'function') {
            this.currentPage.destroy();
        }

        // Stop background services
        if (this.priceService && typeof this.priceService.stop === 'function') {
            this.priceService.stop();
        }

        this.isInitialized = false;
        console.log('Application destroyed');
    }

    /**
     * Get current application state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentPage: this.currentPage?.constructor?.name || null,
            user: this.user,
            route: window.location.hash
        };
    }
}

// Initialize and expose the application globally
let app = null;

function initBitcoinApp() {
    if (app) {
        console.warn('Application already initialized');
        return app;
    }

    app = new BitcoinApp();

    // Expose globally for debugging and compatibility
    window.bitcoinApp = app;

    return app;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBitcoinApp);
} else {
    initBitcoinApp();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BitcoinApp, initBitcoinApp };
}