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

            // Define home page chart configurations (use ratio vs BTC like old app)
            const chartConfigs = [
                { containerId: 'chartGold', name: 'Gold', assetSymbol: 'XAU' },
                { containerId: 'chartSPY', name: 'S&P 500', assetSymbol: 'SPY' },
                { containerId: 'chartAAPL', name: 'Apple', assetSymbol: 'AAPL' },
                { containerId: 'chartTSLA', name: 'Tesla', assetSymbol: 'TSLA' },
                { containerId: 'chartVNQ', name: 'Real Estate', assetSymbol: 'VNQ' },
                { containerId: 'chartOil', name: 'Oil', assetSymbol: 'WTI' }
            ];

            // Ensure TradingView library is loaded before initializing charts
            await this.ensureTradingViewLoaded();

            // Initialize each chart with ratio symbol (ASSET/BTC)
            chartConfigs.forEach(config => {
                const base = this.getTradingViewBaseSymbol(config.assetSymbol);
                const tvSymbol = `${base}/BITSTAMP:BTCUSD`;
                this.initMiniChart(config.containerId, tvSymbol, config.name, config.assetSymbol);
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

        // Create TradingView mini symbol embed (external script)
        try {
            // Embedded mini-symbol-overview widget
            const chartDiv = document.createElement('div');
            chartDiv.style.width = '100%';
            chartDiv.style.height = '100%';
            chartDiv.style.position = 'absolute';
            chartDiv.style.top = '0';
            chartDiv.style.left = '0';
            chartDiv.style.pointerEvents = 'none';

            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
            script.innerHTML = JSON.stringify({
                symbol,
                width: '100%',
                height: '100%',
                locale: 'en',
                dateRange: '60M',
                colorTheme: 'light',
                trendLineColor: 'rgba(251, 146, 60, 1)',
                underLineColor: 'rgba(251, 146, 60, 0.1)',
                underLineBottomColor: 'rgba(251, 146, 60, 0)',
                isTransparent: true,
                autosize: true,
                noTimeScale: true,
                chartOnly: true,
                hide_top_toolbar: true,
                hide_legend: true,
                allow_symbol_change: false
            });

            chartDiv.appendChild(script);
            wrapper.appendChild(chartDiv);

        } catch (error) {
            console.error('Error creating TradingView embed:', error);
        }

        // Add wrapper to container
        container.appendChild(wrapper);

        // Load performance data for this asset
        this.loadAssetPerformance(assetSymbol, containerId);
    }

    /**
     * Map asset symbol to TradingView base symbol
     * @param {string} assetSymbol
     * @returns {string} TradingView base symbol (USD pair or TVC)
     */
    getTradingViewBaseSymbol(assetSymbol) {
        const map = {
            // Crypto
            'BTC': 'BITSTAMP:BTCUSD',
            // Commodities
            'XAU': 'TVC:GOLD',
            'XAG': 'TVC:SILVER',
            'WTI': 'TVC:USOIL',
            // US stocks and ETFs
            'SPY': 'AMEX:SPY',
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'META': 'NASDAQ:META',
            'NVDA': 'NASDAQ:NVDA',
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
            // Ticker with dot in TradingView
            'BRK-B': 'NYSE:BRK.B'
        };
        return map[assetSymbol] || `NASDAQ:${assetSymbol}`;
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

        if (!priceElement) return;

        let sats = pricesInSats[asset.symbol];
        // Fallback: compute from USD if sats not present
        if ((sats === undefined || sats === null) && pricesUsd[asset.symbol] && btcPrice) {
            sats = Math.round((pricesUsd[asset.symbol] / btcPrice) * 100000000);
        }

        if (typeof sats === 'number' && sats > 0) {
            const priceInBTC = sats / 100000000;
            priceElement.textContent = priceInBTC < 0.001 ? priceInBTC.toFixed(8) : priceInBTC.toFixed(4);
        } else {
            priceElement.textContent = '—';
        }

        // Load and display performance if element exists
        if (changeElement) {
            this.loadAssetPerformance(asset.symbol, null, changeElement);
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

                // Update 5Y big overlay in the card
                if (chartContainerId) {
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

            // Recent activity removed per user request
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

        // Recent activity component removed
    }

    // Recent activity section removed per user request

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
     * Update quick stats content - Portfolio at a Glance removed per user request
     * @param {HTMLElement} statsElement - Stats container element
     */
    updateQuickStatsContent(statsElement) {
        // Portfolio at a Glance section removed per user request
        statsElement.style.display = 'none';
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

        // Portfolio at a Glance and Recent Activity sections removed per user request

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
