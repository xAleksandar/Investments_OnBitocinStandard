/**
 * Frontend authentication service
 * Manages user authentication state, login/logout, and admin permissions
 */
class AuthService {
    constructor(apiClient, notificationService = null) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');

        // Event listeners for auth state changes
        this.authStateListeners = [];
    }

    /**
     * Add listener for authentication state changes
     * @param {Function} listener - Callback function
     */
    onAuthStateChange(listener) {
        this.authStateListeners.push(listener);
    }

    /**
     * Remove auth state change listener
     * @param {Function} listener - Callback function to remove
     */
    removeAuthStateListener(listener) {
        const index = this.authStateListeners.indexOf(listener);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of auth state change
     * @param {Object} authState - Current authentication state
     */
    notifyAuthStateChange(authState) {
        this.authStateListeners.forEach(listener => {
            try {
                listener(authState);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    /**
     * Check if user is currently authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return !!(this.token && this.user.email);
    }

    /**
     * Check if current user has admin privileges
     * @returns {boolean} Admin status
     */
    isCurrentUserAdmin() {
        return this.user && (this.user.isAdmin || this.user.is_admin);
    }

    /**
     * Get current user data
     * @returns {Object} User object
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Get current authentication token
     * @returns {string|null} JWT token
     */
    getToken() {
        return this.token;
    }

    /**
     * Request magic link for email authentication
     * @param {string} email - User email
     * @param {string} username - Optional username for new users
     * @returns {Promise<Object>} Request result
     */
    async requestMagicLink(email, username = null) {
        try {
            const data = await this.apiClient.requestMagicLink(email, username);

            if (this.notificationService) {
                this.notificationService.showMessage(data.message, 'success');

                // If we have a magic link URL, show the open button
                if (data.magicLink) {
                    this.showMagicLinkButton(data.magicLink);
                }
            }

            return data;
        } catch (error) {
            const errorMessage = error.message || 'Network error';

            if (this.notificationService) {
                this.notificationService.showMessage(errorMessage, 'error');

                // If user not found, show the username field
                if (errorMessage.includes('User not found')) {
                    this.showUsernameField();
                }
            }

            throw error;
        }
    }

    /**
     * Show magic link button in the UI
     * @param {string} magicLink - Magic link URL
     */
    showMagicLinkButton(magicLink) {
        const messageDiv = document.getElementById('authMessage');
        if (!messageDiv) return;

        const buttonHtml = `
            <button
                type="button"
                onclick="window.open('${magicLink}', '_blank')"
                class="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
                Open Magic Link
            </button>
        `;

        messageDiv.innerHTML = messageDiv.innerHTML + buttonHtml;
    }

    /**
     * Show username field for new user registration
     */
    showUsernameField() {
        const usernameField = document.getElementById('usernameField');
        if (usernameField) {
            usernameField.style.display = 'block';
        }
    }

    /**
     * Verify magic link token and authenticate user
     * @param {string} token - Magic link token
     * @returns {Promise<Object>} User data
     */
    async verifyMagicLink(token) {
        console.log('Verifying token:', token);

        try {
            const data = await this.apiClient.verifyMagicLink(token);

            console.log('Verification response:', data);

            // Store authentication data
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            // Notify listeners of successful authentication
            this.notifyAuthStateChange({
                isAuthenticated: true,
                user: this.user,
                isAdmin: this.isCurrentUserAdmin()
            });

            return data;
        } catch (error) {
            console.error('Verification error:', error);

            if (this.notificationService) {
                this.notificationService.showMessage(error.message, 'error');
            }

            throw error;
        }
    }

    /**
     * Check if user exists by email
     * @param {string} email - User email
     * @returns {Promise<Object>} User existence check result
     */
    async checkUser(email) {
        return this.apiClient.checkUser(email);
    }

    /**
     * Log out current user
     */
    logout() {
        // Clear stored data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};

        // Update navigation state
        this.updateNavigationAuthState(false);

        // Notify listeners of logout
        this.notifyAuthStateChange({
            isAuthenticated: false,
            user: null,
            isAdmin: false
        });

        // Navigate to home
        window.location.hash = '#home';
    }

    /**
     * Update navigation elements based on auth state
     * @param {boolean} isAuthenticated - Authentication status
     */
    updateNavigationAuthState(isAuthenticated) {
        const navLoginBtn = document.getElementById('navLoginBtn');
        const navUserInfo = document.getElementById('navUserInfo');

        if (navLoginBtn && navUserInfo) {
            if (isAuthenticated) {
                navLoginBtn.classList.add('hidden');
                navUserInfo.classList.remove('hidden');
            } else {
                navLoginBtn.classList.remove('hidden');
                navUserInfo.classList.add('hidden');
            }
        }

        // Sync mobile navigation auth state
        this.syncMobileAuthState();
    }

    /**
     * Synchronize mobile navigation authentication state
     */
    syncMobileAuthState() {
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileUserInfo = document.getElementById('mobileUserInfo');

        if (mobileLoginBtn && mobileUserInfo) {
            if (this.isAuthenticated()) {
                mobileLoginBtn.classList.add('hidden');
                mobileUserInfo.classList.remove('hidden');
            } else {
                mobileLoginBtn.classList.remove('hidden');
                mobileUserInfo.classList.add('hidden');
            }
        }
    }

    /**
     * Initialize authentication state from URL token (magic link)
     * @returns {Promise<boolean>} True if token was processed
     */
    async initializeFromUrlToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
            try {
                await this.verifyMagicLink(urlToken);

                // Remove token from URL to clean up
                const url = new URL(window.location);
                url.searchParams.delete('token');
                window.history.replaceState({}, document.title, url.toString());

                return true;
            } catch (error) {
                console.error('Failed to verify URL token:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * Initialize authentication state and update UI
     */
    initializeAuthState() {
        const isAuthenticated = this.isAuthenticated();

        // Update navigation
        this.updateNavigationAuthState(isAuthenticated);

        // Notify initial state to listeners
        this.notifyAuthStateChange({
            isAuthenticated,
            user: this.user,
            isAdmin: this.isCurrentUserAdmin()
        });
    }

    /**
     * Set up logout button event listeners
     */
    setupLogoutListeners() {
        // Desktop logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Mobile logout
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', () => {
                this.logout();
            });
        }

        // Navigation logout
        const navLogoutBtn = document.getElementById('navLogoutBtn');
        if (navLogoutBtn) {
            navLogoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }
}

export { AuthService };
export default AuthService;