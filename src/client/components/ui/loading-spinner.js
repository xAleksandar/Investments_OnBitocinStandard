/**
 * Loading Spinner Component
 * Displays loading indicators with various styles and configurations
 * Extracted from monolithic BitcoinGame class as part of Task 6.1
 */

import { getElementById, showElement, hideElement } from '../../utils/dom-helpers.js';

export class LoadingSpinner {
    constructor() {
        this.spinners = new Map();
        this.isInitialized = false;

        // Spinner types and their SVG/CSS
        this.spinnerTypes = {
            default: {
                className: 'animate-spin',
                svg: `
                    <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                `
            },
            dots: {
                className: 'flex space-x-1',
                svg: `
                    <div class="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-current rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-current rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                `
            },
            pulse: {
                className: 'animate-pulse',
                svg: `
                    <div class="w-8 h-8 bg-current rounded-full opacity-60"></div>
                `
            },
            ring: {
                className: 'animate-spin',
                svg: `
                    <svg class="w-8 h-8" viewBox="0 0 50 50">
                        <circle class="stroke-current opacity-25" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                        <circle class="stroke-current" cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416" transform="rotate(-90 25 25)">
                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                `
            },
            bars: {
                className: 'flex space-x-1 items-end',
                svg: `
                    <div class="w-1 h-6 bg-current animate-pulse" style="animation-delay: 0s"></div>
                    <div class="w-1 h-4 bg-current animate-pulse" style="animation-delay: 0.1s"></div>
                    <div class="w-1 h-6 bg-current animate-pulse" style="animation-delay: 0.2s"></div>
                    <div class="w-1 h-4 bg-current animate-pulse" style="animation-delay: 0.3s"></div>
                    <div class="w-1 h-6 bg-current animate-pulse" style="animation-delay: 0.4s"></div>
                `
            }
        };

        // Size configurations
        this.sizes = {
            small: { dimension: 'w-4 h-4', text: 'text-sm' },
            medium: { dimension: 'w-8 h-8', text: 'text-base' },
            large: { dimension: 'w-12 h-12', text: 'text-lg' },
            'extra-large': { dimension: 'w-16 h-16', text: 'text-xl' }
        };

        // Color configurations
        this.colors = {
            primary: 'text-orange-500',
            secondary: 'text-gray-500',
            success: 'text-green-500',
            warning: 'text-yellow-500',
            danger: 'text-red-500',
            info: 'text-blue-500',
            white: 'text-white',
            current: 'text-current'
        };
    }

    /**
     * Initialize the loading spinner component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('LoadingSpinner component already initialized');
            return;
        }

        // Auto-enhance existing spinners
        this.enhanceExistingSpinners();

        this.isInitialized = true;
        console.log('LoadingSpinner component initialized');
    }

    /**
     * Auto-enhance existing loading elements in the DOM
     */
    enhanceExistingSpinners() {
        const spinners = document.querySelectorAll('[data-spinner], .loading-spinner');
        spinners.forEach(spinner => {
            if (!spinner.dataset.spinnerEnhanced) {
                this.enhanceSpinner(spinner);
            }
        });
    }

    /**
     * Create a new loading spinner
     * @param {Object} options - Spinner options
     * @returns {HTMLElement} Spinner element
     */
    create(options = {}) {
        const spinnerOptions = {
            type: 'default',
            size: 'medium',
            color: 'primary',
            text: '',
            overlay: false,
            center: true,
            className: '',
            ...options
        };

        const spinner = document.createElement('div');
        this.setupSpinner(spinner, spinnerOptions);

        // Store spinner reference
        const spinnerId = this.generateSpinnerId();
        this.spinners.set(spinnerId, {
            element: spinner,
            options: spinnerOptions
        });

        spinner.dataset.spinnerId = spinnerId;

        return spinner;
    }

