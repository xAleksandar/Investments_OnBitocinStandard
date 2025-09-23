/**
 * Main Navigation Component
 * Manages the primary navigation bar with authentication state and routing
 * Extracted from monolithic BitcoinGame class as part of Task 6.2
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class MainNavigation {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Navigation state
        this.currentPage = 'home';
        this.isAuthenticated = false;
        this.user = null;

        // Navigation items configuration
        this.navigationItems = [
            {
                id: 'navHome',
                href: '#home',
                text: 'navigation.home',
                requiresAuth: false,
                adminOnly: false
            },
            {
                id: 'navAssets',
                href: '#assets',
                text: 'navigation.assets',
                requiresAuth: false,
                adminOnly: false
            },
            {
                id: 'navPortfolio',
                href: '#portfolio',
                text: 'navigation.portfolio',
                requiresAuth: true,
                adminOnly: false
            },
            {
                id: 'navEducation',
                href: '#education',
                text: 'navigation.education',
                requiresAuth: false,
                adminOnly: false
            },
            {
                id: 'navComponents',
                href: '#components',
                text: 'navigation.components',
                requiresAuth: false,
                adminOnly: false
            },
            {
                id: 'navAdmin',
                href: '#admin',
                text: 'navigation.admin',
                requiresAuth: true,
                adminOnly: true
            }
        ];
    }

    /**
     * Initialize the main navigation component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('MainNavigation already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.authService || !this.services.router) {
                console.error('MainNavigation requires authService and router');
                return;
            }

            // Initialize navigation state
            this.updateAuthenticationState();

            // Set up event listeners
            this.setupEventListeners();

            // Set up navigation items
            this.setupNavigationItems();

            // Listen for authentication changes
            this.setupAuthListeners();

            this.isInitialized = true;
            console.log('MainNavigation initialized successfully');

        } catch (error) {
            console.error('Failed to initialize main navigation:', error);
        }
    }

    /**
     * Update authentication state from service
     */
    updateAuthenticationState() {
        this.isAuthenticated = this.services.authService?.isAuthenticated() || false;
        this.user = this.services.authService?.getCurrentUser() || null;
    }

    /**
     * Set up navigation event listeners
     */
    setupEventListeners() {
        // Login button
        const loginBtn = getElementById('navLoginBtn');
        if (loginBtn) {
            const cleanup = addEventListener(loginBtn, 'click', (e) => {
                e.preventDefault();
                this.handleLoginClick();
            });
            this.eventListeners.push(cleanup);
        }

        // Logout button
        const logoutBtn = getElementById('navLogoutBtn');
        if (logoutBtn) {
            const cleanup = addEventListener(logoutBtn, 'click', (e) => {
                e.preventDefault();
                this.handleLogoutClick();
            });
            this.eventListeners.push(cleanup);
        }

        // User info dropdown toggle
        const userInfo = getElementById('navUserInfo');
        if (userInfo) {
            const cleanup = addEventListener(userInfo, 'click', (e) => {
                e.preventDefault();
                this.toggleUserDropdown();
            });
            this.eventListeners.push(cleanup);
        }

        // Close dropdown when clicking outside
        const cleanup = addEventListener(document, 'click', (e) => {
            const userDropdown = getElementById('navUserDropdown');
            if (userDropdown && !userInfo?.contains(e.target)) {
                this.closeUserDropdown();
            }
        });
        this.eventListeners.push(cleanup);
    }

    /**
     * Set up navigation items
     */
    setupNavigationItems() {
        this.navigationItems.forEach(item => {
            const element = getElementById(item.id);
            if (element) {
                // Set up click handler
                const cleanup = addEventListener(element, 'click', (e) => {
                    e.preventDefault();
                    this.handleNavigationClick(item);
                });
                this.eventListeners.push(cleanup);

                // Update visibility based on auth state
                this.updateNavigationItemVisibility(item, element);
            }
        });
    }

    /**
     * Set up authentication change listeners
     */
    setupAuthListeners() {
        // Listen for auth state changes
        if (this.services.authService.onAuthChange) {
            this.services.authService.onAuthChange((isAuthenticated, user) => {
                this.handleAuthStateChange(isAuthenticated, user);
            });
        }

        // Listen for route changes to update active nav item
        if (this.services.router.onRouteChange) {
            this.services.router.onRouteChange((route) => {
                this.updateActiveNavigationItem(route);
            });
        }
    }

    /**
     * Handle navigation item click
     * @param {Object} item - Navigation item configuration
     */
    handleNavigationClick(item) {
        // Check authentication requirements
        if (item.requiresAuth && !this.isAuthenticated) {
            this.services.notificationService?.showError('Please login to access this page');
            this.showLoginForm();
            return;
        }

        // Check admin requirements
        if (item.adminOnly && !this.services.authService?.isCurrentUserAdmin()) {
            if (this.isAuthenticated) {
                this.services.notificationService?.showError('Admin access required');
                this.services.router?.navigate('#home');
            } else {
                this.services.notificationService?.showError('Please login to access admin panel');
                this.showLoginForm();
            }
            return;
        }

        // Navigate to the page
        this.services.router?.navigate(item.href);
        this.currentPage = item.href.replace('#', '');

        // Update active state
        this.updateActiveNavigationItem(item.href);
    }

    /**
     * Handle login button click
     */
    handleLoginClick() {
        this.showLoginForm();
    }

    /**
     * Handle logout button click
     */
    async handleLogoutClick() {
        try {
            await this.services.authService?.logout();
            this.services.notificationService?.showSuccess('Logged out successfully');
            this.services.router?.navigate('#home');
        } catch (error) {
            console.error('Logout error:', error);
            this.services.notificationService?.showError('Failed to logout');
        }
    }

    /**
     * Show login form
     */
    showLoginForm() {
        // Hide all pages
        this.hideAllPages();

        // Show login form
        const loginForm = getElementById('loginForm');
        if (loginForm) {
            showElement(loginForm);
        }

        this.currentPage = 'login';
    }

    /**
     * Hide all pages
     */
    hideAllPages() {
        const pageIds = ['homePage', 'assetsPage', 'mainApp', 'adminPage', 'educationPage', 'componentsPage'];
        pageIds.forEach(pageId => {
            const element = getElementById(pageId);
            if (element) {
                hideElement(element);
            }
        });
    }

    /**
     * Handle authentication state change
     * @param {boolean} isAuthenticated - Authentication status
     * @param {Object} user - User object
     */
    handleAuthStateChange(isAuthenticated, user) {
        this.isAuthenticated = isAuthenticated;
        this.user = user;

        // Update navigation UI
        this.updateNavigationForAuthState();

        // Update navigation item visibility
        this.updateAllNavigationItems();
    }

    /**
     * Update navigation UI for current authentication state
     */
    updateNavigationForAuthState() {
        const loginBtn = getElementById('navLoginBtn');
        const userInfo = getElementById('navUserInfo');
        const username = getElementById('navUsername');

        if (this.isAuthenticated && this.user) {
            // Show user info, hide login button
            if (loginBtn) hideElement(loginBtn);
            if (userInfo) showElement(userInfo);

            // Update username display
            if (username) {
                username.textContent = this.user.username || this.user.email;
            }

            // Show/hide admin link
            this.updateAdminLinkVisibility();

        } else {
            // Show login button, hide user info
            if (loginBtn) showElement(loginBtn);
            if (userInfo) hideElement(userInfo);
        }
    }

    /**
     * Update admin link visibility
     */
    updateAdminLinkVisibility() {
        const adminLink = getElementById('navAdminLink');
        if (adminLink) {
            if (this.services.authService?.isCurrentUserAdmin()) {
                showElement(adminLink);
            } else {
                hideElement(adminLink);
            }
        }
    }

    /**
     * Update navigation item visibility based on auth state
     * @param {Object} item - Navigation item
     * @param {HTMLElement} element - Navigation element
     */
    updateNavigationItemVisibility(item, element) {
        if (item.requiresAuth && !this.isAuthenticated) {
            // Hide auth-required items for non-authenticated users
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
        } else if (item.adminOnly && !this.services.authService?.isCurrentUserAdmin()) {
            // Hide admin items for non-admin users
            hideElement(element);
        } else {
            // Show available items
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            showElement(element);
        }
    }

    /**
     * Update all navigation items
     */
    updateAllNavigationItems() {
        this.navigationItems.forEach(item => {
            const element = getElementById(item.id);
            if (element) {
                this.updateNavigationItemVisibility(item, element);
            }
        });
    }

    /**
     * Update active navigation item
     * @param {string} route - Current route
     */
    updateActiveNavigationItem(route) {
        // Remove active class from all nav items
        this.navigationItems.forEach(item => {
            const element = getElementById(item.id);
            if (element) {
                element.classList.remove('active', 'nav-active');
            }
        });

        // Add active class to current item
        const currentItem = this.navigationItems.find(item => item.href === route);
        if (currentItem) {
            const element = getElementById(currentItem.id);
            if (element) {
                element.classList.add('active', 'nav-active');
            }
        }
    }

    /**
     * Toggle user dropdown menu
     */
    toggleUserDropdown() {
        const dropdown = getElementById('navUserDropdown');
        if (dropdown) {
            const isOpen = dropdown.classList.contains('open');
            if (isOpen) {
                this.closeUserDropdown();
            } else {
                this.openUserDropdown();
            }
        }
    }

    /**
     * Open user dropdown menu
     */
    openUserDropdown() {
        const dropdown = getElementById('navUserDropdown');
        if (dropdown) {
            dropdown.classList.add('open');
        }
    }

    /**
     * Close user dropdown menu
     */
    closeUserDropdown() {
        const dropdown = getElementById('navUserDropdown');
        if (dropdown) {
            dropdown.classList.remove('open');
        }
    }

    /**
     * Get current page
     * @returns {string} Current page name
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Set current page
     * @param {string} page - Page name
     */
    setCurrentPage(page) {
        this.currentPage = page;
        this.updateActiveNavigationItem(`#${page}`);
    }

    /**
     * Add navigation item
     * @param {Object} item - Navigation item configuration
     */
    addNavigationItem(item) {
        this.navigationItems.push(item);

        // Set up the new item if DOM element exists
        const element = getElementById(item.id);
        if (element) {
            const cleanup = addEventListener(element, 'click', (e) => {
                e.preventDefault();
                this.handleNavigationClick(item);
            });
            this.eventListeners.push(cleanup);

            this.updateNavigationItemVisibility(item, element);
        }
    }

    /**
     * Remove navigation item
     * @param {string} itemId - Navigation item ID
     */
    removeNavigationItem(itemId) {
        this.navigationItems = this.navigationItems.filter(item => item.id !== itemId);
    }

    /**
     * Force navigation state update
     */
    refresh() {
        this.updateAuthenticationState();
        this.updateNavigationForAuthState();
        this.updateAllNavigationItems();
    }

    /**
     * Destroy the main navigation component
     */
    destroy() {
        console.log('Destroying main navigation');

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up navigation event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.currentPage = 'home';
        this.isAuthenticated = false;
        this.user = null;
        this.isInitialized = false;

        console.log('Main navigation destroyed');
    }
}

// Export singleton instance factory
export function createMainNavigation(services) {
    return new MainNavigation(services);
}

export default MainNavigation;
