/**
 * UI interaction utilities
 * Tooltip, modal, and UI component helpers extracted from monolithic code
 */

import {
    getElementById,
    addClass,
    removeClass,
    showElement,
    hideElement,
    addEventListener,
    removeEventListener
} from './dom-helpers.js';

import { ELEMENT_IDS, CSS_CLASSES, TIMING } from './constants.js';

/**
 * Tooltip management system
 */
export class TooltipManager {
    constructor() {
        this.tooltip = null;
        this.currentElement = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.init();
    }

    /**
     * Initialize tooltip system
     */
    init() {
        this.tooltip = getElementById('customTooltip');
        if (!this.tooltip) {
            console.warn('Tooltip element not found. Creating default tooltip.');
            this.createDefaultTooltip();
        }
    }

    /**
     * Create default tooltip element if not found
     */
    createDefaultTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'customTooltip';
        this.tooltip.className = 'absolute bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg z-50 pointer-events-none opacity-0 transition-opacity duration-200';
        document.body.appendChild(this.tooltip);
    }

    /**
     * Show tooltip with content
     * @param {HTMLElement} element - Element to show tooltip for
     * @param {string} content - Tooltip content
     * @param {Event} event - Mouse event for positioning
     */
    showTooltip(element, content, event) {
        if (!this.tooltip) return;

        // Clear existing timeouts
        this.clearTimeouts();

        // Set content and show
        this.tooltip.textContent = content;
        addClass(this.tooltip, 'show');
        this.tooltip.style.opacity = '1';

        // Position tooltip
        this.positionTooltip(element, event);
        this.currentElement = element;
    }

    /**
     * Position tooltip relative to element and mouse
     * @param {HTMLElement} element - Target element
     * @param {Event} event - Mouse event
     */
    positionTooltip(element, event) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = event.clientX - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;

        // Prevent tooltip from going off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            removeClass(this.tooltip, 'show');
            this.tooltip.style.opacity = '0';
        }
        this.currentElement = null;
    }

    /**
     * Set up performance tooltip for element
     * @param {HTMLElement} element - Target element
     * @param {string} content - Tooltip content
     */
    setupPerformanceTooltip(element, content) {
        if (!element) return;

        // Remove existing title attribute
        element.removeAttribute('title');

        // Add performance-metric class for cursor styling
        addClass(element, 'performance-metric');

        // Remove existing event listeners to prevent duplicates
        element.onmouseenter = null;
        element.onmouseleave = null;
        element.onmousemove = null;

        // Add hover event listeners
        element.addEventListener('mouseenter', (event) => {
            this.showTimeout = setTimeout(() => {
                this.showTooltip(element, content, event);
            }, TIMING.TOOLTIP_DELAY);
        });

        element.addEventListener('mouseleave', () => {
            this.clearTimeouts();
            this.hideTooltip();
        });

        element.addEventListener('mousemove', (event) => {
            if (this.currentElement === element) {
                this.positionTooltip(element, event);
            }
        });
    }

    /**
     * Clear all timeouts
     */
    clearTimeouts() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * Clean up tooltip system
     */
    destroy() {
        this.clearTimeouts();
        this.hideTooltip();
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}

/**
 * Modal management system
 */
export class ModalManager {
    constructor() {
        this.activeModals = [];
        this.escapeHandler = this.handleEscapeKey.bind(this);
    }

    /**
     * Show modal by ID
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        const modal = getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID '${modalId}' not found`);
            return;
        }

        // Add to active modals
        this.activeModals.push(modalId);

        // Show modal
        removeClass(modal, CSS_CLASSES.HIDDEN);

        // Set up escape key handler
        if (this.activeModals.length === 1) {
            document.addEventListener('keydown', this.escapeHandler);
        }

        // Set up click outside handler if enabled
        if (options.closeOnClickOutside !== false) {
            this.setupClickOutsideHandler(modal, modalId);
        }

        // Focus management
        if (options.focusFirst !== false) {
            this.focusFirstElement(modal);
        }

        // Prevent body scrolling
        if (options.preventBodyScroll !== false) {
            document.body.style.overflow = 'hidden';
        }

        return modal;
    }

    /**
     * Hide modal by ID
     * @param {string} modalId - Modal element ID
     */
    hideModal(modalId) {
        const modal = getElementById(modalId);
        if (!modal) return;

        // Remove from active modals
        const index = this.activeModals.indexOf(modalId);
        if (index > -1) {
            this.activeModals.splice(index, 1);
        }

        // Hide modal
        addClass(modal, CSS_CLASSES.HIDDEN);

        // Remove escape key handler if no active modals
        if (this.activeModals.length === 0) {
            document.removeEventListener('keydown', this.escapeHandler);
            document.body.style.overflow = '';
        }

        // Clean up click outside handler
        this.cleanupClickOutsideHandler(modal);
    }

