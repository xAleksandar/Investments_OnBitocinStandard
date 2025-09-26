/**
 * Frontend authentication service
 * Manages user authentication state, login/logout, and admin permissions
 */
class AuthService {
    constructor(apiClient, notificationService = null) {
        this.apiClient = apiClient;
        this.notificationService = notificationService;
        this.token = localStorage.getItem('token');
        // Robustly parse stored user, guarding against string "undefined"/"null" and invalid JSON
        const rawUser = localStorage.getItem('user');
        if (rawUser && rawUser !== 'undefined' && rawUser !== 'null') {
            try {
                this.user = JSON.parse(rawUser);
            } catch (e) {
                console.warn('Invalid user JSON in localStorage, resetting. Raw:', rawUser);
                this.user = {};
                localStorage.removeItem('user');
            }
        } else {
            this.user = {};
        }

        // Event listeners for auth state changes (service-level)
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
     * Backward-compat alias used by components
     * @param {Function} listener - (isAuthenticated, user) => void
     */
    onAuthChange(listener) {
        this.onAuthStateChange(({ isAuthenticated, user }) => listener(isAuthenticated, user));
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
        // Notify registered service listeners
        this.authStateListeners.forEach(listener => {
            try {
                listener(authState);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });

        // Also broadcast as DOM event for app-wide listeners
        try {
            const evt = new CustomEvent('authStateChanged', { detail: authState });
            document.dispatchEvent(evt);
        } catch (err) {
            // In non-DOM contexts this may fail; ignore silently
        }
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
            console.log('🔍 Magic link response:', data);
            console.log('🔍 Data structure:', JSON.stringify(data, null, 2));

            if (this.notificationService) {
                const fallbackMsg = 'Magic link sent. Please check your email.';
                const msg = typeof data?.message === 'string' ? data.message
                    : (typeof data?.data?.message === 'string' ? data.data.message : fallbackMsg);
                this.notificationService.showMessage(msg, 'success');

                // Check for magic link URL - server returns nested in data.data.magicLinkUrl
                const magicLink = data.magicLink || data.magicLinkUrl || data.data?.magicLinkUrl || data.data?.magicLink;
                console.log('🔍 Magic link found:', magicLink);

                if (magicLink) {
                    console.log('🔗 Showing magic link button for:', magicLink);
                    this.showMagicLinkButton(magicLink);
                } else {
                    console.log('❌ No magic link found in response');
                    console.log('❌ Available keys:', Object.keys(data));
                    if (data.data) {
                        console.log('❌ data.data keys:', Object.keys(data.data));
                    }
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
        console.log('🔍 Looking for authMessage element...');
        const messageDiv = document.getElementById('authMessage');

        if (!messageDiv) {
            console.log('❌ authMessage element not found');
            return;
        }

        console.log('✅ authMessage element found, adding magic link button');
        // Replace content with message + button to avoid leftover values like 'true'
        const buttonHtml = `
            <div class="mt-2">
                <button type="button"
                    onclick="window.open('${magicLink}', '_blank')"
                    class="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Open Magic Link
                </button>
            </div>`;
        // Preserve current message text (already set by showMessage)
        const currentText = messageDiv.textContent || '';
        messageDiv.innerHTML = `<div class="${messageDiv.className}">${currentText}</div>${buttonHtml}`;
        console.log('🔗 Magic link button added to DOM');
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
            const apiResponse = await this.apiClient.verifyMagicLink(token);
            console.log('Verification response:', apiResponse);

            // Support standardized API envelope { success, data: { token, user, message } }
            const payload = apiResponse?.data || apiResponse;
            if (!payload?.token || !payload?.user) {
                throw new Error('Invalid verification response');
            }

            // Store authentication data
            this.token = payload.token;
            this.user = payload.user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            // Update nav/UI immediately
            this.updateNavigationAuthState(true);

            // Notify listeners of successful authentication
            this.notifyAuthStateChange({
                isAuthenticated: true,
                user: this.user,
                isAdmin: this.isCurrentUserAdmin()
            });

            return payload;
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
        // Support both legacy and current IDs
        const mobileLoginBtn = document.getElementById('mobileLoginBtn') || document.getElementById('mobileNavLoginBtn');
        const mobileUserInfo = document.getElementById('mobileUserInfo') || document.getElementById('mobileNavUserInfo');

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
