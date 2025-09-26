/**
 * Assets Page Component
 * Public assets information page with price chart (BTC/USD)
 */

import { getElementById, addClass, removeClass } from '../utils/dom-helpers.js';

export class AssetsPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;

        this.currentSymbol = 'XAU';
        this.currentDenom = 'BTC'; // 'BTC' | 'USD'
        this.chartInstance = null;
        this._tvLoadingPromise = null;
        this._priceListener = null;

        // Minimal symbol mapping for TradingView
        this.symbolMap = {
            // Crypto
            'BTC': 'BITSTAMP:BTCUSD',
            // US stocks / ETFs
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'META': 'NASDAQ:META',
            'NVDA': 'NASDAQ:NVDA',
            'SPY': 'AMEX:SPY',
            'QQQ': 'NASDAQ:QQQ',
            'VTI': 'AMEX:VTI',
            'VOO': 'AMEX:VOO',
            'VEA': 'AMEX:VEA',
            'VWO': 'AMEX:VWO',
            'AGG': 'NASDAQ:AGG',
            'TLT': 'NASDAQ:TLT',
            'IEF': 'NASDAQ:IEF',
            'HYG': 'AMEX:HYG',
            'LQD': 'AMEX:LQD',
            'TIP': 'NASDAQ:TIP',
            'VNQ': 'AMEX:VNQ',
            'GLD': 'AMEX:GLD',
            'SLV': 'AMEX:SLV',
            'DBC': 'AMEX:DBC',
            'USO': 'AMEX:USO',
            'UNG': 'AMEX:UNG',
            'ARKK': 'AMEX:ARKK',
            'COIN': 'NASDAQ:COIN',
            'MSTR': 'NASDAQ:MSTR',
            'VXUS': 'NASDAQ:VXUS',
            'EFA': 'AMEX:EFA',
            'EWU': 'AMEX:EWU',
            'EWG': 'AMEX:EWG',
            'EWJ': 'AMEX:EWJ',
            'VNO': 'NYSE:VNO',
            'PLD': 'NYSE:PLD',
            'EQIX': 'NASDAQ:EQIX',
            'URA': 'AMEX:URA',
            'DBA': 'AMEX:DBA',
            'CPER': 'AMEX:CPER',
            'WEAT': 'AMEX:WEAT',
            // Special tickers
            'BRK-B': 'NYSE:BRK.B',
            // Commodities
            'XAU': 'TVC:GOLD',
            'XAG': 'TVC:SILVER'
        };
    }

    /**
     * Initialize the assets page
     */
    async init() {
        if (this.isInitialized) return;

        console.log('Initializing Assets Page');
        this.isInitialized = true;
    }

    /**
     * Show the assets page and initialize UI/chart
     * @param {Object} params - Route parameters
     */
    show(params = {}) {
        // Resolve initial state
        if (params && params.asset) {
            this.currentSymbol = params.asset;
        }

        // Initialize UI hooks and render chart
        this.initializeUI();
        this.updateMetrics();
        if (this.services?.priceService && !this._priceListener) {
            this._priceListener = () => this.updateMetrics();
            this.services.priceService.onPriceChange(this._priceListener);
        }
        this.renderChart();
    }

    /**
     * Hide the assets page
     */
    hide() {
        // No-op; kept for symmetry
    }

    /**
     * Destroy the assets page
     */
    destroy() {
        if (this.chartInstance) {
            try { this.chartInstance.remove(); } catch {}
            this.chartInstance = null;
        }
        if (this._priceListener && this.services?.priceService) {
            try { this.services.priceService.removePriceListener(this._priceListener); } catch {}
            this._priceListener = null;
        }
        this.isInitialized = false;
    }

    // ===== Internal helpers =====

    initializeUI() {
        const selector = getElementById('assetSelector');
        const btcBtn = getElementById('btcDenomination');
        const usdBtn = getElementById('usdDenomination');
        const denomLabel = getElementById('chartDenomination');

        if (selector) {
            // Sync selector with current symbol if present
            if (this.currentSymbol) {
                // If option exists, set it; otherwise keep current selection
                const opt = Array.from(selector.options).find(o => o.value === this.currentSymbol);
                if (opt) selector.value = this.currentSymbol;
                else this.currentSymbol = selector.value;
            } else {
                this.currentSymbol = selector.value;
            }

            selector.onchange = () => {
                this.currentSymbol = selector.value;
                this.updateMetrics();
                this.renderChart();
            };
        }

        if (btcBtn && usdBtn) {
            const setActive = (isBTC) => {
                if (isBTC) {
                    addClass(btcBtn, ['bg-blue-500','text-white']);
                    removeClass(usdBtn, ['bg-blue-500','text-white']);
                    removeClass(btcBtn, 'text-gray-700');
                    addClass(usdBtn, 'text-gray-700');
                    if (denomLabel) denomLabel.textContent = 'in Bitcoin';
                } else {
                    addClass(usdBtn, ['bg-blue-500','text-white']);
                    removeClass(btcBtn, ['bg-blue-500','text-white']);
                    removeClass(usdBtn, 'text-gray-700');
                    addClass(btcBtn, 'text-gray-700');
                    if (denomLabel) denomLabel.textContent = 'in USD';
                }
            };

            setActive(this.currentDenom === 'BTC');

            btcBtn.onclick = () => {
                if (this.currentDenom !== 'BTC') {
                    this.currentDenom = 'BTC';
                    setActive(true);
                    this.renderChart();
                }
            };
            usdBtn.onclick = () => {
                if (this.currentDenom !== 'USD') {
                    this.currentDenom = 'USD';
                    setActive(false);
                    this.renderChart();
                }
            };
        }
    }

    updateMetrics() {
        const priceBTCEl = getElementById('assetPriceBTC');
        const priceUSDEl = getElementById('assetPriceUSD');

        if (this.services?.priceService) {
            const sats = this.services.priceService.getAssetPrice(this.currentSymbol);
            const usd = this.services.priceService.getAssetPriceUsd(this.currentSymbol);
            if (priceBTCEl && typeof sats === 'number') {
                const btc = sats / 100000000;
                priceBTCEl.textContent = btc < 0.001 ? btc.toFixed(8) : btc.toFixed(4);
            }
            if (priceUSDEl && typeof usd === 'number') {
                priceUSDEl.textContent = usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            }
        }

        // Performance metrics
        this.updatePerformanceMetric('24h', 'asset24h');
        this.updatePerformanceMetric('1y', 'asset1y');
        this.updatePerformanceMetric('5y', 'asset5y');
        this.updatePerformanceMetric('10y', 'assetAllTime');
    }

    async updatePerformanceMetric(period, elementId) {
        const el = getElementById(elementId);
        if (!el || !this.services?.priceService) return;
        try {
            el.textContent = '…';
            const resp = await this.services.priceService.getAssetPerformance(this.currentSymbol, period);
            if (resp && typeof resp.performance === 'number') {
                const val = resp.performance;
                const sign = val > 0 ? '+' : '';
                el.textContent = `${sign}${val.toFixed(2)}%`;
                el.className = `text-sm font-semibold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`;
            } else {
                el.textContent = 'N/A';
                el.className = 'text-sm font-semibold text-gray-500';
            }
        } catch (e) {
            el.textContent = 'N/A';
            el.className = 'text-sm font-semibold text-gray-500';
        }
    }

    getTradingViewSymbol(symbol) {
        return this.symbolMap[symbol] || `NASDAQ:${symbol}`;
    }

    renderChart() {
        const container = getElementById('assetChart');
        if (!container) return;

        // Clear previous widget content (TradingView manages its container)
        container.innerHTML = '';

        const baseSymbol = this.getTradingViewSymbol(this.currentSymbol);
        const btcSymbol = 'BITSTAMP:BTCUSD';
        const tvSymbol = this.currentDenom === 'BTC' ? `${baseSymbol}/${btcSymbol}` : baseSymbol;

        const createWidget = () => {
            // TradingView global injected by tv.js
            if (typeof TradingView === 'undefined') {
                container.innerHTML = `<div class="flex items-center justify-center h-64 text-gray-500">Failed to load chart. Check connection.</div>`;
                return;
            }
            try {
                const options = {
                    width: '100%',
                    height: 600,
                    symbol: tvSymbol,
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
                    container_id: 'assetChart',
                    range: '60M'
                };

                this.chartInstance = new TradingView.widget(options);
            } catch (err) {
                container.innerHTML = `<div class=\"flex items-center justify-center h-64 text-gray-500\">Failed to initialize chart.</div>`;
            }
        };

        this.ensureTradingViewLoaded().then(createWidget).catch(createWidget);
    }

    // Load tv.js once (similar approach used on home page)
    ensureTradingViewLoaded() {
        if (typeof TradingView !== 'undefined') {
            return Promise.resolve();
        }
        if (this._tvLoadingPromise) return this._tvLoadingPromise;
        this._tvLoadingPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.head.appendChild(script);
        });
        return this._tvLoadingPromise;
    }
}

export default AssetsPage;
