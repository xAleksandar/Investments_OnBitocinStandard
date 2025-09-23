/**
 * Button Component
 * Provides consistent button styling and behavior across the application
 * Extracted from monolithic BitcoinGame class as part of Task 6.1
 */

import { addEventListener } from '../../utils/dom-helpers.js';

export class Button {
    constructor() {
        this.buttons = new Map();
        this.isInitialized = false;

        // Default button styles and configurations
        this.styles = {
            primary: {
                base: 'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
                disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
                loading: 'bg-orange-400 cursor-wait'
            },
            secondary: {
                base: 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300',
                disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed',
                loading: 'bg-gray-200 cursor-wait'
            },
            success: {
                base: 'bg-green-500 hover:bg-green-600 text-white border-transparent',
                disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
                loading: 'bg-green-400 cursor-wait'
            },
            danger: {
                base: 'bg-red-500 hover:bg-red-600 text-white border-transparent',
                disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
                loading: 'bg-red-400 cursor-wait'
            },
            outline: {
                base: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300',
                disabled: 'bg-transparent text-gray-400 border-gray-200 cursor-not-allowed',
                loading: 'bg-gray-50 cursor-wait'
            },
            link: {
                base: 'bg-transparent hover:bg-gray-50 text-orange-500 hover:text-orange-600 border-transparent underline',
                disabled: 'bg-transparent text-gray-400 cursor-not-allowed',
                loading: 'bg-transparent cursor-wait'
            }
        };

        this.sizes = {
            small: 'px-3 py-1.5 text-sm',
            medium: 'px-4 py-2 text-sm',
            large: 'px-6 py-3 text-base',
            'extra-large': 'px-8 py-4 text-lg'
        };

        this.baseClasses = 'inline-flex items-center justify-center font-medium rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500';
    }

    /**
     * Initialize the button component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('Button component already initialized');
            return;
        }

        // Auto-enhance existing buttons
        this.enhanceExistingButtons();

        this.isInitialized = true;
        console.log('Button component initialized');
    }

    /**
     * Auto-enhance existing buttons in the DOM
     */
    enhanceExistingButtons() {
        const buttons = document.querySelectorAll('[data-button-variant], .btn');
        buttons.forEach(button => {
            if (!button.dataset.buttonEnhanced) {
                this.enhanceButton(button);
            }
        });
    }

    /**
     * Create a new button element
     * @param {Object} options - Button options
     * @returns {HTMLElement} Button element
     */
    create(options = {}) {
        const buttonOptions = {
            text: 'Button',
            variant: 'primary',
            size: 'medium',
            disabled: false,
            loading: false,
            icon: null,
            iconPosition: 'left',
            className: '',
            onClick: null,
            ...options
        };

        const button = document.createElement('button');
        button.type = options.type || 'button';

        // Set up button properties
        this.setupButton(button, buttonOptions);

        // Store button reference
        const buttonId = this.generateButtonId();
        this.buttons.set(buttonId, {
            element: button,
            options: buttonOptions,
            eventListeners: []
        });

        button.dataset.buttonId = buttonId;

        return button;
    }

    /**
     * Enhance an existing button element
     * @param {HTMLElement} button - Button element to enhance
     * @param {Object} options - Enhancement options
     */
    enhanceButton(button, options = {}) {
        if (!button || button.dataset.buttonEnhanced) return;

        // Get variant from data attribute or class
        const variant = button.dataset.buttonVariant ||
                       this.getVariantFromClasses(button) ||
                       'primary';

        const size = button.dataset.buttonSize ||
                    this.getSizeFromClasses(button) ||
                    'medium';

        const buttonOptions = {
            variant,
            size,
            disabled: button.disabled,
            loading: button.dataset.loading === 'true',
            ...options
        };

        this.setupButton(button, buttonOptions);

        // Store button reference
        const buttonId = this.generateButtonId();
        this.buttons.set(buttonId, {
            element: button,
            options: buttonOptions,
            eventListeners: []
        });

        button.dataset.buttonId = buttonId;
        button.dataset.buttonEnhanced = 'true';
    }

    /**
     * Set up button styling and behavior
     * @param {HTMLElement} button - Button element
     * @param {Object} options - Button options
     */
    setupButton(button, options) {
        // Apply styling
        this.applyButtonStyle(button, options);

        // Set content
        this.updateButtonContent(button, options);

        // Set up event listeners
        this.setupButtonEventListeners(button, options);
    }

    /**
     * Apply button styling
     * @param {HTMLElement} button - Button element
     * @param {Object} options - Button options
     */
    applyButtonStyle(button, options) {
        const variant = this.styles[options.variant] || this.styles.primary;
        const size = this.sizes[options.size] || this.sizes.medium;

        // Base classes
        let className = this.baseClasses + ' ' + size;

        // State-specific styling
        if (options.disabled) {
            className += ' ' + variant.disabled;
            button.disabled = true;
        } else if (options.loading) {
            className += ' ' + variant.loading;
            button.disabled = true;
        } else {
            className += ' ' + variant.base;
            button.disabled = false;
        }

        // Custom className
        if (options.className) {
            className += ' ' + options.className;
        }

        button.className = className;
    }

