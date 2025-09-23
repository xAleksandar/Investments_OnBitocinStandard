/**
 * Mobile Menu Component
 * Manages mobile navigation menu with slide-out functionality
 * Extracted from monolithic BitcoinGame class as part of Task 6.2
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class MobileMenu {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Mobile menu state
        this.isOpen = false;
        this.isAuthenticated = false;
        this.user = null;

        // Animation settings
        this.animationDuration = 300; // ms
    }

    /**
     * Initialize the mobile menu component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('MobileMenu already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.authService) {
                console.error('MobileMenu requires authService');
                return;
            }

            // Initialize authentication state
            this.updateAuthenticationState();

            // Set up event listeners
            this.setupEventListeners();

            // Set up authentication state listeners
            this.setupAuthListeners();

            // Update initial UI state
            this.updateMobileAuthState();

            this.isInitialized = true;
            console.log('MobileMenu initialized successfully');

        } catch (error) {
            console.error('Failed to initialize mobile menu:', error);
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
     * Set up mobile menu event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle button
        const menuBtn = getElementById('mobileMenuBtn');
        if (menuBtn) {
            const cleanup = addEventListener(menuBtn, 'click', (e) => {
                e.preventDefault();
                this.toggleMenu();
            });
            this.eventListeners.push(cleanup);
        }

        // Close menu button
        const closeBtn = getElementById('closeMobileMenu');
        if (closeBtn) {
            const cleanup = addEventListener(closeBtn, 'click', (e) => {
                e.preventDefault();
                this.closeMenu();
            });
            this.eventListeners.push(cleanup);
        }

        // Mobile navigation links
        const navLinks = document.querySelectorAll('.mobile-nav-link');
        navLinks.forEach(link => {
            const cleanup = addEventListener(link, 'click', (e) => {
                e.preventDefault();
                this.handleNavLinkClick(link);
            });
            this.eventListeners.push(cleanup);
        });

        // Mobile auth buttons
        const loginBtn = getElementById('mobileNavLoginBtn');
        const logoutBtn = getElementById('mobileNavLogoutBtn');

        if (loginBtn) {
            const cleanup = addEventListener(loginBtn, 'click', (e) => {
                e.preventDefault();
                this.handleMobileLogin();
            });
            this.eventListeners.push(cleanup);
        }

        if (logoutBtn) {
            const cleanup = addEventListener(logoutBtn, 'click', (e) => {
                e.preventDefault();
                this.handleMobileLogout();
            });
            this.eventListeners.push(cleanup);
        }

        // Close menu on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        };

        const cleanup = addEventListener(document, 'keydown', escapeHandler);
        this.eventListeners.push(cleanup);

        // Close menu on backdrop click
        const menu = getElementById('mobileMenu');
        if (menu) {
            const backdropHandler = (e) => {
                // Only close if clicking on the backdrop, not the menu content
                if (e.target === menu && this.isOpen) {
                    this.closeMenu();
                }
            };

            const cleanup = addEventListener(menu, 'click', backdropHandler);
            this.eventListeners.push(cleanup);
        }
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
    }

    /**
     * Toggle mobile menu open/closed
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMenu() {
        const menu = getElementById('mobileMenu');
        const menuBtn = getElementById('mobileMenuBtn');

        if (!menu || this.isOpen) return;

        // Update state
        this.isOpen = true;

        // Update auth state before showing
        this.updateMobileAuthState();

        // Add active class to menu button
        if (menuBtn) {
            menuBtn.classList.add('active');
        }

        // Show menu
        menu.classList.remove('hidden');

        // Trigger animation
        setTimeout(() => {
            menu.classList.add('open');
        }, 10);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Emit open event
        this.emitEvent('mobileMenuOpen');
    }

    /**
     * Close mobile menu
     */
    closeMenu() {
        const menu = getElementById('mobileMenu');
        const menuBtn = getElementById('mobileMenuBtn');

        if (!menu || !this.isOpen) return;

        // Update state
        this.isOpen = false;

        // Remove active class from menu button
        if (menuBtn) {
            menuBtn.classList.remove('active');
        }

        // Start close animation
        menu.classList.add('closing');
        menu.classList.remove('open');

        // Hide menu after animation
        setTimeout(() => {
            menu.classList.add('hidden');
            menu.classList.remove('closing');
        }, this.animationDuration);

        // Restore body scroll
        document.body.style.overflow = '';

        // Emit close event
        this.emitEvent('mobileMenuClose');
    }

    /**
     * Handle mobile navigation link click
     * @param {HTMLElement} link - Clicked navigation link
     */
    handleNavLinkClick(link) {
        const href = link.getAttribute('href');
        const requiresAuth = link.dataset.requiresAuth === 'true';
        const adminOnly = link.dataset.adminOnly === 'true';

        // Check authentication requirements
        if (requiresAuth && !this.isAuthenticated) {
            this.services.notificationService?.showError('Please login to access this page');
            this.closeMenu();
            this.showLoginForm();
            return;
        }

        // Check admin requirements
        if (adminOnly && !this.services.authService?.isCurrentUserAdmin()) {
            if (this.isAuthenticated) {
                this.services.notificationService?.showError('Admin access required');
                this.closeMenu();
                this.services.router?.navigate('#home');
            } else {
                this.services.notificationService?.showError('Please login to access admin panel');
                this.closeMenu();
                this.showLoginForm();
            }
            return;
        }

        // Navigate to the page
        if (href) {
            this.services.router?.navigate(href);
        }

        // Close mobile menu
        this.closeMenu();
    }

    /**
     * Handle mobile login button click
     */
    handleMobileLogin() {
        this.closeMenu();
        this.showLoginForm();
    }

    /**
     * Handle mobile logout button click
     */
    async handleMobileLogout() {
        try {
            await this.services.authService?.logout();
            this.services.notificationService?.showSuccess('Logged out successfully');
            this.closeMenu();
            this.services.router?.navigate('#home');
        } catch (error) {
            console.error('Mobile logout error:', error);
            this.services.notificationService?.showError('Failed to logout');
        }
    }

    /**
     * Show login form
     */
    showLoginForm() {
        // This could be handled by the main nav or router
        // For now, navigate to login
        this.services.router?.navigate('#login');
    }

    /**
     * Handle authentication state change
     * @param {boolean} isAuthenticated - Authentication status
     * @param {Object} user - User object
     */
    handleAuthStateChange(isAuthenticated, user) {
        this.isAuthenticated = isAuthenticated;
        this.user = user;

        // Update mobile auth state
        this.updateMobileAuthState();
    }

    /**
     * Update mobile authentication state UI
     */
    updateMobileAuthState() {
        const loginBtn = getElementById('mobileNavLoginBtn');
        const userInfo = getElementById('mobileNavUserInfo');
        const username = getElementById('mobileNavUsername');
        const logoutBtn = getElementById('mobileNavLogoutBtn');
        const adminLink = getElementById('mobileNavAdminLink');

        if (!loginBtn || !userInfo) return;

        if (this.isAuthenticated && this.user) {
            // User is logged in
            hideElement(loginBtn);
            showElement(userInfo);

            // Update username display
            if (username) {
                username.textContent = this.user.username || this.user.email;
            }

            // Show logout button
            if (logoutBtn) {
                showElement(logoutBtn);
            }

            // Show/hide admin link
            if (adminLink) {
                if (this.services.authService?.isCurrentUserAdmin()) {
                    showElement(adminLink);
                } else {
                    hideElement(adminLink);
                }
            }

        } else {
            // User is not logged in
            showElement(loginBtn);
            hideElement(userInfo);

            // Hide logout button
            if (logoutBtn) {
                hideElement(logoutBtn);
            }

            // Hide admin link
            if (adminLink) {
                hideElement(adminLink);
            }
        }
    }

    /**
     * Update mobile navigation items visibility
     */
    updateNavigationItems() {
        const navLinks = document.querySelectorAll('.mobile-nav-link');

        navLinks.forEach(link => {
            const requiresAuth = link.dataset.requiresAuth === 'true';
            const adminOnly = link.dataset.adminOnly === 'true';

            if (requiresAuth && !this.isAuthenticated) {
                link.style.opacity = '0.5';
                link.style.pointerEvents = 'none';
            } else if (adminOnly && !this.services.authService?.isCurrentUserAdmin()) {
                hideElement(link);
            } else {
                link.style.opacity = '1';
                link.style.pointerEvents = 'auto';
                showElement(link);
            }
        });
    }

    /**
     * Set active navigation item
     * @param {string} route - Current route
     */
    setActiveNavItem(route) {
        const navLinks = document.querySelectorAll('.mobile-nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === route) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Check if menu is open
     * @returns {boolean} True if menu is open
     */
    isMenuOpen() {
        return this.isOpen;
    }

    /**
     * Force close menu (for external control)
     */
    forceClose() {
        if (this.isOpen) {
            this.closeMenu();
        }
    }

    /**
     * Refresh mobile menu state
     */
    refresh() {
        this.updateAuthenticationState();
        this.updateMobileAuthState();
        this.updateNavigationItems();
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'MobileMenu' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the mobile menu component
     */
    destroy() {
        console.log('Destroying mobile menu');

        // Close menu if open
        if (this.isOpen) {
            this.forceClose();
        }

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up mobile menu event listener:', error);
            }
        });
        this.eventListeners = [];

        // Restore body scroll
        document.body.style.overflow = '';

        // Reset state
        this.isOpen = false;
        this.isAuthenticated = false;
        this.user = null;
        this.isInitialized = false;

        console.log('Mobile menu destroyed');
    }
}

// Export singleton instance factory
export function createMobileMenu(services) {
    return new MobileMenu(services);
}

export default MobileMenu;