    /**
     * Enhance an existing spinner element
     * @param {HTMLElement} spinner - Spinner element to enhance
     * @param {Object} options - Enhancement options
     */
    enhanceSpinner(spinner, options = {}) {
        if (!spinner || spinner.dataset.spinnerEnhanced) return;

        const type = spinner.dataset.spinnerType || 'default';
        const size = spinner.dataset.spinnerSize || 'medium';
        const color = spinner.dataset.spinnerColor || 'primary';

        const spinnerOptions = {
            type,
            size,
            color,
            text: spinner.dataset.spinnerText || '',
            overlay: spinner.dataset.spinnerOverlay === 'true',
            center: spinner.dataset.spinnerCenter !== 'false',
            ...options
        };

        this.setupSpinner(spinner, spinnerOptions);

        // Store spinner reference
        const spinnerId = this.generateSpinnerId();
        this.spinners.set(spinnerId, {
            element: spinner,
            options: spinnerOptions
        });

        spinner.dataset.spinnerId = spinnerId;
        spinner.dataset.spinnerEnhanced = 'true';
    }

    /**
     * Set up spinner styling and content
     * @param {HTMLElement} spinner - Spinner element
     * @param {Object} options - Spinner options
     */
    setupSpinner(spinner, options) {
        // Base classes
        let className = 'loading-spinner';

        // Center alignment
        if (options.center) {
            className += ' flex items-center justify-center';
        }

        // Overlay styling
        if (options.overlay) {
            className += ' fixed inset-0 z-50 bg-black bg-opacity-50';
        }

        // Custom className
        if (options.className) {
            className += ' ' + options.className;
        }

        spinner.className = className;

        // Generate spinner content
        this.updateSpinnerContent(spinner, options);
    }

    /**
     * Update spinner content
     * @param {HTMLElement} spinner - Spinner element
     * @param {Object} options - Spinner options
     */
    updateSpinnerContent(spinner, options) {
        const spinnerType = this.spinnerTypes[options.type] || this.spinnerTypes.default;
        const size = this.sizes[options.size] || this.sizes.medium;
        const color = this.colors[options.color] || this.colors.primary;

        let content = '';

        // Container for spinner and text
        if (options.overlay) {
            content += '<div class="bg-white rounded-lg p-6 shadow-lg">';
        }

        content += `<div class="flex flex-col items-center space-y-2">`;

        // Spinner icon
        content += `<div class="${spinnerType.className} ${size.dimension} ${color}">`;
        content += spinnerType.svg;
        content += '</div>';

        // Loading text
        if (options.text) {
            content += `<div class="${size.text} ${color} text-center">${options.text}</div>`;
        }

        content += '</div>';

        if (options.overlay) {
            content += '</div>';
        }

        spinner.innerHTML = content;
    }

    /**
     * Show a loading spinner
     * @param {HTMLElement|string} target - Target element or selector
     * @param {Object} options - Spinner options
     * @returns {HTMLElement} Created spinner element
     */
    show(target, options = {}) {
        const targetElement = typeof target === 'string' ?
            document.querySelector(target) : target;

        if (!targetElement) {
            console.error('Target element not found for spinner');
            return null;
        }

        // Create spinner
        const spinner = this.create(options);

        // Add to target or body (for overlays)
        if (options.overlay) {
            document.body.appendChild(spinner);
        } else {
            // Store original content if replacing
            if (options.replace) {
                spinner.dataset.originalContent = targetElement.innerHTML;
            }

            if (options.replace) {
                targetElement.innerHTML = '';
                targetElement.appendChild(spinner);
            } else {
                targetElement.appendChild(spinner);
            }
        }

        return spinner;
    }

    /**
     * Hide a specific spinner
     * @param {HTMLElement|string} spinner - Spinner element, target element, or spinner ID
     */
    hide(spinner) {
        let spinnerElement;

        if (typeof spinner === 'string') {
            // Try to find by spinner ID first
            spinnerElement = document.querySelector(`[data-spinner-id="${spinner}"]`);

            // If not found, try as selector
            if (!spinnerElement) {
                const targetElement = document.querySelector(spinner);
                if (targetElement) {
                    spinnerElement = targetElement.querySelector('.loading-spinner');
                }
            }
        } else {
            spinnerElement = spinner;
        }

        if (!spinnerElement) {
            console.error('Spinner element not found');
            return;
        }

        const spinnerData = this.spinners.get(spinnerElement.dataset.spinnerId);

        // Restore original content if it was replaced
        if (spinnerElement.dataset.originalContent) {
            const parent = spinnerElement.parentNode;
            if (parent) {
                parent.innerHTML = spinnerElement.dataset.originalContent;
            }
        } else {
            spinnerElement.remove();
        }

        // Clean up from registry
        if (spinnerData) {
            this.spinners.delete(spinnerElement.dataset.spinnerId);
        }
    }

