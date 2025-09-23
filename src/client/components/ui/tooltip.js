/**
 * Tooltip Component
 * Displays contextual information on hover or focus
 * Extracted from monolithic BitcoinGame class as part of Task 6.1
 */

import { getElementById, addEventListener } from '../../utils/dom-helpers.js';

export class Tooltip {
    constructor() {
        this.tooltipElement = null;
        this.isInitialized = false;
        this.activeTooltip = null;
        this.eventListeners = [];

        // Configuration
        this.config = {
            showDelay: 500,      // Delay before showing tooltip (ms)
            hideDelay: 100,      // Delay before hiding tooltip (ms)
            offset: 10,          // Distance from target element (px)
            maxWidth: '300px',   // Maximum width
            zIndex: 9999         // Z-index for tooltip
        };

        // Timers
        this.showTimer = null;
        this.hideTimer = null;
    }

    /**
     * Initialize the tooltip component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('Tooltip component already initialized');
            return;
        }

        // Merge configuration
        this.config = { ...this.config, ...options };

        // Create tooltip element
        this.createTooltipElement();

        // Set up global event listeners
        this.setupGlobalEventListeners();

        this.isInitialized = true;
        console.log('Tooltip component initialized');
    }

    /**
     * Create the tooltip DOM element
     */
    createTooltipElement() {
        // Remove existing tooltip if any
        const existingTooltip = getElementById('customTooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create new tooltip element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'customTooltip';
        this.tooltipElement.className = 'tooltip-container';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.4;
            max-width: ${this.config.maxWidth};
            word-wrap: break-word;
            z-index: ${this.config.zIndex};
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        document.body.appendChild(this.tooltipElement);
    }

    /**
     * Set up global event listeners for auto-detection
     */
    setupGlobalEventListeners() {
        // Listen for mouseenter on elements with tooltip attributes
        const mouseEnterHandler = (e) => {
            const target = e.target.closest('[data-tooltip], [title]');
            if (target) {
                const content = target.dataset.tooltip || target.title;
                if (content) {
                    // Clear title to prevent native tooltip
                    if (target.title) {
                        target.dataset.originalTitle = target.title;
                        target.title = '';
                    }
                    this.show(target, content, e);
                }
            }
        };

        const mouseLeaveHandler = (e) => {
            const target = e.target.closest('[data-tooltip], [data-original-title]');
            if (target) {
                this.hide();
                // Restore original title
                if (target.dataset.originalTitle) {
                    target.title = target.dataset.originalTitle;
                    delete target.dataset.originalTitle;
                }
            }
        };

        const mouseMoveHandler = (e) => {
            if (this.activeTooltip) {
                this.updatePosition(this.activeTooltip.element, e);
            }
        };

        // Add event listeners
        const cleanup1 = addEventListener(document, 'mouseenter', mouseEnterHandler, true);
        const cleanup2 = addEventListener(document, 'mouseleave', mouseLeaveHandler, true);
        const cleanup3 = addEventListener(document, 'mousemove', mouseMoveHandler);

        this.eventListeners.push(cleanup1, cleanup2, cleanup3);
    }

    /**
     * Show tooltip for an element
     * @param {HTMLElement} element - Target element
     * @param {string} content - Tooltip content
     * @param {Event} event - Mouse event for positioning
     */
    show(element, content, event = null) {
        if (!this.isInitialized || !this.tooltipElement) {
            console.error('Tooltip component not initialized');
            return;
        }

        // Clear any existing timers
        this.clearTimers();

        // Set active tooltip
        this.activeTooltip = { element, content };

        // Set content
        this.tooltipElement.textContent = content;

        // Show with delay
        this.showTimer = setTimeout(() => {
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.visibility = 'visible';

            // Position tooltip
            this.updatePosition(element, event);
        }, this.config.showDelay);
    }

    /**
     * Hide tooltip
     */
    hide() {
        if (!this.tooltipElement) return;

        // Clear timers
        this.clearTimers();

        // Hide with delay
        this.hideTimer = setTimeout(() => {
            if (this.tooltipElement) {
                this.tooltipElement.style.opacity = '0';
                this.tooltipElement.style.visibility = 'hidden';
            }
            this.activeTooltip = null;
        }, this.config.hideDelay);
    }

    /**
     * Update tooltip position
     * @param {HTMLElement} element - Target element
     * @param {Event} event - Mouse event (optional)
     */
    updatePosition(element, event = null) {
        if (!this.tooltipElement || !element) return;

        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        let left, top;

        if (event) {
            // Position relative to mouse cursor
            left = event.clientX - tooltipRect.width / 2;
            top = elementRect.top - tooltipRect.height - this.config.offset;
        } else {
            // Position relative to element center
            left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
            top = elementRect.top - tooltipRect.height - this.config.offset;
        }

        // Prevent tooltip from going off screen
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Horizontal bounds
        if (left < this.config.offset) {
            left = this.config.offset;
        } else if (left + tooltipRect.width > viewport.width - this.config.offset) {
            left = viewport.width - tooltipRect.width - this.config.offset;
        }

        // Vertical bounds - flip to bottom if not enough space on top
        if (top < this.config.offset) {
            top = elementRect.bottom + this.config.offset;
        }

        // Apply position
        this.tooltipElement.style.left = `${left}px`;
        this.tooltipElement.style.top = `${top}px`;
    }

    /**
     * Clear show/hide timers
     */
    clearTimers() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    /**
     * Add tooltip to an element programmatically
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} content - Tooltip content
     * @param {Object} options - Additional options
     */
    addTooltip(element, content, options = {}) {
        const targetElement = typeof element === 'string' ? document.querySelector(element) : element;

        if (!targetElement) {
            console.error('Tooltip target element not found');
            return;
        }

        // Set tooltip data attribute
        targetElement.dataset.tooltip = content;

        // Apply custom options as data attributes
        if (options.delay !== undefined) {
            targetElement.dataset.tooltipDelay = options.delay;
        }
        if (options.position) {
            targetElement.dataset.tooltipPosition = options.position;
        }
    }

    /**
     * Remove tooltip from an element
     * @param {HTMLElement|string} element - Element or selector
     */
    removeTooltip(element) {
        const targetElement = typeof element === 'string' ? document.querySelector(element) : element;

        if (!targetElement) {
            console.error('Tooltip target element not found');
            return;
        }

        // Remove tooltip data attributes
        delete targetElement.dataset.tooltip;
        delete targetElement.dataset.tooltipDelay;
        delete targetElement.dataset.tooltipPosition;

        // Restore original title if it was moved
        if (targetElement.dataset.originalTitle) {
            targetElement.title = targetElement.dataset.originalTitle;
            delete targetElement.dataset.originalTitle;
        }
    }

    /**
     * Set up performance tooltip for an element (from original implementation)
     * @param {HTMLElement} element - Target element
     * @param {string} content - Tooltip content
     */
    setupPerformanceTooltip(element, content) {
        if (!element) return;

        // Remove existing listeners
        element.onmouseenter = null;
        element.onmouseleave = null;
        element.onmousemove = null;

        // Add new listeners
        element.onmouseenter = (e) => {
            this.show(element, content, e);
        };

        element.onmouseleave = () => {
            this.hide();
        };

        element.onmousemove = (e) => {
            if (this.activeTooltip && this.activeTooltip.element === element) {
                this.updatePosition(element, e);
            }
        };
    }

    /**
     * Show tooltip immediately (legacy compatibility)
     * @param {HTMLElement} element - Target element
     * @param {string} content - Tooltip content
     * @param {Event} event - Mouse event
     */
    showTooltip(element, content, event) {
        // Clear any delay and show immediately
        this.clearTimers();
        this.activeTooltip = { element, content };
        this.tooltipElement.textContent = content;
        this.tooltipElement.style.opacity = '1';
        this.tooltipElement.style.visibility = 'visible';
        this.updatePosition(element, event);
    }

    /**
     * Hide tooltip immediately (legacy compatibility)
     */
    hideTooltip() {
        this.clearTimers();
        if (this.tooltipElement) {
            this.tooltipElement.style.opacity = '0';
            this.tooltipElement.style.visibility = 'hidden';
        }
        this.activeTooltip = null;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Update tooltip element styles if needed
        if (this.tooltipElement) {
            if (newConfig.maxWidth) {
                this.tooltipElement.style.maxWidth = newConfig.maxWidth;
            }
            if (newConfig.zIndex) {
                this.tooltipElement.style.zIndex = newConfig.zIndex;
            }
        }
    }

    /**
     * Destroy the tooltip component
     */
    destroy() {
        // Clear timers
        this.clearTimers();

        // Remove event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up tooltip event listener:', error);
            }
        });
        this.eventListeners = [];

        // Remove tooltip element
        if (this.tooltipElement) {
            this.tooltipElement.remove();
            this.tooltipElement = null;
        }

        // Reset state
        this.activeTooltip = null;
        this.isInitialized = false;

        console.log('Tooltip component destroyed');
    }
}

// Create and export singleton instance
export const tooltip = new Tooltip();

export default tooltip;