    /**
     * Hide all active modals
     */
    hideAllModals() {
        [...this.activeModals].forEach(modalId => {
            this.hideModal(modalId);
        });
    }

    /**
     * Check if any modal is currently active
     * @returns {boolean} True if modal is active
     */
    hasActiveModal() {
        return this.activeModals.length > 0;
    }

    /**
     * Handle escape key press
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape' && this.activeModals.length > 0) {
            const lastModal = this.activeModals[this.activeModals.length - 1];
            this.hideModal(lastModal);
        }
    }

    /**
     * Set up click outside handler for modal
     * @param {HTMLElement} modal - Modal element
     * @param {string} modalId - Modal ID
     */
    setupClickOutsideHandler(modal, modalId) {
        const handler = (event) => {
            const modalContent = modal.querySelector('[data-modal-content]') ||
                                modal.querySelector('.modal-content') ||
                                modal.children[0];

            if (modalContent && !modalContent.contains(event.target)) {
                this.hideModal(modalId);
            }
        };

        modal.clickOutsideHandler = handler;
        setTimeout(() => {
            document.addEventListener('click', handler);
        }, 100); // Delay to prevent immediate closure
    }

    /**
     * Clean up click outside handler
     * @param {HTMLElement} modal - Modal element
     */
    cleanupClickOutsideHandler(modal) {
        if (modal.clickOutsideHandler) {
            document.removeEventListener('click', modal.clickOutsideHandler);
            modal.clickOutsideHandler = null;
        }
    }

