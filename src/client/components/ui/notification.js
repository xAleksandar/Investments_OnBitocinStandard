/**
 * Notification Component
 * Displays success, error, and informational messages to users
 * Extracted from monolithic BitcoinGame class as part of Task 6.1
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class Notification {
    constructor() {
        this.container = null;
        this.messageElement = null;
        this.iconElement = null;
        this.closeTimeout = null;
        this.isInitialized = false;

        // Default configuration
        this.config = {
            autoCloseDelay: 5000, // 5 seconds
            animationDuration: 300, // 0.3 seconds
            position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center
            maxWidth: '400px'
        };

        // Notification queue for multiple notifications
        this.notificationQueue = [];
        this.currentNotification = null;
    }

    /**
     * Initialize the notification component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('Notification component already initialized');
            return;
        }

        // Merge configuration
        this.config = { ...this.config, ...options };

        // Create notification container if it doesn't exist
        this.createNotificationContainer();

        // Get DOM elements
        this.container = getElementById('notification');
        this.messageElement = getElementById('notificationMessage');
        this.iconElement = getElementById('notificationIcon');

        if (!this.container || !this.messageElement || !this.iconElement) {
            console.error('Notification DOM elements not found');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();

        this.isInitialized = true;
        console.log('Notification component initialized');
    }

    /**
     * Create notification container if it doesn't exist
     */
    createNotificationContainer() {
        let container = getElementById('notification');

        if (!container) {
            container = document.createElement('div');
            container.id = 'notification';
            container.className = 'notification-container fixed z-50 hidden';

            // Set position based on config
            this.setContainerPosition(container);

            container.innerHTML = `
                <div class="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 translate-y-0 opacity-100">
                    <div class="flex items-center">
                        <div id="notificationIcon" class="w-5 h-5 text-green-500 mr-3 flex-shrink-0">✓</div>
                        <div class="flex-1">
                            <p id="notificationMessage" class="text-sm font-medium text-gray-900"></p>
                        </div>
                        <button id="notificationClose" class="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600">
                            <span class="sr-only">Close</span>
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(container);
        }
    }

    /**
     * Set container position based on configuration
     * @param {HTMLElement} container - Notification container
     */
    setContainerPosition(container) {
        const positions = {
            'top-right': 'top-4 right-4',
            'top-left': 'top-4 left-4',
            'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
            'bottom-right': 'bottom-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
        };

        const positionClass = positions[this.config.position] || positions['top-right'];
        container.className += ` ${positionClass}`;

        if (this.config.maxWidth) {
            container.style.maxWidth = this.config.maxWidth;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        const closeButton = getElementById('notificationClose');
        if (closeButton) {
            addEventListener(closeButton, 'click', () => {
                this.hide();
            });
        }

        // Auto-hide on click outside (optional)
        addEventListener(document, 'click', (e) => {
            if (this.container && !this.container.contains(e.target)) {
                // Don't auto-hide on outside click for now
                // this.hide();
            }
        });
    }

    /**
     * Show notification with message and type
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {Object} options - Additional options
     */
    show(message, type = 'success', options = {}) {
        if (!this.isInitialized) {
            console.error('Notification component not initialized');
            return;
        }

        // Merge options with defaults
        const notificationOptions = {
            autoClose: true,
            autoCloseDelay: this.config.autoCloseDelay,
            ...options
        };

        // If a notification is currently showing, queue this one
        if (this.currentNotification) {
            this.notificationQueue.push({ message, type, options: notificationOptions });
            return;
        }

        this.currentNotification = { message, type, options: notificationOptions };

        // Update message
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        // Update styling based on type
        this.updateNotificationStyle(type);

        // Show the notification
        this.showNotification();

        // Auto-hide if enabled
        if (notificationOptions.autoClose) {
            this.scheduleAutoHide(notificationOptions.autoCloseDelay);
        }
    }

    /**
     * Update notification styling based on type
     * @param {string} type - Notification type
     */
    updateNotificationStyle(type) {
        if (!this.container || !this.iconElement) return;

        const notificationContent = this.container.querySelector('div > div');
        if (!notificationContent) return;

        // Reset classes
        notificationContent.className = 'bg-white rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 translate-y-0 opacity-100';

        // Apply type-specific styling
        switch (type) {
            case 'success':
                notificationContent.className += ' border-l-4 border-green-500';
                this.iconElement.textContent = '✓';
                this.iconElement.className = 'w-5 h-5 text-green-500 mr-3 flex-shrink-0';
                break;

            case 'error':
                notificationContent.className += ' border-l-4 border-red-500';
                this.iconElement.textContent = '✕';
                this.iconElement.className = 'w-5 h-5 text-red-500 mr-3 flex-shrink-0';
                break;

            case 'warning':
                notificationContent.className += ' border-l-4 border-yellow-500';
                this.iconElement.textContent = '⚠';
                this.iconElement.className = 'w-5 h-5 text-yellow-500 mr-3 flex-shrink-0';
                break;

            case 'info':
                notificationContent.className += ' border-l-4 border-blue-500';
                this.iconElement.textContent = 'ℹ';
                this.iconElement.className = 'w-5 h-5 text-blue-500 mr-3 flex-shrink-0';
                break;

            default:
                // Default to success style
                notificationContent.className += ' border-l-4 border-green-500';
                this.iconElement.textContent = '✓';
                this.iconElement.className = 'w-5 h-5 text-green-500 mr-3 flex-shrink-0';
        }
    }

    /**
     * Show the notification with animation
     */
    showNotification() {
        if (!this.container) return;

        // Clear any existing timeout
        this.clearAutoHideTimeout();

        // Show container
        this.container.classList.remove('hidden');

        // Trigger animation
        const content = this.container.querySelector('div > div');
        if (content) {
            // Start with hidden state for animation
            content.style.transform = 'translateY(-100%) scale(0.95)';
            content.style.opacity = '0';

            // Animate in
            setTimeout(() => {
                content.style.transform = 'translateY(0) scale(1)';
                content.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * Hide the notification with animation
     */
    hide() {
        if (!this.container) return;

        const content = this.container.querySelector('div > div');
        if (content) {
            // Animate out
            content.style.transform = 'translateY(-100%) scale(0.95)';
            content.style.opacity = '0';

            // Hide container after animation
            setTimeout(() => {
                this.container.classList.add('hidden');
                this.currentNotification = null;

                // Process next notification in queue
                this.processNotificationQueue();
            }, this.config.animationDuration);
        } else {
            // Fallback if no content element
            this.container.classList.add('hidden');
            this.currentNotification = null;
            this.processNotificationQueue();
        }

        // Clear timeout
        this.clearAutoHideTimeout();
    }

    /**
     * Schedule auto-hide
     * @param {number} delay - Delay in milliseconds
     */
    scheduleAutoHide(delay) {
        this.clearAutoHideTimeout();
        this.closeTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }

    /**
     * Clear auto-hide timeout
     */
    clearAutoHideTimeout() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
        }
    }

    /**
     * Process notification queue
     */
    processNotificationQueue() {
        if (this.notificationQueue.length > 0) {
            const nextNotification = this.notificationQueue.shift();
            // Small delay to allow for smooth transitions
            setTimeout(() => {
                this.show(nextNotification.message, nextNotification.type, nextNotification.options);
            }, 100);
        }
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     */
    showSuccess(message, options = {}) {
        this.show(message, 'success', options);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    showError(message, options = {}) {
        this.show(message, 'error', options);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     */
    showWarning(message, options = {}) {
        this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     */
    showInfo(message, options = {}) {
        this.show(message, 'info', options);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notificationQueue = [];
        this.hide();
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Update container position if changed
        if (newConfig.position && this.container) {
            this.setContainerPosition(this.container);
        }
    }

    /**
     * Destroy the notification component
     */
    destroy() {
        // Clear any timeouts
        this.clearAutoHideTimeout();

        // Clear queue
        this.notificationQueue = [];
        this.currentNotification = null;

        // Remove container
        if (this.container) {
            this.container.remove();
        }

        // Reset state
        this.container = null;
        this.messageElement = null;
        this.iconElement = null;
        this.isInitialized = false;

        console.log('Notification component destroyed');
    }
}

// Create and export a singleton instance
export const notification = new Notification();

// Legacy compatibility - matches original showNotification method signature
export function showNotification(message, type = 'success') {
    notification.show(message, type);
}

export default notification;
