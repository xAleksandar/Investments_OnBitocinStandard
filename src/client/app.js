import { ApiClient } from './services/api-client.js';
import { AuthService } from './services/auth-service.js';
import { PortfolioService } from './services/portfolio-service.js';
import { PriceService } from './services/price-service.js';
import { NotificationService } from './services/notification-service.js';

import { Router } from './routing/router.js';

import { HomePage } from './pages/home-page.js';
import { AssetsPage } from './pages/assets-page.js';
import { PortfolioPage } from './pages/portfolio-page.js';
import { EducationPage } from './pages/education-page.js';
import { AdminPage } from './pages/admin-page.js';
import { AssetDetailPage } from './pages/asset-detail-page.js';
import { ComponentsShowcasePage } from './pages/components-showcase-page.js';

import { Button } from './components/ui/button.js';
import { Modal } from './components/ui/modal.js';
import { Notification } from './components/ui/notification.js';
import { LoadingSpinner } from './components/ui/loading-spinner.js';
import { Tooltip } from './components/ui/tooltip.js';

import { MainNavigation } from './components/navigation/main-nav.js';
import { MobileMenu } from './components/navigation/mobile-menu.js';
import { UserMenu } from './components/navigation/user-menu.js';
import { LanguageSwitcher } from './components/navigation/language-switcher.js';

class BitcoinApp {
    constructor() {
        this.isInitialized = false;
        this.services = {};
        this.pages = {};
        this.components = {};
        this.router = null;

        this.priceUpdateInterval = null;
        this.backgroundServices = new Set();
        this.eventListeners = new Map();

        this.appConfig = {
            priceUpdateInterval: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            enableServiceWorker: true,
            enableOfflineMode: false
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.showLoadingState();

            await this.initializeServices();
            await this.initializeComponents();
            await this.initializePages();
            await this.initializeRouter();
            await this.initializeGlobalFeatures();

            await this.startApplication();

            this.setupGlobalErrorHandling();
            this.setupEventCoordination();

            this.hideLoadingState();
            this.isInitialized = true;

            console.log('✅ Bitcoin App initialized successfully');
            this.services.notificationService?.show('Application loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Failed to initialize Bitcoin App:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeServices() {
        console.log('🔧 Initializing services...');

        const apiClient = new ApiClient();
        const notificationService = new NotificationService();
        const authService = new AuthService(apiClient, notificationService);
        const portfolioService = new PortfolioService(apiClient, notificationService);
        const priceService = new PriceService(apiClient, notificationService);

        this.services = {
            apiClient,
            authService,
            portfolioService,
            priceService,
            notificationService
        };

        console.log('✅ Services initialized');
    }


    async initializeComponents() {
        console.log('🧩 Initializing UI components...');

        const components = [
            ['modal', Modal],
            ['tooltip', Tooltip],
            ['button', Button],
            ['loading', LoadingSpinner]
        ];

        this.components = { notification: this.services.notificationService };

        for (const [name, Component] of components) {
            const instance = new Component();
            await instance.init();
            this.components[name] = instance;
            if (name === 'modal' || name === 'tooltip') {
                this.services[`${name}Service`] = instance;
            }
        }

        console.log('✅ UI components initialized');
    }

    async initializePages() {
        console.log('📄 Initializing pages...');

        const pageClasses = [
            ['home', HomePage],
            ['assets', AssetsPage],
            ['portfolio', PortfolioPage],
            ['education', EducationPage],
            ['admin', AdminPage],
            ['assetDetail', AssetDetailPage],
            ['components', ComponentsShowcasePage]
        ];

        this.pages = {};
        const currentUser = await this.services.authService.getCurrentUser();

        for (const [name, PageClass] of pageClasses) {
            if (name === 'admin' && (!currentUser || !this.isAdminUser(currentUser))) continue;
            const page = new PageClass(this.services);
            await page.init();
            this.pages[name] = page;
        }

        console.log('✅ Pages initialized');
    }

    async initializeRouter() {
        console.log('🗺️ Initializing router...');

        this.router = new Router(this.services.authService, this.services.notificationService);

        // Store page references for router handlers
        this.router.pages = this.pages;

        // Start router now that pages are assigned
        this.router.start();

        console.log('✅ Router initialized and started');
    }

    async initializeGlobalFeatures() {
        console.log('🌐 Initializing global features...');

        const features = [
            ['mainNav', MainNavigation],
            ['mobileMenu', MobileMenu],
            ['userMenu', UserMenu],
            ['languageSwitcher', LanguageSwitcher]
        ];

        for (const [name, FeatureClass] of features) {
            const feature = new FeatureClass(this.services);
            await feature.init();
            this.components[name] = feature;
        }

        console.log('✅ Global features initialized');
    }

    async startApplication() {
        console.log('🚀 Starting application...');

        await this.checkAuthenticationStatus();
        await this.startBackgroundServices();
        await this.loadInitialData();

        this.setupPeriodicTasks();

        console.log('✅ Application started');
    }

    async checkAuthenticationStatus() {
        try {
            const isAuthenticated = await this.services.authService.isAuthenticated();
            const currentUser = await this.services.authService.getCurrentUser();

            if (isAuthenticated && currentUser) {
                console.log(`👤 User authenticated: ${currentUser.email}`);
                this.components.userMenu?.updateUserInfo(currentUser);
                // TODO: Fix method name - should be updateAuthenticationState
                // this.components.mainNav?.updateAuthState(true);
            } else {
                console.log('👤 User not authenticated');
                // TODO: Fix method name - should be updateAuthenticationState
                // this.components.mainNav?.updateAuthState(false);
            }
        } catch (error) {
            console.error('Failed to check authentication status:', error);
        }
    }

    async startBackgroundServices() {
        console.log('⚡ Starting background services...');

        // Start price updates
        this.backgroundServices.add('priceService');
        await this.services.priceService.startPriceUpdates();

        if (await this.services.authService.isAuthenticated()) {
            this.backgroundServices.add('portfolioService');
            this.services.portfolioService.startPeriodicUpdates();
        }

        console.log('✅ Background services started');
    }

    async loadInitialData() {
        try {
            // Load initial prices
            await this.services.priceService.loadInitialPrices();

            if (await this.services.authService.isAuthenticated()) {
                await this.services.portfolioService.loadUserPortfolio();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.services.notificationService?.show('Failed to load some data. Please refresh the page.', 'warning');
        }
    }

    setupPeriodicTasks() {
        // Set up price updates
        this.priceUpdateInterval = setInterval(async () => {
            try {
                await this.services.priceService.updatePrices();
            } catch (error) {
                console.error('Price update failed:', error);
            }
        }, this.appConfig.priceUpdateInterval);
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });

        document.addEventListener('serviceError', (event) => {
            console.error('Service error:', event.detail);
            this.handleServiceError(event.detail);
        });
    }

    setupEventCoordination() {
        const events = [
            ['authStateChanged', this.handleAuthStateChange],
            ['portfolioUpdated', this.handlePortfolioUpdate],
            ['pricesUpdated', this.handlePricesUpdate],
            ['routeChanged', this.handleRouteChange],
            ['userAction', this.handleUserAction]
        ];

        events.forEach(([event, handler]) => {
            document.addEventListener(event, handler.bind(this));
        });
    }

    handleAuthStateChange(event) {
        const { isAuthenticated, user } = event.detail;
        this.components.userMenu?.updateUserInfo(isAuthenticated ? user : null);
        // TODO: Fix method name - should be updateAuthenticationState
        // this.components.mainNav?.updateAuthState(isAuthenticated);

        if (isAuthenticated) {
            this.services.portfolioService.loadUserPortfolio();
            this.services.portfolioService.startPeriodicUpdates();
        } else {
            this.services.portfolioService.clearPortfolio();
            this.services.portfolioService.stopPeriodicUpdates();
        }
    }

    handlePortfolioUpdate(event) {
        const { portfolio } = event.detail;
        this.pages.portfolio?.updatePortfolioDisplay(portfolio);
        this.pages.home?.updatePortfolioSummary(portfolio);
    }

    handlePricesUpdate(event) {
        const { prices } = event.detail;
        Object.values(this.pages).forEach(page => page.updatePrices?.(prices));
    }

    handleRouteChange(event) {
        const { route } = event.detail;
        this.components.mainNav?.updateActiveRoute(route);
    }

    async handleUserAction(event) {
        const { action, data } = event.detail;
        const actions = {
            trade: () => this.services.portfolioService.executeTrade(data),
            convert: () => this.services.portfolioService.convertAsset(data),
            export: () => this.services.portfolioService.exportPortfolio(data)
        };

        if (actions[action]) {
            try {
                await actions[action]();
                this.services.notificationService?.show(`${action} completed successfully`, 'success');
            } catch (error) {
                console.error(`${action} failed:`, error);
                this.services.notificationService?.show(`${action} failed. Please try again.`, 'error');
            }
        }
    }

    handleGlobalError(error) {
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            this.services.notificationService?.show('Network error. Please check your connection.', 'error');
        } else if (error.name === 'AuthenticationError') {
            this.services.authService?.logout();
            this.services.notificationService?.show('Session expired. Please log in again.', 'warning');
        } else {
            this.services.notificationService?.show('An unexpected error occurred.', 'error');
        }
    }

