/**
 * Frontend notification service
 * Manages user notifications, messages, and toast notifications
 */
class NotificationService {
    constructor() {
        // Auto-hide timeout configurations
        this.defaultAutoHideTimeout = 5000; // 5 seconds
        this.activeTimeouts = new Map(); // Track active timeouts

        // Notification queue for managing multiple notifications
        this.notificationQueue = [];
        this.isShowingNotification = false;
    }

    /**
     * Show a toast notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
     * @param {number} autoHideMs - Auto-hide timeout in milliseconds (null for no auto-hide)
     */
    showNotification(message, type = 'success', autoHideMs = null) {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');
        const iconEl = document.getElementById('notificationIcon');

        if (!notification || !messageEl || !iconEl) {
            console.warn('Notification elements not found in DOM');
            return;
        }

        // Clear any existing timeout
        this.clearNotificationTimeout();

        messageEl.textContent = message;

        // Update styling based on type
        const container = notification.querySelector('div');
        if (container) {
            const { className, icon, iconClass } = this.getNotificationStyle(type);
            container.className = className;
            iconEl.textContent = icon;
            iconEl.className = iconClass;
        }

        // Show notification
        notification.classList.remove('hidden');
        this.isShowingNotification = true;

        // Set auto-hide timeout if specified
        const timeout = autoHideMs !== null ? autoHideMs : this.defaultAutoHideTimeout;
        if (timeout > 0) {
            const timeoutId = setTimeout(() => {
                this.hideNotification();
            }, timeout);

            this.activeTimeouts.set('notification', timeoutId);
        }
    }

    /**
     * Get notification styling configuration
     * @param {string} type - Notification type
     * @returns {Object} Style configuration
     */
    getNotificationStyle(type) {
        const styles = {
            success: {
                className: 'bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm',
                icon: '✓',
                iconClass: 'w-5 h-5 text-green-500'
            },
            error: {
                className: 'bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-sm',
                icon: '✕',
                iconClass: 'w-5 h-5 text-red-500'
            },
            warning: {
                className: 'bg-white border-l-4 border-yellow-500 rounded-lg shadow-lg p-4 max-w-sm',
                icon: '⚠',
                iconClass: 'w-5 h-5 text-yellow-500'
            },
            info: {
                className: 'bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4 max-w-sm',
                icon: 'ℹ',
                iconClass: 'w-5 h-5 text-blue-500'
            }
        };

        return styles[type] || styles.info;
    }

