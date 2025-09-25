/**
 * Hash-based router for single-page application
 * Manages navigation between different pages and handles route parameters
 */

import { hideElement, showElement, getElementById } from '../utils/dom-helpers.js';
import { ELEMENT_IDS } from '../utils/constants.js';

export class Router {
    constructor(authService, notificationService) {
        this.authService = authService;
        this.notificationService = notificationService;

        // Current route state
        this.currentRoute = null;
        this.currentPage = 'home';
        this.routes = new Map();
        this.middlewares = [];

        // Route parameters and query string
        this.routeParams = {};
        this.queryParams = {};

        // Navigation history
        this.history = [];

        // Set up routes immediately (but don't start navigation yet)
        this.setupDefaultRoutes();
    }

    /**
     * Start router with event listeners and initial navigation
     * Call this after pages are assigned
     */
    start() {
        console.log('🚀 Starting router with pages assigned');
        console.log('🚀 Pages available:', this.pages);
        this.setupEventListeners();

        // Handle initial navigation
        const initialHash = window.location.hash || '#home';
        console.log('🚀 Initial navigation to:', initialHash);
        this.navigate(initialHash);
    }

    /**
     * Set up default application routes
     */
    setupDefaultRoutes() {
        // Home page
        this.addRoute('home', {
            path: '#home',
            pageId: 'homePage',
            requiresAuth: false,
            handler: () => this.handleHomePage()
        });

        // Assets page
        this.addRoute('assets', {
            path: '#assets',
            pageId: 'assetsPage',
            requiresAuth: false,
            handler: (params) => this.handleAssetsPage(params),
            paramPattern: /^#assets(\?asset=(.+))?/
        });

        // Portfolio page
        this.addRoute('portfolio', {
            path: '#portfolio',
            pageId: 'mainApp',
            requiresAuth: true,
            handler: () => this.handlePortfolioPage()
        });

        // Admin page
        this.addRoute('admin', {
            path: '#admin',
            pageId: 'adminPage',
            requiresAuth: true,
            requiresAdmin: true,
            handler: () => this.handleAdminPage()
        });

        // Components showcase page
        this.addRoute('components', {
            path: '#components',
            pageId: 'componentsPage',
            requiresAuth: false,
            handler: () => this.handleComponentsPage()
        });

        // Education pages
        this.addRoute('education', {
            path: '#education',
            pageId: 'educationPage',
            requiresAuth: false,
            handler: (params) => this.handleEducationPage(params)
        });

        this.addRoute('education-content', {
            path: '#education/:content',
            pageId: 'educationPage',
            requiresAuth: false,
            handler: (params) => this.handleEducationContent(params),
            paramPattern: /^#education\/(.+)/
        });
    }

