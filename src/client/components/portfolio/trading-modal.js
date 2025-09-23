/**
 * Trading Modal Component
 * Asset trading interface with buy/sell/convert functionality
 * Extracted from monolithic BitcoinGame class as part of Task 6.3
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters.js';

export class TradingModal {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Trading modal state
        this.isOpen = false;
        this.currentAsset = null;
        this.tradingMode = 'buy'; // 'buy', 'sell', 'convert'
        this.tradingData = {
            fromAsset: null,
            toAsset: null,
            amount: 0,
            price: 0,
            total: 0,
            fees: 0
        };

        // Form validation state
        this.isFormValid = false;
        this.validationErrors = {};

        // Modal configuration
        this.modalOptions = {
            closeOnBackdrop: true,
            closeOnEscape: true,
            showFees: true,
            showPreview: true,
            enableValidation: true,
            autoCalculate: true
        };
    }

    /**
     * Initialize the trading modal component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('TradingModal already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.portfolioService || !this.services.priceService) {
                console.error('TradingModal requires portfolioService and priceService');
                return;
            }

            // Merge options
            this.modalOptions = { ...this.modalOptions, ...options };

            // Set up event listeners
            this.setupEventListeners();

            // Listen for modal open events
            this.setupModalEventListeners();

            this.isInitialized = true;
            console.log('TradingModal initialized successfully');

        } catch (error) {
            console.error('Failed to initialize trading modal:', error);
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Listen for trading modal open events
        document.addEventListener('openTradingModal', (e) => {
            if (e.detail && e.detail.asset) {
                this.openModal(e.detail.asset, e.detail.mode || 'buy');
            }
        });

        // Listen for convert modal open events
        document.addEventListener('openConvertModal', (e) => {
            if (e.detail && e.detail.asset) {
                this.openModal(e.detail.asset, 'convert');
            }
        });
    }

    /**
     * Set up modal-specific event listeners
     */
    setupModalEventListeners() {
        // Close modal button
        const closeBtn = getElementById('tradingModalClose');
        if (closeBtn) {
            const cleanup = addEventListener(closeBtn, 'click', () => {
                this.closeModal();
            });
            this.eventListeners.push(cleanup);
        }

        // Modal backdrop click
        const modal = getElementById('tradingModal');
        if (modal && this.modalOptions.closeOnBackdrop) {
            const cleanup = addEventListener(modal, 'click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
            this.eventListeners.push(cleanup);
        }

        // Escape key handler
        if (this.modalOptions.closeOnEscape) {
            const cleanup = addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeModal();
                }
            });
            this.eventListeners.push(cleanup);
        }

        // Trading mode tabs
        this.setupTradingModeHandlers();

        // Form inputs
        this.setupFormHandlers();

        // Action buttons
        this.setupActionHandlers();
    }

    /**
     * Set up trading mode handlers
     */
    setupTradingModeHandlers() {
        const modeButtons = document.querySelectorAll('[data-trading-mode]');
        modeButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', (e) => {
                e.preventDefault();
                const mode = button.dataset.tradingMode;
                this.setTradingMode(mode);
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Set up form input handlers
     */
    setupFormHandlers() {
        // Amount input
        const amountInput = getElementById('tradingAmount');
        if (amountInput) {
            const cleanup = addEventListener(amountInput, 'input', () => {
                this.updateTradingCalculations();
                this.validateForm();
            });
            this.eventListeners.push(cleanup);
        }

        // Price input (for limit orders)
        const priceInput = getElementById('tradingPrice');
        if (priceInput) {
            const cleanup = addEventListener(priceInput, 'input', () => {
                this.updateTradingCalculations();
                this.validateForm();
            });
            this.eventListeners.push(cleanup);
        }

        // Asset selector (for convert mode)
        const assetSelector = getElementById('tradingToAsset');
        if (assetSelector) {
            const cleanup = addEventListener(assetSelector, 'change', () => {
                this.updateTargetAsset();
                this.updateTradingCalculations();
                this.validateForm();
            });
            this.eventListeners.push(cleanup);
        }

        // Max amount button
        const maxAmountBtn = getElementById('tradingMaxAmount');
        if (maxAmountBtn) {
            const cleanup = addEventListener(maxAmountBtn, 'click', () => {
                this.setMaxAmount();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up action button handlers
     */
    setupActionHandlers() {
        // Confirm trade button
        const confirmBtn = getElementById('tradingConfirmBtn');
        if (confirmBtn) {
            const cleanup = addEventListener(confirmBtn, 'click', () => {
                this.confirmTrade();
            });
            this.eventListeners.push(cleanup);
        }

        // Cancel button
        const cancelBtn = getElementById('tradingCancelBtn');
        if (cancelBtn) {
            const cleanup = addEventListener(cancelBtn, 'click', () => {
                this.closeModal();
            });
            this.eventListeners.push(cleanup);
        }

        // Preview toggle
        const previewBtn = getElementById('tradingPreviewBtn');
        if (previewBtn) {
            const cleanup = addEventListener(previewBtn, 'click', () => {
                this.togglePreview();
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Open trading modal
     * @param {Object} asset - Asset to trade
     * @param {string} mode - Trading mode ('buy', 'sell', 'convert')
     */
    openModal(asset, mode = 'buy') {
        if (!asset) {
            console.error('Asset is required to open trading modal');
            return;
        }

        this.currentAsset = asset;
        this.tradingMode = mode;

        // Initialize trading data
        this.initializeTradingData();

        // Update modal content
        this.updateModalContent();

        // Show modal
        this.showModal();

        // Set focus to amount input
        const amountInput = getElementById('tradingAmount');
        if (amountInput) {
            setTimeout(() => amountInput.focus(), 100);
        }

        this.emitEvent('tradingModalOpen', { asset, mode });
    }

    /**
     * Close trading modal
     */
    closeModal() {
        if (!this.isOpen) return;

        this.hideModal();
        this.resetForm();

        this.emitEvent('tradingModalClose', { asset: this.currentAsset });

        this.currentAsset = null;
        this.tradingMode = 'buy';
    }

    /**
     * Show modal element
     */
    showModal() {
        const modal = getElementById('tradingModal');
        if (modal) {
            this.isOpen = true;
            modal.classList.remove('hidden');
            modal.classList.add('open');

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Add animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    /**
     * Hide modal element
     */
    hideModal() {
        const modal = getElementById('tradingModal');
        if (modal) {
            this.isOpen = false;
            modal.classList.remove('show');
            modal.classList.add('closing');

            // Hide after animation
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('open', 'closing');
                document.body.style.overflow = '';
            }, 300);
        }
    }

    /**
     * Set trading mode
     * @param {string} mode - Trading mode
     */
    setTradingMode(mode) {
        this.tradingMode = mode;
        this.initializeTradingData();
        this.updateModalContent();
        this.updateTradingModeUI();
    }

    /**
     * Initialize trading data based on mode
     */
    initializeTradingData() {
        this.tradingData = {
            fromAsset: null,
            toAsset: null,
            amount: 0,
            price: 0,
            total: 0,
            fees: 0
        };

        switch (this.tradingMode) {
            case 'buy':
                this.tradingData.toAsset = this.currentAsset;
                this.tradingData.fromAsset = { symbol: 'BTC', name: 'Bitcoin' };
                break;
            case 'sell':
                this.tradingData.fromAsset = this.currentAsset;
                this.tradingData.toAsset = { symbol: 'BTC', name: 'Bitcoin' };
                break;
            case 'convert':
                this.tradingData.fromAsset = this.currentAsset;
                // toAsset will be selected by user
                break;
        }

        // Get current price
        this.updateCurrentPrice();
    }

    /**
     * Update current price from service
     */
    async updateCurrentPrice() {
        try {
            if (this.currentAsset) {
                const priceData = await this.services.priceService?.getAssetPrice(this.currentAsset.symbol);
                if (priceData) {
                    this.tradingData.price = priceData.price_sats;
                    this.updatePriceDisplay();
                    this.updateTradingCalculations();
                }
            }
        } catch (error) {
            console.error('Failed to update price:', error);
        }
    }

    /**
     * Update modal content
     */
    updateModalContent() {
        this.updateModalHeader();
        this.updateTradingForm();
        this.updateAssetSelector();
        this.updateTradingModeUI();
        this.updatePreview();
    }

    /**
     * Update modal header
     */
    updateModalHeader() {
        const modalTitle = getElementById('tradingModalTitle');
        const assetSymbol = getElementById('tradingAssetSymbol');
        const assetName = getElementById('tradingAssetName');

        if (modalTitle) {
            const modeText = this.tradingMode.charAt(0).toUpperCase() + this.tradingMode.slice(1);
            modalTitle.textContent = `${modeText} ${this.currentAsset.symbol}`;
        }

        if (assetSymbol) {
            assetSymbol.textContent = this.currentAsset.symbol;
        }

        if (assetName) {
            assetName.textContent = this.currentAsset.name || this.currentAsset.symbol;
        }
    }

    /**
     * Update trading form fields
     */
    updateTradingForm() {
        const amountInput = getElementById('tradingAmount');
        const priceInput = getElementById('tradingPrice');

        // Reset form
        if (amountInput) amountInput.value = '';
        if (priceInput) priceInput.value = this.tradingData.price || '';

        // Update labels and placeholders based on mode
        const amountLabel = getElementById('tradingAmountLabel');
        const priceLabel = getElementById('tradingPriceLabel');

        if (amountLabel) {
            switch (this.tradingMode) {
                case 'buy':
                    amountLabel.textContent = `Amount to buy (${this.currentAsset.symbol})`;
                    break;
                case 'sell':
                    amountLabel.textContent = `Amount to sell (${this.currentAsset.symbol})`;
                    break;
                case 'convert':
                    amountLabel.textContent = `Amount to convert (${this.currentAsset.symbol})`;
                    break;
            }
        }

        if (priceLabel) {
            priceLabel.textContent = `Price per ${this.currentAsset.symbol} (sats)`;
        }
    }

    /**
     * Update asset selector for convert mode
     */
    updateAssetSelector() {
        const assetSelector = getElementById('tradingToAsset');
        const selectorContainer = getElementById('tradingAssetSelectorContainer');

        if (this.tradingMode === 'convert') {
            if (selectorContainer) showElement(selectorContainer);
            if (assetSelector) {
                this.populateAssetSelector(assetSelector);
            }
        } else {
            if (selectorContainer) hideElement(selectorContainer);
        }
    }

    /**
     * Populate asset selector with available assets
     * @param {HTMLElement} selector - Select element
     */
    async populateAssetSelector(selector) {
        try {
            const availableAssets = await this.services.priceService?.getAllAssets();
            if (!availableAssets) return;

            let options = '<option value="">Select asset to convert to...</option>';

            availableAssets.forEach(asset => {
                if (asset.symbol !== this.currentAsset.symbol) {
                    options += `<option value="${asset.symbol}">${asset.symbol} - ${asset.name}</option>`;
                }
            });

            // Add Bitcoin option
            options += '<option value="BTC">BTC - Bitcoin</option>';

            selector.innerHTML = options;

        } catch (error) {
            console.error('Failed to populate asset selector:', error);
        }
    }

    /**
     * Update target asset for convert mode
     */
    async updateTargetAsset() {
        const assetSelector = getElementById('tradingToAsset');
        if (!assetSelector || !assetSelector.value) return;

        const symbol = assetSelector.value;

        if (symbol === 'BTC') {
            this.tradingData.toAsset = { symbol: 'BTC', name: 'Bitcoin' };
        } else {
            try {
                const assetData = await this.services.priceService?.getAssetInfo(symbol);
                this.tradingData.toAsset = assetData;
            } catch (error) {
                console.error('Failed to get target asset info:', error);
            }
        }
    }

    /**
     * Update trading calculations
     */
    updateTradingCalculations() {
        const amountInput = getElementById('tradingAmount');
        const priceInput = getElementById('tradingPrice');

        if (!amountInput) return;

        const amount = parseFloat(amountInput.value) || 0;
        const price = parseFloat(priceInput?.value || this.tradingData.price) || 0;

        this.tradingData.amount = amount;
        this.tradingData.price = price;

        // Calculate total
        this.tradingData.total = amount * price;

        // Calculate fees (example: 0.1%)
        this.tradingData.fees = this.tradingData.total * 0.001;

        this.updateCalculationsDisplay();
    }

    /**
     * Update calculations display
     */
    updateCalculationsDisplay() {
        const totalDisplay = getElementById('tradingTotal');
        const feesDisplay = getElementById('tradingFees');
        const netDisplay = getElementById('tradingNet');

        if (totalDisplay) {
            totalDisplay.textContent = `${formatNumber(this.tradingData.total)} sats`;
        }

        if (feesDisplay) {
            feesDisplay.textContent = `${formatNumber(this.tradingData.fees)} sats`;
        }

        if (netDisplay) {
            const net = this.tradingData.total - this.tradingData.fees;
            netDisplay.textContent = `${formatNumber(net)} sats`;
        }
    }

    /**
     * Update price display
     */
    updatePriceDisplay() {
        const priceDisplay = getElementById('tradingCurrentPrice');
        if (priceDisplay) {
            priceDisplay.textContent = `${formatNumber(this.tradingData.price)} sats`;
        }
    }

    /**
     * Set maximum amount based on available balance
     */
    setMaxAmount() {
        const amountInput = getElementById('tradingAmount');
        if (!amountInput) return;

        let maxAmount = 0;

        switch (this.tradingMode) {
            case 'sell':
            case 'convert':
                maxAmount = this.currentAsset.quantity || 0;
                break;
            case 'buy':
                // Calculate max based on available sats
                if (this.tradingData.price > 0) {
                    // This would come from portfolio service
                    const availableSats = 1000000; // Example: 1M sats
                    maxAmount = Math.floor(availableSats / this.tradingData.price);
                }
                break;
        }

        amountInput.value = maxAmount.toString();
        this.updateTradingCalculations();
        this.validateForm();
    }

    /**
     * Update trading mode UI
     */
    updateTradingModeUI() {
        const modeButtons = document.querySelectorAll('[data-trading-mode]');
        modeButtons.forEach(button => {
            if (button.dataset.tradingMode === this.tradingMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Toggle preview display
     */
    togglePreview() {
        const preview = getElementById('tradingPreview');
        if (preview) {
            const isVisible = !preview.classList.contains('hidden');
            if (isVisible) {
                hideElement(preview);
            } else {
                this.updatePreview();
                showElement(preview);
            }
        }
    }

    /**
     * Update preview section
     */
    updatePreview() {
        const preview = getElementById('tradingPreview');
        if (!preview || !this.modalOptions.showPreview) return;

        const previewContent = `
            <div class="trading-preview-content">
                <h4>Trade Preview</h4>
                <div class="preview-row">
                    <span class="preview-label">Action:</span>
                    <span class="preview-value">${this.tradingMode.toUpperCase()}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Asset:</span>
                    <span class="preview-value">${this.currentAsset.symbol}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Amount:</span>
                    <span class="preview-value">${formatNumber(this.tradingData.amount)}</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Price:</span>
                    <span class="preview-value">${formatNumber(this.tradingData.price)} sats</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Total:</span>
                    <span class="preview-value">${formatNumber(this.tradingData.total)} sats</span>
                </div>
                <div class="preview-row">
                    <span class="preview-label">Fees:</span>
                    <span class="preview-value">${formatNumber(this.tradingData.fees)} sats</span>
                </div>
                <div class="preview-row preview-total">
                    <span class="preview-label">Net Amount:</span>
                    <span class="preview-value">${formatNumber(this.tradingData.total - this.tradingData.fees)} sats</span>
                </div>
            </div>
        `;

        preview.innerHTML = previewContent;
    }

    /**
     * Validate trading form
     */
    validateForm() {
        this.validationErrors = {};
        this.isFormValid = true;

        const amount = this.tradingData.amount;
        const price = this.tradingData.price;

        // Validate amount
        if (!amount || amount <= 0) {
            this.validationErrors.amount = 'Amount must be greater than 0';
            this.isFormValid = false;
        }

        // Validate price
        if (!price || price <= 0) {
            this.validationErrors.price = 'Price must be greater than 0';
            this.isFormValid = false;
        }

        // Validate sufficient balance for sell/convert
        if ((this.tradingMode === 'sell' || this.tradingMode === 'convert') &&
            amount > (this.currentAsset.quantity || 0)) {
            this.validationErrors.amount = 'Insufficient balance';
            this.isFormValid = false;
        }

        // Validate target asset for convert
        if (this.tradingMode === 'convert' && !this.tradingData.toAsset) {
            this.validationErrors.toAsset = 'Please select an asset to convert to';
            this.isFormValid = false;
        }

        this.updateValidationUI();
        this.updateConfirmButton();
    }

    /**
     * Update validation UI
     */
    updateValidationUI() {
        // Clear previous errors
        const errorElements = document.querySelectorAll('.trading-error');
        errorElements.forEach(el => el.remove());

        // Show new errors
        Object.entries(this.validationErrors).forEach(([field, message]) => {
            const input = getElementById(`trading${field.charAt(0).toUpperCase() + field.slice(1)}`);
            if (input) {
                const errorEl = document.createElement('div');
                errorEl.className = 'trading-error text-red-500 text-sm mt-1';
                errorEl.textContent = message;
                input.parentNode.appendChild(errorEl);
            }
        });
    }

    /**
     * Update confirm button state
     */
    updateConfirmButton() {
        const confirmBtn = getElementById('tradingConfirmBtn');
        if (confirmBtn) {
            confirmBtn.disabled = !this.isFormValid;
            if (this.isFormValid) {
                confirmBtn.textContent = `Confirm ${this.tradingMode.toUpperCase()}`;
            } else {
                confirmBtn.textContent = 'Please fix errors';
            }
        }
    }

    /**
     * Confirm and execute trade
     */
    async confirmTrade() {
        if (!this.isFormValid) {
            this.validateForm();
            return;
        }

        try {
            this.showLoadingState();

            const tradeData = {
                asset: this.currentAsset,
                mode: this.tradingMode,
                amount: this.tradingData.amount,
                price: this.tradingData.price,
                toAsset: this.tradingData.toAsset
            };

            // Execute trade through portfolio service
            let result;
            switch (this.tradingMode) {
                case 'buy':
                    result = await this.services.portfolioService?.buyAsset(tradeData);
                    break;
                case 'sell':
                    result = await this.services.portfolioService?.sellAsset(tradeData);
                    break;
                case 'convert':
                    result = await this.services.portfolioService?.convertAsset(tradeData);
                    break;
            }

            if (result && result.success) {
                this.services.notificationService?.showSuccess(`${this.tradingMode} completed successfully`);
                this.emitEvent('tradeCompleted', { tradeData, result });
                this.closeModal();
            } else {
                throw new Error(result?.error || 'Trade failed');
            }

        } catch (error) {
            console.error('Trade execution failed:', error);
            this.services.notificationService?.showError(`Trade failed: ${error.message}`);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const confirmBtn = getElementById('tradingConfirmBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        this.updateConfirmButton();
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        const amountInput = getElementById('tradingAmount');
        const priceInput = getElementById('tradingPrice');
        const assetSelector = getElementById('tradingToAsset');

        if (amountInput) amountInput.value = '';
        if (priceInput) priceInput.value = '';
        if (assetSelector) assetSelector.value = '';

        this.tradingData = {
            fromAsset: null,
            toAsset: null,
            amount: 0,
            price: 0,
            total: 0,
            fees: 0
        };

        this.validationErrors = {};
        this.isFormValid = false;

        // Clear error messages
        const errorElements = document.querySelectorAll('.trading-error');
        errorElements.forEach(el => el.remove());
    }

    /**
     * Check if modal is open
     * @returns {boolean} True if modal is open
     */
    isModalOpen() {
        return this.isOpen;
    }

    /**
     * Get current trading data
     * @returns {Object} Trading data
     */
    getTradingData() {
        return { ...this.tradingData };
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'TradingModal' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the trading modal component
     */
    destroy() {
        console.log('Destroying trading modal');

        // Close modal if open
        if (this.isOpen) {
            this.closeModal();
        }

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up trading modal event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.currentAsset = null;
        this.tradingMode = 'buy';
        this.isOpen = false;
        this.isInitialized = false;

        console.log('Trading modal destroyed');
    }
}

// Export singleton instance factory
export function createTradingModal(services) {
    return new TradingModal(services);
}

export default TradingModal;