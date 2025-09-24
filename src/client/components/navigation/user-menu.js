/**
 * User Menu Component
 * Manages user authentication menu with login/logout and user info display
 * Extracted from monolithic BitcoinGame class as part of Task 6.2
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class UserMenu {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // User menu state
        this.isAuthenticated = false;
        this.user = null;
        this.isDropdownOpen = false;

        // Menu configuration
        this.dropdownItems = [
            {
                id: 'userMenuProfile',
                text: 'userMenu.profile',
                icon: '👤',
                action: 'profile',
                requiresAuth: true
            },
            {
                id: 'userMenuSettings',
                text: 'userMenu.settings',
                icon: '⚙️',
                action: 'settings',
                requiresAuth: true
            },
            {
                id: 'userMenuAdmin',
                text: 'userMenu.admin',
                icon: '🛡️',
                action: 'admin',
                requiresAuth: true,
                adminOnly: true
            },
            {
                id: 'userMenuLogout',
                text: 'userMenu.logout',
                icon: '🚪',
                action: 'logout',
                requiresAuth: true,
                separator: true
            }
        ];
    }

    /**
     * Initialize the user menu component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('UserMenu already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.authService) {
                console.error('UserMenu requires authService');
                return;
            }

            // Merge options
            this.options = { ...this.options, ...options };

            // Initialize authentication state
            this.updateAuthenticationState();

            // Set up event listeners
            this.setupEventListeners();

            // Set up authentication listeners
            this.setupAuthListeners();

            // Update initial UI state
            this.updateUserMenuUI();

            this.isInitialized = true;
            console.log('UserMenu initialized successfully');

        } catch (error) {
            console.error('Failed to initialize user menu:', error);
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
     * Set up user menu event listeners
     */
    setupEventListeners() {
        // Note: Login button (navLoginBtn) is handled by MainNavigation component
        // UserMenu focuses on user dropdown menu functionality

        // User info trigger (for dropdown)
        const userInfo = getElementById('navUserInfo');
        if (userInfo) {
            const cleanup = addEventListener(userInfo, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown();
            });
            this.eventListeners.push(cleanup);
        }

        // User avatar/trigger
        const userTrigger = getElementById('userMenuTrigger');
        if (userTrigger) {
            const cleanup = addEventListener(userTrigger, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown();
            });
            this.eventListeners.push(cleanup);
        }

        // Dropdown menu items
        this.setupDropdownItems();

        // Close dropdown when clicking outside
        const outsideClickHandler = (e) => {
            const userMenu = getElementById('userMenuDropdown') || getElementById('navUserDropdown');
            const userTrigger = getElementById('navUserInfo') || getElementById('userMenuTrigger');

            if (this.isDropdownOpen && userMenu && !userMenu.contains(e.target) && !userTrigger?.contains(e.target)) {
                this.closeDropdown();
            }
        };

        const cleanup = addEventListener(document, 'click', outsideClickHandler);
        this.eventListeners.push(cleanup);

        // Close dropdown on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isDropdownOpen) {
                this.closeDropdown();
            }
        };

        const escapeCleanup = addEventListener(document, 'keydown', escapeHandler);
        this.eventListeners.push(escapeCleanup);
    }

    /**
     * Set up dropdown menu items
     */
    setupDropdownItems() {
        this.dropdownItems.forEach(item => {
            const element = getElementById(item.id);
            if (element) {
                const cleanup = addEventListener(element, 'click', (e) => {
                    e.preventDefault();
                    this.handleDropdownAction(item.action);
                });
                this.eventListeners.push(cleanup);
            }
        });

        // Generic logout button (if exists)
        const logoutBtn = getElementById('navLogoutBtn') || getElementById('userMenuLogout');
        if (logoutBtn) {
            const cleanup = addEventListener(logoutBtn, 'click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
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
     * Handle login action
     */
    handleLogin() {
        this.closeDropdown();
        this.showLoginForm();
    }

    /**
     * Handle logout action
     */
    async handleLogout() {
        try {
            this.closeDropdown();
            await this.services.authService?.logout();
            this.services.notificationService?.showSuccess('Logged out successfully');
            this.services.router?.navigate('#home');
        } catch (error) {
            console.error('Logout error:', error);
            this.services.notificationService?.showError('Failed to logout');
        }
    }

    /**
     * Handle dropdown action
     * @param {string} action - Action to perform
     */
    handleDropdownAction(action) {
        this.closeDropdown();

        switch (action) {
            case 'profile':
                this.handleProfile();
                break;
            case 'settings':
                this.handleSettings();
                break;
            case 'admin':
                this.handleAdmin();
                break;
            case 'logout':
                this.handleLogout();
                break;
            default:
                console.warn('Unknown user menu action:', action);
        }
    }

    /**
     * Handle profile action
     */
    handleProfile() {
        // Navigate to profile page or show profile modal
        this.services.router?.navigate('#profile');
    }

    /**
     * Handle settings action
     */
    handleSettings() {
        // Navigate to settings page or show settings modal
        this.services.router?.navigate('#settings');
    }

    /**
     * Handle admin action
     */
    handleAdmin() {
        if (this.services.authService?.isCurrentUserAdmin()) {
            this.services.router?.navigate('#admin');
        } else {
            this.services.notificationService?.showError('Admin access required');
        }
    }

    /**
     * Show login form
     */
    showLoginForm() {
        // This could trigger a modal or navigate to login page
        this.services.router?.navigate('#login');
    }

    /**
     * Toggle dropdown menu
     */
    toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open dropdown menu
     */
    openDropdown() {
        if (!this.isAuthenticated) return;

        const dropdown = getElementById('userMenuDropdown') || getElementById('navUserDropdown');
        if (dropdown) {
            this.isDropdownOpen = true;
            dropdown.classList.add('open', 'show');
            dropdown.style.display = 'block';

            // Update dropdown content
            this.updateDropdownContent();

            // Emit event
            this.emitEvent('userMenuOpen');
        }
    }

    /**
     * Close dropdown menu
     */
    closeDropdown() {
        const dropdown = getElementById('userMenuDropdown') || getElementById('navUserDropdown');
        if (dropdown) {
            this.isDropdownOpen = false;
            dropdown.classList.remove('open', 'show');
            dropdown.style.display = 'none';

            // Emit event
            this.emitEvent('userMenuClose');
        }
    }

    /**
     * Update dropdown content
     */
    updateDropdownContent() {
        // Update dropdown items based on current auth state
        this.dropdownItems.forEach(item => {
            const element = getElementById(item.id);
            if (element) {
                // Show/hide based on requirements
                if (item.adminOnly && !this.services.authService?.isCurrentUserAdmin()) {
                    hideElement(element);
                } else if (item.requiresAuth && this.isAuthenticated) {
                    showElement(element);
                } else if (!item.requiresAuth) {
                    showElement(element);
                } else {
                    hideElement(element);
                }
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

        // Close dropdown if user logs out
        if (!isAuthenticated && this.isDropdownOpen) {
            this.closeDropdown();
        }

        // Update UI
        this.updateUserMenuUI();
    }

    /**
     * Update user menu UI
     */
    updateUserMenuUI() {
        const loginBtn = getElementById('navLoginBtn');
        const userInfo = getElementById('navUserInfo');
        const userTrigger = getElementById('userMenuTrigger');
        const username = getElementById('navUsername') || getElementById('userMenuUsername');
        const userAvatar = getElementById('userAvatar');

        if (this.isAuthenticated && this.user) {
            // Hide login button
            if (loginBtn) hideElement(loginBtn);

            // Show user info/trigger
            if (userInfo) showElement(userInfo);
            if (userTrigger) showElement(userTrigger);

            // Update username display
            if (username) {
                username.textContent = this.user.username || this.user.email;
            }

            // Update user avatar (if exists)
            if (userAvatar) {
                userAvatar.src = this.user.avatar || this.getDefaultAvatar();
                userAvatar.alt = this.user.username || this.user.email;
            }

        } else {
            // Show login button
            if (loginBtn) showElement(loginBtn);

            // Hide user info/trigger
            if (userInfo) hideElement(userInfo);
            if (userTrigger) hideElement(userTrigger);
        }
    }

    /**
     * Get default avatar URL
     * @returns {string} Default avatar URL
     */
    getDefaultAvatar() {
        // Return a default avatar (could be based on user initials or a generic icon)
        const initials = this.user?.username?.charAt(0).toUpperCase() ||
                         this.user?.email?.charAt(0).toUpperCase() ||
                         'U';

        // Could return a data URL for a simple generated avatar
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#f97316"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">${initials}</text>
            </svg>
        `)}`;
    }

    /**
     * Update user info display
     * @param {Object} userInfo - Updated user information
     */
    updateUserInfo(userInfo) {
        if (userInfo) {
            this.user = { ...this.user, ...userInfo };
            this.updateUserMenuUI();
        }
    }

    /**
     * Check if dropdown is open
     * @returns {boolean} True if dropdown is open
     */
    isDropdownMenuOpen() {
        return this.isDropdownOpen;
    }

    /**
     * Force close dropdown (for external control)
     */
    forceCloseDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        }
    }

    /**
     * Refresh user menu state
     */
    refresh() {
        this.updateAuthenticationState();
        this.updateUserMenuUI();
        if (this.isDropdownOpen) {
            this.updateDropdownContent();
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'UserMenu', user: this.user }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the user menu component
     */
    destroy() {
        console.log('Destroying user menu');

        // Close dropdown if open
        if (this.isDropdownOpen) {
            this.closeDropdown();
        }

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up user menu event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.isAuthenticated = false;
        this.user = null;
        this.isDropdownOpen = false;
        this.isInitialized = false;

        console.log('User menu destroyed');
    }
}

// Export singleton instance factory
export function createUserMenu(services) {
    return new UserMenu(services);
}

export default UserMenu;
