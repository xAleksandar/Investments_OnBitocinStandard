class BitcoinGame {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.assets = [];
        this.prices = {};
        this.currentPage = 'home';
        this.priceRefreshInterval = null;

        this.initTooltips();
        this.initTranslation();
        this.init();
    }

    async initTranslation() {
        // Wait for translation service to be available
        while (!window.translationService) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Initialize translation service
        await window.translationService.loadTranslations();
        this.initLanguageSwitcher();

        // Listen for language changes
        window.addEventListener('languageChanged', async () => {
            this.updateLanguageSwitcher();
            // Update commodity names when language changes
            this.updateCommodityNames();
            // Re-translate asset descriptions if on assets page
            if (this.currentPage === 'assets') {
                this.updateAssetDescription();
            }
            // Re-render current page content with new language
            await this.rerenderCurrentPage();
        });

        // Update page translations after initial load
        setTimeout(async () => {
            if (window.translationService) {
                await window.translationService.updatePageTranslations();
            }
        }, 100);
    }

    initLanguageSwitcher() {
        const languageSwitcher = document.getElementById('languageSwitcher');
        const languageTrigger = document.getElementById('languageTrigger');
        const languageDropdown = document.getElementById('languageDropdown');
        const languageOptions = document.querySelectorAll('.language-option');

        if (!languageSwitcher || !languageTrigger) return;

        // Update current language display
        this.updateLanguageSwitcher();

        // Toggle dropdown
        languageTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            languageSwitcher.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            languageSwitcher.classList.remove('open');
        });

        // Handle language selection
        languageOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                const selectedLang = option.getAttribute('data-lang');

                if (selectedLang !== window.translationService.getCurrentLanguage()) {
                    await window.translationService.setLanguage(selectedLang);
                    this.updateLanguageSwitcher();
                }

                languageSwitcher.classList.remove('open');
            });
        });
    }

    updateLanguageSwitcher() {
        const currentLanguage = window.translationService?.getCurrentLanguage() || 'en';
        const currentFlag = document.getElementById('currentFlag');
        const currentLanguageText = document.getElementById('currentLanguage');
        const languageOptions = document.querySelectorAll('.language-option');

        if (currentFlag) {
            currentFlag.className = `language-flag flag-${currentLanguage}`;
        }

        if (currentLanguageText) {
            currentLanguageText.textContent = currentLanguage.toUpperCase();
        }

        // Update active option
        languageOptions.forEach(option => {
            const lang = option.getAttribute('data-lang');
            option.classList.toggle('active', lang === currentLanguage);
        });
    }

    async rerenderCurrentPage() {
        // Re-render content when language changes
        switch(this.currentPage) {
            case 'assets':
                this.updateAssetDescriptions();
                // Also update static page elements like dropdown categories
                if (window.translationService) {
                    await window.translationService.updatePageTranslations();
                }
                break;
            case 'portfolio':
                await this.updatePortfolioTranslations();
                break;
            case 'education':
                // Education pages will reload content automatically
                if (window.location.hash.startsWith('#education/')) {
                    const contentType = window.location.hash.replace('#education/', '');
                    this.loadEducationalContent(contentType);
                } else {
                    this.initEducationPage();
                }
                break;
            default:
                // For home and other pages, just update translations
                if (window.translationService) {
                    await window.translationService.updatePageTranslations();
                }
                break;
        }
    }

    updateAssetDescriptions() {
        // Update asset descriptions with translations
        const assetCards = document.querySelectorAll('[data-asset]');
        assetCards.forEach(card => {
            const assetSymbol = card.getAttribute('data-asset');
            const descElement = card.querySelector('.asset-description');
            if (descElement && window.translationService) {
                const translatedDesc = window.translationService.translate(`assets.descriptions.${assetSymbol}`);
                if (translatedDesc !== `assets.descriptions.${assetSymbol}`) {
                    descElement.textContent = translatedDesc;
                }
            }
        });

        // Update commodity names in asset selector
        this.updateCommodityNames();
    }

    updateCommodityNames() {
        if (!window.translationService) return;

        const commodityMap = {
            'XAU': 'gold',
            'XAG': 'silver',
            'WTI': 'crudeOil',
            'CPER': 'copper',
            'WEAT': 'wheat',
            'UNG': 'naturalGas',
            'URA': 'uranium',
            'DBA': 'agriculture'
        };

        Object.entries(commodityMap).forEach(([symbol, commodityKey]) => {
            const options = document.querySelectorAll(`option[value="${symbol}"]`);
            options.forEach(option => {
                const translatedName = window.translationService.translate(`assets.commodityNames.${commodityKey}`);
                if (translatedName !== `assets.commodityNames.${commodityKey}`) {
                    option.textContent = `${translatedName} (${symbol})`;
                }
            });
        });
    }

    async updatePortfolioTranslations() {
        // Update portfolio-specific translations
        if (window.translationService) {
            await window.translationService.updatePageTranslations();
            // Update any dynamically generated content
            this.updateHoldingsDisplay();
        }
    }

    initTooltips() {
        // Initialize custom tooltip system
        this.tooltip = document.getElementById('customTooltip');
    }

    showTooltip(element, content, event) {
        if (!this.tooltip) return;

        this.tooltip.textContent = content;
        this.tooltip.classList.add('show');

        // Position tooltip relative to mouse
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

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('show');
        }
    }

    setupPerformanceTooltip(element, content) {
        // Remove existing title attribute
        element.removeAttribute('title');

        // Add performance-metric class for cursor styling
        element.classList.add('performance-metric');

        // Remove existing event listeners to prevent duplicates
        element.onmouseenter = null;
        element.onmouseleave = null;
        element.onmousemove = null;

        // Add hover event listeners
        element.addEventListener('mouseenter', (e) => {
            this.showTooltip(element, content, e);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        element.addEventListener('mousemove', (e) => {
            if (this.tooltip && this.tooltip.classList.contains('show')) {
                this.showTooltip(element, content, e);
            }
        });
    }

    init() {
        console.log('App init started, pathname:', window.location.pathname);
        console.log('Full URL:', window.location.href);

        // Check for share URLs FIRST before any other initialization
        const isShareUrl = this.handleShareRouting();
        console.log('handleShareRouting() returned:', isShareUrl);
        if (isShareUrl) {
            console.log('Share URL detected, skipping normal app initialization');
            return;
        }
        console.log('Not a share URL, continuing with normal initialization');

        // Set up routing for normal pages
        this.setupRouting();

        // Check if we have a token from URL (magic link)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
            // Clean URL first
            window.history.replaceState({}, document.title, '/');
            this.verifyMagicLink(urlToken);
            return;
        }

        if (this.token) {
            // User is logged in - update nav but don't auto-navigate
            this.updateNavForLoggedInUser();
        }

        this.setupEventListeners();

        // Initialize suggestions system
        this.initSuggestionsSystem();

        // Navigate to current hash or default to home
        this.navigate(window.location.hash || '#home');
    }

    setupRouting() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.navigate(window.location.hash);
        });

        // Handle login buttons
        ['heroLoginBtn', 'navLoginBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.showLoginForm());
            }
        });

        // Handle logout button
        const logoutBtn = document.getElementById('navLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    navigate(hash) {
        // Clean up any existing interactive components
        this.cleanup();

        // Hide all pages
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('assetsPage').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('adminPage').classList.add('hidden');
        document.getElementById('educationPage').classList.add('hidden');

        // Route to appropriate page
        const baseHash = hash.split('?')[0]; // Remove query parameters for switch statement
        switch(baseHash) {
            case '#assets':
                this.currentPage = 'assets';
                document.getElementById('assetsPage').classList.remove('hidden');
                // Parse asset parameter from URL
                const hashParts = window.location.hash.split('?');
                let preselectedAsset = null;
                if (hashParts.length > 1) {
                    const urlParams = new URLSearchParams(hashParts[1]);
                    preselectedAsset = urlParams.get('asset');
                }
                this.initAssetsPage(preselectedAsset);
                break;
            case '#portfolio':
                this.currentPage = 'portfolio';
                if (this.token) {
                    document.getElementById('mainApp').classList.remove('hidden');

                    // Set up event listeners for the portfolio page
                    this.setupMainAppEventListeners();

                    if (!this.assets || this.assets.length === 0) {
                        this.loadData();
                        this.startPriceAutoRefresh();
                    }
                    // Initialize TradingView chart when portfolio is shown
                    setTimeout(() => {
                        this.initTradingViewChart('BTC', 'AMZN');
                    }, 100);
                } else {
                    this.showNotification('Please login to access your portfolio', 'error');
                    this.showLoginForm();
                }
                break;
            case '#admin':
                this.currentPage = 'admin';
                if (this.token && this.isCurrentUserAdmin()) {
                    document.getElementById('adminPage').classList.remove('hidden');
                    this.initAdminDashboard();
                } else if (this.token) {
                    this.showNotification('Admin access required', 'error');
                    this.navigate('#home');
                } else {
                    this.showNotification('Please login to access admin panel', 'error');
                    this.showLoginForm();
                }
                break;
            case '#education':
                this.currentPage = 'education';
                document.getElementById('educationPage').classList.remove('hidden');
                this.initEducationPage();
                break;
            case '#education/why-bitcoin':
                this.currentPage = 'education';
                document.getElementById('educationPage').classList.remove('hidden');
                this.loadEducationalContent('why-bitcoin');
                break;
            case '#education/why-not-gold':
                this.currentPage = 'education';
                document.getElementById('educationPage').classList.remove('hidden');
                this.loadEducationalContent('why-not-gold');
                break;
            case '#education/fiat-experiment':
                this.currentPage = 'education';
                document.getElementById('educationPage').classList.remove('hidden');
                this.loadEducationalContent('fiat-experiment');
                break;
            case '#home':
            default:
                this.currentPage = 'home';
                document.getElementById('homePage').classList.remove('hidden');
                this.initHomePage();
                break;
        }
    }

    navigateToAsset(assetSymbol) {
        // Navigate to assets page with preselected asset
        window.location.hash = `#assets?asset=${assetSymbol}`;
    }

    initHomePage() {
        // Initialize mini charts for popular assets
        setTimeout(() => {
            this.initMiniChart('chartGold', 'TVC:GOLD/BITSTAMP:BTCUSD');
            this.initMiniChart('chartSPY', 'AMEX:SPY/BITSTAMP:BTCUSD');
            this.initMiniChart('chartAAPL', 'NASDAQ:AAPL/BITSTAMP:BTCUSD');
            this.initMiniChart('chartTSLA', 'NASDAQ:TSLA/BITSTAMP:BTCUSD');
            this.initMiniChart('chartVNQ', 'AMEX:VNQ/BITSTAMP:BTCUSD');
            this.initMiniChart('chartOil', 'TVC:USOIL/BITSTAMP:BTCUSD');
        }, 500);

        // Load and display asset metrics
        this.loadHomePageMetrics();
    }

    initMiniChart(containerId, symbol) {
        const container = document.getElementById(containerId);
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
        labelText.style.color = '#9ca3af';
        labelText.style.marginTop = '2px';
        performanceOverlay.appendChild(labelText);

        container.appendChild(performanceOverlay);

        // Fetch real 5-year performance data
        this.fetchAndDisplay5YearPerformance(cleanSymbol, containerId);

        // Create the TradingView chart
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = '100%';
        chartDiv.style.position = 'absolute';
        chartDiv.style.top = '0';
        chartDiv.style.left = '0';
        chartDiv.style.pointerEvents = 'none'; // Disable clicks on chart

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        script.innerHTML = JSON.stringify({
            "symbol": symbol,
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "dateRange": "60M",
            "colorTheme": "light",
            "trendLineColor": "rgba(251, 146, 60, 1)",
            "underLineColor": "rgba(251, 146, 60, 0.1)",
            "underLineBottomColor": "rgba(251, 146, 60, 0)",
            "isTransparent": true,
            "autosize": true,
            "largeChartUrl": "",
            "noTimeScale": true,
            "chartOnly": true,
            "hide_top_toolbar": true,
            "hide_legend": true,
            "allow_symbol_change": false
        });

        chartDiv.appendChild(script);
        wrapper.appendChild(chartDiv);
        container.appendChild(wrapper);
    }

    async fetch5YearPerformance(symbol) {
        try {
            const response = await fetch(`/api/assets/performance/${symbol}/5y`);
            const data = await response.json();
            return data.performance;
        } catch (error) {
            console.error(`Failed to fetch 5Y performance for ${symbol}:`, error);
            return null;
        }
    }

    async fetchAndDisplay5YearPerformance(displaySymbol, containerId) {
        try {
            // Map display symbols to API symbols
            const apiSymbol = {
                'GOLD': 'XAU',
                'SPY': 'SPY',
                'AAPL': 'AAPL',
                'TSLA': 'TSLA',
                'VNQ': 'VNQ',
                'OIL': 'WTI',
                'USOIL': 'WTI'
            }[displaySymbol.toUpperCase()] || displaySymbol;

            const response = await fetch(`/api/assets/performance/${apiSymbol}/5y`);
            const data = await response.json();

            const perfElement = document.getElementById(`${containerId}-5y-perf`);
            if (perfElement && data.performance !== null) {
                const perf = data.performance.toFixed(1);
                const isPositive = data.performance >= 0;
                // Display with large percentage
                perfElement.textContent = `${isPositive ? '+' : ''}${perf}%`;
                perfElement.style.color = isPositive ? '#10b981' : '#ef4444';
            } else if (perfElement) {
                // If no data available, show a dash
                perfElement.textContent = '—';
                perfElement.style.color = '#6b7280';
            }
        } catch (error) {
            console.error('Error fetching 5Y performance:', error);
            const perfElement = document.getElementById(`${containerId}-5y-perf`);
            if (perfElement) {
                perfElement.textContent = '—';
                perfElement.style.color = '#6b7280';
            }
        }
    }

    async loadHomePageMetrics() {
        try {
            // Fetch current prices
            const response = await fetch('/api/assets/prices');
            const data = await response.json();

            if (!data || !data.pricesInSats) return;

            const btcPrice = data.btcPrice || 100000;
            const pricesInSats = data.pricesInSats;
            const pricesUsd = data.pricesUsd;

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
                const priceElement = document.getElementById(`${asset.elementId}Price`);
                const changeElement = document.getElementById(`${asset.elementId}Change`);

                if (priceElement && pricesInSats[asset.symbol]) {
                    // Convert sats to BTC for display
                    const priceInBTC = pricesInSats[asset.symbol] / 100000000;
                    priceElement.textContent = priceInBTC.toFixed(8);
                }

                if (changeElement) {
                    // Fetch real 5-year performance from server
                    this.fetch5YearPerformance(asset.symbol).then(performance => {
                        if (performance !== null) {
                            const sign = performance > 0 ? '+' : '';
                            changeElement.textContent = `${sign}${performance.toFixed(2)}%`;
                            changeElement.className = `font-semibold ${performance > 0 ? 'text-green-600' : 'text-red-600'}`;

                            // Also update the chart overlay if it exists
                            const overlayId = `chart${asset.elementId.charAt(0).toUpperCase() + asset.elementId.slice(1)}-5y-overlay`;
                            const chartOverlay = document.getElementById(overlayId);
                            if (chartOverlay) {
                                chartOverlay.textContent = `5Y: ${sign}${performance.toFixed(1)}%`;
                                chartOverlay.style.color = 'white';
                                chartOverlay.style.background = performance > 0 ? '#10b981' : '#ef4444';
                            }
                        } else {
                            changeElement.textContent = 'N/A';
                            changeElement.className = 'font-semibold text-gray-500';
                        }
                    });
                }
            });

            // Also update asset prices on the Assets page if visible
            if (this.currentPage === 'assets') {
                this.updateAssetMetrics();
            }
        } catch (error) {
            console.error('Failed to load home page metrics:', error);
        }
    }

    initEducationPage() {
        // Show education overview with links to articles
        const educationContent = document.getElementById('educationContent');
        if (!educationContent) return;

        const t = window.translationService?.translate.bind(window.translationService) || ((key) => key);

        educationContent.innerHTML = `
            <div class="max-w-4xl mx-auto py-8">
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4" data-translate="education.title">Education</h1>
                    <p class="text-xl text-gray-600" data-translate="education.subtitle">Learn about Bitcoin and sound money principles</p>
                </div>

                <div class="grid md:grid-cols-3 gap-8">
                    <div class="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onclick="window.location.hash = '#education/why-bitcoin'">
                        <div class="text-orange-500 text-4xl mb-4">₿</div>
                        <h3 class="text-xl font-semibold mb-3" data-translate="education.pages.whyBitcoin.title">Why Bitcoin?</h3>
                        <p class="text-gray-600 mb-4" data-translate="education.pages.whyBitcoin.subtitle">Understanding Bitcoin as neutral, apolitical money</p>
                        <span class="text-orange-500 font-medium">Read Article →</span>
                    </div>

                    <div class="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onclick="window.location.hash = '#education/why-not-gold'">
                        <div class="text-yellow-500 text-4xl mb-4">🥇</div>
                        <h3 class="text-xl font-semibold mb-3" data-translate="education.pages.whyNotGold.title">Why Not Gold?</h3>
                        <p class="text-gray-600 mb-4" data-translate="education.pages.whyNotGold.subtitle">The history of the gold standard and why it won't return</p>
                        <span class="text-orange-500 font-medium">Read Article →</span>
                    </div>

                    <div class="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer" onclick="window.location.hash = '#education/fiat-experiment'">
                        <div class="text-green-500 text-4xl mb-4">💵</div>
                        <h3 class="text-xl font-semibold mb-3" data-translate="education.pages.fiatExperiment.title">The Fiat Experiment</h3>
                        <p class="text-gray-600 mb-4" data-translate="education.pages.fiatExperiment.subtitle">How we arrived at today's monetary system</p>
                        <span class="text-orange-500 font-medium">Read Article →</span>
                    </div>
                </div>
            </div>
        `;

        // Update translations
        if (window.translationService) {
            window.translationService.updatePageTranslations();
        }
    }

    async loadEducationalContent(contentType) {
        const educationContent = document.getElementById('educationContent');
        if (!educationContent) return;

        try {
            // Show loading state
            educationContent.innerHTML = '<div class="flex justify-center items-center py-20"><div class="text-xl">Loading...</div></div>';

            // Get current language
            const currentLang = window.translationService?.getCurrentLanguage() || 'en';

            // Dynamically import the appropriate content file
            const contentModule = await import(`./content/educational/${contentType}-${currentLang}.js`);
            const content = contentModule.default || contentModule.content;

            this.renderEducationalContent(content);

        } catch (error) {
            console.error('Failed to load educational content:', error);
            educationContent.innerHTML = `
                <div class="max-w-4xl mx-auto py-8">
                    <div class="text-center">
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Content Not Available</h1>
                        <p class="text-gray-600 mb-6">Sorry, this educational content is not available in the selected language.</p>
                        <button onclick="window.location.hash = '#education'" class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
                            Back to Education
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderEducationalContent(content) {
        const educationContent = document.getElementById('educationContent');
        if (!educationContent || !content) return;

        const t = window.translationService?.translate.bind(window.translationService) || ((key) => key);

        // Generate table of contents
        const tocItems = content.tableOfContents.map(item =>
            `<li><a href="#${item.id}" class="text-orange-500 hover:text-orange-600">${item.title}</a></li>`
        ).join('');

        // Generate sections
        const sectionsHtml = content.sections.map(section => `
            <section id="${section.id}" class="mb-12">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">${section.title}</h2>
                <div class="prose prose-lg max-w-none">
                    ${section.content}
                </div>
            </section>
        `).join('');

        // Generate related topics
        const relatedTopicsHtml = content.relatedTopics.map(topic => `
            <a href="${topic.link}" class="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 class="font-semibold text-gray-800 mb-2">${topic.title}</h4>
                <p class="text-gray-600 text-sm">${topic.description}</p>
            </a>
        `).join('');

        educationContent.innerHTML = `
            <!-- Reading Progress Bar -->
            <div class="fixed top-0 left-0 w-full z-50">
                <div id="readingProgress" class="h-1 bg-orange-500 transition-all duration-300" style="width: 0%"></div>
            </div>

            <div class="max-w-4xl mx-auto py-8">
                <!-- Header -->
                <div class="mb-8">
                    <nav class="text-sm text-gray-500 mb-4">
                        <a href="#education" class="hover:text-orange-500" data-translate="education.backToEducation">Back to Education</a>
                        <span class="mx-2">→</span>
                        <span>${content.title}</span>
                    </nav>
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">${content.title}</h1>
                    <p class="text-xl text-gray-600 mb-6">${content.subtitle}</p>
                    <div class="flex items-center space-x-6 text-sm text-gray-500">
                        <span data-translate="education.readingTime">${content.readingTime} min read</span>
                        <span data-translate="education.lastUpdated">Last updated: ${content.lastUpdated}</span>
                    </div>
                </div>

                <div class="grid lg:grid-cols-4 gap-8">
                    <!-- Table of Contents -->
                    <div class="lg:col-span-1">
                        <div class="sticky top-4">
                            <h3 class="font-semibold text-gray-800 mb-4" data-translate="education.tableOfContents">Table of Contents</h3>
                            <ul class="space-y-2 text-sm">
                                ${tocItems}
                            </ul>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="lg:col-span-3">
                        <article class="prose prose-lg max-w-none">
                            ${sectionsHtml}
                        </article>

                        <!-- Related Topics -->
                        ${content.relatedTopics && content.relatedTopics.length > 0 ? `
                        <div class="mt-12 pt-8 border-t">
                            <h3 class="text-xl font-semibold text-gray-800 mb-6" data-translate="education.relatedTopics">Related Topics</h3>
                            <div class="grid md:grid-cols-2 gap-4">
                                ${relatedTopicsHtml}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Smooth scroll for table of contents links
        const tocLinks = educationContent.querySelectorAll('a[href^="#"]');
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Initialize reading progress and active section tracking
        this.initReadingProgress();
        this.initActiveSection();

        // Update translations
        if (window.translationService) {
            window.translationService.updatePageTranslations();
        }
    }

    initReadingProgress() {
        const progressBar = document.getElementById('readingProgress');
        if (!progressBar) return;

        // Remove any existing scroll listeners
        if (this.readingProgressHandler) {
            window.removeEventListener('scroll', this.readingProgressHandler);
        }

        this.readingProgressHandler = () => {
            const article = document.querySelector('article');
            if (!article) return;

            const articleTop = article.offsetTop;
            const articleHeight = article.offsetHeight;
            const scrollTop = window.pageYOffset;
            const windowHeight = window.innerHeight;

            // Calculate reading progress
            const startReading = articleTop - windowHeight * 0.3;
            const endReading = articleTop + articleHeight - windowHeight * 0.7;
            const totalReadingDistance = endReading - startReading;

            let progress = 0;
            if (scrollTop > startReading) {
                progress = Math.min((scrollTop - startReading) / totalReadingDistance, 1);
            }

            progressBar.style.width = `${progress * 100}%`;
        };

        window.addEventListener('scroll', this.readingProgressHandler);
    }

    initActiveSection() {
        // Remove any existing intersection observer
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
        }

        const sections = document.querySelectorAll('section[id]');
        const tocLinks = document.querySelectorAll('a[href^="#"]');

        if (sections.length === 0 || tocLinks.length === 0) return;

        this.sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Remove active class from all TOC links
                    tocLinks.forEach(link => {
                        link.classList.remove('font-semibold', 'text-orange-600');
                        link.classList.add('text-orange-500');
                    });

                    // Add active class to current section's TOC link
                    const activeLink = document.querySelector(`a[href="#${entry.target.id}"]`);
                    if (activeLink) {
                        activeLink.classList.remove('text-orange-500');
                        activeLink.classList.add('font-semibold', 'text-orange-600');
                    }
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        });

        sections.forEach(section => {
            this.sectionObserver.observe(section);
        });
    }

    cleanup() {
        // Clean up event listeners and observers when navigating away
        if (this.readingProgressHandler) {
            window.removeEventListener('scroll', this.readingProgressHandler);
            this.readingProgressHandler = null;
        }
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
            this.sectionObserver = null;
        }
        // Clean up any pending asset translation attempts
        if (this.pendingAssetTranslation) {
            this.pendingAssetTranslation = false;
        }
    }

    async initAssetsPage(preselectedAsset = null) {
        const selector = document.getElementById('assetSelector');
        if (!selector) return;

        // Remove any existing listeners
        const newSelector = selector.cloneNode(true);
        selector.parentNode.replaceChild(newSelector, selector);

        // Preselect asset if specified
        if (preselectedAsset && newSelector.querySelector(`option[value="${preselectedAsset}"]`)) {
            newSelector.value = preselectedAsset;
        }

        // Initialize denomination state
        this.currentDenomination = 'BTC'; // Default to Bitcoin

        // Setup denomination toggle buttons
        const btcBtn = document.getElementById('btcDenomination');
        const usdBtn = document.getElementById('usdDenomination');

        if (btcBtn && usdBtn) {
            btcBtn.addEventListener('click', () => {
                this.currentDenomination = 'BTC';
                btcBtn.classList.add('bg-blue-500', 'text-white');
                btcBtn.classList.remove('text-gray-700', 'hover:bg-gray-200');
                usdBtn.classList.remove('bg-blue-500', 'text-white');
                usdBtn.classList.add('text-gray-700', 'hover:bg-gray-200');
                document.getElementById('chartDenomination').textContent = 'in Bitcoin';
                this.updateAssetChart();
                this.loadAssetPageMetrics();
            });

            usdBtn.addEventListener('click', () => {
                this.currentDenomination = 'USD';
                usdBtn.classList.add('bg-blue-500', 'text-white');
                usdBtn.classList.remove('text-gray-700', 'hover:bg-gray-200');
                btcBtn.classList.remove('bg-blue-500', 'text-white');
                btcBtn.classList.add('text-gray-700', 'hover:bg-gray-200');
                document.getElementById('chartDenomination').textContent = 'in USD';
                this.updateAssetChart();
                this.loadAssetPageMetrics();
            });
        }

        // Initialize chart for selected asset
        this.updateAssetChart();

        // Load metrics for assets page
        this.loadAssetPageMetrics();

        newSelector.addEventListener('change', () => {
            this.updateAssetChart();
            this.loadAssetPageMetrics();
            this.updateAssetDescription();
        });

        // Initialize description for default selected asset
        this.updateAssetDescription();

        // Update page translations for static dropdown categories
        // (This handles the <optgroup> data-translate attributes)
        // Wait for translation service to be ready before updating
        if (window.translationService) {
            try {
                await window.translationService.updatePageTranslations();
            } catch (error) {
                console.error('Failed to update page translations:', error);
                // Fallback: try again after a short delay
                setTimeout(() => {
                    if (window.translationService) {
                        window.translationService.updatePageTranslations();
                    }
                }, 500);
            }
        }
    }

    async loadAssetPageMetrics() {
        try {
            const selector = document.getElementById('assetSelector');
            if (!selector) return;

            const selectedAsset = selector.value;

            // Fetch current prices
            const response = await fetch('/api/assets/prices');
            const data = await response.json();

            if (!data || !data.pricesInSats) return;

            const pricesInSats = data.pricesInSats;
            const pricesUsd = data.pricesUsd;
            const btcPrice = data.btcPrice || 100000;

            // Update BTC price display
            const priceBTCElement = document.getElementById('assetPriceBTC');
            if (priceBTCElement && pricesInSats[selectedAsset]) {
                const priceInBTC = pricesInSats[selectedAsset] / 100000000;
                priceBTCElement.textContent = priceInBTC.toFixed(8);
            }

            // Update USD price display
            const priceUSDElement = document.getElementById('assetPriceUSD');
            if (priceUSDElement && pricesUsd && pricesUsd[selectedAsset]) {
                const priceUSD = pricesUsd[selectedAsset];
                priceUSDElement.textContent = `$${priceUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }

            // Update performance metrics with real API data
            const metrics = {
                '24h': document.getElementById('asset24h'),
                '1y': document.getElementById('asset1y'),
                '5y': document.getElementById('asset5y'),
                '10y': document.getElementById('assetAllTime')
            };

            // Show loading state initially
            Object.values(metrics).forEach(element => {
                if (element) {
                    element.textContent = 'Loading...';
                    element.className = 'font-semibold text-gray-500';
                }
            });

            // Fetch real performance data for each time period
            const performancePromises = Object.keys(metrics).map(async period => {
                try {
                    const response = await fetch(`/api/assets/performance/${selectedAsset}/${period}`);
                    const data = await response.json();
                    return {
                        period,
                        performance: data.performance,
                        startDate: data.startDate,
                        details: data.details || null
                    };
                } catch (error) {
                    console.error(`Failed to fetch ${period} performance for ${selectedAsset}:`, error);
                    return { period, performance: null, details: null };
                }
            });

            // Wait for all performance data and update the UI
            const performanceResults = await Promise.all(performancePromises);

            performanceResults.forEach(({ period, performance, details }) => {
                const element = metrics[period];

                if (element) {
                    // Find the parent container div (.bg-gray-50.rounded.p-3)
                    const container = element.closest('.bg-gray-50');

                    if (performance !== null && !isNaN(performance) && details) {
                        const value = performance.toFixed(2);
                        element.textContent = `${performance > 0 ? '+' : ''}${value}%`;
                        element.className = `font-semibold ${performance > 0 ? 'text-green-600' : 'text-red-600'}`;

                        // Create detailed tooltip with price breakdown
                        const assetMultiplier = (details.assetPriceCurrent / details.assetPriceOld).toFixed(1);
                        const btcMultiplier = (details.btcPriceCurrent / details.btcPriceOld).toFixed(1);

                        // Use translated period labels
                        const periodLabelKey = period === '24h' ? 'time.twentyFourHoursAgo' :
                                              period === '1y' ? 'time.oneYearAgo' :
                                              period === '5y' ? 'time.fiveYearsAgo' :
                                              period === '10y' ? 'time.tenYearsAgo' : period;

                        const periodLabel = window.translationService?.translate(periodLabelKey) || period;
                        const vsPerformance = window.translationService?.translate('tooltips.vsPerformance') || 'vs Bitcoin Performance';
                        const netPerformance = window.translationService?.translate('tooltips.netPerformance') || 'Net performance';
                        const bitcoinGrew = window.translationService?.translate('tooltips.bitcoinGrew') || 'Bitcoin grew';
                        const vs = window.translationService?.translate('tooltips.vs') || 'vs';

                        const tooltip = `${selectedAsset} ${vsPerformance} (${period})\n\n` +
                                      `${periodLabel}:\n` +
                                      `${selectedAsset}: $${details.assetPriceOld.toLocaleString()} → $${details.assetPriceCurrent.toLocaleString()} (${assetMultiplier}x)\n` +
                                      `Bitcoin: $${details.btcPriceOld.toLocaleString()} → $${details.btcPriceCurrent.toLocaleString()} (${btcMultiplier}x)\n\n` +
                                      `${bitcoinGrew} ${btcMultiplier}x ${vs} ${selectedAsset}'s ${assetMultiplier}x\n` +
                                      `${netPerformance}: ${value}%`;

                        // Apply tooltip to the container div instead of just the text
                        this.setupPerformanceTooltip(container || element, tooltip);
                    } else if (performance !== null && !isNaN(performance)) {
                        const value = performance.toFixed(2);
                        element.textContent = `${performance > 0 ? '+' : ''}${value}%`;
                        element.className = `font-semibold ${performance > 0 ? 'text-green-600' : 'text-red-600'}`;
                        const performanceOverPeriod = window.translationService?.translate('tooltips.performanceOverPeriod') || 'Performance vs Bitcoin over';
                        this.setupPerformanceTooltip(container || element, `${performanceOverPeriod} ${period}`);
                    } else {
                        element.textContent = 'N/A';
                        element.className = 'font-semibold text-gray-500';
                        const dataNotAvailable = window.translationService?.translate('tooltips.dataNotAvailable') || 'Data not available for';
                        const periodText = window.translationService?.translate('tooltips.period') || 'period';
                        this.setupPerformanceTooltip(container || element, `${dataNotAvailable} ${period} ${periodText}`);
                    }
                }
            });

            // Add Bitcoin price tooltip for Current (BTC) section
            const btcPriceElement = document.getElementById('assetPriceBTC');
            if (btcPriceElement && data && data.pricesInSats && data.pricesUsd && data.btcPrice) {
                const btcContainer = btcPriceElement.closest('.bg-gray-50');
                const btcPrice = data.btcPrice;
                const assetPriceInBTC = data.pricesInSats[selectedAsset];
                const assetPriceInUSD = data.pricesUsd[selectedAsset];

                if (assetPriceInBTC && btcPrice && assetPriceInUSD) {
                    // Convert satoshis to BTC (divide by 100,000,000)
                    const assetPriceInBTCConverted = assetPriceInBTC / 100000000;
                    const currentBitcoinPrice = window.translationService?.translate('tooltips.currentBitcoinPrice') || 'Current Bitcoin Price';
                    const currentAssetPriceTemplate = window.translationService?.translate('tooltips.currentPrice') || 'Current %ASSET% Price';
                    const currentAssetPrice = currentAssetPriceTemplate.replace('%ASSET%', selectedAsset);

                    const btcTooltip = `${currentBitcoinPrice}: $${btcPrice.toLocaleString()}\n` +
                                      `${currentAssetPrice}: $${assetPriceInUSD.toLocaleString()}\n\n` +
                                      `1 ${selectedAsset} = ${assetPriceInBTCConverted.toFixed(8)} BTC\n` +
                                      `1 BTC = ${(1/assetPriceInBTCConverted).toFixed(2)} ${selectedAsset}`;

                    this.setupPerformanceTooltip(btcContainer || btcPriceElement, btcTooltip);
                }
            }

        } catch (error) {
            console.error('Failed to load asset page metrics:', error);
        }
    }

    updateAssetMetrics() {
        const selector = document.getElementById('assetSelector');
        if (!selector) return;

        const asset = selector.value;

        // Update the price metrics for the selected asset on Assets page
        const priceElement = document.getElementById('assetPriceBTC');
        const changeElement = document.getElementById('asset24hChange');

        // This would be called when we have the price data
        // For now it's a placeholder that will be populated by loadAssetPageMetrics
    }

    updateAssetChart() {
        const selector = document.getElementById('assetSelector');
        const container = document.getElementById('assetChart');
        if (!selector || !container) return;

        const asset = selector.value;
        const denomination = this.currentDenomination || 'BTC';

        // Different symbol mapping based on denomination
        const symbolMapBTC = {
            // Original assets
            'XAU': 'TVC:GOLD/BITSTAMP:BTCUSD',
            'XAG': 'TVC:SILVER/BITSTAMP:BTCUSD',
            'SPY': 'AMEX:SPY/BITSTAMP:BTCUSD',
            'AAPL': 'NASDAQ:AAPL/BITSTAMP:BTCUSD',
            'TSLA': 'NASDAQ:TSLA/BITSTAMP:BTCUSD',
            'MSFT': 'NASDAQ:MSFT/BITSTAMP:BTCUSD',
            'GOOGL': 'NASDAQ:GOOGL/BITSTAMP:BTCUSD',
            'AMZN': 'NASDAQ:AMZN/BITSTAMP:BTCUSD',
            'NVDA': 'NASDAQ:NVDA/BITSTAMP:BTCUSD',
            'VNQ': 'AMEX:VNQ/BITSTAMP:BTCUSD',
            'WTI': 'TVC:USOIL/BITSTAMP:BTCUSD',

            // New stocks
            'META': 'NASDAQ:META/BITSTAMP:BTCUSD',
            'BRK-B': 'NYSE:BRK.B/BITSTAMP:BTCUSD',
            'JNJ': 'NYSE:JNJ/BITSTAMP:BTCUSD',
            'V': 'NYSE:V/BITSTAMP:BTCUSD',
            'WMT': 'NYSE:WMT/BITSTAMP:BTCUSD',

            // Bond ETFs
            'TLT': 'NASDAQ:TLT/BITSTAMP:BTCUSD',
            'HYG': 'AMEX:HYG/BITSTAMP:BTCUSD',

            // International ETFs and Indices
            'VXUS': 'NASDAQ:VXUS/BITSTAMP:BTCUSD',
            'EFA': 'AMEX:EFA/BITSTAMP:BTCUSD',
            'EWU': 'AMEX:EWU/BITSTAMP:BTCUSD',
            'EWG': 'AMEX:EWG/BITSTAMP:BTCUSD',
            'EWJ': 'AMEX:EWJ/BITSTAMP:BTCUSD',

            // REITs
            'VNO': 'NYSE:VNO/BITSTAMP:BTCUSD',
            'PLD': 'NYSE:PLD/BITSTAMP:BTCUSD',
            'EQIX': 'NASDAQ:EQIX/BITSTAMP:BTCUSD',

            // Commodity ETFs
            'URA': 'AMEX:URA/BITSTAMP:BTCUSD',
            'DBA': 'AMEX:DBA/BITSTAMP:BTCUSD',
            'CPER': 'AMEX:CPER/BITSTAMP:BTCUSD',
            'WEAT': 'AMEX:WEAT/BITSTAMP:BTCUSD',
            'UNG': 'AMEX:UNG/BITSTAMP:BTCUSD'
        };

        const symbolMapUSD = {
            // Original assets
            'XAU': 'TVC:GOLD',
            'XAG': 'TVC:SILVER',
            'SPY': 'AMEX:SPY',
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'NVDA': 'NASDAQ:NVDA',
            'VNQ': 'AMEX:VNQ',
            'WTI': 'TVC:USOIL',

            // New stocks
            'META': 'NASDAQ:META',
            'BRK-B': 'NYSE:BRK.B',
            'JNJ': 'NYSE:JNJ',
            'V': 'NYSE:V',
            'WMT': 'NYSE:WMT',

            // Bond ETFs
            'TLT': 'NASDAQ:TLT',
            'HYG': 'AMEX:HYG',

            // International ETFs and Indices
            'VXUS': 'NASDAQ:VXUS',
            'EFA': 'AMEX:EFA',
            'EWU': 'AMEX:EWU',
            'EWG': 'AMEX:EWG',
            'EWJ': 'AMEX:EWJ',

            // REITs
            'VNO': 'NYSE:VNO',
            'PLD': 'NYSE:PLD',
            'EQIX': 'NASDAQ:EQIX',

            // Commodity ETFs
            'URA': 'AMEX:URA',
            'DBA': 'AMEX:DBA',
            'CPER': 'AMEX:CPER',
            'WEAT': 'AMEX:WEAT',
            'UNG': 'AMEX:UNG'
        };

        const symbolMap = denomination === 'USD' ? symbolMapUSD : symbolMapBTC;
        const symbol = symbolMap[asset] || (denomination === 'USD' ? 'TVC:DJI' : 'BITSTAMP:BTCUSD');

        container.innerHTML = '';
        const widgetId = 'tv-widget-' + Date.now();
        const widgetContainer = document.createElement('div');
        widgetContainer.id = widgetId;
        widgetContainer.style.height = '600px';
        widgetContainer.style.width = '100%';
        container.appendChild(widgetContainer);

        const createWidget = () => {
            new window.TradingView.widget({
                "width": "100%",
                "height": 600,
                "symbol": symbol,
                "interval": "D",
                "timezone": "Etc/UTC",
                "theme": "light",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "allow_symbol_change": false,
                "range": "60M",  // 5 years (60 months)
                "container_id": widgetId
            });
        };

        if (window.TradingView) {
            createWidget();
        } else {
            const tvScript = document.createElement('script');
            tvScript.type = 'text/javascript';
            tvScript.src = 'https://s3.tradingview.com/tv.js';
            tvScript.onload = createWidget;
            document.head.appendChild(tvScript);
        }
    }

    updateAssetDescription() {
        const selector = document.getElementById('assetSelector');
        if (!selector) return;

        const selectedAsset = selector.value;
        const titleElement = document.getElementById('assetTitle');
        const descriptionElement = document.getElementById('assetDescriptionText');
        const categoryElement = document.getElementById('assetCategory');

        const assetDescriptions = {
            // Popular Assets
            'XAU': {
                title: 'Gold (XAU)',
                description: 'Gold has been humanity\'s store of value for over 5,000 years and remains the most recognized alternative to fiat currency. Central banks hold gold as reserves, and investors traditionally view it as a hedge against inflation and economic uncertainty. However, when measured against Bitcoin, gold has consistently underperformed, revealing Bitcoin\'s superior monetary properties as the ultimate store of value for the digital age.',
                category: 'Commodity',
                tags: ['Traditional Store of Value', 'Central Bank Reserve']
            },
            'SPY': {
                title: 'SPDR S&P 500 ETF (SPY)',
                description: 'SPY tracks the S&P 500 index, representing the largest 500 publicly traded companies in America. It\'s the world\'s largest and most traded ETF, with over $400 billion in assets. Often considered the benchmark for U.S. stock market performance, SPY is used by institutions and individuals as a core holding. Yet even this diversified exposure to America\'s top companies has lost significant value when priced in Bitcoin.',
                category: 'Stock ETF',
                tags: ['Market Benchmark', 'Institutional Favorite']
            },
            'AAPL': {
                title: 'Apple Inc. (AAPL)',
                description: 'Apple is the world\'s most valuable company, known for revolutionary products like the iPhone, iPad, and Mac. With over $3 trillion in market capitalization, Apple has been many investors\' favorite "safe" technology stock. The company generates massive cash flows and has a loyal customer base globally. Despite its dominance, even Apple\'s impressive growth pales in comparison to Bitcoin\'s performance as a store of value.',
                category: 'Technology Stock',
                tags: ['Largest Company', 'Consumer Technology']
            },
            'TSLA': {
                title: 'Tesla Inc. (TSLA)',
                description: 'Tesla revolutionized the automotive industry by making electric vehicles mainstream and desirable. Led by Elon Musk, Tesla has expanded into energy storage, solar panels, and autonomous driving technology. The company famously added Bitcoin to its treasury in 2021, recognizing its superior monetary properties. Tesla represents the future of transportation, yet Bitcoin represents the future of money.',
                category: 'Technology Stock',
                tags: ['Electric Vehicles', 'Bitcoin Adopter']
            },
            'META': {
                title: 'Meta Platforms Inc. (META)',
                description: 'Meta (formerly Facebook) owns the world\'s largest social media platforms including Facebook, Instagram, and WhatsApp, connecting over 3 billion people globally. The company is heavily investing in the "metaverse" and virtual reality technologies. Despite controlling how billions communicate and share information, Meta\'s stock has struggled to maintain its value against Bitcoin\'s monetary superiority.',
                category: 'Technology Stock',
                tags: ['Social Media', 'Metaverse Pioneer']
            },

            // Technology Stocks
            'MSFT': {
                title: 'Microsoft Corporation (MSFT)',
                description: 'Microsoft is a global technology leader in cloud computing (Azure), productivity software (Office 365), and operating systems (Windows). The company has successfully transitioned to a subscription-based model and dominates enterprise software. With consistent revenue growth and strong fundamentals, Microsoft represents "stable" tech investing, yet it still loses purchasing power when measured in Bitcoin.',
                category: 'Technology Stock',
                tags: ['Cloud Computing', 'Enterprise Software']
            },
            'GOOGL': {
                title: 'Alphabet Inc. (GOOGL)',
                description: 'Alphabet is Google\'s parent company, controlling the world\'s dominant search engine and advertising platform. Google processes over 8 billion searches daily and owns YouTube, Android, and Google Cloud. The company has near-monopolistic control over internet information flow, generating massive profits from advertising. Yet even this digital dominance cannot compete with Bitcoin as a store of value.',
                category: 'Technology Stock',
                tags: ['Search Engine', 'Digital Advertising']
            },
            'AMZN': {
                title: 'Amazon.com Inc. (AMZN)',
                description: 'Amazon transformed from an online bookstore into the "everything store" and cloud computing leader (AWS). The company dominates e-commerce and provides the infrastructure powering much of the modern internet. Amazon Web Services alone generates billions in high-margin revenue. Despite revolutionizing commerce and computing, Amazon\'s stock value has declined significantly when priced in Bitcoin.',
                category: 'Technology Stock',
                tags: ['E-commerce', 'Cloud Infrastructure']
            },
            'NVDA': {
                title: 'NVIDIA Corporation (NVDA)',
                description: 'NVIDIA designs the graphics processing units (GPUs) that power gaming, artificial intelligence, and cryptocurrency mining. The company\'s chips are essential for AI development and machine learning applications. Ironically, many NVIDIA GPUs are used to mine Bitcoin and other cryptocurrencies, yet the company\'s stock still underperforms Bitcoin as an investment.',
                category: 'Technology Stock',
                tags: ['AI Hardware', 'GPU Manufacturing']
            },

            // Traditional Stocks
            'BRK-B': {
                title: 'Berkshire Hathaway Inc. Class B (BRK-B)',
                description: 'Berkshire Hathaway is Warren Buffett\'s legendary investment conglomerate, often called the world\'s most successful investment vehicle. The company owns dozens of businesses and holds massive stock positions in Apple, Coca-Cola, and other blue-chip companies. Buffett has famously criticized Bitcoin, calling it "rat poison squared," yet even his proven investment strategy has underperformed Bitcoin over the past decade.',
                category: 'Conglomerate',
                tags: ['Warren Buffett', 'Value Investing']
            },
            'JNJ': {
                title: 'Johnson & Johnson (JNJ)',
                description: 'Johnson & Johnson is one of the world\'s largest healthcare companies, producing pharmaceuticals, medical devices, and consumer products. The company has paid increasing dividends for 59 consecutive years, making it a favorite among income investors. J&J represents stability and essential healthcare needs, yet even this defensive stock has lost significant value when measured against Bitcoin.',
                category: 'Healthcare Stock',
                tags: ['Dividend Aristocrat', 'Healthcare Essential']
            },
            'V': {
                title: 'Visa Inc. (V)',
                description: 'Visa operates the world\'s largest payment network, processing over 150 billion transactions annually across 200+ countries. The company earns fees on nearly every credit and debit card transaction globally, creating a near-monopolistic "tollbooth" business model. Ironically, while Visa facilitates fiat currency transactions, Bitcoin offers a superior payment network that eliminates the need for intermediaries.',
                category: 'Financial Services',
                tags: ['Payment Network', 'Transaction Fees']
            },
            'WMT': {
                title: 'Walmart Inc. (WMT)',
                description: 'Walmart is the world\'s largest retailer, serving 230 million customers weekly across 10,500 stores in 24 countries. The company pioneered efficient supply chain management and low-cost retail operations. Walmart represents essential consumer goods and services that people need regardless of economic conditions, yet even this defensive retail giant has declined in value when priced in Bitcoin.',
                category: 'Retail Stock',
                tags: ['Largest Retailer', 'Consumer Staples']
            },

            // Bonds
            'TLT': {
                title: 'iShares 20+ Year Treasury Bond ETF (TLT)',
                description: 'TLT provides exposure to U.S. Treasury bonds with 20+ year maturities, traditionally considered the "safest" investment in the world. These bonds are backed by the full faith and credit of the U.S. government and have been the go-to safe haven for institutional investors. However, when measured against Bitcoin, even the safest government bonds have lost tremendous purchasing power, highlighting the debasement of fiat currency.',
                category: 'Bond ETF',
                tags: ['Government Bonds', 'Traditional Safe Haven']
            },
            'HYG': {
                title: 'iShares iBoxx $ High Yield Corporate Bond ETF (HYG)',
                description: 'HYG tracks high-yield corporate bonds, also known as "junk bonds," from companies with lower credit ratings. These bonds offer higher interest rates to compensate for increased default risk. Professional investors use HYG for income generation and portfolio diversification. Despite offering higher yields than government bonds, HYG has still lost significant value when priced in Bitcoin.',
                category: 'Bond ETF',
                tags: ['High Yield', 'Corporate Debt']
            },

            // International Markets
            'EWU': {
                title: 'iShares MSCI United Kingdom ETF (EWU)',
                description: 'EWU provides exposure to large and mid-capitalization UK stocks, including giants like Shell, AstraZeneca, and ASML. This ETF tracks the performance of the UK economy and provides investors with easy access to British markets. EWU shows how even the most established international markets have significantly underperformed Bitcoin, demonstrating Bitcoin\'s global monetary superiority over traditional geographic diversification strategies.',
                category: 'International ETF',
                tags: ['UK Market', 'European Exposure']
            },
            'EWG': {
                title: 'iShares MSCI Germany ETF (EWG)',
                description: 'EWG provides exposure to German equities, tracking the largest companies including BMW, SAP, and Siemens. Germany has Europe\'s largest economy and is known for manufacturing excellence and engineering prowess. This ETF represents German industrial strength and European economic leadership, yet even Germany\'s robust economy has seen this ETF lose substantial value when measured against Bitcoin.',
                category: 'International ETF',
                tags: ['German Market', 'Industrial Economy']
            },
            'EWJ': {
                title: 'iShares MSCI Japan ETF (EWJ)',
                description: 'EWJ provides exposure to Japanese equities, including Japan\'s largest companies like Toyota, Sony, and SoftBank. Japan has the world\'s third-largest economy and is known for technological innovation and manufacturing excellence. Japanese markets peaked in 1989 and have struggled for decades, illustrating the consequences of monetary manipulation. Bitcoin offers a stark contrast as a deflationary alternative to Japan\'s inflationary monetary policy.',
                category: 'International ETF',
                tags: ['Japanese Market', 'Technology Innovation']
            },
            'VXUS': {
                title: 'Vanguard Total International Stock ETF (VXUS)',
                description: 'VXUS provides broad exposure to international developed and emerging markets outside the United States, holding over 7,000 stocks from companies in Europe, Asia, and emerging markets. This ETF is popular for global diversification, giving investors exposure to international economic growth. However, even this broad international diversification has failed to preserve value when measured against Bitcoin.',
                category: 'International ETF',
                tags: ['Global Diversification', 'Emerging Markets']
            },
            'EFA': {
                title: 'iShares MSCI EAFE ETF (EFA)',
                description: 'EFA tracks developed international markets in Europe, Australasia, and the Far East (EAFE), excluding the U.S. and Canada. The fund holds companies like Nestlé, ASML, and Samsung, representing established international businesses. EFA is a cornerstone holding for investors seeking international developed market exposure, yet it has consistently lost value when priced in Bitcoin.',
                category: 'International ETF',
                tags: ['Developed Markets', 'International Blue Chips']
            },

            // Real Estate
            'VNQ': {
                title: 'Vanguard Real Estate ETF (VNQ)',
                description: 'VNQ provides exposure to U.S. real estate investment trusts (REITs), which own and operate income-producing real estate like shopping centers, apartments, and office buildings. Real estate has traditionally been considered a hedge against inflation and a store of value. However, when measured against Bitcoin, even real estate has proven to be a poor store of value in the digital age.',
                category: 'REIT ETF',
                tags: ['Real Estate', 'Income Producing']
            },
            'VNO': {
                title: 'Vornado Realty Trust (VNO)',
                description: 'Vornado is one of the largest owners and managers of commercial real estate in the United States, with a portfolio concentrated in Manhattan and other prime locations. The company owns iconic properties including office buildings and retail spaces in New York City. Despite owning some of the world\'s most valuable real estate, VNO has lost significant value when priced in Bitcoin.',
                category: 'REIT',
                tags: ['Commercial Real Estate', 'Manhattan Properties']
            },
            'PLD': {
                title: 'Prologis Inc. (PLD)',
                description: 'Prologis is the world\'s largest industrial real estate company, owning and developing logistics facilities and distribution centers. The company benefits from the growth of e-commerce and global supply chains, with properties leased by Amazon, FedEx, and other logistics leaders. Despite the essential nature of logistics real estate, PLD has underperformed Bitcoin as a store of value.',
                category: 'REIT',
                tags: ['Industrial Real Estate', 'E-commerce Infrastructure']
            },
            'EQIX': {
                title: 'Equinix Inc. (EQIX)',
                description: 'Equinix operates data centers and provides colocation services for cloud computing, content delivery, and digital infrastructure. The company\'s facilities house the servers and networking equipment that power the modern internet. Equinix is essential digital infrastructure, yet even this critical technology real estate has declined in value when measured against Bitcoin.',
                category: 'REIT',
                tags: ['Data Centers', 'Digital Infrastructure']
            },

            // Commodities
            'XAG': {
                title: 'Silver (XAG)',
                description: 'Silver is both a precious metal and an industrial commodity, used in electronics, solar panels, and medical applications. Often called "poor man\'s gold," silver has monetary properties but also significant industrial demand. Silver bugs argue it\'s undervalued relative to gold, but when measured against Bitcoin, silver has lost substantial purchasing power, demonstrating Bitcoin\'s superior monetary properties.',
                category: 'Commodity',
                tags: ['Precious Metal', 'Industrial Use']
            },
            'WTI': {
                title: 'Crude Oil WTI (WTI)',
                description: 'West Texas Intermediate (WTI) crude oil is a key energy commodity and economic indicator. Oil powers transportation, heating, and chemical production worldwide. Countries have fought wars over oil access, and oil prices significantly impact global inflation. Despite oil\'s critical importance to the global economy, it has lost value against Bitcoin, highlighting Bitcoin\'s emergence as the superior store of value.',
                category: 'Commodity',
                tags: ['Energy Source', 'Economic Indicator']
            },
            'CPER': {
                title: 'United States Copper Index Fund (CPER)',
                description: 'CPER provides exposure to copper prices through futures contracts, allowing investors to participate in copper\'s performance without physical storage. Copper is known as "Dr. Copper" for its ability to predict economic health due to its widespread use in construction, electronics, and industrial applications. This ETF makes copper investing accessible to retail investors, yet even this economically critical metal has declined significantly when priced in Bitcoin.',
                category: 'Commodity ETF',
                tags: ['Industrial Metal', 'Economic Indicator']
            },
            'WEAT': {
                title: 'Teucrium Wheat Fund (WEAT)',
                description: 'WEAT provides exposure to wheat prices through futures contracts, allowing investors to gain exposure to one of the world\'s most important food crops. Wheat feeds billions of people globally and prices are influenced by weather, geopolitics, and global demand. This ETF makes agricultural commodity investing accessible, yet despite representing essential food security, it has lost purchasing power when measured against Bitcoin.',
                category: 'Commodity ETF',
                tags: ['Agricultural Exposure', 'Food Security']
            },
            'UNG': {
                title: 'United States Natural Gas Fund (UNG)',
                description: 'UNG provides exposure to natural gas prices through futures contracts, allowing investors to participate in this critical energy commodity. Natural gas is essential for heating, electricity generation, and industrial processes, gaining importance as a "cleaner" fossil fuel. This ETF makes energy commodity investing accessible to retail investors, yet despite natural gas\'s essential role in the energy transition, it has underperformed Bitcoin as a store of value.',
                category: 'Commodity ETF',
                tags: ['Natural Gas', 'Energy Transition']
            },
            'URA': {
                title: 'Global X Uranium ETF (URA)',
                description: 'URA provides exposure to companies involved in uranium mining and nuclear energy production. Uranium is essential for nuclear power generation, which provides clean, baseload electricity. With growing focus on carbon-free energy, uranium demand is expected to increase. Nuclear energy powers Bitcoin mining operations globally, yet even this critical energy commodity has lost value when priced in Bitcoin.',
                category: 'Commodity ETF',
                tags: ['Nuclear Energy', 'Clean Power']
            },
            'DBA': {
                title: 'Invesco DB Agriculture Fund (DBA)',
                description: 'DBA tracks agricultural commodities including corn, wheat, soybeans, and sugar - the building blocks of global food systems. Agriculture feeds the world\'s population and is essential for human survival. Climate change and population growth are increasing agricultural commodity demand. Despite representing humanity\'s most basic needs, agricultural commodities have lost significant value when measured against Bitcoin.',
                category: 'Commodity ETF',
                tags: ['Agriculture', 'Food Security']
            }
        };

        const assetInfo = assetDescriptions[selectedAsset];
        if (assetInfo) {
            // Check if translation service is ready and has translations loaded
            const isTranslationReady = window.translationService &&
                                     typeof window.translationService.translate === 'function' &&
                                     window.translationService.getCurrentLanguage &&
                                     window.translationService.getCurrentLanguage() !== null;

            let translatedTitle, translatedDescription, translatedCategory;

            if (isTranslationReady) {
                // Translation service is ready, try to get translations
                translatedTitle = window.translationService.translate(`assets.assetDescriptions.${selectedAsset}.title`);
                translatedDescription = window.translationService.translate(`assets.assetDescriptions.${selectedAsset}.description`);
                translatedCategory = window.translationService.translate(`assets.categories.${assetInfo.category}`);
            }

            // Use translated version if available and valid, otherwise fallback to hardcoded
            titleElement.textContent = translatedTitle && translatedTitle !== `assets.assetDescriptions.${selectedAsset}.title`
                ? translatedTitle
                : assetInfo.title;
            descriptionElement.textContent = translatedDescription && translatedDescription !== `assets.assetDescriptions.${selectedAsset}.description`
                ? translatedDescription
                : assetInfo.description;
            categoryElement.textContent = translatedCategory && translatedCategory !== `assets.categories.${assetInfo.category}`
                ? translatedCategory
                : assetInfo.category;

            // If translation service wasn't ready, set up to retry when it becomes ready
            if (!isTranslationReady && !this.pendingAssetTranslation) {
                this.pendingAssetTranslation = true;
                let retryCount = 0;
                const maxRetries = 50; // Maximum 5 seconds of retrying (50 * 100ms)

                // Listen for when translation service becomes ready
                const checkAndRetranslate = () => {
                    // Stop retrying if we're no longer on assets page or exceeded max retries
                    if (this.currentPage !== 'assets' || retryCount >= maxRetries) {
                        this.pendingAssetTranslation = false;
                        return;
                    }

                    if (window.translationService &&
                        typeof window.translationService.translate === 'function' &&
                        window.translationService.getCurrentLanguage &&
                        window.translationService.getCurrentLanguage() !== null) {
                        this.pendingAssetTranslation = false;
                        // Re-translate the current asset description
                        this.updateAssetDescription();
                    } else {
                        // Check again in a short while
                        retryCount++;
                        setTimeout(checkAndRetranslate, 100);
                    }
                };
                setTimeout(checkAndRetranslate, 100);
            }

            // Update category color based on type
            const categoryColors = {
                'Technology Stock': 'bg-blue-100 text-blue-800',
                'Stock ETF': 'bg-green-100 text-green-800',
                'Commodity': 'bg-yellow-100 text-yellow-800',
                'Bond ETF': 'bg-purple-100 text-purple-800',
                'International Index': 'bg-indigo-100 text-indigo-800',
                'International ETF': 'bg-indigo-100 text-indigo-800',
                'REIT': 'bg-orange-100 text-orange-800',
                'REIT ETF': 'bg-orange-100 text-orange-800',
                'Commodity ETF': 'bg-yellow-100 text-yellow-800',
                'Conglomerate': 'bg-gray-100 text-gray-800',
                'Healthcare Stock': 'bg-red-100 text-red-800',
                'Financial Services': 'bg-emerald-100 text-emerald-800',
                'Retail Stock': 'bg-pink-100 text-pink-800'
            };

            categoryElement.className = `px-3 py-1 text-sm rounded-full font-medium ${categoryColors[assetInfo.category] || 'bg-gray-100 text-gray-800'}`;

            // Render tags dynamically
            const tagsContainer = document.getElementById('assetTags');
            if (tagsContainer && assetInfo.tags) {
                tagsContainer.innerHTML = assetInfo.tags.map(tag => {
                    // Use the same readiness check for tags
                    let translatedTag;
                    if (isTranslationReady) {
                        translatedTag = window.translationService.translate(`assets.tags.${tag}`);
                    }
                    const displayTag = translatedTag && translatedTag !== `assets.tags.${tag}` ? translatedTag : tag;
                    return `<span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">${displayTag}</span>`;
                }).join('');
            }
        }
    }

    updateNavForLoggedInUser() {
        document.getElementById('navLoginBtn').classList.add('hidden');
        document.getElementById('navUserInfo').classList.remove('hidden');
        if (this.user && this.user.username) {
            document.getElementById('navUsername').textContent = this.user.username;
        }

        // Show admin link if user is admin
        const navAdminLink = document.getElementById('navAdminLink');
        if (this.isCurrentUserAdmin() && navAdminLink) {
            navAdminLink.classList.remove('hidden');
        }
    }

    setupEventListeners() {
        // Auth form - always available
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.requestMagicLink();
            });
        }

        // Show username field for new users - always available
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', async () => {
                const email = document.getElementById('email').value;
                if (email) {
                    // Check if user exists
                    try {
                        const response = await fetch('/api/auth/check-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });
                        const data = await response.json();

                        const usernameField = document.getElementById('usernameField');
                        if (usernameField) {
                            if (!data.exists) {
                                usernameField.style.display = 'block';
                            } else {
                                usernameField.style.display = 'none';
                            }
                        }
                    } catch (error) {
                        // If check fails, show username field to be safe
                        const usernameField = document.getElementById('usernameField');
                        if (usernameField) {
                            usernameField.style.display = 'block';
                        }
                    }
                }
            });
        }
    }

    setupMainAppEventListeners() {
        // Prevent duplicate listeners by checking if already set up
        if (this.mainAppListenersSetup) {
            return;
        }
        this.mainAppListenersSetup = true;

        // Trade form
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeTrade();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Mobile logout
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', () => {
                this.logout();
            });
        }

        // Update amount unit options when from asset changes
        document.getElementById('fromAsset').addEventListener('change', () => {
            this.updateAmountUnitOptions();
            this.updateAmountHelper();
            // Update To Asset dropdown to exclude the selected From Asset
            this.updateToAssetDropdown();
            // Update chart when dropdown changes
            this.updateChartFromTradeDropdowns();
        });

        document.getElementById('toAsset').addEventListener('change', () => {
            // Update From Asset dropdown to exclude the selected To Asset
            this.updateFromAssetDropdown();
            // Update chart when dropdown changes
            this.updateChartFromTradeDropdowns();
        });

        // Update amount helper text
        const amountUnit = document.getElementById('amountUnit');
        if (amountUnit) {
            amountUnit.addEventListener('change', () => {
                this.updateAmountHelper();
            });
        }

        const tradeAmount = document.getElementById('tradeAmount');
        if (tradeAmount) {
            tradeAmount.addEventListener('input', () => {
                this.updateAmountHelper();
            });
        }

        // Close notification
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        // Don't set up modal handlers here - do it when showing the modal instead

        // Setup custom dropdowns for mobile
        this.setupCustomDropdowns();
    }

    setupCustomDropdowns() {
        // Setup basic dropdown toggle functionality
        const customSelects = document.querySelectorAll('.custom-select');

        customSelects.forEach(select => {
            const trigger = select.querySelector('.custom-select-trigger');

            // Toggle dropdown
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other dropdowns
                customSelects.forEach(otherSelect => {
                    if (otherSelect !== select) {
                        otherSelect.classList.remove('open');
                    }
                });
                select.classList.toggle('open');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            customSelects.forEach(select => {
                select.classList.remove('open');
            });
        });
    }

    setupCustomDropdownOptions(selectElement) {
        const options = selectElement.querySelectorAll('.custom-select-option');

        // Handle option selection
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Update selected option
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Update trigger text
                const text = selectElement.querySelector('.custom-select-text');
                text.textContent = option.textContent;

                // Update corresponding native select
                const value = option.dataset.value;
                if (selectElement.id === 'fromAssetCustom') {
                    document.getElementById('fromAsset').value = value;
                    document.getElementById('fromAsset').dispatchEvent(new Event('change'));
                } else if (selectElement.id === 'toAssetCustom') {
                    document.getElementById('toAsset').value = value;
                } else if (selectElement.id === 'amountUnitCustom') {
                    document.getElementById('amountUnit').value = value;
                    document.getElementById('amountUnit').dispatchEvent(new Event('change'));
                }

                // Close dropdown
                selectElement.classList.remove('open');
            });
        });

        // Set & Forget Portfolio Event Listeners
        this.setupSetForgetEventListeners();
    }

    async requestMagicLink() {
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;

        try {
            const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(data.message, 'success');

                // If we have a magic link URL, show the open button
                if (data.magicLink) {
                    this.showMagicLinkButton(data.magicLink);
                }
            } else {
                this.showMessage(data.error, 'error');

                // If user not found, show the username field
                if (data.error && data.error.includes('User not found')) {
                    const usernameField = document.getElementById('usernameField');
                    if (usernameField) {
                        usernameField.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            this.showMessage('Network error', 'error');
        }
    }

    showMagicLinkButton(magicLink) {
        // Find the message div (where green text appears)
        const messageDiv = document.getElementById('authMessage');
        if (!messageDiv) return;

        // Add the open button right after the message
        const buttonHtml = `
            <button
                type="button"
                onclick="window.open('${magicLink}', '_blank')"
                class="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
                Open Magic Link
            </button>
        `;

        // Append button to the existing message
        messageDiv.innerHTML = messageDiv.innerHTML + buttonHtml;
    }

    async verifyMagicLink(token) {
        console.log('Verifying token:', token);
        try {
            const response = await fetch(`/api/auth/verify?token=${token}`);
            const data = await response.json();

            console.log('Verification response:', response.status, data);

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));

                this.showMainApp();
                this.loadData();
                // Start 30-second price auto-refresh after successful login
                this.startPriceAutoRefresh();
            } else {
                this.showMessage(data.error, 'error');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showMessage('Verification failed', 'error');
            this.showLoginForm();
        }
    }

    async loadData() {
        await Promise.all([
            this.loadAssets(),
            this.loadPrices(),
            this.loadPortfolio(),
            this.loadTradeHistory(),
            this.loadSetForgetPortfolios()
        ]);

        // Initialize the amount helper after data is loaded
        this.updateAmountHelper();
    }

    async loadAssets() {
        try {
            const response = await fetch('/api/assets');
            this.assets = await response.json();
            this.populateAssetSelects();
            // Chart will use existing trade dropdowns
        } catch (error) {
            console.error('Failed to load assets:', error);
        }
    }

    async loadPrices() {
        try {
            const response = await fetch('/api/assets/prices');
            const data = await response.json();

            // Check if response contains valid data
            if (data.error) {
                console.error('Server error loading prices:', data.error);
                return;
            }

            this.prices = data.pricesInSats;

            // Update Bitcoin price display with error handling
            // Bitcoin price display removed - no longer showing USD prices
        } catch (error) {
            console.error('Failed to load prices:', error);
        }
    }

    async loadPortfolio() {
        try {
            const response = await fetch('/api/portfolio', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();
            this.displayPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    }

    async loadTradeHistory() {
        try {
            const response = await fetch('/api/trades/history', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const trades = await response.json();
            this.displayTradeHistory(trades);
        } catch (error) {
            console.error('Failed to load trade history:', error);
        }
    }

    displayPortfolio(data) {
        // Store holdings for use in dropdown updates
        this.holdings = data.holdings || [];

        const holdingsDiv = document.getElementById('holdings');
        const totalValueDiv = document.getElementById('totalValue');
        const performanceDiv = document.getElementById('performance');

        const totalSats = data.total_value_sats || 0;
        const totalBTC = (totalSats / 100000000).toFixed(8);
        totalValueDiv.textContent = `${totalBTC} BTC`;

        // Calculate and display performance
        // Performance is always measured against the initial 1 BTC starting balance
        const startingBalance = 100000000; // 1 BTC in sats
        const currentValue = data.total_value_sats || 0;

        // Performance = (current - initial) / initial * 100
        const performanceValue = ((currentValue - startingBalance) / startingBalance) * 100;
        const isPositive = performanceValue >= 0;

        // Update performance display
        performanceDiv.textContent = `${isPositive ? '+' : ''}${performanceValue.toFixed(2)}%`;

        // Update color based on performance
        const performanceParent = performanceDiv.parentElement;
        if (isPositive) {
            performanceParent.className = 'bg-green-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-green-600';
        } else {
            performanceParent.className = 'bg-red-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-red-600';
        }

        holdingsDiv.innerHTML = '';

        // Sort holdings alphabetically, but keep BTC first
        const sortedHoldings = [...data.holdings].sort((a, b) => {
            // BTC always comes first
            if (a.asset_symbol === 'BTC') return -1;
            if (b.asset_symbol === 'BTC') return 1;

            // Get asset names for comparison
            const assetA = this.assets.find(asset => asset.symbol === a.asset_symbol);
            const assetB = this.assets.find(asset => asset.symbol === b.asset_symbol);

            const nameA = assetA?.name || a.asset_symbol;
            const nameB = assetB?.name || b.asset_symbol;

            // Sort alphabetically by name
            return nameA.localeCompare(nameB);
        });

        sortedHoldings.forEach(holding => {
            const asset = this.assets.find(a => a.symbol === holding.asset_symbol);

            const holdingDiv = document.createElement('div');
            let bgClass = 'bg-gray-50';
            if (holding.lock_status === 'locked') {
                bgClass = 'bg-red-50 border-red-200';
            } else if (holding.lock_status === 'partial') {
                bgClass = 'bg-yellow-50 border-yellow-200';
            }

            holdingDiv.className = `p-3 border rounded cursor-pointer hover:bg-gray-100 ${bgClass}`;

            let displayAmount;
            if (holding.asset_symbol === 'BTC') {
                displayAmount = `${(holding.amount / 100000000).toFixed(8)} BTC`;
            } else {
                // Convert back from stored integer to actual shares
                const actualAmount = holding.amount / 100000000;
                displayAmount = `${actualAmount.toFixed(8)} ${holding.asset_symbol}`;
            }

            const currentValue = (holding.current_value_sats / 100000000).toFixed(8);
            const costBasis = (holding.cost_basis_sats / 100000000).toFixed(8);
            const pnl = holding.current_value_sats - holding.cost_basis_sats;
            const pnlBTC = (pnl / 100000000).toFixed(8);
            const pnlPercent = holding.cost_basis_sats > 0 ? ((pnl / holding.cost_basis_sats) * 100).toFixed(2) : '0.00';
            const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';
            const pnlSign = pnl >= 0 ? '+' : '';

            const lastPurchaseDate = holding.last_purchase_date ? new Date(holding.last_purchase_date).toLocaleDateString() : 'Never';

            // Lock status display
            let lockDisplay = '';
            if (holding.lock_status === 'locked') {
                lockDisplay = '<div class="text-xs text-red-600 font-medium">🔒 Fully Locked</div>';
            } else if (holding.lock_status === 'partial') {
                const lockedAmount = (holding.locked_amount / 100000000).toFixed(8);
                lockDisplay = `<div class="text-xs text-yellow-600 font-medium">🔒 ${lockedAmount} Locked</div>`;
            }

            holdingDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-semibold">${asset?.name || holding.asset_symbol}</span>
                                <div class="text-sm text-gray-600">${displayAmount}</div>
                                ${holding.purchase_count > 0 ? `<div class="text-xs text-gray-500">${holding.purchase_count} purchases • Last: ${lastPurchaseDate}</div>` : ''}
                            </div>
                            <div class="text-right">
                                <div class="font-semibold">${currentValue} BTC</div>
                                ${holding.asset_symbol !== 'BTC' ? `
                                    <div class="text-xs text-gray-500">Cost: ${costBasis} BTC</div>
                                    <div class="text-xs ${pnlColor}">${pnlSign}${pnlBTC} BTC (${pnlSign}${pnlPercent}%)</div>
                                ` : ''}
                                ${lockDisplay}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add click handler for non-BTC assets
            if (holding.asset_symbol !== 'BTC' && holding.purchase_count > 0) {
                holdingDiv.addEventListener('click', () => {
                    this.showAssetDetails(holding.asset_symbol, asset?.name || holding.asset_symbol);
                });
            }

            holdingsDiv.appendChild(holdingDiv);
        });

        // After displaying holdings, update the From Asset dropdown to reflect what user owns
        // Only do this if we're on the portfolio page (elements exist)
        if (document.getElementById('fromAsset') && document.getElementById('toAsset')) {
            this.updateFromAssetDropdown();
        }
    }

    displayTradeHistory(trades) {
        const historyDiv = document.getElementById('tradeHistory');

        if (trades.length === 0) {
            historyDiv.innerHTML = '<p class="text-gray-500">No trades yet</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'w-full text-sm';

        table.innerHTML = `
            <thead>
                <tr class="border-b">
                    <th class="text-left p-2">Date</th>
                    <th class="text-left p-2">Sold</th>
                    <th class="text-left p-2">Bought</th>
                </tr>
            </thead>
            <tbody>
                ${trades.map(trade => {
            const fromAmount = trade.from_asset === 'BTC'
                ? (trade.from_amount / 100000000).toFixed(8) + ' BTC'
                : (trade.from_amount / 100000000).toFixed(8) + ' ' + trade.from_asset;

            const toAmount = trade.to_asset === 'BTC'
                ? (trade.to_amount / 100000000).toFixed(8) + ' BTC'
                : (trade.to_amount / 100000000).toFixed(8) + ' ' + trade.to_asset;

            return `
                        <tr class="border-b">
                            <td class="p-2">${new Date(trade.created_at).toLocaleDateString()}</td>
                            <td class="p-2 text-red-600">-${fromAmount}</td>
                            <td class="p-2 text-green-600">+${toAmount}</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        `;

        historyDiv.innerHTML = '';
        historyDiv.appendChild(table);
    }

    populateAssetSelects() {
        const fromSelect = document.getElementById('fromAsset');
        const toSelect = document.getElementById('toAsset');

        // Check if elements exist and we have assets data
        if (!fromSelect || !toSelect || !this.assets || this.assets.length === 0) {
            return;
        }

        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        // Sort assets to put Bitcoin first
        const sortedAssets = [...this.assets].sort((a, b) => {
            if (a.symbol === 'BTC') return -1;
            if (b.symbol === 'BTC') return 1;
            return a.name.localeCompare(b.name);
        });

        // Populate both dropdowns with all assets initially
        sortedAssets.forEach(asset => {
            const option1 = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);
            const option2 = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);

            // Set BTC as default for From Asset
            if (asset.symbol === 'BTC') {
                option1.selected = true;
            }

            // Set AMZN as default for To Asset
            if (asset.symbol === 'AMZN') {
                option2.selected = true;
            }

            fromSelect.appendChild(option1);
            toSelect.appendChild(option2);
        });

        // Populate custom dropdowns for mobile
        this.populateCustomDropdowns(sortedAssets);

        // Initialize unit options for the default selection
        this.updateAmountUnitOptions();

        // Apply exclusions based on initial selections
        // This removes BTC from To Asset and AMZN from From Asset
        this.updateToAssetDropdown();  // Removes BTC from To
        this.updateFromAssetDropdown(); // Removes AMZN from From
    }

    populateCustomDropdowns(sortedAssets) {
        const fromCustomOptions = document.querySelector('#fromAssetCustom .custom-select-options');
        const toCustomOptions = document.querySelector('#toAssetCustom .custom-select-options');

        if (!fromCustomOptions || !toCustomOptions) return;

        // Clear existing options
        fromCustomOptions.innerHTML = '';
        toCustomOptions.innerHTML = '';

        // Populate custom dropdowns
        sortedAssets.forEach((asset, index) => {
            const fromOption = document.createElement('div');
            fromOption.className = `custom-select-option ${index === 0 ? 'selected' : ''}`;
            fromOption.dataset.value = asset.symbol;
            fromOption.textContent = `${asset.name} (${asset.symbol})`;

            const toOption = document.createElement('div');
            toOption.className = 'custom-select-option';
            toOption.dataset.value = asset.symbol;
            toOption.textContent = `${asset.name} (${asset.symbol})`;

            fromCustomOptions.appendChild(fromOption);
            toCustomOptions.appendChild(toOption);
        });

        // Update trigger text for first option
        const fromTriggerText = document.querySelector('#fromAssetCustom .custom-select-text');
        const toTriggerText = document.querySelector('#toAssetCustom .custom-select-text');

        if (fromTriggerText && sortedAssets.length > 0) {
            fromTriggerText.textContent = `${sortedAssets[0].name} (${sortedAssets[0].symbol})`;
        }
        if (toTriggerText && sortedAssets.length > 0) {
            toTriggerText.textContent = `${sortedAssets[0].name} (${sortedAssets[0].symbol})`;
        }

        // Setup event listeners for the newly created options
        const fromCustomSelect = document.getElementById('fromAssetCustom');
        const toCustomSelect = document.getElementById('toAssetCustom');
        const amountUnitCustomSelect = document.getElementById('amountUnitCustom');

        if (fromCustomSelect) this.setupCustomDropdownOptions(fromCustomSelect);
        if (toCustomSelect) this.setupCustomDropdownOptions(toCustomSelect);
        if (amountUnitCustomSelect) this.setupCustomDropdownOptions(amountUnitCustomSelect);
    }

    updateAmountUnitOptions() {
        const fromAsset = document.getElementById('fromAsset').value;
        const unitSelect = document.getElementById('amountUnit');
        const currentValue = unitSelect.value;

        // Clear existing options
        unitSelect.innerHTML = '';

        if (fromAsset === 'BTC') {
            // When selling BTC, show BTC units
            unitSelect.innerHTML = `
                <option value="btc">BTC</option>
                <option value="msat">mSats</option>
                <option value="ksat">kSats</option>
                <option value="sat">Sats</option>
            `;
        } else {
            // When selling other assets, show the asset symbol
            unitSelect.innerHTML = `<option value="asset">${fromAsset}</option>`;
        }

        // Try to maintain the previous selection if possible
        if (fromAsset === 'BTC' && ['btc', 'msat', 'ksat', 'sat'].includes(currentValue)) {
            unitSelect.value = currentValue;
        }
    }

    updateAmountHelper() {
        const amountInput = document.getElementById('tradeAmount');
        const unitSelect = document.getElementById('amountUnit');
        const helper = document.getElementById('amountHelper');
        const fromAsset = document.getElementById('fromAsset')?.value;

        // Check if elements exist (they might not during initial load)
        if (!amountInput || !unitSelect || !helper) {
            return;
        }

        const amount = parseFloat(amountInput.value);
        const unit = unitSelect.value;

        // If no amount entered, show default conversion for 1 BTC
        if (!amount || amount <= 0) {
            helper.textContent = '1 BTC = 100 mSats = 100,000 kSats = 100,000,000 sats';
            helper.className = 'text-gray-500';
            return;
        }

        // When selling non-BTC assets, show the asset amount
        if (unit === 'asset' && fromAsset && fromAsset !== 'BTC') {
            helper.textContent = `${amount} ${fromAsset}`;
            helper.className = 'text-gray-500';
            return;
        } else {
            // BTC units
            let sats = 0;
            let btc = 0;

            switch (unit) {
                case 'btc':
                    sats = amount * 100000000;
                    helper.textContent = `${amount} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'msat':
                    sats = amount * 1000000;
                    btc = amount / 100;
                    helper.textContent = `${amount} mSats = ${btc.toFixed(8)} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'ksat':
                    sats = amount * 1000;
                    btc = amount / 100000;
                    helper.textContent = `${amount} kSats = ${btc.toFixed(8)} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'sat':
                    btc = amount / 100000000;
                    helper.textContent = `${amount} sats = ${btc.toFixed(8)} BTC`;
                    break;
            }
        }

        // Calculate all conversions for BTC units
        let sats = 0;
        let btc = 0;
        let msats = 0;
        let ksats = 0;

        switch(unit) {
            case 'btc':
                btc = amount;
                msats = amount * 100;
                ksats = amount * 100000;
                sats = amount * 100000000;
                break;
            case 'msat':
                btc = amount / 100;
                msats = amount;
                ksats = amount * 1000;
                sats = amount * 1000000;
                break;
            case 'ksat':
                btc = amount / 100000;
                msats = amount / 1000;
                ksats = amount;
                sats = amount * 1000;
                break;
            case 'sat':
                btc = amount / 100000000;
                msats = amount / 1000000;
                ksats = amount / 1000;
                sats = amount;
                break;
        }

        // Check if it's below minimum (only for BTC trades)
        const MIN_TRADE_SATS = 100000;
        const executeBtn = document.querySelector('#tradeForm button[type="submit"]');

        if (fromAsset === 'BTC' && sats < MIN_TRADE_SATS) {
            helper.textContent = `⚠️ Minimum trade: 100 kSats (${MIN_TRADE_SATS.toLocaleString()} sats)`;
            helper.className = 'text-red-600 font-medium';
            // Disable execute button when below minimum
            if (executeBtn) {
                executeBtn.disabled = true;
                executeBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            return;
        }

        // Re-enable execute button when above minimum
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        // Show full conversion
        const btcStr = btc.toFixed(8).replace(/\.?0+$/, '');
        const msatStr = msats.toLocaleString();
        const ksatStr = ksats.toLocaleString();
        const satStr = sats.toLocaleString();

        helper.textContent = `${btcStr} BTC = ${msatStr} mSats = ${ksatStr} kSats = ${satStr} sats`;
        helper.className = 'text-gray-500';
    }

    async executeTrade() {
        const fromAsset = document.getElementById('fromAsset').value;
        const toAsset = document.getElementById('toAsset').value;
        const amount = parseFloat(document.getElementById('tradeAmount').value);
        const unit = document.getElementById('amountUnit').value;

        if (fromAsset === toAsset) {
            this.showNotification('Cannot trade the same asset', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return;
        }

        // Convert amount to satoshis based on unit
        let tradeAmount = amount;
        if (fromAsset === 'BTC') {
            switch (unit) {
                case 'btc':
                    tradeAmount = Math.round(amount * 100000000); // BTC to sats
                    break;
                case 'msat':
                    tradeAmount = Math.round(amount * 1000000); // mSats to sats
                    break;
                case 'ksat':
                    tradeAmount = Math.round(amount * 1000); // kSats to sats
                    break;
                case 'sat':
                    tradeAmount = Math.round(amount); // Already in sats
                    break;
            }
        } else {
            // For non-BTC assets, the amount is in asset units
            if (unit === 'asset') {
                // Amount is in the asset's native units - convert to integer storage
                tradeAmount = Math.round(amount * 100000000);
            } else {
                // This shouldn't happen with the new UI, but handle it just in case
                tradeAmount = Math.round(amount * 100000000);
            }
        }

        // Check minimum trade amount (100k sats) - AFTER conversion
        const MIN_TRADE_SATS = 100000;
        if (fromAsset === 'BTC' && tradeAmount < MIN_TRADE_SATS) {
            this.showNotification(`Minimum trade amount is ${MIN_TRADE_SATS.toLocaleString()} sats (100 kSats)`, 'error');
            return;
        }

        console.log('=== TRADE REQUEST DEBUG ===');
        console.log('From Asset:', fromAsset);
        console.log('To Asset:', toAsset);
        console.log('Original Amount:', amount);
        console.log('Unit:', unit);
        console.log('Converted Amount (sats):', tradeAmount);
        console.log('Min Trade Amount:', 100000);
        console.log('Passes Min Check:', tradeAmount >= 100000);

        try {
            console.log('Sending HTTP request...');

            const response = await fetch('/api/trades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    fromAsset,
                    toAsset,
                    amount: tradeAmount
                })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                this.showNotification('Trade executed successfully!', 'success');
                document.getElementById('tradeForm').reset();
                this.loadData(); // Refresh data
            } else {
                this.showNotification(`Trade failed: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Trade request error:', error);
            this.showNotification(`Trade failed: ${error.message}`, 'error');
        }
    }

    showLoginForm() {
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('assetsPage').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    }

    showMainApp() {
        // Update navigation bar
        this.updateNavForLoggedInUser();

        // Navigate to portfolio
        window.location.hash = '#portfolio';

        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('assetsPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userInfo').textContent = `Welcome, ${this.user.username}!`;

        // Also update mobile user info
        const userInfoMobile = document.getElementById('userInfoMobile');
        if (userInfoMobile) {
            userInfoMobile.textContent = `Welcome, ${this.user.username}!`;
        }

        // Ensure event listeners are set up for the main app
        this.setupMainAppEventListeners();

        // Initialize TradingView chart with default BTC/AMZN
        this.initTradingViewChart('BTC', 'AMZN');
    }

    initTradingViewChart(fromSymbol = 'BTC', toSymbol = 'BTC') {
        const container = document.getElementById('tradingview-widget-container');
        if (!container) return;

        // Clear existing chart
        container.innerHTML = '';

        // Map assets to TradingView symbols
        const symbolMap = {
            // Crypto
            'BTC': 'BITSTAMP:BTCUSD',

            // Original stocks
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'NVDA': 'NASDAQ:NVDA',
            'SPY': 'AMEX:SPY',
            'VNQ': 'AMEX:VNQ',

            // New stocks
            'META': 'NASDAQ:META',
            'BRK-B': 'NYSE:BRK.B',
            'JNJ': 'NYSE:JNJ',
            'V': 'NYSE:V',
            'WMT': 'NYSE:WMT',

            // Bond ETFs
            'TLT': 'NASDAQ:TLT',
            'HYG': 'AMEX:HYG',

            // International ETFs and Indices
            'VXUS': 'NASDAQ:VXUS',
            'EFA': 'AMEX:EFA',
            'EWU': 'AMEX:EWU',
            'EWG': 'AMEX:EWG',
            'EWJ': 'AMEX:EWJ',

            // REITs
            'VNO': 'NYSE:VNO',
            'PLD': 'NYSE:PLD',
            'EQIX': 'NASDAQ:EQIX',

            // Commodities
            'XAU': 'TVC:GOLD',
            'XAG': 'TVC:SILVER',
            'WTI': 'TVC:USOIL',

            // Commodity ETFs
            'URA': 'AMEX:URA',
            'DBA': 'AMEX:DBA',
            'CPER': 'AMEX:CPER',
            'WEAT': 'AMEX:WEAT',
            'UNG': 'AMEX:UNG'
        };

        // Create ratio symbol
        let tvSymbol;
        const fromTv = symbolMap[fromSymbol] || 'BITSTAMP:BTCUSD';
        const toTv = symbolMap[toSymbol] || 'BITSTAMP:BTCUSD';

        if (fromSymbol === toSymbol) {
            // Same asset ratio would be 1, so just show the asset price
            tvSymbol = fromTv;
        } else {
            // Create ratio expression: from/to
            tvSymbol = `${fromTv}/${toTv}`;
        }

        // Create unique container ID for this widget
        const widgetId = 'tv-widget-' + Date.now();
        const widgetContainer = document.createElement('div');
        widgetContainer.id = widgetId;
        widgetContainer.style.height = '500px';
        container.appendChild(widgetContainer);

        // Function to create the widget
        const createWidget = () => {
            new window.TradingView.widget({
                "width": "100%",
                "height": 600,
                "symbol": tvSymbol,
                "interval": "D",
                "timezone": "Etc/UTC",
                "theme": "light",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "allow_symbol_change": false,
                "range": "60M",  // 5 years (60 months)
                "container_id": widgetId,
                "hide_side_toolbar": false,
                "studies": [],
                "show_popup_button": false,
                "popup_width": "1000",
                "popup_height": "650"
            });
        };

        // Check if TradingView library is already loaded
        if (window.TradingView) {
            // Library already loaded, create widget
            createWidget();
        } else {
            // Add TradingView library script first
            const tvScript = document.createElement('script');
            tvScript.type = 'text/javascript';
            tvScript.src = 'https://s3.tradingview.com/tv.js';
            tvScript.onload = () => {
                // After library loads, create widget
                createWidget();
            };
            // Append the TradingView library script
            document.head.appendChild(tvScript);
        }
    }

    updateFromAssetDropdown() {
        const fromSelect = document.getElementById('fromAsset');
        const toSelect = document.getElementById('toAsset');

        if (!fromSelect || !toSelect || !this.assets) return;

        const selectedToAsset = toSelect.value;
        const currentFromAsset = fromSelect.value;

        // Clear From Asset dropdown
        fromSelect.innerHTML = '';

        // Get user holdings - only show assets user owns
        const userHoldings = this.holdings || [];
        const ownedAssetSymbols = new Set(userHoldings.map(h => h.asset_symbol));

        // Filter assets to only those the user owns
        const ownedAssets = this.assets.filter(asset => ownedAssetSymbols.has(asset.symbol));

        // Sort assets to put Bitcoin first
        const sortedAssets = [...ownedAssets].sort((a, b) => {
            if (a.symbol === 'BTC') return -1;
            if (b.symbol === 'BTC') return 1;
            return a.name.localeCompare(b.name);
        });

        // Populate From Asset dropdown with only owned assets
        sortedAssets.forEach(asset => {
            // Also exclude whatever is selected in To Asset (can't trade same to same)
            if (asset.symbol !== selectedToAsset) {
                const option = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);

                // Keep the current selection if it's still valid
                if (asset.symbol === currentFromAsset) {
                    option.selected = true;
                }

                fromSelect.appendChild(option);
            }
        });

        // If no assets owned yet (new user or holdings not loaded), show Bitcoin as default
        if (sortedAssets.length === 0 || !this.holdings || this.holdings.length === 0) {
            // Check if user actually owns BTC from holdings
            const btcHolding = this.holdings?.find(h => h.asset_symbol === 'BTC');

            if (btcHolding && btcHolding.amount > 0) {
                // User owns BTC, show it
                const btcAsset = this.assets.find(a => a.symbol === 'BTC');
                if (btcAsset) {
                    const option = new Option(`${btcAsset.name} (${btcAsset.symbol})`, btcAsset.symbol);
                    option.selected = true;
                    fromSelect.appendChild(option);
                }
            } else if (!this.holdings || this.holdings.length === 0) {
                // New user or holdings not loaded yet - show BTC as default
                const btcAsset = this.assets.find(a => a.symbol === 'BTC');
                if (btcAsset) {
                    const option = new Option(`${btcAsset.name} (${btcAsset.symbol})`, btcAsset.symbol);
                    option.selected = true;
                    fromSelect.appendChild(option);
                }
            }
            // If user has no BTC and no other holdings, From dropdown stays empty (can't trade)
        }

        // If the current From Asset was removed, select the first available option
        if (currentFromAsset === selectedToAsset || !ownedAssetSymbols.has(currentFromAsset)) {
            fromSelect.selectedIndex = 0;
        }

        // Update amount unit options after changing From Asset
        this.updateAmountUnitOptions();
        this.updateAmountHelper();
    }

    updateToAssetDropdown() {
        const fromSelect = document.getElementById('fromAsset');
        const toSelect = document.getElementById('toAsset');

        if (!fromSelect || !toSelect || !this.assets) return;

        const selectedFromAsset = fromSelect.value;
        const currentToAsset = toSelect.value;

        // Clear To Asset dropdown
        toSelect.innerHTML = '';

        // Show all assets except the one selected in From Asset
        const assetsToShow = [...this.assets].filter(asset => asset.symbol !== selectedFromAsset);

        // Sort assets to put Bitcoin first
        const sortedAssets = [...assetsToShow].sort((a, b) => {
            if (a.symbol === 'BTC') return -1;
            if (b.symbol === 'BTC') return 1;
            return a.name.localeCompare(b.name);
        });

        // Populate To Asset dropdown
        sortedAssets.forEach(asset => {
            const option = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);

            // Keep the current selection if it's still valid
            if (asset.symbol === currentToAsset) {
                option.selected = true;
            }

            toSelect.appendChild(option);
        });

        // If the current To Asset was removed or invalid, select the first available option
        const validSelection = sortedAssets.some(asset => asset.symbol === currentToAsset);
        if (!validSelection && sortedAssets.length > 0) {
            toSelect.selectedIndex = 0;
        }
    }

    updateChartFromTradeDropdowns() {
        const fromAsset = document.getElementById('fromAsset');
        const toAsset = document.getElementById('toAsset');

        if (fromAsset && toAsset) {
            this.initTradingViewChart(fromAsset.value, toAsset.value);
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        messageDiv.textContent = message;
        messageDiv.className = `mt-4 text-center ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        messageDiv.classList.remove('hidden');
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');
        const iconEl = document.getElementById('notificationIcon');

        messageEl.textContent = message;

        // Update styling based on type
        const container = notification.querySelector('div');
        if (type === 'success') {
            container.className = 'bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm';
            iconEl.textContent = '✓';
            iconEl.className = 'w-5 h-5 text-green-500';
        } else if (type === 'error') {
            container.className = 'bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-sm';
            iconEl.textContent = '✕';
            iconEl.className = 'w-5 h-5 text-red-500';
        }

        notification.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        document.getElementById('notification').classList.add('hidden');
    }

    async showAssetDetails(symbol, name) {
        try {
            const response = await fetch(`/api/portfolio/asset/${symbol}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            document.getElementById('modalTitle').textContent = `${name} (${symbol}) Purchase History`;

            const modalContent = document.getElementById('modalContent');

            if (data.purchases.length === 0 && data.sales.length === 0) {
                modalContent.innerHTML = '<p class="text-gray-500">No transactions found for this asset.</p>';
            } else {
                let content = '';

                // Show purchases
                if (data.purchases.length > 0) {
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

                    data.purchases.forEach(purchase => {
                        const amount = (purchase.amount / 100000000).toFixed(8);
                        const btcSpent = (purchase.btc_spent / 100000000).toFixed(8);
                        const isLocked = purchase.is_locked;
                        const unlockDate = purchase.locked_until ? new Date(purchase.locked_until).toLocaleString() : 'N/A';

                        content += `
                            <tr class="border-b ${isLocked ? 'bg-red-50' : 'bg-green-50'}">
                                <td class="p-2">${new Date(purchase.created_at).toLocaleDateString()}</td>
                                <td class="p-2">${amount} ${symbol}</td>
                                <td class="p-2">${btcSpent} BTC</td>
                                <td class="p-2">
                                    <span class="${isLocked ? 'text-red-600' : 'text-green-600'}">
                                        ${isLocked ? '🔒 Locked' : '✅ Unlocked'}
                                    </span>
                                </td>
                                <td class="p-2 text-xs">${isLocked ? unlockDate : 'Available'}</td>
                            </tr>
                        `;
                    });

                    content += '</tbody></table></div>';
                }

                // Show sales if any
                if (data.sales.length > 0) {
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

                    data.sales.forEach(sale => {
                        const soldAmount = (sale.from_amount / 100000000).toFixed(8);
                        const receivedBTC = (sale.to_amount / 100000000).toFixed(8);

                        content += `
                            <tr class="border-b">
                                <td class="p-2">${new Date(sale.created_at).toLocaleDateString()}</td>
                                <td class="p-2">${soldAmount} ${symbol}</td>
                                <td class="p-2">${receivedBTC} BTC</td>
                            </tr>
                        `;
                    });

                    content += '</tbody></table></div>';
                }

                modalContent.innerHTML = content;
            }

            document.getElementById('assetModal').classList.remove('hidden');

            // Setup modal close handlers after modal is shown
            this.setupModalCloseHandlers();
        } catch (error) {
            console.error('Failed to load asset details:', error);
            this.showNotification('Failed to load asset details', 'error');
        }
    }

    hideAssetModal() {
        const modal = document.getElementById('assetModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    setupModalCloseHandlers() {
        // Direct event listener on close button
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            // Remove any existing listeners by cloning
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

            // Add fresh click listener
            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAssetModal();
            });
        }

        // Click outside to close - use a one-time listener
        const modalBackdrop = document.getElementById('assetModal');
        if (modalBackdrop) {
            const backdropHandler = (e) => {
                // Check if clicked on the backdrop itself, not the modal content
                if (e.target === modalBackdrop) {
                    this.hideAssetModal();
                }
            };

            // Remove old listener if exists and add new one
            modalBackdrop.removeEventListener('click', backdropHandler);
            modalBackdrop.addEventListener('click', backdropHandler);
        }

        // ESC key to close - use a one-time document listener
        if (!this.escHandlerAdded) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('assetModal');
                    if (modal && !modal.classList.contains('hidden')) {
                        this.hideAssetModal();
                    }
                }
            });
            this.escHandlerAdded = true;
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};
        // Stop price auto-refresh when logging out
        this.stopPriceAutoRefresh();

        // Update navigation
        document.getElementById('navLoginBtn').classList.remove('hidden');
        document.getElementById('navUserInfo').classList.add('hidden');

        // Navigate to home
        window.location.hash = '#home';
        this.navigate('#home');
    }

    startPriceAutoRefresh() {
        // Refresh prices every 30 seconds
        this.priceRefreshInterval = setInterval(() => {
            this.loadPrices();
            // Also reload portfolio to update values with new prices
            this.loadPortfolio();
        }, 30000); // 30 seconds
    }

    stopPriceAutoRefresh() {
        if (this.priceRefreshInterval) {
            clearInterval(this.priceRefreshInterval);
            this.priceRefreshInterval = null;
        }
    }

    // ===== SUGGESTIONS SYSTEM =====

    initSuggestionsSystem() {
        // Initialize suggestions system event listeners
        this.setupSuggestionsEventListeners();
    }

    setupSuggestionsEventListeners() {
        const fab = document.getElementById('suggestionsFab');
        const modal = document.getElementById('suggestionsModal');
        const closeBtn = document.getElementById('closeSuggestionsModal');
        const cancelBtn = document.getElementById('cancelSuggestionBtn');
        const submitTab = document.getElementById('submitTab');
        const mySuggestionsTab = document.getElementById('mySuggestionsTab');
        const form = document.getElementById('suggestionsForm');

        // Open modal
        fab.addEventListener('click', () => {
            this.openSuggestionsModal();
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            this.closeSuggestionsModal();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeSuggestionsModal();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSuggestionsModal();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.closeSuggestionsModal();
            }
        });

        // Tab switching
        submitTab.addEventListener('click', () => {
            this.switchSuggestionsTab('submit');
        });

        mySuggestionsTab.addEventListener('click', () => {
            this.switchSuggestionsTab('mySuggestions');
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSuggestion();
        });
    }

    openSuggestionsModal() {
        const modal = document.getElementById('suggestionsModal');

        // Check if user is authenticated
        if (!this.token) {
            this.showNotification('Please login to submit suggestions or report bugs', 'error');
            this.showLoginForm();
            return;
        }

        // Check rate limit before opening
        this.checkRateLimit();

        modal.classList.add('show');

        // Reset to submit tab
        this.switchSuggestionsTab('submit');
    }

    closeSuggestionsModal() {
        const modal = document.getElementById('suggestionsModal');
        modal.classList.remove('show');

        // Delay form reset until after modal animation completes (prevent flickering)
        setTimeout(() => {
            // Reset form
            const form = document.getElementById('suggestionsForm');
            form.reset();
            form.style.display = 'block'; // Show form again
            document.getElementById('typeSuggestion').checked = true;

            // Hide rate limit warning
            document.getElementById('rateLimitWarning').classList.add('hidden');

            // Hide and reset success message
            const successMessage = document.getElementById('suggestionSuccessMessage');
            successMessage.classList.add('hidden');
            successMessage.classList.remove('fade-out');
        }, 400); // Wait for modal animation to complete

        // Clear any countdown interval immediately
        if (this.rateLimitInterval) {
            clearInterval(this.rateLimitInterval);
            this.rateLimitInterval = null;
        }
    }

    switchSuggestionsTab(tab) {
        const submitTab = document.getElementById('submitTab');
        const mySuggestionsTab = document.getElementById('mySuggestionsTab');
        const submitContent = document.getElementById('submitTabContent');
        const mySuggestionsContent = document.getElementById('mySuggestionsTabContent');

        if (tab === 'submit') {
            submitTab.classList.add('active');
            mySuggestionsTab.classList.remove('active');
            submitContent.classList.remove('hidden');
            mySuggestionsContent.classList.add('hidden');

            // Refresh rate limit status when switching to submit tab
            this.checkRateLimit();
        } else {
            submitTab.classList.remove('active');
            mySuggestionsTab.classList.add('active');
            submitContent.classList.add('hidden');
            mySuggestionsContent.classList.remove('hidden');

            // Load user's suggestions
            this.loadMySuggestions();
        }
    }

    async checkRateLimit() {
        try {
            const response = await fetch('/api/suggestions/rate-limit', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (!data.canSubmit) {
                this.showRateLimitWarning(data.remainingMs);
            } else {
                // Rate limit cleared - re-enable submission
                const warning = document.getElementById('rateLimitWarning');
                const submitBtn = document.getElementById('submitSuggestionBtn');

                warning.classList.add('hidden');
                submitBtn.disabled = false;

                // Clear any existing countdown interval
                if (this.rateLimitInterval) {
                    clearInterval(this.rateLimitInterval);
                    this.rateLimitInterval = null;
                }
            }
        } catch (error) {
            console.error('Error checking rate limit:', error);
        }
    }

    showRateLimitWarning(remainingMs) {
        const warning = document.getElementById('rateLimitWarning');
        const countdown = document.getElementById('rateLimitCountdown');
        const submitBtn = document.getElementById('submitSuggestionBtn');

        warning.classList.remove('hidden');
        submitBtn.disabled = true;

        // Update countdown every second
        this.updateRateLimitCountdown(remainingMs);

        if (this.rateLimitInterval) {
            clearInterval(this.rateLimitInterval);
        }

        this.rateLimitInterval = setInterval(() => {
            remainingMs -= 1000;
            if (remainingMs <= 0) {
                clearInterval(this.rateLimitInterval);
                warning.classList.add('hidden');
                submitBtn.disabled = false;
                this.rateLimitInterval = null;
            } else {
                this.updateRateLimitCountdown(remainingMs);
            }
        }, 1000);
    }

    updateRateLimitCountdown(remainingMs) {
        const countdown = document.getElementById('rateLimitCountdown');
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        countdown.textContent = `${minutes}m ${seconds}s`;
    }

    showSuccessInModal(type) {
        const successMessage = document.getElementById('suggestionSuccessMessage');
        const successType = document.getElementById('successType');
        const form = document.getElementById('suggestionsForm');

        // Check if all required elements exist
        if (!successMessage || !successType || !form) {
            console.error('Missing DOM elements for success modal:', { successMessage, successType, form });
            throw new Error('Required DOM elements not found for success modal');
        }

        // Hide the form and show success message
        form.style.display = 'none';
        successType.textContent = type;
        successMessage.classList.remove('hidden');

        // Add fade-out animation before closing
        setTimeout(() => {
            successMessage.classList.add('fade-out');
        }, 1000);
    }

    async submitSuggestion() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const title = document.getElementById('suggestionTitle').value.trim();
        const description = document.getElementById('suggestionDescription').value.trim();
        const submitBtn = document.getElementById('submitSuggestionBtn');

        if (!title || !description) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ type, title, description })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(data.message, 'success');

                try {
                    this.showSuccessInModal(type);

                    // Auto-close modal after 1.5 seconds
                    setTimeout(() => {
                        this.closeSuggestionsModal();
                    }, 1500);
                } catch (modalError) {
                    console.error('Error showing success in modal:', modalError);
                    // Fallback: just close the modal normally
                    this.closeSuggestionsModal();
                }
            } else {
                if (response.status === 429) {
                    // Rate limit exceeded
                    this.showRateLimitWarning(data.remainingMs);
                    this.showNotification(data.error, 'error');
                } else {
                    this.showNotification(data.error, 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            this.showNotification('Failed to submit suggestion', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    }

    async loadMySuggestions() {
        const container = document.getElementById('mySuggestionsList');
        container.innerHTML = '<div class="text-center text-gray-500">Loading...</div>';

        try {
            const response = await fetch('/api/suggestions', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.displayMySuggestions(data.suggestions);

                // Check if rate limit status should be updated (in case admin closed suggestions)
                // This helps sync the submit tab with current state
                this.checkRateLimit();
            } else {
                container.innerHTML = '<div class="text-center text-red-500">Failed to load suggestions</div>';
            }
        } catch (error) {
            console.error('Error loading suggestions:', error);
            container.innerHTML = '<div class="text-center text-red-500">Failed to load suggestions</div>';
        }
    }

    displayMySuggestions(suggestions) {
        const container = document.getElementById('mySuggestionsList');

        if (suggestions.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500">No suggestions submitted yet</div>';
            return;
        }

        container.innerHTML = suggestions.map(suggestion => {
            const typeClass = suggestion.type === 'bug' ? 'bug' : 'suggestion';
            const statusClass = suggestion.status === 'open' ? 'open' : 'closed';
            const statusIcon = suggestion.status === 'open' ? '🟢' : '⚫';
            const typeIcon = suggestion.type === 'bug' ? '🐛' : '💡';

            const date = new Date(suggestion.created_at).toLocaleDateString();
            const timeAgo = this.getTimeAgo(new Date(suggestion.created_at));

            let replyHtml = '';
            if (suggestion.admin_reply) {
                replyHtml = `
                    <div class="suggestion-reply">
                        ${this.formatAdminReply(suggestion.admin_reply)}
                    </div>
                `;
            }

            return `
                <div class="suggestion-item">
                    <div class="suggestion-header">
                        <span class="suggestion-type ${typeClass}">${typeIcon} ${suggestion.type.toUpperCase()}</span>
                        <span class="suggestion-status ${statusClass}">${statusIcon} ${suggestion.status.toUpperCase()}</span>
                    </div>
                    <div class="suggestion-meta">Submitted ${timeAgo} (${date})</div>
                    <div class="suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                    <div class="suggestion-description">${this.escapeHtml(suggestion.description)}</div>
                    ${replyHtml}
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAdminReply(adminReply) {
        if (!adminReply) return '';

        // Check if this is the new format with timestamps
        const timestampRegex = /\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})\]/g;

        if (timestampRegex.test(adminReply)) {
            // New format with conversation history
            const replies = adminReply.split(/\n\n(?=\[)/).filter(reply => reply.trim());

            return replies.map(reply => {
                const match = reply.match(/^\[([^\]]+)\]\s*(.*)$/s);
                if (match) {
                    const [, timestamp, content] = match;
                    return `
                        <div class="admin-reply-item">
                            <div class="admin-reply-timestamp">💬 Admin Reply (${timestamp}):</div>
                            <div class="admin-reply-content">${this.escapeHtml(content.trim())}</div>
                        </div>
                    `;
                }
                return `<div class="admin-reply-content">${this.escapeHtml(reply)}</div>`;
            }).join('');
        } else {
            // Legacy format - single reply without timestamp
            return `<div class="admin-reply-content">${this.escapeHtml(adminReply)}</div>`;
        }
    }

    // ===== ADMIN DASHBOARD SYSTEM =====

    initAdminDashboard() {
        // Initialize admin dashboard
        this.adminCurrentPage = 1;
        this.adminCurrentFilter = 'all';
        this.adminCurrentSearch = '';

        this.setupAdminEventListeners();
        this.loadAdminStats();
        this.loadAdminSuggestions();

        // Auto-refresh every 30 seconds
        if (this.adminRefreshInterval) {
            clearInterval(this.adminRefreshInterval);
        }
        this.adminRefreshInterval = setInterval(() => {
            this.loadAdminStats();
            this.loadAdminSuggestions();
        }, 30000);
    }

    setupAdminEventListeners() {
        // Filter buttons
        const filterButtons = {
            'filterAll': 'all',
            'filterOpen': 'open',
            'filterClosed': 'closed',
            'filterBugs': 'bug',
            'filterSuggestions': 'suggestion'
        };

        Object.entries(filterButtons).forEach(([id, filter]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setAdminFilter(filter);
                });
            }
        });

        // Search input
        const searchInput = document.getElementById('adminSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.adminCurrentSearch = e.target.value;
                    this.adminCurrentPage = 1;
                    this.loadAdminSuggestions();
                }, 500);
            });
        }

        // Pagination
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.adminCurrentPage > 1) {
                    this.adminCurrentPage--;
                    this.loadAdminSuggestions();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.adminCurrentPage < this.adminTotalPages) {
                    this.adminCurrentPage++;
                    this.loadAdminSuggestions();
                }
            });
        }
    }

    setAdminFilter(filter) {
        this.adminCurrentFilter = filter;
        this.adminCurrentPage = 1;

        // Update active filter button
        document.querySelectorAll('#adminPage button[id^="filter"]').forEach(btn => {
            btn.classList.remove('active-filter');
            btn.classList.add('bg-gray-200', 'text-gray-700');
            btn.classList.remove('bg-blue-500', 'text-white');
        });

        const activeBtn = document.getElementById(
            filter === 'all' ? 'filterAll' :
            filter === 'open' ? 'filterOpen' :
            filter === 'closed' ? 'filterClosed' :
            filter === 'bug' ? 'filterBugs' :
            'filterSuggestions'
        );

        if (activeBtn) {
            activeBtn.classList.add('active-filter');
            activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
            activeBtn.classList.add('bg-blue-500', 'text-white');
        }

        this.loadAdminSuggestions();
    }

    async loadAdminStats() {
        try {
            const response = await fetch('/api/suggestions/admin/stats', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const stats = await response.json();

            if (response.ok) {
                document.getElementById('statsOpen').textContent = stats.status.open || 0;
                document.getElementById('statsClosed').textContent = stats.status.closed || 0;
                document.getElementById('statsBugs').textContent = stats.type.bug || 0;
                document.getElementById('statsSuggestions').textContent = stats.type.suggestion || 0;
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async loadAdminSuggestions() {
        const container = document.getElementById('adminSuggestionsList');
        container.innerHTML = '<div class="text-center text-gray-500 py-8">Loading suggestions...</div>';

        try {
            let url = `/api/suggestions/admin/suggestions?page=${this.adminCurrentPage}&limit=10`;

            if (this.adminCurrentFilter !== 'all') {
                if (['open', 'closed'].includes(this.adminCurrentFilter)) {
                    url += `&status=${this.adminCurrentFilter}`;
                } else {
                    url += `&type=${this.adminCurrentFilter}`;
                }
            }

            if (this.adminCurrentSearch) {
                url += `&search=${encodeURIComponent(this.adminCurrentSearch)}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.displayAdminSuggestions(data.suggestions);
                this.updateAdminPagination(data.pagination);
            } else {
                container.innerHTML = '<div class="text-center text-red-500 py-8">Failed to load suggestions</div>';
            }
        } catch (error) {
            console.error('Error loading admin suggestions:', error);
            container.innerHTML = '<div class="text-center text-red-500 py-8">Failed to load suggestions</div>';
        }
    }

    displayAdminSuggestions(suggestions) {
        const container = document.getElementById('adminSuggestionsList');

        if (suggestions.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No suggestions found</div>';
            return;
        }

        container.innerHTML = suggestions.map(suggestion => {
            const typeClass = suggestion.type === 'bug' ? 'bug' : 'suggestion';
            const statusClass = suggestion.status === 'open' ? 'open' : 'closed';
            const typeIcon = suggestion.type === 'bug' ? '🐛' : '💡';
            const statusIcon = suggestion.status === 'open' ? '🟢' : '⚫';

            const date = new Date(suggestion.created_at).toLocaleDateString();
            const timeAgo = this.getTimeAgo(new Date(suggestion.created_at));

            let existingReplyHtml = '';
            if (suggestion.admin_reply) {
                existingReplyHtml = `
                    <div class="admin-existing-reply">
                        ${this.formatAdminReply(suggestion.admin_reply)}
                    </div>
                `;
            }

            return `
                <div class="admin-suggestion-item" id="suggestion-${suggestion.id}">
                    <div class="admin-suggestion-header">
                        <div class="flex items-center gap-2">
                            <span class="admin-type-badge ${typeClass}">${typeIcon} ${suggestion.type}</span>
                            <span class="admin-status-badge ${statusClass}">${statusIcon} ${suggestion.status}</span>
                        </div>
                        <div class="admin-user-info">
                            <strong>${this.escapeHtml(suggestion.username)}</strong> (${this.escapeHtml(suggestion.email)}) • ${timeAgo}
                        </div>
                    </div>

                    <div class="admin-suggestion-title">${this.escapeHtml(suggestion.title)}</div>
                    <div class="admin-suggestion-description">${this.escapeHtml(suggestion.description)}</div>

                    ${existingReplyHtml}

                    <div class="admin-reply-form">
                        <textarea
                            id="reply-${suggestion.id}"
                            class="admin-reply-textarea"
                            placeholder="Write admin reply..."
                            maxlength="2000"
                        ></textarea>
                        <div class="flex gap-2 mt-3">
                            <button
                                class="admin-action-btn primary"
                                onclick="window.app.addAdminReply(${suggestion.id}, false)"
                            >Send Reply</button>
                            <button
                                class="admin-action-btn secondary"
                                onclick="window.app.addAdminReply(${suggestion.id}, true)"
                            >Send & Close</button>
                            ${suggestion.status === 'open' ? `
                                <button
                                    class="admin-action-btn danger"
                                    onclick="window.app.changeStatus(${suggestion.id}, 'closed')"
                                >Mark Closed</button>
                            ` : `
                                <button
                                    class="admin-action-btn primary"
                                    onclick="window.app.changeStatus(${suggestion.id}, 'open')"
                                >Reopen</button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateAdminPagination(pagination) {
        this.adminTotalPages = pagination.totalPages;

        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const paginationDiv = document.getElementById('adminPagination');

        if (pageInfo) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = pagination.page <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = pagination.page >= pagination.totalPages;
        }

        if (paginationDiv) {
            paginationDiv.classList.toggle('hidden', pagination.totalPages <= 1);
        }
    }

    async addAdminReply(suggestionId, closeAfterReply) {
        const textarea = document.getElementById(`reply-${suggestionId}`);
        const adminReply = textarea.value.trim();

        if (!adminReply) {
            this.showNotification('Please enter a reply', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/suggestions/admin/suggestions/${suggestionId}/reply`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    adminReply,
                    closeAfterReply
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(data.message, 'success');
                textarea.value = '';
                this.loadAdminSuggestions(); // Refresh the list
                this.loadAdminStats(); // Update stats
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Error adding admin reply:', error);
            this.showNotification('Failed to add reply', 'error');
        }
    }

    async changeStatus(suggestionId, newStatus) {
        try {
            const response = await fetch(`/api/suggestions/admin/suggestions/${suggestionId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.loadAdminSuggestions(); // Refresh the list
                this.loadAdminStats(); // Update stats
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Error changing status:', error);
            this.showNotification('Failed to change status', 'error');
        }
    }

    // Clean up admin intervals when leaving admin page
    stopAdminRefresh() {
        if (this.adminRefreshInterval) {
            clearInterval(this.adminRefreshInterval);
            this.adminRefreshInterval = null;
        }
    }

    // Set & Forget Portfolio Methods
    setupSetForgetEventListeners() {
        // Create Portfolio button
        const createBtn = document.getElementById('createSetForgetBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showSetForgetModal();
            });
        }

        // Close modals
        const closeModal = document.getElementById('closeSetForgetModal');
        const cancelBtn = document.getElementById('cancelSetForget');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hideSetForgetModal();
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideSetForgetModal();
            });
        }

        // Close details modal
        const closeDetailsModal = document.getElementById('closeSetForgetDetailsModal');
        if (closeDetailsModal) {
            closeDetailsModal.addEventListener('click', () => {
                this.hideSetForgetDetailsModal();
            });
        }

        // Form submission
        const form = document.getElementById('setForgetForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createSetForgetPortfolio();
            });
        }


        // Share portfolio button
        const shareBtn = document.getElementById('sharePortfolioBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.sharePortfolio();
            });
        }

        // Delete portfolio button (admin only)
        const deleteBtn = document.getElementById('deletePortfolioBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.showDeleteConfirmation();
            });
        }

        // Delete confirmation modal
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.hideDeleteConfirmation();
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.confirmDeletePortfolio();
            });
        }

        // Share modal event listeners
        const closeShareModal = document.getElementById('closeShareModal');
        const shareModalCloseBtn = document.getElementById('shareModalCloseBtn');
        const copyUrlBtn = document.getElementById('copyUrlBtn');
        const downloadImageBtn = document.getElementById('downloadImageBtn');

        if (closeShareModal) {
            // Remove existing listeners to prevent duplicates
            closeShareModal.replaceWith(closeShareModal.cloneNode(true));
            const freshCloseBtn = document.getElementById('closeShareModal');
            if (freshCloseBtn) {
                freshCloseBtn.addEventListener('click', () => {
                    this.hideShareModal();
                });
            }
        }
        if (shareModalCloseBtn) {
            shareModalCloseBtn.replaceWith(shareModalCloseBtn.cloneNode(true));
            const freshCloseBtn2 = document.getElementById('shareModalCloseBtn');
            if (freshCloseBtn2) {
                freshCloseBtn2.addEventListener('click', () => {
                    this.hideShareModal();
                });
            }
        }
        if (copyUrlBtn) {
            copyUrlBtn.replaceWith(copyUrlBtn.cloneNode(true));
            const freshCopyBtn = document.getElementById('copyUrlBtn');
            if (freshCopyBtn) {
                freshCopyBtn.addEventListener('click', () => {
                    this.copyShareUrl();
                });
            }
        }
        if (downloadImageBtn) {
            // Remove any existing listeners first to prevent duplicates
            downloadImageBtn.replaceWith(downloadImageBtn.cloneNode(true));
            // Get the fresh element after replacement
            const freshDownloadBtn = document.getElementById('downloadImageBtn');
            if (freshDownloadBtn) {
                freshDownloadBtn.addEventListener('click', () => {
                    this.downloadPortfolioImage();
                });
            }
        }

        // Donator achievement modal (new)
        const cancelDonationBtn = document.getElementById('cancelDonationBtn');
        const donateBtn = document.getElementById('donateBtn');

        if (cancelDonationBtn) {
            cancelDonationBtn.addEventListener('click', () => {
                this.hideDonatorAchievementModal();
            });
        }

        if (donateBtn) {
            donateBtn.addEventListener('click', () => {
                this.handleDonatorAchievement();
            });
        }

        // Legacy premium upgrade modal (backwards compatibility)
        const cancelUpgradeBtn = document.getElementById('cancelUpgradeBtn');
        const upgradeBtn = document.getElementById('upgradeBtn');

        if (cancelUpgradeBtn) {
            cancelUpgradeBtn.addEventListener('click', () => {
                this.hidePremiumUpgradeModal();
            });
        }

        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.handlePremiumUpgrade();
            });
        }

        // Initialize allocation chart canvas
        this.initAllocationChart();
    }

    async loadSetForgetPortfolios() {
        try {
            const response = await fetch('/api/set-forget-portfolios', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.setForgetPortfolios = data.portfolios; // Store portfolios for limit checking
                this.displaySetForgetPortfolios(data.portfolios);
            } else {
                console.error('Failed to load Set & Forget portfolios');
            }
        } catch (error) {
            console.error('Error loading Set & Forget portfolios:', error);
        }
    }

    displaySetForgetPortfolios(portfolios) {
        const listContainer = document.getElementById('setForgetPortfoliosList');
        const noPortfoliosMsg = document.getElementById('noSetForgetPortfolios');

        if (!listContainer) return;

        if (portfolios.length === 0) {
            listContainer.innerHTML = '';
            noPortfoliosMsg.classList.remove('hidden');
            return;
        }

        noPortfoliosMsg.classList.add('hidden');

        listContainer.innerHTML = portfolios.map(portfolio => {
            const performanceColor = portfolio.total_performance_percent >= 0 ? 'text-green-600' : 'text-red-600';
            const daysRunning = Math.floor((new Date() - new Date(portfolio.created_at)) / (1000 * 60 * 60 * 24));

            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow" onclick="window.app.showPortfolioDetails(${portfolio.portfolio_id})">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-lg">${portfolio.portfolio_name}</h3>
                        <span class="text-sm text-gray-500">📊 ${daysRunning} days tracked</span>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Initial:</span>
                            <div class="font-medium">${this.formatSatoshis(portfolio.initial_btc_amount)} BTC</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Current:</span>
                            <div class="font-medium">${this.formatSatoshis(portfolio.current_value_sats)} BTC</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Performance:</span>
                            <div class="font-medium ${performanceColor}">${portfolio.total_performance_percent >= 0 ? '+' : ''}${portfolio.total_performance_percent.toFixed(2)}%</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Created:</span>
                            <div class="font-medium">${new Date(portfolio.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-2">
                        ${portfolio.allocations.slice(0, 3).map(alloc =>
                            `<span class="px-2 py-1 bg-gray-100 rounded text-xs">${alloc.asset_symbol} ${alloc.allocation_percentage}%</span>`
                        ).join('')}
                        ${portfolio.allocations.length > 3 ? `<span class="px-2 py-1 bg-gray-100 rounded text-xs">+${portfolio.allocations.length - 3} more</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    showSetForgetModal() {
        // Check portfolio limit for free users FIRST
        const currentPortfolioCount = this.setForgetPortfolios ? this.setForgetPortfolios.length : 0;
        const isAdmin = this.isCurrentUserAdmin();
        const isDonator = this.user.isDonator || false; // TODO: Implement donator status

        if (!isDonator && currentPortfolioCount >= 1) {
            this.showDonatorAchievementModal();
            return;
        }

        // Store the BTC balance for validation (but we always use 1 BTC equivalent)
        const btcHolding = this.currentPortfolio?.holdings?.find(h => h.asset_symbol === 'BTC');
        this.availableBTC = btcHolding ? btcHolding.amount : 0;

        // We always invest the equivalent of 1 BTC (100M sats)
        this.investmentAmount = 100000000;

        // Clear form
        this.resetSetForgetForm();

        // Add initial allocation input
        this.addAllocationInput();

        // Show modal
        const modal = document.getElementById('setForgetModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideSetForgetModal() {
        const modal = document.getElementById('setForgetModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.resetSetForgetForm();
    }

    hideSetForgetDetailsModal() {
        const modal = document.getElementById('setForgetDetailsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    resetSetForgetForm() {
        const form = document.getElementById('setForgetForm');
        if (form) {
            form.reset();
        }

        const allocationsContainer = document.getElementById('allocationInputs');
        if (allocationsContainer) {
            allocationsContainer.innerHTML = '';
        }

        this.updateAllocationTotal();
        this.clearAllocationChart();
    }

    addAllocationInput() {
        const container = document.getElementById('allocationInputs');
        if (!container) return;

        // Check if we already have an empty allocation input
        const existingEmpty = Array.from(container.querySelectorAll('.allocation-input')).find(div => {
            const select = div.querySelector('.asset-select');
            return !select.value;
        });

        if (existingEmpty) {
            return; // Don't add another empty input
        }

        const div = document.createElement('div');
        div.className = 'flex gap-3 items-center allocation-input';

        // Get available assets (exclude already selected ones)
        const availableAssets = this.getAvailableAssets();

        div.innerHTML = `
            <select class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 asset-select">
                <option value="">Select Asset</option>
                ${availableAssets.map(asset => `<option value="${asset.symbol}">${asset.name} (${asset.symbol})</option>`).join('')}
            </select>
            <div class="relative w-24">
                <input type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 percentage-input"
                       placeholder="0" min="5" max="100" step="0.01">
                <span class="absolute right-2 top-2 text-gray-500 text-sm">%</span>
            </div>
            <button type="button" class="text-red-500 hover:text-red-700 remove-allocation" title="Remove">×</button>
        `;

        container.appendChild(div);

        // Add event listeners
        const assetSelect = div.querySelector('.asset-select');
        const percentageInput = div.querySelector('.percentage-input');
        const removeBtn = div.querySelector('.remove-allocation');

        assetSelect.addEventListener('change', () => {
            this.updateAssetDropdowns();
            this.updateAllocationTotal();
            this.updateAllocationChart();

            // If an asset is selected and we don't have 100% allocation, ensure we have one empty row
            if (assetSelect.value) {
                this.ensureOneEmptyAllocation();
            }
        });

        percentageInput.addEventListener('input', () => {
            // Validate percentage range
            const value = parseFloat(percentageInput.value);
            if (value < 5 && value > 0) {
                percentageInput.setCustomValidity('Minimum allocation is 5%');
            } else if (value > 100) {
                percentageInput.setCustomValidity('Maximum allocation is 100%');
            } else {
                percentageInput.setCustomValidity('');
            }

            this.updateAllocationTotal();
            this.updateAllocationChart();
            this.ensureOneEmptyAllocation();
        });

        removeBtn.addEventListener('click', () => {
            div.remove();
            this.updateAssetDropdowns();
            this.updateAllocationTotal();
            this.updateAllocationChart();
            this.ensureOneEmptyAllocation();
        });
    }

    ensureOneEmptyAllocation() {
        const currentTotal = this.getCurrentAllocationTotal();

        // If we're at 100%, don't add empty allocation
        if (currentTotal >= 100) {
            return;
        }

        // Check if we have exactly one empty allocation
        const emptyAllocations = Array.from(document.querySelectorAll('.allocation-input')).filter(div => {
            const select = div.querySelector('.asset-select');
            return !select.value;
        });

        if (emptyAllocations.length === 0) {
            this.addAllocationInput();
        } else if (emptyAllocations.length > 1) {
            // Remove extra empty allocations, keep only one
            for (let i = 1; i < emptyAllocations.length; i++) {
                emptyAllocations[i].remove();
            }
        }
    }

    getCurrentAllocationTotal() {
        const percentageInputs = document.querySelectorAll('.percentage-input');
        let total = 0;
        percentageInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        return total;
    }

    getAvailableAssets() {
        // Get all selected assets
        const selectedAssets = new Set();
        document.querySelectorAll('.asset-select').forEach(select => {
            if (select.value) {
                selectedAssets.add(select.value);
            }
        });

        // Return assets not yet selected (including BTC)
        return this.assets.filter(asset => !selectedAssets.has(asset.symbol));
    }

    updateAssetDropdowns() {
        const availableAssets = this.getAvailableAssets();

        document.querySelectorAll('.asset-select').forEach(select => {
            const currentValue = select.value;

            // Rebuild options
            select.innerHTML = `
                <option value="">Select Asset</option>
                ${availableAssets.map(asset => `<option value="${asset.symbol}">${asset.name} (${asset.symbol})</option>`).join('')}
                ${currentValue ? `<option value="${currentValue}" selected style="display:none;">${currentValue}</option>` : ''}
            `;

            // Restore selected value if it was previously selected
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    updateAllocationTotal() {
        const total = this.getCurrentAllocationTotal();

        const totalElement = document.getElementById('totalAllocation');
        if (totalElement) {
            totalElement.textContent = `${total.toFixed(2)}%`;
            totalElement.className = total === 100 ? 'font-medium text-green-600' :
                                   total > 100 ? 'font-medium text-red-600' : 'font-medium text-gray-700';
        }

        // Enable/disable submit button - check for valid allocations
        const submitBtn = document.getElementById('createSetForgetSubmit');
        if (submitBtn) {
            const validAllocations = this.getValidAllocations();
            const hasUnselectedAssets = this.hasUnselectedAssets();

            submitBtn.disabled = total !== 100 || validAllocations.length === 0 || hasUnselectedAssets;
        }
    }

    getValidAllocations() {
        const allocationInputs = document.querySelectorAll('.allocation-input');
        const validAllocations = [];

        allocationInputs.forEach(input => {
            const assetSelect = input.querySelector('.asset-select');
            const percentageInput = input.querySelector('.percentage-input');

            const asset = assetSelect.value;
            const percentage = parseFloat(percentageInput.value) || 0;

            if (asset && percentage >= 5) {
                validAllocations.push({ asset, percentage });
            }
        });

        return validAllocations;
    }

    hasUnselectedAssets() {
        const allocationInputs = document.querySelectorAll('.allocation-input');

        for (let input of allocationInputs) {
            const assetSelect = input.querySelector('.asset-select');
            const percentageInput = input.querySelector('.percentage-input');

            const asset = assetSelect.value;
            const percentage = parseFloat(percentageInput.value) || 0;

            // If there's a percentage but no asset selected
            if (!asset && percentage > 0) {
                return true;
            }
        }

        return false;
    }

    initAllocationChart() {
        this.allocationChart = {
            canvas: document.getElementById('allocationChart'),
            colors: ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16']
        };
    }

    updateAllocationChart() {
        if (!this.allocationChart || !this.allocationChart.canvas) return;

        const canvas = this.allocationChart.canvas;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get allocations
        const allocations = this.getAllocationsFromForm();
        const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);

        if (allocations.length === 0 || totalPercentage === 0) {
            this.clearAllocationChart();
            return;
        }

        // Draw pie chart
        let currentAngle = -Math.PI / 2; // Start at top

        allocations.forEach((allocation, index) => {
            const sliceAngle = (allocation.percentage / 100) * 2 * Math.PI;
            const color = this.allocationChart.colors[index % this.allocationChart.colors.length];

            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            currentAngle += sliceAngle;
        });

        // Update legend
        this.updateChartLegend(allocations);
    }

    updateChartLegend(allocations) {
        const legendContainer = document.getElementById('chartLegend');
        if (!legendContainer) return;

        legendContainer.innerHTML = allocations.map((allocation, index) => {
            const color = this.allocationChart.colors[index % this.allocationChart.colors.length];
            return `
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <span class="text-sm">${allocation.asset} (${allocation.percentage.toFixed(1)}%)</span>
                </div>
            `;
        }).join('');
    }

    clearAllocationChart() {
        if (!this.allocationChart || !this.allocationChart.canvas) return;

        const canvas = this.allocationChart.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw placeholder
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 20, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        const legendContainer = document.getElementById('chartLegend');
        if (legendContainer) {
            legendContainer.innerHTML = '<p class="text-gray-500 text-sm">Add allocations to see preview</p>';
        }
    }

    getAllocationsFromForm() {
        return this.getValidAllocations();
    }

    async createSetForgetPortfolio() {
        // Prevent double submission
        if (this.isCreatingPortfolio) {
            return;
        }

        // Portfolio limit already checked in showSetForgetModal() - no need to check again

        const createBtn = document.getElementById('createSetForgetBtn');
        const name = document.getElementById('setForgetName').value;
        const amount = this.investmentAmount; // Always 1 BTC equivalent (100M sats)
        const allocations = this.getAllocationsFromForm();

        if (!name || allocations.length === 0) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // This is a theoretical portfolio - no actual BTC movement required

        const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            this.showNotification('Allocations must sum to exactly 100%', 'error');
            return;
        }

        // Convert to API format
        const apiAllocations = allocations.map(alloc => ({
            asset_symbol: alloc.asset,
            allocation_percentage: alloc.percentage
        }));

        // Set submission flag and disable button
        this.isCreatingPortfolio = true;
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
        }

        try {
            const response = await fetch('/api/set-forget-portfolios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name,
                    initial_btc_amount: amount,
                    allocations: apiAllocations
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Set & Forget portfolio created successfully!', 'success');
                this.hideSetForgetModal();
                this.loadSetForgetPortfolios();
                // No need to refresh main portfolio - this is theoretical
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Error creating portfolio:', error);
            this.showNotification('Failed to create portfolio', 'error');
        } finally {
            // Always reset submission flag and button state
            this.isCreatingPortfolio = false;
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create Portfolio';
            }
        }
    }

    async showPortfolioDetails(portfolioId) {
        try {
            const response = await fetch(`/api/set-forget-portfolios/${portfolioId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const portfolio = await response.json();
                this.displayPortfolioDetails(portfolio);
            } else {
                this.showNotification('Failed to load portfolio details', 'error');
            }
        } catch (error) {
            console.error('Error loading portfolio details:', error);
            this.showNotification('Failed to load portfolio details', 'error');
        }
    }

    displayPortfolioDetails(portfolio) {
        const titleElement = document.getElementById('portfolioDetailsTitle');
        const contentElement = document.getElementById('portfolioDetailsContent');
        const deleteBtn = document.getElementById('deletePortfolioBtn');

        if (!titleElement || !contentElement) return;

        titleElement.textContent = portfolio.portfolio_name;

        // Show delete button only for admins
        if (deleteBtn && this.isCurrentUserAdmin()) {
            deleteBtn.classList.remove('hidden');
        } else if (deleteBtn) {
            deleteBtn.classList.add('hidden');
        }

        const performanceColor = portfolio.total_performance_percent >= 0 ? 'text-green-600' : 'text-red-600';
        const daysRunning = Math.floor((new Date() - new Date(portfolio.created_at)) / (1000 * 60 * 60 * 24));

        contentElement.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="space-y-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">Portfolio Overview</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Status:</span>
                                <span>📊 Performance Tracking</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Days Tracked:</span>
                                <span class="font-medium">${daysRunning}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Created:</span>
                                <span>${new Date(portfolio.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>BTC Price at Creation:</span>
                                <span>$${portfolio.current_btc_price.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">Performance</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Initial Value:</span>
                                <span class="font-medium">${this.formatSatoshis(portfolio.initial_btc_amount)} BTC</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Current Value:</span>
                                <span class="font-medium">${this.formatSatoshis(portfolio.current_value_sats)} BTC</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Total Performance:</span>
                                <span class="font-bold ${performanceColor}">${portfolio.total_performance_percent >= 0 ? '+' : ''}${portfolio.total_performance_percent.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-semibold mb-4">Asset Allocations</h4>
                    <div class="space-y-3">
                        ${portfolio.allocations.map(alloc => {
                            const assetPerformanceColor = alloc.asset_performance_percent >= 0 ? 'text-green-600' : 'text-red-600';
                            return `
                                <div class="border border-gray-200 rounded-lg p-3">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-medium">${alloc.asset_symbol}</span>
                                        <span class="text-sm text-gray-600">${alloc.allocation_percentage}%</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>
                                            <div>Initial: ${this.formatSatoshis(alloc.initial_btc_amount)} BTC</div>
                                            <div>Current: ${this.formatSatoshis(alloc.current_value_sats)} BTC</div>
                                        </div>
                                        <div>
                                            <div>Initial: $${alloc.initial_price_usd.toLocaleString()}</div>
                                            <div>Current: $${alloc.current_price_usd.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div class="mt-2 text-xs">
                                        <span class="text-gray-600">Performance vs BTC: </span>
                                        <span class="${assetPerformanceColor} font-medium">
                                            ${alloc.asset_performance_percent >= 0 ? '+' : ''}${alloc.asset_performance_percent.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        // Store current portfolio for sharing
        this.currentSetForgetPortfolio = portfolio;

        // Show modal
        const modal = document.getElementById('setForgetDetailsModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    async sharePortfolio() {
        if (!this.currentSetForgetPortfolio) return;

        // Show the share modal
        this.showShareModal();

        try {
            const portfolioId = this.currentSetForgetPortfolio.portfolio_id;
            const shareToken = this.currentSetForgetPortfolio.share_token;

            if (!shareToken) {
                this.showNotification('Share token not available', 'error');
                this.hideShareModal();
                return;
            }

            // Set URLs
            const shareUrl = `${window.location.origin}/share/${shareToken}`;
            const imageUrl = `${window.location.origin}/api/set-forget-portfolios/public/${shareToken}/image`;

            // Update URL inputs
            const shareUrlInput = document.getElementById('shareUrlInput');
            const imageUrlInput = document.getElementById('imageUrlInput');

            if (shareUrlInput) shareUrlInput.value = shareUrl;
            if (imageUrlInput) imageUrlInput.value = imageUrl;

            // Store URLs for later use
            this.currentShareUrl = shareUrl;
            this.currentImageUrl = imageUrl;

            // Check metadata and handle generation/display appropriately
            await this.handleImageGenerationAndDisplay(shareToken, imageUrl);

        } catch (error) {
            console.error('Error preparing share modal:', error);
            this.showNotification('Failed to prepare sharing options', 'error');
        }
    }

    showShareModal() {
        const modal = document.getElementById('portfolioShareModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Reset modal state
            this.resetShareModal();
        }
    }

    hideShareModal() {
        const modal = document.getElementById('portfolioShareModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    resetShareModal() {
        // Show loader, hide image and error
        const loader = document.getElementById('imageLoader');
        const preview = document.getElementById('portfolioImagePreview');
        const error = document.getElementById('imageError');
        const infoContainer = document.getElementById('imageGenerationInfo');
        const shareUrlInput = document.getElementById('shareUrlInput');
        const imageUrlInput = document.getElementById('imageUrlInput');

        if (loader) {
            loader.innerHTML = `
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Generating image...
            `;
            loader.classList.remove('hidden');
        }
        if (preview) preview.classList.add('hidden');
        if (error) error.classList.add('hidden');
        if (infoContainer) infoContainer.classList.add('hidden');
        if (shareUrlInput) shareUrlInput.value = 'Generating link...';
        if (imageUrlInput) imageUrlInput.value = 'Generating image...';
    }

    async loadImagePreview(imageUrl) {
        const loader = document.getElementById('imageLoader');
        const preview = document.getElementById('portfolioImagePreview');
        const error = document.getElementById('imageError');

        try {
            // Show loader
            if (loader) loader.classList.remove('hidden');
            if (preview) preview.classList.add('hidden');
            if (error) error.classList.add('hidden');

            // Load image
            const img = new Image();

            img.onload = () => {
                if (preview) {
                    preview.src = imageUrl;
                    preview.classList.remove('hidden');
                }
                if (loader) loader.classList.add('hidden');
            };

            img.onerror = () => {
                if (loader) loader.classList.add('hidden');
                if (error) error.classList.remove('hidden');
                console.error('Failed to load portfolio image');
            };

            img.src = imageUrl;

        } catch (err) {
            console.error('Error loading image preview:', err);
            if (loader) loader.classList.add('hidden');
            if (error) error.classList.remove('hidden');
        }
    }

    async loadImageMetadata(shareToken) {
        try {
            const response = await fetch(`/api/set-forget-portfolios/public/${shareToken}/image-info`);
            if (!response.ok) {
                console.error('Failed to fetch image metadata');
                return null;
            }

            const metadata = await response.json();
            this.updateImageMetadataDisplay(metadata);
            return metadata;

        } catch (error) {
            console.error('Error loading image metadata:', error);
            return null;
        }
    }

    updateImageMetadataDisplay(metadata) {
        const infoContainer = document.getElementById('imageGenerationInfo');
        const timestampText = document.getElementById('imageTimestampText');

        if (infoContainer && timestampText && metadata) {
            timestampText.textContent = metadata.message;
            infoContainer.classList.remove('hidden');

            // Update styling based on refresh status
            if (metadata.canRefresh || !metadata.hasGeneratedImage) {
                infoContainer.className = 'mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700';
            } else {
                infoContainer.className = 'mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700';
            }
        }
    }

    async handleImageGenerationAndDisplay(shareToken, baseImageUrl) {
        // Prevent multiple simultaneous executions
        if (this.isGeneratingImage) {
            console.log('DEBUG: Already generating image, skipping duplicate call');
            return;
        }
        this.isGeneratingImage = true;

        try {
            // First, get metadata without displaying it to check if regeneration is needed
            const metadata = await this.loadImageMetadataQuiet(shareToken);
            console.log('DEBUG: Metadata received:', metadata);

            const needsRegeneration = !metadata || !metadata.hasGeneratedImage || (metadata.canRefresh && metadata.hoursAgo >= 24);
            console.log('DEBUG: Needs regeneration:', needsRegeneration);

            if (needsRegeneration) {
                console.log('DEBUG: Showing generating message');
                // Show generating message immediately - don't show old timestamp
                this.showImageGenerating();

                // Trigger image generation
                try {
                    const response = await fetch(baseImageUrl, {
                        method: 'GET',
                        cache: 'no-cache',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });

                    if (response.ok) {
                        console.log('DEBUG: Image generated successfully');
                        // Image was generated successfully, now load it with cache busting
                        const cacheBustUrl = `${baseImageUrl}?t=${Date.now()}`;
                        await this.loadImagePreview(cacheBustUrl);

                        // Show "just generated" message instead of fetching from backend
                        this.showJustGeneratedMessage();
                    } else {
                        throw new Error('Failed to generate image');
                    }
                } catch (error) {
                    console.error('Error generating image:', error);
                    this.showImageError();
                }
            } else {
                console.log('DEBUG: Using existing image, showing metadata');
                // Image is recent, show metadata and load existing image
                this.updateImageMetadataDisplay(metadata);
                const cacheBustUrl = `${baseImageUrl}?t=${Date.now()}`;
                await this.loadImagePreview(cacheBustUrl);
            }
        } finally {
            this.isGeneratingImage = false;
        }
    }

    showJustGeneratedMessage() {
        const infoContainer = document.getElementById('imageGenerationInfo');
        const timestampText = document.getElementById('imageTimestampText');

        if (infoContainer && timestampText) {
            timestampText.textContent = 'Image was just generated';
            infoContainer.classList.remove('hidden');
            infoContainer.className = 'mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700';
        }
    }

    async loadImageMetadataQuiet(shareToken) {
        // Load metadata without displaying it
        try {
            const response = await fetch(`/api/set-forget-portfolios/public/${shareToken}/image-info`);
            if (!response.ok) {
                console.error('Failed to fetch image metadata');
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading image metadata:', error);
            return null;
        }
    }

    showImageGenerating() {
        const loader = document.getElementById('imageLoader');
        const preview = document.getElementById('portfolioImagePreview');
        const error = document.getElementById('imageError');
        const infoContainer = document.getElementById('imageGenerationInfo');
        const timestampText = document.getElementById('imageTimestampText');

        if (loader) {
            loader.innerHTML = `
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Generating fresh image...
            `;
            loader.classList.remove('hidden');
        }
        if (preview) preview.classList.add('hidden');
        if (error) error.classList.add('hidden');

        // Update info to show generating status
        if (infoContainer && timestampText) {
            timestampText.textContent = 'Generating fresh image...';
            infoContainer.classList.remove('hidden');
            infoContainer.className = 'mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700';
        }
    }

    showImageError() {
        const loader = document.getElementById('imageLoader');
        const preview = document.getElementById('portfolioImagePreview');
        const error = document.getElementById('imageError');

        if (loader) loader.classList.add('hidden');
        if (preview) preview.classList.add('hidden');
        if (error) error.classList.remove('hidden');
    }

    async copyShareUrl() {
        if (!this.currentShareUrl) return;

        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(this.currentShareUrl);
                this.showNotification('Portfolio URL copied to clipboard!', 'success');
            } else {
                // Fallback for older browsers
                const input = document.getElementById('shareUrlInput');
                if (input) {
                    input.select();
                    document.execCommand('copy');
                    this.showNotification('Portfolio URL copied to clipboard!', 'success');
                }
            }
        } catch (error) {
            console.error('Error copying URL:', error);
            this.showNotification('Failed to copy URL', 'error');
        }
    }

    async downloadPortfolioImage() {
        if (!this.currentImageUrl) return;

        try {
            // Use cache busting for download to ensure fresh image
            const downloadUrl = `${this.currentImageUrl}?t=${Date.now()}`;

            // Create a temporary link to download the image
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `portfolio-${this.currentSetForgetPortfolio.portfolio_name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Portfolio image download started!', 'success');
        } catch (error) {
            console.error('Error downloading image:', error);
            this.showNotification('Failed to download image', 'error');
        }
    }

    formatSatoshis(sats) {
        const btc = sats / 100000000;
        return btc < 0.001 ? btc.toFixed(8) : btc.toFixed(4);
    }

    showDeleteConfirmation() {
        if (!this.currentSetForgetPortfolio || !this.isCurrentUserAdmin()) {
            this.showNotification('Access denied', 'error');
            return;
        }

        const modal = document.getElementById('deleteConfirmModal');
        const message = document.getElementById('deleteConfirmMessage');

        if (modal && message) {
            message.textContent = `Are you sure you want to delete the portfolio "${this.currentSetForgetPortfolio.portfolio_name}"? This action cannot be undone.`;
            modal.classList.remove('hidden');
        }
    }

    hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showDonatorAchievementModal() {
        const modal = document.getElementById('donatorAchievementModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideDonatorAchievementModal() {
        const modal = document.getElementById('donatorAchievementModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    handleDonatorAchievement() {
        this.hideDonatorAchievementModal();
        this.showNotification('Thank you for your interest! Donation system coming soon. Contact support for early access.', 'info');
    }

    // Legacy methods for backwards compatibility
    showPremiumUpgradeModal() {
        this.showDonatorAchievementModal();
    }

    hidePremiumUpgradeModal() {
        this.hideDonatorAchievementModal();
    }

    handlePremiumUpgrade() {
        this.handleDonatorAchievement();
    }

    // Centralized admin check for frontend
    isCurrentUserAdmin() {
        return this.user && (this.user.isAdmin || this.user.is_admin);
    }

    fixNavigationOnSharePage() {
        console.log('Fixing navigation links for share page');

        // Find all navigation links and make them absolute
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        navLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Navigation click intercepted:', originalHref);
                window.location.href = '/' + originalHref;
            });
        });
    }

    getBtcPriceAtCreation(portfolio) {
        // Get BTC price from the first allocation (they all have the same btc_price_usd)
        if (portfolio.allocations && portfolio.allocations.length > 0) {
            return parseFloat(portfolio.allocations[0].initial_btc_price_usd || 0);
        }
        return 0;
    }

    handleShareRouting() {
        const path = window.location.pathname;
        console.log('Checking share routing for path:', path);
        console.log('Path length:', path.length);
        console.log('Expected pattern: /^\/share\/([a-f0-9]{64})$/');
        const shareMatch = path.match(/^\/share\/([a-f0-9]{64})$/);
        console.log('Share match result:', shareMatch);

        if (shareMatch) {
            const shareToken = shareMatch[1];
            console.log('MATCH FOUND! Loading shared portfolio with token:', shareToken);
            this.loadSharedPortfolio(shareToken);
            return true;
        }

        console.log('NO MATCH - not a valid share URL');
        return false;
    }

    async loadSharedPortfolio(shareToken) {
        try {
            console.log('Loading shared portfolio with token:', shareToken);

            const response = await fetch(`/api/set-forget-portfolios/public/${shareToken}`);

            if (response.ok) {
                const portfolioData = await response.json();
                console.log('Shared portfolio data loaded:', portfolioData);
                this.displaySharedPortfolio(portfolioData);

                // Fix navigation links to work from share URLs
                this.fixNavigationOnSharePage();

                // Check if user is logged in and update nav accordingly
                if (this.token) {
                    this.updateNavForLoggedInUser();
                }
            } else {
                console.error('Failed to load shared portfolio, status:', response.status);
                const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
                console.error('Error data:', errorData);

                // For now, show an alert instead of notification system (which might require login)
                alert('Shared portfolio not found');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error loading shared portfolio:', error);
            this.showNotification('Failed to load shared portfolio', 'error');
            window.location.href = '/';
        }
    }

    displaySharedPortfolio(portfolioData) {
        // Hide all pages first
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('assetsPage').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('adminPage').classList.add('hidden');

        // Create and show dedicated shared portfolio page
        this.createSharedPortfolioPage(portfolioData);

        // Update page title
        document.title = `${portfolioData.portfolio_name} - Bitcoin Investment Portfolio`;
    }

    createSharedPortfolioPage(portfolio) {
        // Remove existing shared page if it exists
        const existing = document.getElementById('sharedPortfolioPage');
        if (existing) {
            existing.remove();
        }

        const performanceColor = portfolio.total_performance_percent >= 0 ? 'text-green-600' : 'text-red-600';
        const performanceSign = portfolio.total_performance_percent >= 0 ? '+' : '';

        const sharedPageHTML = `
            <div id="sharedPortfolioPage" class="min-h-screen bg-gray-50">
                <!-- Enhanced Header with Branding -->
                <header class="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
                    <div class="max-w-4xl mx-auto px-4 py-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="flex items-center mb-2">
                                    <span class="text-2xl mr-2">₿</span>
                                    <span class="text-lg font-semibold">Bitcoin Standard Platform</span>
                                </div>
                                <h1 class="text-3xl font-bold">${portfolio.portfolio_name}</h1>
                                <p class="text-orange-100 mt-1">Set & Forget Portfolio • Bitcoin-Denominated Performance</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-orange-200">Performance vs HODL</div>
                                <div class="text-3xl font-bold ${portfolio.total_performance_percent >= 0 ? 'text-green-300' : 'text-red-300'}">
                                    ${performanceSign}${portfolio.total_performance_percent.toFixed(2)}%
                                </div>
                                <div class="text-sm text-orange-200 mt-1">${portfolio.days_tracked} days tracked</div>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Bitcoin Standard Message Banner -->
                <div class="bg-gray-900 text-white">
                    <div class="max-w-4xl mx-auto px-4 py-4">
                        <div class="flex items-center justify-center space-x-4 text-sm">
                            <span>📊</span>
                            <span>All values measured in Bitcoin • The ultimate unit of account</span>
                            <span>⚡</span>
                            <span>Demonstrating the opportunity cost of not holding BTC</span>
                        </div>
                    </div>
                </div>

                <!-- Portfolio Content -->
                <main class="max-w-4xl mx-auto px-4 py-8">
                    <!-- Portfolio Status -->
                    <div class="bg-white rounded-lg p-6 shadow-sm mb-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Status</h3>
                                <p class="text-gray-600">📊 Performance Tracking</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-500">Created</div>
                                <div class="font-semibold">${new Date(portfolio.created_at).toLocaleDateString()}</div>
                                <div class="text-xs text-gray-500 mt-1">Days Tracked: ${portfolio.days_tracked}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Portfolio Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-white rounded-lg p-6 shadow-sm">
                            <h3 class="text-lg font-semibold mb-2">Initial Investment</h3>
                            <p class="text-2xl font-bold">${this.formatSatoshis(portfolio.initial_btc_amount)} BTC</p>
                            <p class="text-sm text-gray-500 mt-1">BTC Price at Creation: $${this.getBtcPriceAtCreation(portfolio).toLocaleString()}</p>
                        </div>
                        <div class="bg-white rounded-lg p-6 shadow-sm">
                            <h3 class="text-lg font-semibold mb-2">Current Value</h3>
                            <p class="text-2xl font-bold">${this.formatSatoshis(portfolio.current_value_sats)} BTC</p>
                            <p class="text-sm text-gray-500 mt-1">Current BTC Price: $${portfolio.current_btc_price.toLocaleString()}</p>
                        </div>
                        <div class="bg-white rounded-lg p-6 shadow-sm">
                            <h3 class="text-lg font-semibold mb-2">Performance</h3>
                            <p class="text-2xl font-bold ${performanceColor}">${performanceSign}${portfolio.total_performance_percent.toFixed(2)}%</p>
                            <p class="text-sm text-gray-500 mt-1">vs HODL Bitcoin</p>
                        </div>
                    </div>

                    <!-- Asset Allocations -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b">
                            <h2 class="text-xl font-bold">Asset Allocations</h2>
                            <p class="text-gray-600 mt-1">Performance measured against Bitcoin</p>
                        </div>
                        <div class="p-6 space-y-4">
                            ${this.generateAllocationHTML(portfolio.allocations)}
                        </div>
                    </div>

                    <!-- Enhanced Call to Action -->
                    <div class="mt-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-8 text-center shadow-lg">
                        <div class="mb-4">
                            <span class="text-4xl">₿</span>
                        </div>
                        <h3 class="text-2xl font-bold text-orange-900 mb-3">Ready to Embrace the Bitcoin Standard?</h3>
                        <p class="text-orange-700 mb-6 max-w-2xl mx-auto leading-relaxed">
                            Create your own Set & Forget portfolio and discover how traditional assets perform when measured against
                            the ultimate store of value. See the true opportunity cost of not holding Bitcoin.
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <div class="text-orange-500 text-xl mb-2">🎯</div>
                                <div class="font-semibold text-gray-800">Set & Forget</div>
                                <div class="text-gray-600">10-year tracking</div>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <div class="text-orange-500 text-xl mb-2">📊</div>
                                <div class="font-semibold text-gray-800">Bitcoin Standard</div>
                                <div class="text-gray-600">True unit of account</div>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm">
                                <div class="text-orange-500 text-xl mb-2">🔗</div>
                                <div class="font-semibold text-gray-800">Share & Compare</div>
                                <div class="text-gray-600">Beautiful images</div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <a href="/" class="inline-block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg">
                                🚀 Create Your Portfolio Now
                            </a>
                            <div class="text-xs text-orange-600">
                                Free to use • No signup required for basic features
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;

        // Insert the shared page into the body
        const sharedDiv = document.createElement('div');
        sharedDiv.innerHTML = sharedPageHTML;
        document.body.appendChild(sharedDiv.firstElementChild);
    }

    generateAllocationHTML(allocations) {
        return allocations.map(alloc => {
            const isPositive = alloc.asset_performance_percent >= 0;
            const performanceColor = isPositive ? 'text-green-600' : 'text-red-600';
            const performanceSign = isPositive ? '+' : '';

            return `
                <div class="border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center">
                            <h3 class="text-lg font-semibold">${alloc.asset_symbol}</h3>
                            <span class="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                                ${Number(alloc.allocation_percentage).toFixed(1)}%
                            </span>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-500">vs BTC Performance</div>
                            <div class="font-bold ${performanceColor}">
                                ${performanceSign}${alloc.asset_performance_percent.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-gray-600">Initial</div>
                            <div class="font-medium">${this.formatSatoshis(alloc.initial_btc_amount)} BTC</div>
                            <div class="text-gray-500">$${Number(alloc.initial_price_usd).toLocaleString()}</div>
                        </div>
                        <div>
                            <div class="text-gray-600">Current</div>
                            <div class="font-medium">${this.formatSatoshis(alloc.current_value_sats)} BTC</div>
                            <div class="text-gray-500">$${Number(alloc.current_price_usd).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async confirmDeletePortfolio() {
        this.hideDeleteConfirmation();

        if (!this.currentSetForgetPortfolio) {
            this.showNotification('No portfolio selected', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/set-forget-portfolios/${this.currentSetForgetPortfolio.portfolio_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showNotification('Portfolio deleted successfully', 'success');
                this.hideSetForgetDetailsModal();
                this.loadSetForgetPortfolios(); // Refresh the list
            } else {
                const data = await response.json();
                this.showNotification(data.error || 'Failed to delete portfolio', 'error');
            }
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            this.showNotification('Failed to delete portfolio', 'error');
        }
    }

    // Legacy method - kept for compatibility, now uses modal
    async deletePortfolio() {
        this.showDeleteConfirmation();
    }
}

// Initialize the app
window.app = new BitcoinGame();