    /**
     * Hide the current notification
     */
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.add('hidden');
        }

        this.clearNotificationTimeout();
        this.isShowingNotification = false;

        // Process next notification in queue if any
        this.processNotificationQueue();
    }

    /**
     * Clear notification auto-hide timeout
     */
    clearNotificationTimeout() {
        const timeoutId = this.activeTimeouts.get('notification');
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.activeTimeouts.delete('notification');
        }
    }

    /**
     * Show an authentication message (specific to auth forms)
     * @param {string} message - Message text
     * @param {string} type - Message type ('success' or 'error')
     */
    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        if (!messageDiv) {
            console.warn('Auth message element not found in DOM');
            return;
        }

        messageDiv.textContent = message;
        messageDiv.className = `mt-4 text-center ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        messageDiv.classList.remove('hidden');
    }

    /**
     * Hide authentication message
     */
    hideMessage() {
        const messageDiv = document.getElementById('authMessage');
        if (messageDiv) {
            messageDiv.classList.add('hidden');
            messageDiv.textContent = '';
        }
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {number} autoHideMs - Auto-hide timeout
     */
    showSuccess(message, autoHideMs = null) {
        this.showNotification(message, 'success', autoHideMs);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {number} autoHideMs - Auto-hide timeout
     */
    showError(message, autoHideMs = null) {
        this.showNotification(message, 'error', autoHideMs);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {number} autoHideMs - Auto-hide timeout
     */
    showWarning(message, autoHideMs = null) {
        this.showNotification(message, 'warning', autoHideMs);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {number} autoHideMs - Auto-hide timeout
     */
    showInfo(message, autoHideMs = null) {
        this.showNotification(message, 'info', autoHideMs);
    }

    /**
     * Queue a notification to be shown after current one
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {number} autoHideMs - Auto-hide timeout
     */
    queueNotification(message, type = 'success', autoHideMs = null) {
        this.notificationQueue.push({ message, type, autoHideMs });

        // If no notification is currently showing, show this one immediately
        if (!this.isShowingNotification) {
            this.processNotificationQueue();
        }
    }

    /**
     * Process notification queue
     */
    processNotificationQueue() {
        if (this.notificationQueue.length > 0 && !this.isShowingNotification) {
            const next = this.notificationQueue.shift();
            this.showNotification(next.message, next.type, next.autoHideMs);
        }
    }

    /**
     * Clear all queued notifications
     */
    clearQueue() {
        this.notificationQueue = [];
    }

    /**
     * Show a confirmation dialog (modal-based)
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    showConfirmation(message, title = 'Confirm') {
        return new Promise((resolve) => {
            // This would need to integrate with a modal system
            // For now, use browser confirm as fallback
            const result = confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }

    /**
     * Show a prompt dialog
     * @param {string} message - Prompt message
     * @param {string} defaultValue - Default input value
     * @param {string} title - Dialog title
     * @returns {Promise<string|null>} User input or null if cancelled
     */
    showPrompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            // This would need to integrate with a modal system
            // For now, use browser prompt as fallback
            const result = prompt(`${title}\n\n${message}`, defaultValue);
            resolve(result);
        });
    }

    /**
     * Show loading notification (persistent until hidden)
     * @param {string} message - Loading message
     * @returns {string} Loading notification ID for hiding
     */
    showLoading(message = 'Loading...') {
        const loadingId = `loading_${Date.now()}`;
        this.showNotification(message, 'info', null); // No auto-hide
        return loadingId;
    }

    /**
     * Hide loading notification
     * @param {string} loadingId - Loading notification ID
     */
    hideLoading(loadingId) {
        this.hideNotification();
    }

    /**
     * Show trade success notification with specific styling
     * @param {Object} tradeDetails - Trade details for display
     */
    showTradeSuccess(tradeDetails) {
        const { fromAsset, toAsset, fromAmount, toAmount } = tradeDetails;
        const message = `Trade executed successfully! ${fromAmount} ${fromAsset} → ${toAmount} ${toAsset}`;
        this.showSuccess(message, 7000); // Show for 7 seconds
    }

    /**
     * Show trade error notification
     * @param {string} error - Error message
     */
    showTradeError(error) {
        this.showError(`Trade failed: ${error}`, 8000); // Show for 8 seconds
    }

    /**
     * Show network error notification
     * @param {string} operation - The operation that failed
     */
    showNetworkError(operation = 'operation') {
        this.showError(`Network error during ${operation}. Please try again.`, 6000);
    }

    /**
     * Set default auto-hide timeout
     * @param {number} timeoutMs - Timeout in milliseconds
     */
    setDefaultTimeout(timeoutMs) {
        this.defaultAutoHideTimeout = timeoutMs;
    }

    /**
     * Check if notification is currently visible
     * @returns {boolean} True if notification is showing
     */
    isNotificationVisible() {
        const notification = document.getElementById('notification');
        return notification && !notification.classList.contains('hidden');
    }

    /**
     * Initialize notification click handlers
     */
    initializeNotificationHandlers() {
        // Close notification on click
        const notification = document.getElementById('notification');
        if (notification) {
            notification.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        // Set up close button if it exists
        const closeBtn = notification?.querySelector('[data-notification-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideNotification();
            });
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clear all timeouts
        this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.activeTimeouts.clear();

        // Clear queue
        this.clearQueue();

        // Hide any visible notifications
        this.hideNotification();
    }
}

export default NotificationService;