    handleServiceError(errorDetail) {
        const { service, error, action } = errorDetail;

        console.error(`Service ${service} error during ${action}:`, error);

        if (this.backgroundServices.has(service)) {
            this.services.notificationService?.show(
                `Background service issue detected. Some features may be limited.`,
                'warning'
            );
        }
    }

    handleInitializationError(error) {
        document.body.innerHTML = `
            <div class="initialization-error">
                <div class="error-container">
                    <h1>⚠️ Application Error</h1>
                    <p>Failed to initialize the application. Please refresh the page to try again.</p>
                    <button onclick="window.location.reload()" class="retry-btn">
                        Refresh Page
                    </button>
                    <details>
                        <summary>Error Details</summary>
                        <pre>${error.message}\n${error.stack}</pre>
                    </details>
                </div>
            </div>
        `;
    }

    isAdminUser(user) {
        return user && (user.role === 'admin' || user.isAdmin);
    }

    showLoadingState() {
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideLoadingState() {
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.display = 'block';
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up application...');

        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }

        if (this.services.priceService) {
            this.services.priceService.stopPriceUpdates();
        }

        if (this.services.portfolioService) {
            this.services.portfolioService.stopPeriodicUpdates();
        }

        Object.values(this.pages).forEach(page => {
            if (page.destroy) {
                page.destroy();
            }
        });

        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });

        this.eventListeners.clear();
        this.backgroundServices.clear();

        console.log('✅ Application cleanup completed');
    }

    destroy() {
        this.cleanup();
        this.isInitialized = false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    window.bitcoinApp = new BitcoinApp();
    await window.bitcoinApp.init();
});

window.addEventListener('beforeunload', () => {
    if (window.bitcoinApp) {
        window.bitcoinApp.cleanup();
    }
});

export { BitcoinApp };