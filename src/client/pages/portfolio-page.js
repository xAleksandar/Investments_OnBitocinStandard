/**
 * Portfolio Page Component
 * Manages the portfolio page functionality extracted from BitcoinGame monolith
 */

import {
    getElementById,
    addEventListener,
    showElement,
    hideElement,
    setText,
    addClass,
    removeClass,
    clearElement,
    createElement
} from '../utils/dom-helpers.js';

import { ELEMENT_IDS, CSS_CLASSES } from '../utils/constants.js';
import {
    formatSatoshisForUI,
    formatPercentageWithStyle,
    formatHoldingDisplay,
    formatLockStatus,
    formatTimeRemaining
} from '../utils/formatters.js';

import { validateTradeAmount, validateAssetPair } from '../utils/validators.js';

export class PortfolioPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Portfolio data
        this.holdings = [];
        this.tradeHistory = [];

        // UI state
        this.selectedHolding = null;
        this.isTrading = false;
        this.mainAppListenersSetup = false;

        // Component elements
        this.holdingsGrid = null;
        this.tradeForm = null;
        this.assetDetailsModal = null;
        this.tradingInterface = null;
    }

    /**
     * Initialize the portfolio page component
     */
    async init() {
        if (this.isInitialized) {
return;
}

        try {
            console.log('Initializing portfolio page component');

            // Get DOM elements
            this.initializeDOMElements();

            // Set up event listeners
            this.setupEventListeners();

            // Load portfolio data
            await this.loadPortfolioData();

            // Initialize components
            await this.initializeComponents();

            // Start price auto-refresh
            this.startPriceAutoRefresh();

            this.isInitialized = true;
            console.log('Portfolio page component initialized successfully');
        } catch (error) {
            console.error('Failed to initialize portfolio page:', error);
             // Check authentication
            if (!this.services.authService?.isAuthenticated()) {
                return;
            }
            this.services.notificationService?.showError('Failed to load portfolio page');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeDOMElements() {
        this.holdingsGrid = getElementById('holdings');
        this.tradeForm = getElementById('tradeForm');
        // Support both new and legacy modal IDs
        this.assetDetailsModal = getElementById('assetDetailsModal') || getElementById('assetModal');
        this.tradingInterface = getElementById('tradingInterface');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (this.mainAppListenersSetup) {
return;
}
        this.mainAppListenersSetup = true;

        // Trade form submission
        if (this.tradeForm) {
            const tradeSubmitHandler = (e) => {
                e.preventDefault();
                this.executeTrade();
            };
            this.eventListeners.push(
                addEventListener(this.tradeForm, 'submit', tradeSubmitHandler)
            );
        }

        // Refresh button
        const refreshBtn = getElementById('refreshPortfolio');
        if (refreshBtn) {
            const refreshHandler = () => this.refreshPortfolio();
            this.eventListeners.push(
                addEventListener(refreshBtn, 'click', refreshHandler)
            );
        }

        // Asset dropdown changes
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');

        if (fromAssetSelect) {
            const fromChangeHandler = () => this.handleAssetSelectionChange();
            this.eventListeners.push(
                addEventListener(fromAssetSelect, 'change', fromChangeHandler)
            );
        }

        if (toAssetSelect) {
            const toChangeHandler = () => this.handleAssetSelectionChange();
            this.eventListeners.push(
                addEventListener(toAssetSelect, 'change', toChangeHandler)
            );
        }

        // Trade amount input
        const tradeAmountInput = getElementById('tradeAmount');
        const amountUnitSelect = getElementById('amountUnit');
        if (tradeAmountInput) {
            const amountInputHandler = () => this.handleTradeAmountInput();
            this.eventListeners.push(
                addEventListener(tradeAmountInput, 'input', amountInputHandler)
            );
        }

        // Portfolio service listeners
        this.setupPortfolioServiceListeners();
    }

    /**
     * Set up portfolio service listeners
     */
    setupPortfolioServiceListeners() {
        if (this.services.portfolioService) {
            const portfolioChangeHandler = (portfolioData) => {
                this.handlePortfolioDataUpdate(portfolioData);
            };

            this.services.portfolioService.onPortfolioChange(portfolioChangeHandler);

            // Store cleanup function
            this.eventListeners.push(() => {
                this.services.portfolioService.removePortfolioListener(portfolioChangeHandler);
            });
        }

        // Price change listeners
        if (this.services.priceService) {
            const priceChangeHandler = (priceData) => {
                this.handlePriceUpdate(priceData);
            };

            this.services.priceService.onPriceChange(priceChangeHandler);

            // Store cleanup function
            this.eventListeners.push(() => {
                this.services.priceService.removePriceListener(priceChangeHandler);
            });
        }
    }

    /**
     * Load portfolio data
     */
    async loadPortfolioData() {
        try {
            // Load portfolio and trade history in parallel
            await Promise.all([
                this.services.portfolioService?.loadPortfolio(),
                this.services.portfolioService?.loadTradeHistory()
            ]);

            // Update holdings reference
            this.holdings = this.services.portfolioService?.getHoldings() || [];
            this.tradeHistory = this.services.portfolioService?.getTradeHistory() || [];

            console.log('Portfolio data loaded successfully');
        } catch (error) {
            console.error('Failed to load portfolio data:', error);
            throw error;
        }
    }

    /**
     * Initialize portfolio components
     */
    async initializeComponents() {
        await Promise.all([
            this.initializePortfolioGrid(),
            this.initializeTradingInterface(),
            this.initializeAssetDetailsModal(),
            this.initializePriceChart(),
            this.updateAssetDropdowns(),
            this.initializeSetForgetPortfolios()
        ]);
    }

    /**
     * Initialize the TradingView price chart in portfolio view
     */
    async initializePriceChart() {
        const container = getElementById('tradingview-widget-container');
        if (!container) {
return;
}

        // Clear any existing content
        container.innerHTML = '';

        const defaultSymbol = 'BITSTAMP:BTCUSD';

        const createWidget = () => {
            if (typeof TradingView === 'undefined') {
                console.error('TradingView library not loaded');
                container.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Failed to load chart. Please check your internet connection.
                    </div>
                `;
                return;
            }

            try {
                new TradingView.widget({
                    width: '100%',
                    height: 600,
                    symbol: defaultSymbol,
                    interval: 'D',
                    timezone: 'Etc/UTC',
                    theme: 'light',
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#f1f3f6',
                    enable_publishing: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: false,
                    container_id: 'tradingview-widget-container'
                });
            } catch (err) {
                console.error('Failed to initialize TradingView widget:', err);
                container.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Failed to initialize chart.
                    </div>
                `;
            }
        };

        if (typeof TradingView !== 'undefined') {
            createWidget();
        } else {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.onload = createWidget;
            script.onerror = () => {
                container.innerHTML = `
                    <div class="flex items-center justify-center h-64 text-gray-500">
                        Failed to load chart library.
                    </div>
                `;
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Initialize portfolio grid component
     */
    async initializePortfolioGrid() {
        if (!this.holdingsGrid) {
return;
}

        // Display current portfolio
        this.displayPortfolio();

        // Set up grid interactions
        this.setupPortfolioGridInteractions();
    }

    /**
     * Initialize trading interface component
     */
    async initializeTradingInterface() {
        if (!this.tradingInterface) {
return;
}

        // Set up trading form validation
        this.setupTradingValidation();

        // Initialize trade amount helper
        this.initializeTradeAmountHelper();
    }

    /**
     * Initialize asset details modal component
     */
    async initializeAssetDetailsModal() {
        if (!this.assetDetailsModal) {
return;
}

        // Set up modal close handlers
        this.setupModalCloseHandlers();
    }

    /**
     * Initialize Set & Forget portfolios UI
     */
    async initializeSetForgetPortfolios() {
        // Button to open creation modal
        const openBtn = getElementById('createSetForgetBtn');
        const modal = getElementById('setForgetModal');
        const closeBtn = getElementById('closeSetForgetModal');
        const cancelBtn = getElementById('cancelSetForget');

        if (openBtn && modal) {
            const openHandler = (e) => {
                e.preventDefault();
                this.showSetForgetModal();
            };
            this.eventListeners.push(addEventListener(openBtn, 'click', openHandler));
        }

        if (closeBtn && modal) {
            const closeHandler = (e) => {
                e.preventDefault();
                this.hideSetForgetModal();
            };
            this.eventListeners.push(addEventListener(closeBtn, 'click', closeHandler));
        }

        if (cancelBtn && modal) {
            const cancelHandler = (e) => {
                e.preventDefault();
                this.hideSetForgetModal();
            };
            this.eventListeners.push(addEventListener(cancelBtn, 'click', cancelHandler));
        }

        // Close when clicking backdrop (but not inner content)
        if (modal) {
            const backdropHandler = (e) => {
                if (e.target === modal) {
this.hideSetForgetModal();
}
            };
            this.eventListeners.push(addEventListener(modal, 'click', backdropHandler));
        }

        // Form submit
        const form = getElementById('setForgetForm');
        if (form) {
            const submitHandler = (e) => {
                e.preventDefault();
                this.createSetForgetPortfolio();
            };
            this.eventListeners.push(addEventListener(form, 'submit', submitHandler));
        }
    }

    // ===== Set & Forget (ported popup behavior) =====

    async showSetForgetModal() {
        const modal = getElementById('setForgetModal');
        if (!modal) {
return;
}
        try {
            this.setForgetAssets = await (this.services.apiClient?.getAssets() || []);
        } catch (_) {
 this.setForgetAssets = [];
}
        this.resetSetForgetForm();
        this.initAllocationChart();
        this.addAllocationInput();
        showElement(modal);
        const cs = window.getComputedStyle(modal);
        if (cs.display === 'none') {
modal.style.display = 'block';
}
    }

    hideSetForgetModal() {
        const modal = getElementById('setForgetModal');
        if (modal) {
hideElement(modal);
}
        this.resetSetForgetForm();
    }

    resetSetForgetForm() {
        const form = getElementById('setForgetForm');
        if (form) {
form.reset();
}
        const container = getElementById('allocationInputs');
        if (container) {
container.innerHTML = '';
}
        this.updateAllocationTotal();
        this.clearAllocationChart?.();
    }

    addAllocationInput() {
        const container = getElementById('allocationInputs');
        if (!container) {
return;
}
        const row = document.createElement('div');
        row.className = 'allocation-input flex items-center gap-3';
        const select = document.createElement('select');
        select.className = 'asset-select w-full px-3 py-2 border rounded-lg';
        select.appendChild(new Option('Select Asset', ''));
        (this.setForgetAssets || []).forEach(a => {
            const name = a?.name && a.name.trim() ? a.name : a.symbol;
            select.appendChild(new Option(`${name} (${a.symbol})`, a.symbol));
        });
        const pct = document.createElement('input');
        pct.type = 'number'; pct.min = '0'; pct.max = '100'; pct.step = '0.1';
        pct.placeholder = '%';
        pct.className = 'percentage-input w-24 px-3 py-2 border rounded-lg';
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50';
        remove.textContent = 'Remove';
        row.appendChild(select); row.appendChild(pct); row.appendChild(remove);
        container.appendChild(row);
        select.addEventListener('change', () => {
 this.updateAssetDropdownsForSetForget(); this.ensureOneEmptyAllocation();
});
        pct.addEventListener('input', () => {
 this.updateAllocationTotal(); this.updateAllocationChart(); this.ensureOneEmptyAllocation();
});
        remove.addEventListener('click', () => {
 row.remove(); this.updateAssetDropdownsForSetForget(); this.updateAllocationTotal(); this.updateAllocationChart(); this.ensureOneEmptyAllocation();
});
    }

    ensureOneEmptyAllocation() {
        const total = this.getCurrentAllocationTotal();
        if (total >= 100) {
return;
}
        const empties = Array.from(document.querySelectorAll('.allocation-input')).filter(d => !(d.querySelector('.asset-select')?.value));
        if (empties.length === 0) {
this.addAllocationInput();
}
        if (empties.length > 1) {
for (let i = 1; i < empties.length; i++) {
empties[i].remove();
}
}
    }

    getCurrentAllocationTotal() {
        let total = 0;
        document.querySelectorAll('.percentage-input').forEach(inp => total += (parseFloat(inp.value) || 0));
        return total;
    }

    updateAllocationTotal() {
        const total = this.getCurrentAllocationTotal();
        const el = getElementById('totalAllocation');
        if (el) {
            el.textContent = `${total.toFixed(2)}%`;
            el.className = total === 100 ? 'font-medium text-green-600' : total > 100 ? 'font-medium text-red-600' : 'font-medium text-gray-700';
        }
        const submit = getElementById('createSetForgetSubmit');
        if (submit) {
submit.disabled = total !== 100 || this.getValidAllocations().length === 0 || this.hasUnselectedAssets();
}
    }

    updateAssetDropdownsForSetForget() {
        const all = new Set((this.setForgetAssets || []).map(a => a.symbol));
        document.querySelectorAll('.asset-select').forEach(sel => {
            const current = sel.value;
            const selected = new Set();
            document.querySelectorAll('.asset-select').forEach(s => {
 if (s !== sel && s.value) {
selected.add(s.value);
}
});
            sel.querySelectorAll('option').forEach(opt => {
                if (!opt.value) {
return;
}
                opt.disabled = selected.has(opt.value) || !all.has(opt.value);
            });
            if (current) {
sel.value = current;
}
        });
    }

    getValidAllocations() {
        const rows = document.querySelectorAll('.allocation-input');
        const out = [];
        rows.forEach(r => {
            const sym = r.querySelector('.asset-select')?.value;
            const pct = parseFloat(r.querySelector('.percentage-input')?.value) || 0;
            if (sym && pct >= 5) {
out.push({ asset: sym, percentage: pct });
}
        });
        return out;
    }

    hasUnselectedAssets() {
        const rows = document.querySelectorAll('.allocation-input');
        for (const r of rows) {
            const sym = r.querySelector('.asset-select')?.value;
            const pct = parseFloat(r.querySelector('.percentage-input')?.value) || 0;
            if (!sym && pct > 0) {
return true;
}
        }
        return false;
    }

    initAllocationChart() {
        this.allocationChart = {
            canvas: getElementById('allocationChart'),
            colors: ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']
        };
        this.clearAllocationChart();
    }

    updateAllocationChart() {
        if (!this.allocationChart?.canvas) {
return;
}
        const canvas = this.allocationChart.canvas;
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 20;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const allocs = this.getValidAllocations();
        const total = allocs.reduce((s, a) => s + a.percentage, 0);
        if (allocs.length === 0 || total === 0) {
 this.clearAllocationChart(); return;
}
        let ang = -Math.PI / 2;
        allocs.forEach((a, i) => {
            const slice = (a.percentage / 100) * 2 * Math.PI;
            const color = this.allocationChart.colors[i % this.allocationChart.colors.length];
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, ang + slice); ctx.closePath();
            ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ang += slice;
        });
        this.updateChartLegend(allocs);
    }

    updateChartLegend(allocs) {
        const legend = getElementById('chartLegend');
        if (!legend) {
return;
}
        legend.innerHTML = allocs.map((a, i) => {
            const color = this.allocationChart.colors[i % this.allocationChart.colors.length];
            return `<div class="flex items-center gap-2"><div class="w-4 h-4 rounded" style="background-color:${color}"></div><span class="text-sm">${a.asset} (${a.percentage.toFixed(1)}%)</span></div>`;
        }).join('');
    }

    clearAllocationChart() {
        const canvas = this.allocationChart?.canvas;
        if (!canvas) {
return;
}
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 20, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
        const legend = getElementById('chartLegend');
        if (legend) {
legend.innerHTML = '<p class="text-gray-500 text-sm">Add allocations to see preview</p>';
}
    }

    async createSetForgetPortfolio() {
        const nameEl = getElementById('setForgetName');
        const name = nameEl?.value?.trim();
        const total = this.getCurrentAllocationTotal();
        const allocations = this.getValidAllocations();
        if (!name || allocations.length === 0 || Math.abs(total - 100) > 0.01) {
            this.services.notificationService?.showError('Please enter name and make allocations sum to 100%');
            return;
        }
        const payload = { name, allocations: allocations.map(a => ({ asset_symbol:a.asset, allocation_percentage:a.percentage })) };
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/set-forget-portfolios', {
                method:'POST', headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) }, body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (!resp.ok) {
throw new Error(data?.error || 'Failed to create portfolio');
}
            this.services.notificationService?.showSuccess('Set & Forget portfolio created successfully!');
            this.hideSetForgetModal();
        } catch (e) {
            console.error('Set&Forget create error:', e);
            this.services.notificationService?.showError(e.message || 'Failed to create portfolio');
        }
    }

    /**
     * Display portfolio data
     */
    displayPortfolio() {
        if (!this.services.portfolioService) {
return;
}

        // Get portfolio data
        const holdings = this.services.portfolioService.getHoldings();
        const totalValue = holdings.reduce((sum, holding) => sum + (holding.current_value_sats || 0), 0);

        // Update portfolio summary
        this.updatePortfolioSummary(totalValue);

        // Update holdings grid
        this.updateHoldingsGrid(holdings);

        // Update trade history
        this.updateTradeHistoryDisplay();
    }

    /**
     * Update portfolio summary
     * @param {number} totalValue - Total portfolio value in sats
     */
    updatePortfolioSummary(totalValue) {
        const totalValueDiv = getElementById('totalValue');
        const performanceDiv = getElementById('performance');

        if (totalValueDiv) {
            setText(totalValueDiv, formatSatoshisForUI(totalValue));
        }

        if (performanceDiv && this.services.portfolioService) {
            const performance = this.services.portfolioService.calculatePerformance(totalValue);
            setText(performanceDiv, performance.formatted);

            // Update performance styling
            const performanceParent = performanceDiv.parentElement;
            if (performanceParent) {
                if (performance.isPositive) {
                    performanceParent.className = 'bg-green-50 p-4 rounded';
                    performanceDiv.className = 'text-2xl font-bold text-green-600';
                } else {
                    performanceParent.className = 'bg-red-50 p-4 rounded';
                    performanceDiv.className = 'text-2xl font-bold text-red-600';
                }
            }
        }
    }

    /**
     * Update holdings grid
     * @param {Array} holdings - Array of holdings
     */
    updateHoldingsGrid(holdings) {
        if (!this.holdingsGrid) {
return;
}

        clearElement(this.holdingsGrid);

        if (!holdings || holdings.length === 0) {
            this.displayEmptyPortfolio();
            return;
        }

        // Sort holdings (BTC first, then alphabetically)
        const sortedHoldings = this.services.portfolioService?.sortHoldings(holdings) || holdings;

        // Create holding elements
        sortedHoldings.forEach(holding => {
            const holdingElement = this.createHoldingElement(holding);
            this.holdingsGrid.appendChild(holdingElement);
        });
    }

    /**
     * Create holding element
     * @param {Object} holding - Holding data
     * @returns {HTMLElement} Holding element
     */
    createHoldingElement(holding) {
        const asset = this.getAssetInfo(holding.asset_symbol);
        const bgClass = this.services.portfolioService?.getHoldingBackgroundClass(holding) || 'bg-gray-50';
        const displayAmount = this.services.portfolioService?.formatHoldingAmount(holding) || '';
        const pnl = this.services.portfolioService?.calculateHoldingPnL(holding) || {};
        const lockStatus = formatLockStatus(holding.lock_status);

        const holdingDiv = createElement('div', {
            className: `p-3 border rounded cursor-pointer hover:bg-gray-100 ${bgClass}`,
            dataset: {
                assetSymbol: holding.asset_symbol,
                holdingId: holding.id || holding.asset_symbol
            }
        });

        let lockStatusHTML = '';
        if (holding.lock_status && holding.lock_status !== 'unlocked') {
            const timeRemaining = holding.locked_until ? formatTimeRemaining(holding.locked_until) : '';
            lockStatusHTML = `
                <div class="text-xs ${lockStatus.colorClass} mt-1">
                    ${lockStatus.icon} ${lockStatus.text}
                    ${timeRemaining ? `<br>${timeRemaining}` : ''}
                </div>
            `;
        }

        holdingDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-medium">${asset?.name || holding.asset_symbol}</div>
                    <div class="text-gray-600 text-sm">${displayAmount}</div>
                    ${lockStatusHTML}
                </div>
                <div class="text-right">
                    <div class="font-medium">${pnl.currentValueBTC || '0.00000000'} BTC</div>
                    <div class="${pnl.isPositive ? 'text-green-600' : 'text-red-600'} text-sm">
                        ${pnl.pnlBTC || '0.00000000'} BTC (${pnl.pnlPercent || '0.00'}%)
                    </div>
                </div>
            </div>
        `;

        // Add click handler for asset details
        const clickHandler = () => this.showAssetDetails(holding.asset_symbol, asset?.name);
        addEventListener(holdingDiv, 'click', clickHandler);

        return holdingDiv;
    }

    /**
     * Display empty portfolio state
     */
    displayEmptyPortfolio() {
        this.holdingsGrid.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">🪙</div>
                <h3 class="text-lg font-medium mb-2">Your Portfolio is Empty</h3>
                <p class="text-sm mb-4">Start trading to build your Bitcoin-denominated portfolio</p>
                <button onclick="document.getElementById('fromAsset').focus()"
                        class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                    Start Trading
                </button>
            </div>
        `;
    }

    /**
     * Set up portfolio grid interactions
     */
    setupPortfolioGridInteractions() {
        // Holdings will have individual click handlers added in createHoldingElement
        // Additional grid-level interactions can be added here
    }

    /**
     * Set up trading validation
     */
    setupTradingValidation() {
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');
        const tradeAmountInput = getElementById('tradeAmount');

        // Real-time validation
        if (fromAssetSelect && toAssetSelect) {
            const validateAssets = () => {
                const validation = validateAssetPair(fromAssetSelect.value, toAssetSelect.value);
                this.displayAssetValidation(validation);
                // Also re-validate amount when asset changes (unit conversion may differ)
                this.handleTradeAmountInput();
            };

            addEventListener(fromAssetSelect, 'change', validateAssets);
            addEventListener(toAssetSelect, 'change', validateAssets);
        }

        // Amount validation
        if (tradeAmountInput && fromAssetSelect) {
            const validateAmount = () => {
                const validation = this.validateCurrentTradeAmount();
                this.displayAmountValidation(validation);
            };

            addEventListener(tradeAmountInput, 'input', validateAmount);
            if (amountUnitSelect) {
                addEventListener(amountUnitSelect, 'change', validateAmount);
            }
        }
    }

    /**
     * Initialize trade amount helper
     */
    initializeTradeAmountHelper() {
        const tradeHelper = getElementById('tradeHelper');
        if (tradeHelper) {
            // Helper will be updated by validation functions
            tradeHelper.className = 'text-sm text-gray-500 mt-1';
        }
    }

    /**
     * Set up modal close handlers
     */
    setupModalCloseHandlers() {
        const closeModalBtn = getElementById('closeAssetDetailsModal') || getElementById('closeModal');
        if (closeModalBtn) {
            const closeHandler = () => this.hideAssetDetailsModal();
            this.eventListeners.push(
                addEventListener(closeModalBtn, 'click', closeHandler)
            );
        }

        // Close on overlay click
        if (this.assetDetailsModal) {
            const overlayClickHandler = (e) => {
                if (e.target === this.assetDetailsModal) {
                    this.hideAssetDetailsModal();
                }
            };
            this.eventListeners.push(
                addEventListener(this.assetDetailsModal, 'click', overlayClickHandler)
            );
        }
    }

    /**
     * Update asset dropdowns
     */
    async updateAssetDropdowns() {
        const fromAssetSelect = getElementById('fromAsset');
        const toAssetSelect = getElementById('toAsset');

        if (!fromAssetSelect || !toAssetSelect) {
return;
}

        try {
            // Get available assets
            const assets = await this.services.apiClient?.getAssets() || [];

            // Clear current options
            clearElement(fromAssetSelect);
            clearElement(toAssetSelect);

            // Add default options
            fromAssetSelect.appendChild(createElement('option', { value: '' }, 'Select asset to sell'));
            toAssetSelect.appendChild(createElement('option', { value: '' }, 'Select asset to buy'));

            // Add asset options based on holdings for "from" dropdown
            this.holdings.forEach(holding => {
                const asset = assets.find(a => a.symbol === holding.asset_symbol);
                const name = asset && typeof asset.name === 'string' && asset.name.trim()
                    ? asset.name
                    : holding.asset_symbol;
                const symbol = holding.asset_symbol;
                const displayName = `${name} (${symbol})`;
                fromAssetSelect.appendChild(createElement('option', { value: symbol }, displayName));
            });

            // Add all assets to "to" dropdown (fallback if name missing)
            assets.forEach(asset => {
                const name = asset && typeof asset.name === 'string' && asset.name.trim()
                    ? asset.name
                    : asset.symbol;
                const displayName = `${name} (${asset.symbol})`;
                toAssetSelect.appendChild(createElement('option', { value: asset.symbol }, displayName));
            });

        } catch (error) {
            console.error('Failed to update asset dropdowns:', error);
        }
    }

    // ===== EVENT HANDLERS =====

    /**
     * Handle asset selection change
     */
    handleAssetSelectionChange() {
        const fromAsset = getElementById('fromAsset')?.value;
        const toAsset = getElementById('toAsset')?.value;

        // Validate asset pair
        if (fromAsset && toAsset) {
            const validation = validateAssetPair(fromAsset, toAsset);
            this.displayAssetValidation(validation);
        }

        // Update available balance display
        this.updateAvailableBalance(fromAsset);

        // Clear amount input if assets are invalid
        if (fromAsset === toAsset && fromAsset) {
            const tradeAmountInput = getElementById('tradeAmount');
            if (tradeAmountInput) {
tradeAmountInput.value = '';
}
        }
    }

    /**
     * Handle trade amount input
     */
    handleTradeAmountInput() {
        const validation = this.validateCurrentTradeAmount();
        if (validation) {
this.displayAmountValidation(validation);
}
    }

    /**
     * Validate current trade amount considering unit selection
     */
    validateCurrentTradeAmount() {
        const fromAsset = getElementById('fromAsset')?.value;
        const amountInput = getElementById('tradeAmount');
        if (!fromAsset || !amountInput) {
return null;
}

        const unitSelect = getElementById('amountUnit');
        const unit = unitSelect?.value || 'btc';
        const raw = amountInput.value;

        // For BTC, convert to sats for validation; for others, raw amount is fine
        if (fromAsset === 'BTC') {
            const sats = this.convertToSats(raw, unit);
            return validateTradeAmount(sats, fromAsset);
        }
        return validateTradeAmount(raw, fromAsset);
    }

    /**
     * Convert UI amount to satoshis based on unit
     */
    convertToSats(amount, unit) {
        const num = Number(amount);
        if (isNaN(num)) {
return 0;
}
        switch ((unit || 'btc').toLowerCase()) {
            case 'btc':
                return Math.round(num * 100000000);
            case 'msat':
                // UI label says mSats but to avoid server mismatch we'll convert to sats here if used
                // Assume mSats means 1/100 BTC (legacy label). Convert to sats accordingly.
                return Math.round(num * 1000000);
            case 'ksat':
                return Math.round(num * 1000);
            case 'sat':
                return Math.round(num);
            default:
                return Math.round(num * 100000000);
        }
    }

    /**
     * Handle portfolio data update
     * @param {Object} portfolioData - Updated portfolio data
     */
    handlePortfolioDataUpdate(portfolioData) {
        this.holdings = portfolioData.holdings || [];
        this.displayPortfolio();
        this.updateAssetDropdowns();
    }

    /**
     * Handle price update
     * @param {Object} priceData - Updated price data
     */
    handlePriceUpdate(priceData) {
        // Refresh portfolio display with new prices
        this.displayPortfolio();
    }

    // ===== TRADING INTERFACE =====

    /**
     * Execute trade
     */
    async executeTrade() {
        if (this.isTrading) {
return;
}

        const fromAsset = getElementById('fromAsset')?.value;
        const toAsset = getElementById('toAsset')?.value;
        const rawAmount = parseFloat(getElementById('tradeAmount')?.value);
        const unitSelect = getElementById('amountUnit');
        const unitChoice = unitSelect?.value || 'btc';

        // Validate inputs
        const assetValidation = validateAssetPair(fromAsset, toAsset);
        let amountForValidation;
        if (fromAsset === 'BTC') {
            amountForValidation = this.convertToSats(rawAmount, unitChoice);
        } else {
            amountForValidation = rawAmount;
        }
        const amountValidation = validateTradeAmount(amountForValidation, fromAsset);

        if (!assetValidation.isValid) {
            this.services.notificationService?.showError(assetValidation.message);
            return;
        }

        if (!amountValidation.isValid) {
            this.services.notificationService?.showError(amountValidation.message);
            return;
        }

        try {
            this.isTrading = true;
            this.updateTradeButtonState(true);

            // Execute trade through portfolio service
            let payloadAmount, payloadUnit;
            if (fromAsset === 'BTC') {
                // Send sats to align with server validation and conversion
                payloadAmount = this.convertToSats(rawAmount, unitChoice);
                payloadUnit = 'sat';
            } else {
                // Selling asset: send in asset units with 'asset' unit
                payloadAmount = rawAmount;
                payloadUnit = 'asset';
            }

            const result = await this.services.portfolioService?.executeTrade(fromAsset, toAsset, payloadAmount, payloadUnit);

            // API client unwraps { success, data } → returns data object
            // Accept either { trade, message } or a raw trade object
            const tradeDetails = result?.trade || result;
            if (!tradeDetails) {
                throw new Error(result?.error || 'Trade failed');
            }

            this.services.notificationService?.showTradeSuccess(tradeDetails);
            this.clearTradeForm();
            // Portfolio refresh happens via service listener

        } catch (error) {
            console.error('Trade execution failed:', error);
            this.services.notificationService?.showTradeError(error.message);
        } finally {
            this.isTrading = false;
            this.updateTradeButtonState(false);
        }
    }

    /**
     * Show asset details modal
     * @param {string} symbol - Asset symbol
     * @param {string} name - Asset name
     */
    async showAssetDetails(symbol, name) {
        try {
            // Load asset details
            const details = await this.services.portfolioService?.getAssetDetails(symbol);

            if (details && this.assetDetailsModal) {
                this.populateAssetDetailsModal(details, symbol, name);
                showElement(this.assetDetailsModal);
            }

        } catch (error) {
            console.error('Failed to load asset details:', error);
            this.services.notificationService?.showError('Failed to load asset details');
        }
    }

    /**
     * Hide asset details modal
     */
    hideAssetDetailsModal() {
        if (this.assetDetailsModal) {
            hideElement(this.assetDetailsModal);
        }
    }

    /**
     * Refresh portfolio data
     */
    async refreshPortfolio() {
        try {
            await this.loadPortfolioData();
            this.displayPortfolio();
            this.services.notificationService?.showSuccess('Portfolio refreshed');
        } catch (error) {
            console.error('Failed to refresh portfolio:', error);
            this.services.notificationService?.showError('Failed to refresh portfolio');
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get asset information
     * @param {string} symbol - Asset symbol
     * @returns {Object|null} Asset information
     */
    getAssetInfo(symbol) {
        // This would typically come from a cached assets list
        // For now, return basic info
        return { name: symbol, symbol };
    }

    /**
     * Update available balance display
     * @param {string} fromAsset - Selected from asset
     */
    updateAvailableBalance(fromAsset) {
        const balanceDisplay = getElementById('availableBalance');
        if (!balanceDisplay || !fromAsset) {
return;
}

        const holding = this.holdings.find(h => h.asset_symbol === fromAsset);
        if (holding) {
            const displayAmount = this.services.portfolioService?.formatHoldingAmount(holding) || '0';
            setText(balanceDisplay, `Available: ${displayAmount}`);
        } else {
            setText(balanceDisplay, 'Available: 0');
        }
    }

    /**
     * Display asset validation
     * @param {Object} validation - Validation result
     */
    displayAssetValidation(validation) {
        const assetMessage = getElementById('assetValidationMessage');
        if (assetMessage) {
            setText(assetMessage, validation.message || '');
            assetMessage.className = `text-sm mt-1 ${validation.messageClass || ''}`;
        }
    }

    /**
     * Display amount validation
     * @param {Object} validation - Validation result
     */
    displayAmountValidation(validation) {
        const tradeHelper = getElementById('tradeHelper');
        if (tradeHelper) {
            setText(tradeHelper, validation.helperText || validation.message || '');
            tradeHelper.className = `text-sm mt-1 ${validation.fieldClass ? 'text-red-600' : 'text-gray-500'}`;
        }
    }

    /**
     * Update trade button state
     * @param {boolean} isLoading - Whether trade is in progress
     */
    updateTradeButtonState(isLoading) {
        const tradeButton = getElementById('executeTradeBtn');
        if (tradeButton) {
            tradeButton.disabled = isLoading;
            setText(tradeButton, isLoading ? 'Executing Trade...' : 'Execute Trade');

            if (isLoading) {
                addClass(tradeButton, 'opacity-50 cursor-not-allowed');
            } else {
                removeClass(tradeButton, 'opacity-50 cursor-not-allowed');
            }
        }
    }

    /**
     * Clear trade form
     */
    clearTradeForm() {
        const fromAsset = getElementById('fromAsset');
        const toAsset = getElementById('toAsset');
        const tradeAmount = getElementById('tradeAmount');
        const tradeHelper = getElementById('tradeHelper');
        const availableBalance = getElementById('availableBalance');

        if (fromAsset) {
fromAsset.value = '';
}
        if (toAsset) {
toAsset.value = '';
}
        if (tradeAmount) {
tradeAmount.value = '';
}
        if (tradeHelper) {
setText(tradeHelper, '');
}
        if (availableBalance) {
setText(availableBalance, '');
}
    }

    /**
     * Populate asset details modal
     * @param {Object} details - Asset details
     * @param {string} symbol - Asset symbol
     * @param {string} name - Asset name
     */
    populateAssetDetailsModal(details, symbol, name) {
        const titleEl = getElementById('modalTitle');
        const contentEl = getElementById('modalContent');
        if (titleEl) {
titleEl.textContent = `${name || symbol} (${symbol}) Purchase History`;
}
        if (!contentEl) {
return;
}

        const purchases = Array.isArray(details.purchases) ? details.purchases : [];
        const sales = Array.isArray(details.sales) ? details.sales : [];

        if (purchases.length === 0 && sales.length === 0) {
            contentEl.innerHTML = '<p class="text-gray-500">No transactions found for this asset.</p>';
            return;
        }

        let content = '';
        if (purchases.length > 0) {
            content += '<h4 class="font-semibold mb-2">Individual Purchases</h4>';
            content += '<div class="overflow-x-auto mb-4">';
            content += '<table class="w-full text-sm">';
            content += `
                <thead>
                    <tr class="border-b">
                        <th class="text-left p-2">Date</th>
                        <th class="text-left p-2">Amount</th>
                        <th class="text-left p-2">BTC Spent</th>
                        <th class="text-left p-2">Status</th>
                        <th class="text-left p-2">Unlocks</th>
                    </tr>
                </thead>
                <tbody>
            `;
            purchases.forEach(p => {
                const amount = (Number(p.amount) / 100000000).toFixed(8);
                const btcSpent = (Number(p.btc_spent) / 100000000).toFixed(8);
                const isLocked = !!p.is_locked;
                const unlockDate = p.locked_until ? new Date(p.locked_until).toLocaleString() : 'N/A';
                content += `
                    <tr class="border-b ${isLocked ? 'bg-red-50' : 'bg-green-50'}">
                        <td class="p-2">${new Date(p.created_at).toLocaleDateString()}</td>
                        <td class="p-2">${amount} ${symbol}</td>
                        <td class="p-2">${btcSpent} BTC</td>
                        <td class="p-2"><span class="${isLocked ? 'text-red-600' : 'text-green-600'}">${isLocked ? '🔒 Locked' : '✅ Unlocked'}</span></td>
                        <td class="p-2 text-xs">${isLocked ? unlockDate : 'Available'}</td>
                    </tr>
                `;
            });
            content += '</tbody></table></div>';
        }

        if (sales.length > 0) {
            content += '<h4 class="font-semibold mb-2">Sales History</h4>';
            content += '<div class="overflow-x-auto">';
            content += '<table class="w-full text-sm">';
            content += `
                <thead>
                    <tr class="border-b">
                        <th class="text-left p-2">Date</th>
                        <th class="text-left p-2">Sold</th>
                        <th class="text-left p-2">Received</th>
                    </tr>
                </thead>
                <tbody>
            `;
            sales.forEach(s => {
                const soldAmount = (Number(s.fromAmount ?? s.from_amount) / 100000000).toFixed(8);
                const receivedBTC = (Number(s.toAmount ?? s.to_amount) / 100000000).toFixed(8);
                const dateStr = new Date(s.createdAt ?? s.created_at).toLocaleDateString();
                content += `
                    <tr class="border-b">
                        <td class="p-2">${dateStr}</td>
                        <td class="p-2">${soldAmount} ${symbol}</td>
                        <td class="p-2">${receivedBTC} BTC</td>
                    </tr>
                `;
            });
            content += '</tbody></table></div>';
        }

        contentEl.innerHTML = content;
    }

    /**
     * Update trade history display
     */
    updateTradeHistoryDisplay() {
        const tradeHistoryDiv = getElementById('tradeHistory');
        if (tradeHistoryDiv && this.services.portfolioService) {
            this.services.portfolioService.displayTradeHistory(this.tradeHistory);
        }
    }

    /**
     * Start price auto-refresh
     */
    startPriceAutoRefresh() {
        if (this.services.priceService && !this.services.priceService.isAutoRefreshActive()) {
            this.services.priceService.startPriceAutoRefresh();
        }
    }

    /**
     * Render the portfolio page (called by router)
     */
    async render() {
        if (!this.isInitialized) {
            await this.init();
        }

        // Refresh data
        await this.loadPortfolioData();
        this.displayPortfolio();

        console.log('Portfolio page rendered');
    }

    /**
     * Clean up component resources
     */
    destroy() {
        // Stop price auto-refresh
        if (this.services.priceService?.isAutoRefreshActive()) {
            this.services.priceService.stopPriceAutoRefresh();
        }

        // Remove event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clean up DOM references
        this.holdingsGrid = null;
        this.tradeForm = null;
        this.assetDetailsModal = null;
        this.tradingInterface = null;

        // Reset state
        this.mainAppListenersSetup = false;
        this.isInitialized = false;

        console.log('Portfolio page component destroyed');
    }
}

export default PortfolioPage;