    /**
     * Hide all spinners
     */
    hideAll() {
        for (const [spinnerId, spinnerData] of this.spinners) {
            this.hide(spinnerData.element);
        }
    }

    /**
     * Show a full-screen overlay loading spinner
     * @param {Object} options - Spinner options
     * @returns {HTMLElement} Created spinner element
     */
    showOverlay(options = {}) {
        const overlayOptions = {
            overlay: true,
            type: 'default',
            size: 'large',
            color: 'primary',
            text: 'Loading...',
            ...options
        };

        return this.show(document.body, overlayOptions);
    }

    /**
     * Hide overlay spinner
     */
    hideOverlay() {
        const overlaySpinner = document.querySelector('.loading-spinner.fixed');
        if (overlaySpinner) {
            this.hide(overlaySpinner);
        }
    }

    /**
     * Create a simple inline spinner
     * @param {Object} options - Spinner options
     * @returns {HTMLElement} Spinner element
     */
    createInline(options = {}) {
        const inlineOptions = {
            type: 'default',
            size: 'small',
            color: 'current',
            center: false,
            className: 'inline-flex',
            ...options
        };

        return this.create(inlineOptions);
    }

    /**
     * Show spinner in button
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Optional loading text
     */
    showInButton(button, loadingText = null) {
        if (!button) return;

        // Store original content
        button.dataset.originalContent = button.innerHTML;
        button.dataset.originalDisabled = button.disabled;

        // Disable button
        button.disabled = true;

        // Create inline spinner
        const spinner = this.createInline({
            size: 'small',
            color: 'current'
        });

        // Update button content
        let content = spinner.outerHTML;
        if (loadingText) {
            content += ` <span class="ml-2">${loadingText}</span>`;
        }

        button.innerHTML = content;
    }

    /**
     * Hide spinner from button
     * @param {HTMLElement} button - Button element
     */
    hideFromButton(button) {
        if (!button || !button.dataset.originalContent) return;

        // Restore original content
        button.innerHTML = button.dataset.originalContent;
        button.disabled = button.dataset.originalDisabled === 'true';

        // Clean up data attributes
        delete button.dataset.originalContent;
        delete button.dataset.originalDisabled;
    }

    /**
     * Update spinner text
     * @param {HTMLElement|string} spinner - Spinner element or ID
     * @param {string} text - New text
     */
    updateText(spinner, text) {
        const spinnerElement = typeof spinner === 'string' ?
            document.querySelector(`[data-spinner-id="${spinner}"]`) : spinner;

        if (!spinnerElement) return;

        const spinnerData = this.spinners.get(spinnerElement.dataset.spinnerId);
        if (spinnerData) {
            spinnerData.options.text = text;
            this.updateSpinnerContent(spinnerElement, spinnerData.options);
        }
    }

    /**
     * Generate unique spinner ID
     * @returns {string} Spinner ID
     */
    generateSpinnerId() {
        return 'spinner_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Destroy the loading spinner component
     */
    destroy() {
        // Remove all spinners
        this.hideAll();

        // Reset state
        this.spinners.clear();
        this.isInitialized = false;

        console.log('LoadingSpinner component destroyed');
    }
}

// Create and export singleton instance
export const loadingSpinner = new LoadingSpinner();

// Convenience functions
export function showLoading(target, options = {}) {
    return loadingSpinner.show(target, options);
}

export function hideLoading(spinner) {
    loadingSpinner.hide(spinner);
}

export function showOverlay(options = {}) {
    return loadingSpinner.showOverlay(options);
}

export function hideOverlay() {
    loadingSpinner.hideOverlay();
}

export default loadingSpinner;