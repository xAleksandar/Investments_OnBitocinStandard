/**
 * Modal Component
 * Displays modal dialogs with flexible content and styling
 * Extracted from monolithic BitcoinGame class as part of Task 6.1
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class Modal {
    constructor() {
        this.activeModals = new Map();
        this.isInitialized = false;
        this.eventListeners = [];

        // Configuration
        this.config = {
            closeOnEscape: true,
            closeOnBackdrop: true,
            animationDuration: 300,
            zIndexStart: 1000
        };

        // Track z-index for stacking modals
        this.currentZIndex = this.config.zIndexStart;
    }

    /**
     * Initialize the modal component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('Modal component already initialized');
            return;
        }

        // Merge configuration
        this.config = { ...this.config, ...options };

        // Set up global event listeners
        this.setupGlobalEventListeners();

        this.isInitialized = true;
        console.log('Modal component initialized');
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.config.closeOnEscape) {
                this.closeTopModal();
            }
        };

        const cleanup = addEventListener(document, 'keydown', escHandler);
        this.eventListeners.push(cleanup);
    }

    /**
     * Create a new modal
     * @param {string} id - Unique modal identifier
     * @param {Object} options - Modal options
     * @returns {HTMLElement} Modal element
     */
    create(id, options = {}) {
        // Remove existing modal with same ID
        this.remove(id);

        const modalOptions = {
            title: '',
            content: '',
            size: 'medium', // small, medium, large, full
            closable: true,
            backdrop: true,
            animation: true,
            className: '',
            buttons: [],
            ...options
        };

        // Create modal structure
        const modal = this.createModalElement(id, modalOptions);
        document.body.appendChild(modal);

        // Store modal reference
        this.activeModals.set(id, {
            element: modal,
            options: modalOptions,
            eventListeners: []
        });

        // Set up modal-specific event listeners
        this.setupModalEventListeners(id);

        return modal;
    }

    /**
     * Create modal DOM element
     * @param {string} id - Modal ID
     * @param {Object} options - Modal options
     * @returns {HTMLElement} Modal element
     */
    createModalElement(id, options) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `modal fixed inset-0 z-50 hidden ${options.className}`;

        // Apply z-index
        modal.style.zIndex = this.currentZIndex++;

        // Backdrop
        let backdropClass = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50';
        if (options.animation) {
            backdropClass += ' transition-opacity duration-300';
        }

        // Modal content size classes
        const sizeClasses = {
            small: 'max-w-md',
            medium: 'max-w-lg',
            large: 'max-w-2xl',
            'extra-large': 'max-w-4xl',
            full: 'max-w-full mx-4'
        };

        const sizeClass = sizeClasses[options.size] || sizeClasses.medium;

        // Content container
        let contentClass = `modal-content relative bg-white rounded-lg shadow-xl mx-auto my-8 ${sizeClass} max-h-full overflow-hidden`;
        if (options.animation) {
            contentClass += ' transition-all duration-300 transform';
        }

        // Build modal HTML
        modal.innerHTML = `
            <div class="${backdropClass}"></div>
            <div class="modal-container fixed inset-0 z-10 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="${contentClass}">
                        ${options.title ? `
                            <div class="modal-header flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 class="modal-title text-lg font-semibold text-gray-900">${options.title}</h3>
                                ${options.closable ? `
                                    <button class="modal-close text-gray-400 hover:text-gray-600 transition-colors">
                                        <span class="sr-only">Close</span>
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                        <div class="modal-body p-6">
                            ${options.content}
                        </div>
                        ${options.buttons.length > 0 ? `
                            <div class="modal-footer flex justify-end space-x-3 p-6 border-t border-gray-200">
                                ${options.buttons.map(button => `
                                    <button class="modal-button ${button.className || 'btn btn-primary'}"
                                            data-action="${button.action || ''}"
                                            ${button.disabled ? 'disabled' : ''}>
                                        ${button.text}
                                    </button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Set up event listeners for a specific modal
     * @param {string} id - Modal ID
     */
    setupModalEventListeners(id) {
        const modalData = this.activeModals.get(id);
        if (!modalData) return;

        const modal = modalData.element;
        const options = modalData.options;

        // Close button
        const closeButton = modal.querySelector('.modal-close');
        if (closeButton) {
            const cleanup = addEventListener(closeButton, 'click', (e) => {
                e.preventDefault();
                this.close(id);
            });
            modalData.eventListeners.push(cleanup);
        }

        // Backdrop click
        if (options.backdrop && this.config.closeOnBackdrop) {
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                const cleanup = addEventListener(backdrop, 'click', (e) => {
                    if (e.target === backdrop) {
                        this.close(id);
                    }
                });
                modalData.eventListeners.push(cleanup);
            }
        }

        // Button actions
        const buttons = modal.querySelectorAll('.modal-button');
        buttons.forEach(button => {
            const cleanup = addEventListener(button, 'click', (e) => {
                e.preventDefault();
                const action = button.dataset.action;
                if (action) {
                    this.handleButtonAction(id, action, e);
                }
            });
            modalData.eventListeners.push(cleanup);
        });
    }

    /**
     * Handle button actions
     * @param {string} id - Modal ID
     * @param {string} action - Button action
     * @param {Event} event - Click event
     */
    handleButtonAction(id, action, event) {
        const modalData = this.activeModals.get(id);
        if (!modalData) return;

        // Emit custom event
        const actionEvent = new CustomEvent('modalAction', {
            detail: { modalId: id, action, originalEvent: event }
        });
        modalData.element.dispatchEvent(actionEvent);

        // Handle common actions
        switch (action) {
            case 'close':
            case 'cancel':
                this.close(id);
                break;
            case 'confirm':
                // Let the consumer handle confirm action via event listener
                break;
        }
    }

    /**
     * Show a modal
     * @param {string} id - Modal ID
     * @param {Object} data - Optional data to pass to modal
     */
    show(id, data = {}) {
        const modalData = this.activeModals.get(id);
        if (!modalData) {
            console.error(`Modal with ID '${id}' not found`);
            return;
        }

        const modal = modalData.element;
        const options = modalData.options;

        // Update content if data provided
        if (data.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = data.title;
        }

        if (data.content) {
            const bodyElement = modal.querySelector('.modal-body');
            if (bodyElement) bodyElement.innerHTML = data.content;
        }

        // Show modal
        modal.classList.remove('hidden');

        // Trigger animation
        if (options.animation) {
            const backdrop = modal.querySelector('.modal-backdrop');
            const content = modal.querySelector('.modal-content');

            if (backdrop) {
                backdrop.style.opacity = '0';
                setTimeout(() => {
                    backdrop.style.opacity = '1';
                }, 10);
            }

            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'scale(0.95) translateY(-20px)';
                setTimeout(() => {
                    content.style.opacity = '1';
                    content.style.transform = 'scale(1) translateY(0)';
                }, 10);
            }
        }

        // Emit show event
        const showEvent = new CustomEvent('modalShow', {
            detail: { modalId: id, data }
        });
        modal.dispatchEvent(showEvent);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide a modal
     * @param {string} id - Modal ID
     */
    close(id) {
        const modalData = this.activeModals.get(id);
        if (!modalData) {
            console.error(`Modal with ID '${id}' not found`);
            return;
        }

        const modal = modalData.element;
        const options = modalData.options;

        // Emit close event (can be prevented)
        const closeEvent = new CustomEvent('modalClose', {
            detail: { modalId: id },
            cancelable: true
        });
        modal.dispatchEvent(closeEvent);

        if (closeEvent.defaultPrevented) {
            return; // Close was prevented
        }

        // Hide with animation
        if (options.animation) {
            const backdrop = modal.querySelector('.modal-backdrop');
            const content = modal.querySelector('.modal-content');

            if (backdrop) backdrop.style.opacity = '0';
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'scale(0.95) translateY(-20px)';
            }

            setTimeout(() => {
                modal.classList.add('hidden');
                this.checkBodyScroll();
            }, this.config.animationDuration);
        } else {
            modal.classList.add('hidden');
            this.checkBodyScroll();
        }
    }

    /**
     * Close the topmost modal
     */
    closeTopModal() {
        if (this.activeModals.size === 0) return;

        // Find the modal with highest z-index
        let topModal = null;
        let highestZIndex = -1;

        for (const [id, modalData] of this.activeModals) {
            const modal = modalData.element;
            if (!modal.classList.contains('hidden')) {
                const zIndex = parseInt(modal.style.zIndex) || 0;
                if (zIndex > highestZIndex) {
                    highestZIndex = zIndex;
                    topModal = id;
                }
            }
        }

        if (topModal) {
            this.close(topModal);
        }
    }

    /**
     * Check if body scroll should be restored
     */
    checkBodyScroll() {
        // Only restore body scroll if no modals are visible
        const hasVisibleModal = Array.from(this.activeModals.values())
            .some(modalData => !modalData.element.classList.contains('hidden'));

        if (!hasVisibleModal) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Remove a modal
     * @param {string} id - Modal ID
     */
    remove(id) {
        const modalData = this.activeModals.get(id);
        if (!modalData) return;

        // Clean up event listeners
        modalData.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up modal event listener:', error);
            }
        });

        // Remove from DOM
        modalData.element.remove();

        // Remove from active modals
        this.activeModals.delete(id);

        // Check body scroll
        this.checkBodyScroll();
    }

    /**
     * Update modal content
     * @param {string} id - Modal ID
     * @param {Object} data - Update data
     */
    update(id, data = {}) {
        const modalData = this.activeModals.get(id);
        if (!modalData) {
            console.error(`Modal with ID '${id}' not found`);
            return;
        }

        const modal = modalData.element;

        if (data.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = data.title;
        }

        if (data.content) {
            const bodyElement = modal.querySelector('.modal-body');
            if (bodyElement) bodyElement.innerHTML = data.content;
        }
    }

    /**
     * Check if a modal is open
     * @param {string} id - Modal ID
     * @returns {boolean} True if modal is open
     */
    isOpen(id) {
        const modalData = this.activeModals.get(id);
        return modalData && !modalData.element.classList.contains('hidden');
    }

    /**
     * Get modal element
     * @param {string} id - Modal ID
     * @returns {HTMLElement|null} Modal element
     */
    getModal(id) {
        const modalData = this.activeModals.get(id);
        return modalData ? modalData.element : null;
    }

    /**
     * Create and show a simple confirmation modal
     * @param {Object} options - Confirmation options
     * @returns {Promise<boolean>} Promise that resolves to true if confirmed
     */
    confirm(options = {}) {
        return new Promise((resolve) => {
            const confirmOptions = {
                title: options.title || 'Confirm',
                content: options.message || 'Are you sure?',
                size: 'small',
                buttons: [
                    {
                        text: options.cancelText || 'Cancel',
                        action: 'cancel',
                        className: 'btn btn-secondary'
                    },
                    {
                        text: options.confirmText || 'Confirm',
                        action: 'confirm',
                        className: 'btn btn-primary'
                    }
                ],
                ...options
            };

            const modalId = 'confirmModal';
            this.create(modalId, confirmOptions);

            const modal = this.getModal(modalId);
            if (modal) {
                // Handle button actions
                const handleAction = (e) => {
                    const action = e.detail.action;
                    modal.removeEventListener('modalAction', handleAction);

                    if (action === 'confirm') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }

                    this.remove(modalId);
                };

                modal.addEventListener('modalAction', handleAction);

                // Handle modal close
                const handleClose = () => {
                    modal.removeEventListener('modalClose', handleClose);
                    resolve(false);
                    this.remove(modalId);
                };

                modal.addEventListener('modalClose', handleClose);

                this.show(modalId);
            }
        });
    }

    /**
     * Destroy the modal component
     */
    destroy() {
        // Close and remove all modals
        for (const id of this.activeModals.keys()) {
            this.remove(id);
        }

        // Clean up global event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up modal event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.activeModals.clear();
        this.currentZIndex = this.config.zIndexStart;
        this.isInitialized = false;

        // Restore body scroll
        document.body.style.overflow = '';

        console.log('Modal component destroyed');
    }
}

// Create and export singleton instance
export const modal = new Modal();

export default modal;