    /**
     * Set up event listeners for navigation
     */
    setupEventListeners() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.navigate(window.location.hash);
        });

        // Handle back/forward navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.navigate(event.state.route, false); // Don't push to history
            }
        });
    }

    /**
     * Add a route to the router
     * @param {string} name - Route name
     * @param {Object} config - Route configuration
     */
    addRoute(name, config) {
        this.routes.set(name, {
            name,
            path: config.path,
            pageId: config.pageId,
            handler: config.handler,
            requiresAuth: config.requiresAuth || false,
            requiresAdmin: config.requiresAdmin || false,
            paramPattern: config.paramPattern || null,
            beforeEnter: config.beforeEnter || null,
            afterEnter: config.afterEnter || null
        });
    }

    /**
     * Add middleware function
     * @param {Function} middleware - Middleware function
     */
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }

    /**
     * Navigate to a route
     * @param {string} hash - Hash to navigate to
     * @param {boolean} pushHistory - Whether to push to browser history
     */
    navigate(hash, pushHistory = true) {
        console.log('Navigating to:', hash);

        // Clean up current page
        this.cleanup();

        // Parse route
        const routeInfo = this.parseRoute(hash);

        // Run middlewares
        if (!this.runMiddlewares(routeInfo)) {
            return; // Middleware blocked navigation
        }

        // Find matching route
        const route = this.findMatchingRoute(routeInfo);

        if (!route) {
            console.warn('No route found for:', hash);
            this.navigate('#home');
            return;
        }

        // Check authentication requirements
        if (!this.checkRouteAccess(route)) {
            return; // Access denied, already handled
        }

        // Hide all pages
        this.hideAllPages();

        // Execute route handler
        this.executeRoute(route, routeInfo);

        // Update current route state
        this.currentRoute = route;
        this.currentPage = route.name;
        this.routeParams = routeInfo.params;
        this.queryParams = routeInfo.query;

        // Update browser history
        if (pushHistory) {
            this.updateHistory(hash);
        }

        console.log('Route navigation completed:', {
            route: route.name,
            params: this.routeParams,
            query: this.queryParams
        });
    }

    /**
     * Parse route hash into components
     * @param {string} hash - Route hash
     * @returns {Object} Parsed route information
     */
    parseRoute(hash) {
        const baseHash = hash.split('?')[0];
        const queryString = hash.includes('?') ? hash.split('?')[1] : '';

        const query = {};
        if (queryString) {
            const urlParams = new URLSearchParams(queryString);
            for (const [key, value] of urlParams) {
                query[key] = value;
            }
        }

        return {
            hash,
            baseHash,
            query,
            params: {}
        };
    }

    /**
     * Find matching route for parsed route info
     * @param {Object} routeInfo - Parsed route information
     * @returns {Object|null} Matching route or null
     */
    findMatchingRoute(routeInfo) {
        for (const [name, route] of this.routes) {
            // Exact match
            if (route.path === routeInfo.baseHash) {
                return route;
            }

            // Pattern match for parameterized routes
            if (route.paramPattern) {
                const match = routeInfo.hash.match(route.paramPattern);
                if (match) {
                    // Extract parameters from match
                    const params = {};
                    if (route.path.includes(':content') && match[1]) {
                        params.content = match[1];
                    }
                    if (routeInfo.query.asset) {
                        params.asset = routeInfo.query.asset;
                    }

                    routeInfo.params = params;
                    return route;
                }
            }
        }

        return null;
    }

    /**
     * Check if user has access to route
     * @param {Object} route - Route configuration
     * @returns {boolean} True if access is allowed
     */
    checkRouteAccess(route) {
        // Check authentication requirement
        if (route.requiresAuth && !this.authService.isAuthenticated()) {
            this.notificationService.showError('Please login to access this page');
            this.showLoginForm();
            return false;
        }

        // Check admin requirement
        if (route.requiresAdmin && !this.authService.isCurrentUserAdmin()) {
            if (this.authService.isAuthenticated()) {
                this.notificationService.showError('Admin access required');
                this.navigate('#home');
            } else {
                this.notificationService.showError('Please login to access admin panel');
                this.showLoginForm();
            }
            return false;
        }

        return true;
    }

    /**
     * Run middleware functions
     * @param {Object} routeInfo - Route information
     * @returns {boolean} True if navigation should continue
     */
    runMiddlewares(routeInfo) {
        for (const middleware of this.middlewares) {
            if (!middleware(routeInfo, this)) {
                return false; // Middleware blocked navigation
            }
        }
        return true;
    }

    /**
     * Execute route handler
     * @param {Object} route - Route configuration
     * @param {Object} routeInfo - Route information
     */
    executeRoute(route, routeInfo) {
        // Show the page
        const pageElement = getElementById(route.pageId);

        if (pageElement) {
            showElement(pageElement);

            // Fallback to inline style if needed
            const computedStyle = window.getComputedStyle(pageElement);
            if (computedStyle.display === 'none') {
                pageElement.style.display = 'block';
            }
        } else {
            console.error('Page element not found:', route.pageId);
        }

        // Run beforeEnter hook
        if (route.beforeEnter) {
            route.beforeEnter(routeInfo, this);
        }

        // Execute route handler
        if (route.handler) {
            console.log('🚀 Executing route handler for:', route.name);
            route.handler(routeInfo.params, routeInfo.query, routeInfo);
        } else {
            console.warn('⚠️ No handler for route:', route.name);
        }

        // Run afterEnter hook
        if (route.afterEnter) {
            route.afterEnter(routeInfo, this);
        }

        console.log('✅ Route execution completed for:', route.name);
    }

    /**
     * Hide all page elements
     */
    hideAllPages() {
        const pageIds = [
            'homePage',
            'assetsPage',
            'mainApp',
            'loginForm',
            'adminPage',
            'educationPage',
            'componentsPage'
        ];

        pageIds.forEach(pageId => {
            const element = getElementById(pageId);
            if (element) {
                hideElement(element);

                // Fallback to inline style if needed
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.display !== 'none') {
                    element.style.display = 'none';
                }
            }
        });
    }

    /**
     * Show login form
     */
    showLoginForm() {
        this.hideAllPages();
        const loginForm = getElementById('loginForm');
        if (loginForm) {
            showElement(loginForm);
        }
        this.currentPage = 'login';
    }

    /**
     * Update browser history
     * @param {string} hash - Route hash
     */
    updateHistory(hash) {
        const state = { route: hash, timestamp: Date.now() };

        // Add to internal history
        this.history.push({
            route: hash,
            timestamp: Date.now(),
            page: this.currentPage
        });

        // Update browser history
        if (window.location.hash !== hash) {
            window.history.pushState(state, '', hash);
        }
    }

    /**
     * Get current route information
     * @returns {Object} Current route state
     */
    getCurrentRoute() {
        return {
            name: this.currentPage,
            route: this.currentRoute,
            params: this.routeParams,
            query: this.queryParams,
            hash: window.location.hash
        };
    }

    /**
     * Go back in navigation history
     */
    goBack() {
        if (this.history.length > 1) {
            // Remove current route
            this.history.pop();

            // Get previous route
            const previousRoute = this.history[this.history.length - 1];
            this.navigate(previousRoute.route, false);
        } else {
            // Default fallback
            this.navigate('#home');
        }
    }

    /**
     * Cleanup current page resources
     */
    cleanup() {
        // Override in subclasses or add cleanup hooks
        if (this.currentRoute && this.currentRoute.cleanup) {
            this.currentRoute.cleanup();
        }
    }

    // ===== ROUTE HANDLERS =====

    /**
     * Handle home page navigation
     */
    handleHomePage() {
        console.log('Loading home page');
        if (this.pages && this.pages.home && this.pages.home.show) {
            this.pages.home.show();
        }
    }

    /**
     * Handle assets page navigation
     * @param {Object} params - Route parameters
     */
    handleAssetsPage(params) {
        console.log('Loading assets page with params:', params);
        if (this.pages && this.pages.assets && this.pages.assets.show) {
            this.pages.assets.show(params);
        }
    }

    /**
     * Handle portfolio page navigation
     */
    handlePortfolioPage() {
        console.log('Loading portfolio page');
        if (this.pages && this.pages.portfolio && this.pages.portfolio.show) {
            this.pages.portfolio.show();
        }
    }

    /**
     * Handle admin page navigation
     */
    handleAdminPage() {
        console.log('Loading admin page');
        if (this.pages && this.pages.admin && this.pages.admin.show) {
            this.pages.admin.show();
        }
    }

    /**
     * Handle components showcase page navigation
     */
    handleComponentsPage() {
        console.log('Loading components showcase page');
        if (this.pages && this.pages.components && this.pages.components.show) {
            this.pages.components.show();
        }
    }

    /**
     * Handle education page navigation
     * @param {Object} params - Route parameters
     */
    handleEducationPage(params) {
        console.log('Loading education page with params:', params);
        if (this.pages && this.pages.education && this.pages.education.show) {
            this.pages.education.show(params);
        }
    }

    /**
     * Handle specific education content
     * @param {Object} params - Route parameters containing content type
     */
    handleEducationContent(params) {
        console.log('Loading education content:', params.content);
        if (params.content && this.pages && this.pages.education) {
            if (this.pages.education.show) {
                this.pages.education.show({ content: params.content });
            } else if (this.pages.education.loadEducationalContent) {
                this.pages.education.loadEducationalContent(params.content);
            }
        }
    }

    /**
     * Generate URL for route
     * @param {string} routeName - Route name
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {string} Generated URL hash
     */
    generateUrl(routeName, params = {}, query = {}) {
        const route = this.routes.get(routeName);
        if (!route) {
            console.warn('Route not found:', routeName);
            return '#home';
        }

        let url = route.path;

        // Replace path parameters
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, value);
        });

        // Add query parameters
        const queryString = new URLSearchParams(query).toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        return url;
    }

    /**
     * Navigate to route by name
     * @param {string} routeName - Route name
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    navigateToRoute(routeName, params = {}, query = {}) {
        const url = this.generateUrl(routeName, params, query);
        this.navigate(url);
    }
}

export default Router;