    /**
     * Update button content
     * @param {HTMLElement} button - Button element
     * @param {Object} options - Button options
     */
    updateButtonContent(button, options) {
        let content = '';

        // Loading spinner
        if (options.loading) {
            content += `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
        }

        // Icon (left side)
        if (options.icon && options.iconPosition === 'left' && !options.loading) {
            content += `<span class="mr-2">${options.icon}</span>`;
        }

        // Button text
        if (options.loading && options.loadingText) {
            content += options.loadingText;
        } else {
            content += options.text;
        }

        // Icon (right side)
        if (options.icon && options.iconPosition === 'right' && !options.loading) {
            content += `<span class="ml-2">${options.icon}</span>`;
        }

        button.innerHTML = content;
    }

    /**
     * Set up button event listeners
     * @param {HTMLElement} button - Button element
     * @param {Object} options - Button options
     */
    setupButtonEventListeners(button, options) {
        const buttonData = this.buttons.get(button.dataset.buttonId);
        if (!buttonData) return;

        // Click handler
        if (options.onClick) {
            const cleanup = addEventListener(button, 'click', (e) => {
                if (!button.disabled) {
                    options.onClick(e, button);
                }
            });
            buttonData.eventListeners.push(cleanup);
        }

        // Prevent double-click on loading buttons
        const clickHandler = (e) => {
            if (button.disabled || options.loading) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const cleanup = addEventListener(button, 'click', clickHandler, true);
        buttonData.eventListeners.push(cleanup);
    }

    /**
     * Update button state
     * @param {HTMLElement|string} button - Button element or button ID
     * @param {Object} updates - State updates
     */
    updateButton(button, updates = {}) {
        const buttonElement = typeof button === 'string' ?
            document.querySelector(`[data-button-id="${button}"]`) : button;

        if (!buttonElement) {
            console.error('Button not found');
            return;
        }

        const buttonData = this.buttons.get(buttonElement.dataset.buttonId);
        if (!buttonData) {
            console.error('Button data not found');
            return;
        }

        // Update options
        const newOptions = { ...buttonData.options, ...updates };
        buttonData.options = newOptions;

        // Re-apply styling and content
        this.applyButtonStyle(buttonElement, newOptions);
        this.updateButtonContent(buttonElement, newOptions);
    }

    /**
     * Set button loading state
     * @param {HTMLElement|string} button - Button element or button ID
     * @param {boolean} loading - Loading state
     * @param {string} loadingText - Optional loading text
     */
    setLoading(button, loading = true, loadingText = null) {
        const updates = { loading };
        if (loadingText) {
            updates.loadingText = loadingText;
        }
        this.updateButton(button, updates);
    }

    /**
     * Set button disabled state
     * @param {HTMLElement|string} button - Button element or button ID
     * @param {boolean} disabled - Disabled state
     */
    setDisabled(button, disabled = true) {
        this.updateButton(button, { disabled });
    }

    /**
     * Update button text
     * @param {HTMLElement|string} button - Button element or button ID
     * @param {string} text - New button text
     */
    setText(button, text) {
        this.updateButton(button, { text });
    }

    /**
     * Get variant from existing CSS classes
     * @param {HTMLElement} button - Button element
     * @returns {string} Variant name
     */
    getVariantFromClasses(button) {
        const classList = Array.from(button.classList);

        if (classList.some(cls => cls.includes('bg-red') || cls.includes('btn-danger'))) {
            return 'danger';
        }
        if (classList.some(cls => cls.includes('bg-green') || cls.includes('btn-success'))) {
            return 'success';
        }
        if (classList.some(cls => cls.includes('bg-gray') || cls.includes('btn-secondary'))) {
            return 'secondary';
        }
        if (classList.some(cls => cls.includes('border-') && cls.includes('bg-transparent'))) {
            return 'outline';
        }
        if (classList.some(cls => cls.includes('underline') || cls.includes('btn-link'))) {
            return 'link';
        }

        return 'primary';
    }

    /**
     * Get size from existing CSS classes
     * @param {HTMLElement} button - Button element
     * @returns {string} Size name
     */
    getSizeFromClasses(button) {
        const classList = Array.from(button.classList);

        if (classList.some(cls => cls.includes('text-lg') || cls.includes('btn-xl'))) {
            return 'extra-large';
        }
        if (classList.some(cls => cls.includes('text-base') || cls.includes('btn-lg'))) {
            return 'large';
        }
        if (classList.some(cls => cls.includes('text-xs') || cls.includes('btn-sm'))) {
            return 'small';
        }

        return 'medium';
    }

    /**
     * Generate unique button ID
     * @returns {string} Button ID
     */
    generateButtonId() {
        return 'btn_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Remove a button
     * @param {HTMLElement|string} button - Button element or button ID
     */
    remove(button) {
        const buttonElement = typeof button === 'string' ?
            document.querySelector(`[data-button-id="${button}"]`) : button;

        if (!buttonElement) return;

        const buttonData = this.buttons.get(buttonElement.dataset.buttonId);
        if (buttonData) {
            // Clean up event listeners
            buttonData.eventListeners.forEach(cleanup => {
                try {
                    cleanup();
                } catch (error) {
                    console.error('Error cleaning up button event listener:', error);
                }
            });

            this.buttons.delete(buttonElement.dataset.buttonId);
        }

        buttonElement.remove();
    }

    /**
     * Destroy the button component
     */
    destroy() {
        // Clean up all buttons
        for (const [buttonId, buttonData] of this.buttons) {
            buttonData.eventListeners.forEach(cleanup => {
                try {
                    cleanup();
                } catch (error) {
                    console.error('Error cleaning up button event listener:', error);
                }
            });
        }

        // Reset state
        this.buttons.clear();
        this.isInitialized = false;

        console.log('Button component destroyed');
    }
}

// Create and export singleton instance
export const button = new Button();

export default button;
