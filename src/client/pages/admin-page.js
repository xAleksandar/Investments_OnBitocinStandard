/**
 * Admin Page Component
 * Manages admin dashboard, suggestion management, user administration, and system statistics
 * Extracted from monolithic BitcoinGame class as part of Task 5.4
 */

import { getElementById, hideElement, showElement, addEventListener } from '../utils/dom-helpers.js';
import { formatters } from '../utils/formatters.js';

export class AdminPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Admin state management
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.totalPages = 1;

        // Auto-refresh interval
        this.refreshInterval = null;

        // Filter configurations
        this.filterButtons = {
            'filterAll': 'all',
            'filterOpen': 'open',
            'filterClosed': 'closed',
            'filterBugs': 'bug',
            'filterSuggestions': 'suggestion'
        };
    }

    /**
     * Initialize admin page
     */
    async init() {
        if (this.isInitialized) {
            console.log('AdminPage already initialized');
            return;
        }

        try {
            console.log('Initializing admin page');

            // Check admin access
            if (!this.checkAdminAccess()) {
                return;
            }

            // Check if admin page DOM exists
            const adminPage = getElementById('adminPage');
            if (!adminPage) {
                throw new Error('Admin page DOM element not found');
            }

            // Initialize DOM components
            this.initializeDOMComponents();

            // Set up event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Start auto-refresh
            this.startAutoRefresh();

            this.isInitialized = true;
            console.log('Admin page initialized successfully');

        } catch (error) {
            console.error('Failed to initialize admin page:', error);
            this.services.notificationService?.showError('Failed to load admin dashboard');
            throw error;
        }
    }

    /**
     * Check admin access permissions
     * @returns {boolean} True if user has admin access
     */
    checkAdminAccess() {
        // Check authentication
        if (!this.services.authService?.isAuthenticated()) {
            this.services.notificationService?.showError('Please login to access admin panel');
            window.location.hash = '#login';
            return false;
        }

        // Check admin privileges
        if (!this.services.authService?.isCurrentUserAdmin()) {
            this.services.notificationService?.showError('Admin access required');
            window.location.hash = '#home';
            return false;
        }

        return true;
    }

    /**
     * Initialize DOM components for admin page
     */
    initializeDOMComponents() {
        const adminPage = getElementById('adminPage');
        if (!adminPage) {
            console.warn('Admin page container not found');
            return;
        }

        // Ensure admin page is visible
        showElement(adminPage);

        // Reset admin state
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentSearch = '';
    }

    /**
     * Load initial admin data
     */
    async loadInitialData() {
        try {
            // Load admin statistics
            await this.loadAdminStats();

            // Load admin suggestions
            await this.loadAdminSuggestions();

            console.log('Admin initial data loaded successfully');

        } catch (error) {
            console.error('Failed to load admin initial data:', error);
            this.services.notificationService?.showError('Failed to load admin data');
        }
    }

    /**
     * Start auto-refresh for admin data
     */
    startAutoRefresh() {
        // Clear existing interval
        this.stopAutoRefresh();

        // Set up new interval - refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadAdminStats();
            this.loadAdminSuggestions();
        }, 30000);

        console.log('Admin auto-refresh started');
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Admin auto-refresh stopped');
        }
    }

    // ===== ADMIN STATISTICS =====

    /**
     * Load admin statistics
     */
    async loadAdminStats() {
        try {
            const response = await this.services.apiClient.get('/api/suggestions/admin/stats');

            if (response && response.status) {
                this.updateStatsDisplay(response);
            }

        } catch (error) {
            console.error('Error loading admin stats:', error);
            // Don't show error notification for stats as it's auto-refreshed
        }
    }

    /**
     * Update statistics display
     * @param {Object} stats - Statistics data
     */
    updateStatsDisplay(stats) {
        // Update status stats
        const statsOpen = getElementById('statsOpen');
        const statsClosed = getElementById('statsClosed');
        const statsBugs = getElementById('statsBugs');
        const statsSuggestions = getElementById('statsSuggestions');

        if (statsOpen) statsOpen.textContent = stats.status.open || 0;
        if (statsClosed) statsClosed.textContent = stats.status.closed || 0;
        if (statsBugs) statsBugs.textContent = stats.type.bug || 0;
        if (statsSuggestions) statsSuggestions.textContent = stats.type.suggestion || 0;
    }

    // ===== SUGGESTION MANAGEMENT =====

    /**
     * Load admin suggestions with current filters
     */
    async loadAdminSuggestions() {
        const container = getElementById('adminSuggestionsList');
        if (!container) return;

        // Show loading state
        container.innerHTML = '<div class="text-center text-gray-500 py-8">Loading suggestions...</div>';

        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: '10'
            });

            // Add filter parameters
            if (this.currentFilter !== 'all') {
                if (['open', 'closed'].includes(this.currentFilter)) {
                    params.append('status', this.currentFilter);
                } else {
                    params.append('type', this.currentFilter);
                }
            }

            // Add search parameter
            if (this.currentSearch) {
                params.append('search', this.currentSearch);
            }

            const response = await this.services.apiClient.get(`/api/suggestions/admin/suggestions?${params}`);

            if (response && response.suggestions) {
                this.displayAdminSuggestions(response.suggestions);
                this.updateAdminPagination(response.pagination);
            } else {
                container.innerHTML = '<div class="text-center text-red-500 py-8">Failed to load suggestions</div>';
            }

        } catch (error) {
            console.error('Error loading admin suggestions:', error);
            container.innerHTML = '<div class="text-center text-red-500 py-8">Failed to load suggestions</div>';
        }
    }

    /**
     * Display admin suggestions list
     * @param {Array} suggestions - Array of suggestion objects
     */
    displayAdminSuggestions(suggestions) {
        const container = getElementById('adminSuggestionsList');
        if (!container) return;

        if (suggestions.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No suggestions found</div>';
            return;
        }

        container.innerHTML = suggestions.map(suggestion => {
            const typeClass = suggestion.type === 'bug' ? 'bug' : 'suggestion';
            const statusClass = suggestion.status === 'open' ? 'open' : 'closed';
            const typeIcon = suggestion.type === 'bug' ? '🐛' : '💡';
            const statusIcon = suggestion.status === 'open' ? '🟢' : '⚫';
            const timeAgo = this.getTimeAgo(new Date(suggestion.created_at));

            let existingReplyHtml = '';
            if (suggestion.admin_reply) {
                existingReplyHtml = `
                    <div class="admin-existing-reply">
                        ${this.formatAdminReply(suggestion.admin_reply)}
                    </div>
                `;
            }

            return `
                <div class="admin-suggestion-item" id="suggestion-${suggestion.id}">
                    <div class="admin-suggestion-header">
                        <div class="flex items-center gap-2">
                            <span class="admin-type-badge ${typeClass}">${typeIcon} ${suggestion.type}</span>
                            <span class="admin-status-badge ${statusClass}">${statusIcon} ${suggestion.status}</span>
                        </div>
                        <div class="admin-user-info">
                            <strong>${this.escapeHtml(suggestion.username)}</strong> (${this.escapeHtml(suggestion.email)}) • ${timeAgo}
                        </div>
                    </div>
                    <div class="admin-suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                    <div class="admin-suggestion-description">${this.escapeHtml(suggestion.description)}</div>
                    ${existingReplyHtml}
                    <div class="admin-reply-form">
                        <textarea
                            id="reply-${suggestion.id}"
                            class="admin-reply-textarea"
                            placeholder="Write admin reply..."
                            maxlength="2000"
                        ></textarea>
                        <div class="flex gap-2 mt-3">
                            <button class="admin-reply-btn" onclick="adminPage.addAdminReply(${suggestion.id})">
                                Add Reply
                            </button>
                            <button class="admin-status-btn ${suggestion.status === 'open' ? 'close-btn' : 'open-btn'}"
                                    onclick="adminPage.changeStatus(${suggestion.id}, '${suggestion.status === 'open' ? 'closed' : 'open'}')">
                                ${suggestion.status === 'open' ? 'Close' : 'Reopen'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Set up suggestion-specific event listeners
        this.setupSuggestionEventListeners();
    }

    /**
     * Update admin pagination display
     * @param {Object} pagination - Pagination data
     */
    updateAdminPagination(pagination) {
        if (!pagination) return;

        this.totalPages = pagination.totalPages || 1;

        const prevBtn = getElementById('prevPage');
        const nextBtn = getElementById('nextPage');
        const pageInfo = getElementById('pageInfo');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.classList.toggle('disabled', this.currentPage <= 1);
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
            nextBtn.classList.toggle('disabled', this.currentPage >= this.totalPages);
        }

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
    }

    /**
     * Set admin filter
     * @param {string} filter - Filter type
     */
    setAdminFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;

        // Update active filter button
        this.updateFilterButtons(filter);

        // Reload suggestions
        this.loadAdminSuggestions();
    }

    /**
     * Update filter button states
     * @param {string} activeFilter - Currently active filter
     */
    updateFilterButtons(activeFilter) {
        // Reset all filter buttons
        Object.keys(this.filterButtons).forEach(buttonId => {
            const btn = getElementById(buttonId);
            if (btn) {
                btn.classList.remove('active-filter', 'bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            }
        });

        // Set active button
        const activeButtonId = Object.keys(this.filterButtons).find(
            id => this.filterButtons[id] === activeFilter
        );

        if (activeButtonId) {
            const activeBtn = getElementById(activeButtonId);
            if (activeBtn) {
                activeBtn.classList.add('active-filter', 'bg-blue-500', 'text-white');
                activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
            }
        }
    }

    /**
     * Add admin reply to suggestion
     * @param {number} suggestionId - Suggestion ID
     */
    async addAdminReply(suggestionId) {
        const textarea = getElementById(`reply-${suggestionId}`);
        if (!textarea) return;

        const reply = textarea.value.trim();
        if (!reply) {
            this.services.notificationService?.showError('Please enter a reply');
            return;
        }

        try {
            const response = await this.services.apiClient.post(`/api/suggestions/admin/suggestions/${suggestionId}/reply`, {
                reply: reply
            });

            if (response && response.message) {
                this.services.notificationService?.showSuccess(response.message);

                // Clear textarea
                textarea.value = '';

                // Refresh data
                await this.loadAdminSuggestions();
                await this.loadAdminStats();
            }

        } catch (error) {
            console.error('Error adding admin reply:', error);
            this.services.notificationService?.showError('Failed to add reply');
        }
    }

    /**
     * Change suggestion status
     * @param {number} suggestionId - Suggestion ID
     * @param {string} newStatus - New status (open/closed)
     */
    async changeStatus(suggestionId, newStatus) {
        try {
            const response = await this.services.apiClient.put(`/api/suggestions/admin/suggestions/${suggestionId}/status`, {
                status: newStatus
            });

            if (response && response.message) {
                this.services.notificationService?.showSuccess(response.message);

                // Refresh data
                await this.loadAdminSuggestions();
                await this.loadAdminStats();
            }

        } catch (error) {
            console.error('Error changing status:', error);
            this.services.notificationService?.showError('Failed to change status');
        }
    }

    // ===== EVENT HANDLING =====

    /**
     * Set up admin page event listeners
     */
    setupEventListeners() {
        // Filter buttons
        Object.entries(this.filterButtons).forEach(([buttonId, filter]) => {
            const btn = getElementById(buttonId);
            if (btn) {
                const cleanup = addEventListener(btn, 'click', () => {
                    this.setAdminFilter(filter);
                });
                this.eventListeners.push(cleanup);
            }
        });

        // Search input
        const searchInput = getElementById('adminSearch');
        if (searchInput) {
            let searchTimeout;
            const cleanup = addEventListener(searchInput, 'input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value;
                    this.currentPage = 1;
                    this.loadAdminSuggestions();
                }, 500);
            });
            this.eventListeners.push(cleanup);
        }

        // Pagination buttons
        const prevBtn = getElementById('prevPage');
        const nextBtn = getElementById('nextPage');

        if (prevBtn) {
            const cleanup = addEventListener(prevBtn, 'click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadAdminSuggestions();
                }
            });
            this.eventListeners.push(cleanup);
        }

        if (nextBtn) {
            const cleanup = addEventListener(nextBtn, 'click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadAdminSuggestions();
                }
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up event listeners for suggestion items
     */
    setupSuggestionEventListeners() {
        // Reply buttons
        const replyButtons = document.querySelectorAll('.admin-reply-btn');
        replyButtons.forEach(btn => {
            const suggestionId = btn.onclick?.toString().match(/addAdminReply\((\d+)\)/)?.[1];
            if (suggestionId) {
                btn.onclick = () => this.addAdminReply(parseInt(suggestionId));
            }
        });

        // Status change buttons
        const statusButtons = document.querySelectorAll('.admin-status-btn');
        statusButtons.forEach(btn => {
            const match = btn.onclick?.toString().match(/changeStatus\((\d+), '(\w+)'\)/);
            if (match) {
                const suggestionId = parseInt(match[1]);
                const newStatus = match[2];
                btn.onclick = () => this.changeStatus(suggestionId, newStatus);
            }
        });
    }

    // ===== UTILITY METHODS =====

    /**
     * Get time ago string
     * @param {Date} date - Date object
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Format admin reply with line breaks
     * @param {string} reply - Reply text
     * @returns {string} Formatted HTML
     */
    formatAdminReply(reply) {
        return this.escapeHtml(reply).replace(/\n/g, '<br>');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render admin page (called by router)
     */
    render() {
        // Admin page rendering is handled by init() method
        // This method is here for consistency with other page components
        console.log('Admin page render called');
    }

    /**
     * Destroy admin page and clean up resources
     */
    destroy() {
        console.log('Destroying admin page');

        // Stop auto-refresh
        this.stopAutoRefresh();

        // Clean up all event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset admin state
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.totalPages = 1;

        // Reset initialization flag
        this.isInitialized = false;

        console.log('Admin page destroyed');
    }
}

// Export for global access (needed for onclick handlers in HTML)
if (typeof window !== 'undefined') {
    window.adminPage = null;
}

export default AdminPage;