    /**
     * Focus first focusable element in modal
     * @param {HTMLElement} modal - Modal element
     */
    focusFirstElement(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

/**
 * Dropdown management system
 */
export class DropdownManager {
    constructor() {
        this.activeDropdowns = [];
        this.clickHandler = this.handleDocumentClick.bind(this);
    }

    /**
     * Toggle dropdown visibility
     * @param {string} dropdownId - Dropdown element ID
     * @param {string} triggerId - Trigger element ID
     */
    toggleDropdown(dropdownId, triggerId) {
        const dropdown = getElementById(dropdownId);
        const trigger = getElementById(triggerId);

        if (!dropdown || !trigger) return;

        const isOpen = this.isDropdownOpen(dropdownId);

        if (isOpen) {
            this.closeDropdown(dropdownId);
        } else {
            this.openDropdown(dropdownId, triggerId);
        }
    }

    /**
     * Open dropdown
     * @param {string} dropdownId - Dropdown element ID
     * @param {string} triggerId - Trigger element ID
     */
    openDropdown(dropdownId, triggerId) {
        const dropdown = getElementById(dropdownId);
        const trigger = getElementById(triggerId);

        if (!dropdown || !trigger) return;

        // Close other dropdowns
        this.closeAllDropdowns();

        // Show dropdown
        removeClass(dropdown, CSS_CLASSES.HIDDEN);
        addClass(trigger, CSS_CLASSES.DROPDOWN_OPEN);

        // Add to active dropdowns
        this.activeDropdowns.push(dropdownId);

        // Set up document click handler
        if (this.activeDropdowns.length === 1) {
            setTimeout(() => {
                document.addEventListener('click', this.clickHandler);
            }, 100);
        }

        // Position dropdown if needed
        this.positionDropdown(dropdown, trigger);
    }

    /**
     * Close dropdown
     * @param {string} dropdownId - Dropdown element ID
     */
    closeDropdown(dropdownId) {
        const dropdown = getElementById(dropdownId);
        const trigger = getElementById(`${dropdownId}Trigger`);

        if (!dropdown) return;

        // Hide dropdown
        addClass(dropdown, CSS_CLASSES.HIDDEN);
        if (trigger) {
            removeClass(trigger, CSS_CLASSES.DROPDOWN_OPEN);
        }

        // Remove from active dropdowns
        const index = this.activeDropdowns.indexOf(dropdownId);
        if (index > -1) {
            this.activeDropdowns.splice(index, 1);
        }

        // Remove document click handler if no active dropdowns
        if (this.activeDropdowns.length === 0) {
            document.removeEventListener('click', this.clickHandler);
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        [...this.activeDropdowns].forEach(dropdownId => {
            this.closeDropdown(dropdownId);
        });
    }

    /**
     * Check if dropdown is open
     * @param {string} dropdownId - Dropdown element ID
     * @returns {boolean} True if dropdown is open
     */
    isDropdownOpen(dropdownId) {
        return this.activeDropdowns.includes(dropdownId);
    }

    /**
     * Handle document click for closing dropdowns
     * @param {Event} event - Click event
     */
    handleDocumentClick(event) {
        this.activeDropdowns.forEach(dropdownId => {
            const dropdown = getElementById(dropdownId);
            const trigger = getElementById(`${dropdownId}Trigger`);

            if (dropdown && trigger) {
                if (!dropdown.contains(event.target) && !trigger.contains(event.target)) {
                    this.closeDropdown(dropdownId);
                }
            }
        });
    }

    /**
     * Position dropdown relative to trigger
     * @param {HTMLElement} dropdown - Dropdown element
     * @param {HTMLElement} trigger - Trigger element
     */
    positionDropdown(dropdown, trigger) {
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Check if dropdown fits below trigger
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        if (spaceBelow < dropdownRect.height && spaceAbove > spaceBelow) {
            // Position above trigger
            dropdown.style.bottom = `${viewportHeight - triggerRect.top}px`;
            dropdown.style.top = 'auto';
        } else {
            // Position below trigger (default)
            dropdown.style.top = `${triggerRect.bottom}px`;
            dropdown.style.bottom = 'auto';
        }

        dropdown.style.left = `${triggerRect.left}px`;
        dropdown.style.minWidth = `${triggerRect.width}px`;
    }
}

/**
 * Loading state management
 */
export class LoadingStateManager {
    constructor() {
        this.loadingStates = new Map();
    }

    /**
     * Start loading state for element
     * @param {string} elementId - Element ID
     * @param {string} loadingText - Loading text (optional)
     * @returns {string} Loading state ID
     */
    startLoading(elementId, loadingText = 'Loading...') {
        const element = getElementById(elementId);
        if (!element) return null;

        const loadingId = `loading_${Date.now()}_${Math.random()}`;
        const originalState = {
            text: element.textContent,
            disabled: element.disabled,
            className: element.className
        };

        // Store original state
        this.loadingStates.set(loadingId, { elementId, originalState });

        // Apply loading state
        element.textContent = loadingText;
        element.disabled = true;
        addClass(element, 'loading');

        return loadingId;
    }

    /**
     * Stop loading state
     * @param {string} loadingId - Loading state ID
     */
    stopLoading(loadingId) {
        const loadingState = this.loadingStates.get(loadingId);
        if (!loadingState) return;

        const element = getElementById(loadingState.elementId);
        if (!element) return;

        const { originalState } = loadingState;

        // Restore original state
        element.textContent = originalState.text;
        element.disabled = originalState.disabled;
        element.className = originalState.className;

        // Remove loading state
        this.loadingStates.delete(loadingId);
    }

    /**
     * Stop all loading states
     */
    stopAllLoading() {
        this.loadingStates.forEach((_, loadingId) => {
            this.stopLoading(loadingId);
        });
    }
}

// Create singleton instances
export const tooltipManager = new TooltipManager();
export const modalManager = new ModalManager();
export const dropdownManager = new DropdownManager();
export const loadingManager = new LoadingStateManager();

// Convenience functions
export const showTooltip = (element, content, event) => tooltipManager.showTooltip(element, content, event);
export const hideTooltip = () => tooltipManager.hideTooltip();
export const setupTooltip = (element, content) => tooltipManager.setupPerformanceTooltip(element, content);

export const showModal = (modalId, options) => modalManager.showModal(modalId, options);
export const hideModal = (modalId) => modalManager.hideModal(modalId);
export const hideAllModals = () => modalManager.hideAllModals();

export const toggleDropdown = (dropdownId, triggerId) => dropdownManager.toggleDropdown(dropdownId, triggerId);
export const closeAllDropdowns = () => dropdownManager.closeAllDropdowns();

export const startLoading = (elementId, text) => loadingManager.startLoading(elementId, text);
export const stopLoading = (loadingId) => loadingManager.stopLoading(loadingId);