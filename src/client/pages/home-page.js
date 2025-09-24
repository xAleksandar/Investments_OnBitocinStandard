/**
 * Home Page Component
 * Manages the home page functionality extracted from BitcoinGame monolith
 */

import {
    getElementById,
    addEventListener,
    showElement,
    hideElement,
    setText,
    addClass,
    removeClass
} from '../utils/dom-helpers.js';

import { ELEMENT_IDS, CSS_CLASSES } from '../utils/constants.js';
import { formatSatoshisForUI, formatPercentageWithStyle } from '../utils/formatters.js';

export class HomePage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Component sections
        this.welcomeSection = null;
        this.examplePortfolioSection = null;
        this.bitcoinBasicsSection = null;
        this.heroSection = null;
    }

    /**
     * Initialize the home page component
     */
    async init() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing home page component');

            // Get DOM elements
            this.initializeDOMElements();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize sections
            await this.initializeSections();

            // Update content based on auth state
            this.updateContentForAuthState();

            this.isInitialized = true;
            console.log('Home page component initialized successfully');
        } catch (error) {
            console.error('Failed to initialize home page:', error);
            this.services.notificationService?.showError('Failed to load home page');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeDOMElements() {
        this.heroSection = getElementById('heroLoginBtn');
        this.welcomeSection = getElementById('homePage');
        this.examplePortfolioSection = this.welcomeSection?.querySelector('.max-w-6xl');
        this.bitcoinBasicsSection = getElementById('bitcoinBasics');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Hero login button
        if (this.heroSection) {
            const heroClickHandler = () => this.handleHeroLogin();
            this.eventListeners.push(
                addEventListener(this.heroSection, 'click', heroClickHandler)
            );
        }

        // Get Started buttons
        const getStartedBtns = document.querySelectorAll('[data-action="get-started"]');
        getStartedBtns.forEach(btn => {
            const clickHandler = () => this.handleGetStarted();
            this.eventListeners.push(
                addEventListener(btn, 'click', clickHandler)
            );
        });

        // Learn more buttons
        const learnMoreBtns = document.querySelectorAll('[data-action="learn-more"]');
        learnMoreBtns.forEach(btn => {
            const clickHandler = (e) => this.handleLearnMore(e);
            this.eventListeners.push(
                addEventListener(btn, 'click', clickHandler)
            );
        });

        // Portfolio example interactions
        this.setupPortfolioExampleListeners();

        // Bitcoin basics interactions
        this.setupBitcoinBasicsListeners();
    }

    /**
     * Initialize page sections
     */
    async initializeSections() {
        await Promise.all([
            this.initializeWelcomeSection(),
            this.initializeExamplePortfolio(),
            this.initializeBitcoinBasics(),
            this.initializeMiniCharts(),
            this.loadHomePageMetrics()
        ]);
    }

    /**
     * Initialize welcome section
     */
    async initializeWelcomeSection() {
        if (!this.welcomeSection) return;

        const isAuthenticated = this.services.authService?.isAuthenticated();

        if (isAuthenticated) {
            const user = this.services.authService.getCurrentUser();
            this.updateWelcomeForUser(user);
        } else {
            this.updateWelcomeForGuest();
        }
    }

    /**
     * Initialize example portfolio section
     */
    async initializeExamplePortfolio() {
        try {
            // Load sample portfolio data for demonstration
            await this.loadExamplePortfolioData();
            this.updateExamplePortfolioDisplay();
        } catch (error) {
            console.error('Failed to load example portfolio:', error);
        }
    }

    /**
     * Initialize Bitcoin basics education section
     */
    async initializeBitcoinBasics() {
        this.setupBitcoinBasicsContent();
        this.setupEducationNavigation();
    }

    /**
     * Initialize mini charts for home page assets
     */
    async initializeMiniCharts() {
        try {
            console.log('Initializing mini charts');

            // Define home page chart configurations
            const chartConfigs = [
                // Use standard TradingView symbols; performance overlay shows vs BTC separately
                { containerId: 'chartGold', symbol: 'TVC:GOLD', name: 'Gold', assetSymbol: 'XAU' },
                { containerId: 'chartSPY', symbol: 'AMEX:SPY', name: 'S&P 500', assetSymbol: 'SPY' },
                { containerId: 'chartAAPL', symbol: 'NASDAQ:AAPL', name: 'Apple', assetSymbol: 'AAPL' },
                { containerId: 'chartTSLA', symbol: 'NASDAQ:TSLA', name: 'Tesla', assetSymbol: 'TSLA' },
                { containerId: 'chartVNQ', symbol: 'AMEX:VNQ', name: 'Real Estate', assetSymbol: 'VNQ' },
                { containerId: 'chartOil', symbol: 'TVC:USOIL', name: 'Oil', assetSymbol: 'WTI' }
            ];

            // Ensure TradingView library is loaded before initializing charts
            await this.ensureTradingViewLoaded();

            // Initialize each chart
            chartConfigs.forEach(config => {
                this.initMiniChart(config.containerId, config.symbol, config.name, config.assetSymbol);
            });

        } catch (error) {
            console.error('Failed to initialize mini charts:', error);
        }
    }

    /**
     * Ensure TradingView tv.js is loaded (once)
     */
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
            script.onerror = () => resolve(); // Resolve anyway to allow fallbacks
            document.head.appendChild(script);
        });

        return this._tvLoadingPromise;
    }

    /**
     * Initialize individual mini chart
     * @param {string} containerId - Chart container ID
     * @param {string} symbol - TradingView symbol
     * @param {string} name - Asset display name
     * @param {string} assetSymbol - Asset symbol for price data
     */
    initMiniChart(containerId, symbol, name, assetSymbol) {
        const container = getElementById(containerId);
        if (!container || container.innerHTML !== '') return;

        // Clear and prepare container
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        // Create wrapper for the chart
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.height = '100%';
        wrapper.style.width = '100%';

        // Create performance overlay with BIG numbers
        const performanceOverlay = document.createElement('div');
        performanceOverlay.style.position = 'absolute';
        performanceOverlay.style.top = '10px';
        performanceOverlay.style.left = '10px';
        performanceOverlay.style.zIndex = '10';
        performanceOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        performanceOverlay.style.padding = '12px';
        performanceOverlay.style.borderRadius = '6px';
        performanceOverlay.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        performanceOverlay.style.minWidth = '100px';

        // Symbol name
        const symbolText = document.createElement('div');
        const cleanSymbol = symbol.split('/')[0].replace('TVC:', '').replace('NASDAQ:', '').replace('AMEX:', '').replace('USOIL', 'OIL');
        symbolText.textContent = cleanSymbol;
        symbolText.style.fontSize = '12px';
        symbolText.style.fontWeight = '600';
        symbolText.style.color = '#374151';
        symbolText.style.marginBottom = '4px';
        performanceOverlay.appendChild(symbolText);

        // 5Y Performance in BIG numbers
        const performanceText = document.createElement('div');
        performanceText.id = `${containerId}-5y-perf`;
        performanceText.textContent = 'Loading...';
        performanceText.style.fontSize = '24px';
        performanceText.style.fontWeight = '700';
        performanceText.style.color = '#6b7280';
        performanceText.style.lineHeight = '1';
        performanceOverlay.appendChild(performanceText);

        // 5Y label
        const labelText = document.createElement('div');
        labelText.textContent = '5 Year';
        labelText.style.fontSize = '11px';
        labelText.style.fontWeight = '500';
        labelText.style.color = '#9ca3af';
        labelText.style.marginTop = '2px';
        performanceOverlay.appendChild(labelText);

        // Append overlay to wrapper
        wrapper.appendChild(performanceOverlay);

        // Create TradingView widget
        try {
            const chartOverlay = document.createElement('div');
            chartOverlay.id = `${containerId}-chart-overlay`;
            chartOverlay.style.position = 'absolute';
            chartOverlay.style.top = '10px';
            chartOverlay.style.right = '10px';
            chartOverlay.style.zIndex = '11';
            chartOverlay.style.fontSize = '14px';
            chartOverlay.style.fontWeight = '600';
            chartOverlay.style.color = '#ffffff';
            chartOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            chartOverlay.style.padding = '4px 8px';
            chartOverlay.style.borderRadius = '4px';
            chartOverlay.textContent = 'Loading...';
            wrapper.appendChild(chartOverlay);

            // Create TradingView widget container
            const chartContainer = document.createElement('div');
            chartContainer.style.height = '100%';
            chartContainer.style.width = '100%';
            // Assign a unique id for TradingView container
            const tvContainerId = `${containerId}-tv`;
            chartContainer.id = tvContainerId;
            wrapper.appendChild(chartContainer);

            // Initialize TradingView widget (if available)
            if (typeof TradingView !== 'undefined') {
                // Determine numeric height for widget (100% can fail)
                const widgetHeight = container.clientHeight || 192;
                // Delay slightly to ensure DOM attachment
                setTimeout(() => {
                    try {
                        new TradingView.widget({
                            width: '100%',
                            height: widgetHeight,
                            symbol: symbol,
                            interval: '1D',
                            timezone: 'Etc/UTC',
                            theme: 'light',
                            style: '1',
                            locale: 'en',
                            toolbar_bg: '#f1f3f6',
                            enable_publishing: false,
                            hide_top_toolbar: true,
                            hide_legend: true,
                            save_image: false,
                            container_id: tvContainerId,
                            hide_volume: true
                        });
                    } catch (e) {
                        console.error('TradingView widget init error:', e);
                    }
                }, 0);
            } else {
                // Fallback for when TradingView is not available
                chartContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280;">Chart Loading...</div>';
            }

        } catch (error) {
            console.error('Error creating TradingView widget:', error);
        }

        // Add wrapper to container
        container.appendChild(wrapper);

        // Load performance data for this asset
        this.loadAssetPerformance(assetSymbol, containerId);
    }

    /**
     * Load home page metrics for all assets
     */
    async loadHomePageMetrics() {
        try {
            console.log('Loading home page metrics');

            // Load current prices
            await this.services.priceService?.loadPrices();
            const pricesInSats = this.services.priceService?.getPrices() || {};
            const pricesUsd = this.services.priceService?.getPricesUsd() || {};
            const btcPrice = this.services.priceService?.getBtcPrice() || 100000;

            // Define the assets we're showing on home page
            const homeAssets = [
                { symbol: 'XAU', elementId: 'gold', name: 'Gold' },
                { symbol: 'SPY', elementId: 'spy', name: 'S&P 500' },
                { symbol: 'AAPL', elementId: 'aapl', name: 'Apple' },
                { symbol: 'TSLA', elementId: 'tsla', name: 'Tesla' },
                { symbol: 'VNQ', elementId: 'vnq', name: 'Real Estate' },
                { symbol: 'WTI', elementId: 'oil', name: 'Oil' }
            ];

            // Update each asset's metrics
            homeAssets.forEach(asset => {
                this.updateAssetMetrics(asset, pricesInSats, pricesUsd, btcPrice);
            });

            console.log('Home page metrics loaded successfully');
        } catch (error) {
            console.error('Failed to load home page metrics:', error);
        }
    }

    /**
     * Update individual asset metrics
     * @param {Object} asset - Asset configuration
     * @param {Object} pricesInSats - Prices in satoshis
     * @param {Object} pricesUsd - Prices in USD
     * @param {number} btcPrice - Current BTC price
     */
    updateAssetMetrics(asset, pricesInSats, pricesUsd, btcPrice) {
        const priceElement = getElementById(`${asset.elementId}Price`);
        const changeElement = getElementById(`${asset.elementId}Change`);

        if (priceElement && pricesInSats[asset.symbol]) {
            // Convert sats to BTC for display
            const priceInBTC = pricesInSats[asset.symbol] / 100000000;
            priceElement.textContent = priceInBTC < 0.001 ? priceInBTC.toFixed(8) : priceInBTC.toFixed(4);

            // Get performance data and update if available
            if (changeElement) {
                this.loadAssetPerformance(asset.symbol, null, changeElement);
            }
        }
    }

    /**
     * Load asset performance data
     * @param {string} assetSymbol - Asset symbol
     * @param {string} chartContainerId - Chart container ID (optional)
     * @param {HTMLElement} changeElement - Change display element (optional)
     */
    async loadAssetPerformance(assetSymbol, chartContainerId = null, changeElement = null) {
        try {
            const performance = await this.services.priceService?.getAssetPerformance(assetSymbol, '5y');

            if (performance && performance.performance !== undefined) {
                const perf = performance.performance.toFixed(1);
                const sign = performance.performance >= 0 ? '+' : '';
                const color = performance.performance >= 0 ? '#10B981' : '#EF4444';

                // Update chart overlay if chart container provided
                if (chartContainerId) {
                    const chartOverlay = getElementById(`${chartContainerId}-chart-overlay`);
                    if (chartOverlay) {
                        chartOverlay.textContent = `5Y: ${sign}${perf}%`;
                        chartOverlay.style.backgroundColor = color;
                    }

                    const perfElement = getElementById(`${chartContainerId}-5y-perf`);
                    if (perfElement) {
                        perfElement.textContent = `${sign}${perf}%`;
                        perfElement.style.color = color;
                    }
                }

                // Update change element if provided
                if (changeElement) {
                    changeElement.textContent = `${sign}${perf}%`;
                    changeElement.style.color = color;
                }
            }
        } catch (error) {
            console.error(`Failed to load performance for ${assetSymbol}:`, error);
        }
    }

    /**
     * Update welcome section for authenticated user
     * @param {Object} user - User object
     */
    updateWelcomeForUser(user) {
        const heroTitle = this.welcomeSection?.querySelector('h1');
        const heroDesc = this.welcomeSection?.querySelector('p');
        const heroBtn = this.heroSection;

        if (heroTitle) {
            setText(heroTitle, `Welcome back, ${user.username || user.email.split('@')[0]}!`);
        }

        if (heroDesc) {
            setText(heroDesc, 'Continue tracking your Bitcoin-denominated portfolio');
        }

        if (heroBtn) {
            setText(heroBtn, 'View Portfolio');
            heroBtn.setAttribute('data-route', '#portfolio');
        }

        // Show quick stats if available
        this.showQuickStats();
    }

    /**
     * Update welcome section for guest user
     */
    updateWelcomeForGuest() {
        const heroBtn = this.heroSection;

        if (heroBtn) {
            setText(heroBtn, 'Start Your Portfolio');
            heroBtn.setAttribute('data-route', '#login');
        }

        // Hide user-specific content
        this.hideQuickStats();
    }

    /**
     * Show quick stats for authenticated users
     */
    async showQuickStats() {
        try {
            if (!this.services.portfolioService) return;

            // Load portfolio data if needed
            const holdings = this.services.portfolioService.getHoldings();
            if (!holdings.length) {
                await this.services.portfolioService.loadPortfolio();
            }

            // Create or update quick stats section
            this.createQuickStatsSection();

            // Show recent activity
            await this.showRecentActivity();
        } catch (error) {
            console.error('Failed to show quick stats:', error);
        }
    }

    /**
     * Hide quick stats section
     */
    hideQuickStats() {
        const quickStats = getElementById('homeQuickStats');
        if (quickStats) {
            hideElement(quickStats);
        }

        const recentActivity = getElementById('homeRecentActivity');
        if (recentActivity) {
            hideElement(recentActivity);
        }
    }

    /**
     * Show recent activity for authenticated users
     */
    async showRecentActivity() {
        try {
            if (!this.services.portfolioService) return;

            // Load recent trades if needed
            const trades = this.services.portfolioService.getTradeHistory();
            if (!trades.length) {
                await this.services.portfolioService.loadTradeHistory();
            }

            // Create or update recent activity section
            this.createRecentActivitySection();
        } catch (error) {
            console.error('Failed to show recent activity:', error);
        }
    }

    /**
     * Create recent activity section
     */
    createRecentActivitySection() {
        let recentActivity = getElementById('homeRecentActivity');

        if (!recentActivity) {
            recentActivity = document.createElement('div');
            recentActivity.id = 'homeRecentActivity';
            recentActivity.className = 'bg-white rounded-lg shadow-md p-6 mb-8';

            // Insert after quick stats
            const quickStats = getElementById('homeQuickStats');
            if (quickStats && quickStats.nextSibling) {
                quickStats.parentNode.insertBefore(recentActivity, quickStats.nextSibling);
            }
        }

        // Update recent activity content
        this.updateRecentActivityContent(recentActivity);
        showElement(recentActivity);
    }

    /**
     * Update recent activity content
     * @param {HTMLElement} activityElement - Activity container element
     */
    updateRecentActivityContent(activityElement) {
        const portfolioService = this.services.portfolioService;
        if (!portfolioService) return;

        const trades = portfolioService.getTradeHistory().slice(0, 5); // Show last 5 trades

        let activityHTML = `
            <h3 class="text-lg font-semibold mb-4">Recent Activity</h3>
        `;

        if (trades.length === 0) {
            activityHTML += `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📊</div>
                    <div>No trades yet</div>
                    <div class="text-sm">Start trading to see your activity here</div>
                </div>
            `;
        } else {
            activityHTML += `<div class="space-y-3">`;

            trades.forEach(trade => {
                const tradeDate = new Date(trade.created_at).toLocaleDateString();
                const fromAmount = this.formatTradeAmount(trade.from_amount, trade.from_asset);
                const toAmount = this.formatTradeAmount(trade.to_amount, trade.to_asset);

                activityHTML += `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 text-sm font-semibold">↔</span>
                            </div>
                            <div>
                                <div class="font-medium">${fromAmount} → ${toAmount}</div>
                                <div class="text-sm text-gray-500">${tradeDate}</div>
                            </div>
                        </div>
                        <div class="text-sm text-gray-400">
                            <span class="hover:text-gray-600 cursor-pointer" onclick="window.location.hash='#portfolio'">View Details</span>
                        </div>
                    </div>
                `;
            });

            activityHTML += `</div>`;

            // Add view all link
            activityHTML += `
                <div class="mt-4 text-center">
                    <button onclick="window.location.hash='#portfolio'" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View All Trades →
                    </button>
                </div>
            `;
        }

        activityElement.innerHTML = activityHTML;
    }

    /**
     * Format trade amount for display
     * @param {number} amount - Raw amount
     * @param {string} asset - Asset symbol
     * @returns {string} Formatted amount
     */
    formatTradeAmount(amount, asset) {
        if (asset === 'BTC') {
            const btc = amount / 100000000;
            return `${btc.toFixed(8)} BTC`;
        } else {
            const actualAmount = amount / 100000000;
            return `${actualAmount.toFixed(2)} ${asset}`;
        }
    }

    /**
     * Create quick stats section
     */
    createQuickStatsSection() {
        let quickStats = getElementById('homeQuickStats');

        if (!quickStats) {
            quickStats = document.createElement('div');
            quickStats.id = 'homeQuickStats';
            quickStats.className = 'bg-white rounded-lg shadow-md p-6 mb-8';

            // Insert after hero section
            const heroSection = this.welcomeSection?.querySelector('.bg-gradient-to-b');
            if (heroSection && heroSection.nextSibling) {
                heroSection.parentNode.insertBefore(quickStats, heroSection.nextSibling);
            }
        }

        // Update quick stats content
        this.updateQuickStatsContent(quickStats);
        showElement(quickStats);
    }

    /**
     * Update quick stats content
     * @param {HTMLElement} statsElement - Stats container element
     */
    updateQuickStatsContent(statsElement) {
        const portfolioService = this.services.portfolioService;
        if (!portfolioService) return;

        const holdings = portfolioService.getHoldings();
        const totalValue = holdings.reduce((sum, holding) => sum + (holding.current_value_sats || 0), 0);
        const baseline = portfolioService.getPortfolioBaseline();
        const performance = portfolioService.calculatePerformance(totalValue);

        const statsHTML = `
            <h3 class="text-lg font-semibold mb-4">Your Portfolio at a Glance</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">${formatSatoshisForUI(totalValue)}</div>
                    <div class="text-sm text-gray-600">Current Value</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${performance.isPositive ? 'text-green-600' : 'text-red-600'}">${performance.formatted}</div>
                    <div class="text-sm text-gray-600">Performance</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-700">${holdings.length}</div>
                    <div class="text-sm text-gray-600">Assets</div>
                </div>
            </div>
        `;

        statsElement.innerHTML = statsHTML;
    }

    /**
     * Load example portfolio data for demonstration
     */
    async loadExamplePortfolioData() {
        // This would typically load sample data to show how traditional assets perform in BTC terms
        // For now, we'll use static example data
        this.exampleData = {
            initialValue: 100000000, // 1 BTC
            currentValue: 95000000,  // 0.95 BTC
            assets: [
                { symbol: 'SPY', name: 'S&P 500 ETF', allocation: 60, performance: -15.2 },
                { symbol: 'GLD', name: 'Gold ETF', allocation: 25, performance: -8.7 },
                { symbol: 'TLT', name: 'Treasury Bonds', allocation: 15, performance: -22.1 }
            ]
        };
    }

    /**
     * Update example portfolio display
     */
    updateExamplePortfolioDisplay() {
        const portfolioSection = this.examplePortfolioSection?.querySelector('.bg-white');
        if (!portfolioSection || !this.exampleData) return;

        const performance = ((this.exampleData.currentValue - this.exampleData.initialValue) / this.exampleData.initialValue) * 100;
        const performanceStyle = formatPercentageWithStyle(performance);

        // Update portfolio performance display
        const performanceElement = portfolioSection.querySelector('[data-portfolio-performance]');
        if (performanceElement) {
            setText(performanceElement, performanceStyle.text);
            performanceElement.className = `text-2xl font-bold ${performanceStyle.colorClass}`;
        }

        // Update asset breakdown
        this.updateExampleAssetBreakdown(portfolioSection);
    }

    /**
     * Update example asset breakdown
     * @param {HTMLElement} container - Container element
     */
    updateExampleAssetBreakdown(container) {
        const assetsGrid = container.querySelector('[data-assets-grid]');
        if (!assetsGrid || !this.exampleData) return;

        const assetsHTML = this.exampleData.assets.map(asset => {
            const performanceStyle = formatPercentageWithStyle(asset.performance);
            return `
                <div class="bg-gray-50 p-4 rounded">
                    <div class="font-medium">${asset.name}</div>
                    <div class="text-sm text-gray-600">${asset.allocation}% allocation</div>
                    <div class="text-sm ${performanceStyle.colorClass}">${performanceStyle.text}</div>
                </div>
            `;
        }).join('');

        assetsGrid.innerHTML = assetsHTML;
    }

    /**
     * Set up Bitcoin basics content
     */
    setupBitcoinBasicsContent() {
        const basicsSection = getElementById('bitcoinBasics');
        if (!basicsSection) return;

        // Add interactive elements to Bitcoin basics
        const topics = basicsSection.querySelectorAll('[data-topic]');
        topics.forEach(topic => {
            const clickHandler = () => this.handleTopicClick(topic);
            this.eventListeners.push(
                addEventListener(topic, 'click', clickHandler)
            );
        });
    }

    /**
     * Set up education navigation
     */
    setupEducationNavigation() {
        const educationLinks = document.querySelectorAll('[data-education-topic]');
        educationLinks.forEach(link => {
            const clickHandler = (e) => this.handleEducationNavigation(e);
            this.eventListeners.push(
                addEventListener(link, 'click', clickHandler)
            );
        });
    }

    /**
     * Set up portfolio example listeners
     */
    setupPortfolioExampleListeners() {
        const portfolioCards = document.querySelectorAll('[data-portfolio-card]');
        portfolioCards.forEach(card => {
            const clickHandler = () => this.handlePortfolioCardClick(card);
            this.eventListeners.push(
                addEventListener(card, 'click', clickHandler)
            );
        });
    }

    /**
     * Set up Bitcoin basics listeners
     */
    setupBitcoinBasicsListeners() {
        const basicsBtns = document.querySelectorAll('[data-basics-action]');
        basicsBtns.forEach(btn => {
            const clickHandler = (e) => this.handleBasicsAction(e);
            this.eventListeners.push(
                addEventListener(btn, 'click', clickHandler)
            );
        });
    }

    // ===== EVENT HANDLERS =====

    /**
     * Handle hero login button click
     */
    handleHeroLogin() {
        const isAuthenticated = this.services.authService?.isAuthenticated();

        if (isAuthenticated) {
            // Navigate to portfolio
            window.location.hash = '#portfolio';
        } else {
            // Navigate to login
            this.showLoginForm();
        }
    }

    /**
     * Handle get started button clicks
     */
    handleGetStarted() {
        const isAuthenticated = this.services.authService?.isAuthenticated();

        if (isAuthenticated) {
            window.location.hash = '#portfolio';
        } else {
            this.showLoginForm();
        }
    }

    /**
     * Handle learn more button clicks
     * @param {Event} event - Click event
     */
    handleLearnMore(event) {
        const target = event.target.getAttribute('data-target');

        if (target) {
            // Navigate to specific education content
            window.location.hash = `#education/${target}`;
        } else {
            // Navigate to general education page
            window.location.hash = '#education';
        }
    }

    /**
     * Handle topic click in Bitcoin basics
     * @param {HTMLElement} topicElement - Clicked topic element
     */
    handleTopicClick(topicElement) {
        const topic = topicElement.getAttribute('data-topic');
        if (topic) {
            // Expand topic or navigate to detailed view
            this.expandTopic(topicElement, topic);
        }
    }

    /**
     * Handle education navigation
     * @param {Event} event - Click event
     */
    handleEducationNavigation(event) {
        event.preventDefault();
        const topic = event.target.getAttribute('data-education-topic');
        if (topic) {
            window.location.hash = `#education/${topic}`;
        }
    }

    /**
     * Handle portfolio card clicks
     * @param {HTMLElement} card - Clicked card element
     */
    handlePortfolioCardClick(card) {
        const asset = card.getAttribute('data-asset');
        if (asset) {
            // Navigate to asset details or show modal
            window.location.hash = `#assets?asset=${asset}`;
        }
    }

    /**
     * Handle Bitcoin basics action buttons
     * @param {Event} event - Click event
     */
    handleBasicsAction(event) {
        const action = event.target.getAttribute('data-basics-action');

        switch (action) {
            case 'why-bitcoin':
                window.location.hash = '#education/why-bitcoin';
                break;
            case 'start-portfolio':
                this.handleGetStarted();
                break;
            case 'learn-more':
                window.location.hash = '#education';
                break;
            default:
                console.log('Unknown basics action:', action);
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Show login form
     */
    showLoginForm() {
        // This would typically trigger the router to show login
        // For now, navigate to login hash
        window.location.hash = '#login';
    }

    /**
     * Expand topic section
     * @param {HTMLElement} topicElement - Topic element
     * @param {string} topic - Topic identifier
     */
    expandTopic(topicElement, topic) {
        const content = topicElement.querySelector('[data-topic-content]');
        if (content) {
            const isExpanded = !content.classList.contains('hidden');

            if (isExpanded) {
                addClass(content, 'hidden');
                topicElement.setAttribute('aria-expanded', 'false');
            } else {
                removeClass(content, 'hidden');
                topicElement.setAttribute('aria-expanded', 'true');
            }
        }
    }

    /**
     * Update content for current auth state
     */
    updateContentForAuthState() {
        const isAuthenticated = this.services.authService?.isAuthenticated();

        // Update auth-dependent content
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(element => {
            if (isAuthenticated) {
                removeClass(element, 'hidden');
            } else {
                addClass(element, 'hidden');
            }
        });

        const guestElements = document.querySelectorAll('[data-guest-only]');
        guestElements.forEach(element => {
            if (isAuthenticated) {
                addClass(element, 'hidden');
            } else {
                removeClass(element, 'hidden');
            }
        });
    }

    /**
     * Render the home page (called by router)
     */
    async render() {
        if (!this.isInitialized) {
            await this.init();
        }

        // Update dynamic content
        this.updateContentForAuthState();

        if (this.services.authService?.isAuthenticated()) {
            await this.showQuickStats();
        }

        console.log('Home page rendered');
    }

    /**
     * Clean up component resources
     */
    destroy() {
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
        this.welcomeSection = null;
        this.examplePortfolioSection = null;
        this.bitcoinBasicsSection = null;
        this.heroSection = null;

        this.isInitialized = false;
        console.log('Home page component destroyed');
    }
}

export default HomePage;
