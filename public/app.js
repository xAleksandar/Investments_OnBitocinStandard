class BitcoinGame {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.assets = [];
        this.prices = {};
        this.currentPage = 'home';
        this.priceRefreshInterval = null;

        this.init();
    }

    init() {
        // Set up routing first
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
        // Hide all pages
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('assetsPage').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');

        // Route to appropriate page
        switch(hash) {
            case '#assets':
                this.currentPage = 'assets';
                document.getElementById('assetsPage').classList.remove('hidden');
                this.initAssetsPage();
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
            case '#home':
            default:
                this.currentPage = 'home';
                document.getElementById('homePage').classList.remove('hidden');
                this.initHomePage();
                break;
        }
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
            "chartOnly": true
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

    initAssetsPage() {
        const selector = document.getElementById('assetSelector');
        if (!selector) return;

        // Remove any existing listeners
        const newSelector = selector.cloneNode(true);
        selector.parentNode.replaceChild(newSelector, selector);

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
        });
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

            // Update performance metrics (mock data for now)
            const metrics = {
                '24h': document.getElementById('asset24h'),
                '1y': document.getElementById('asset1y'),
                '5y': document.getElementById('asset5y'),
                'all': document.getElementById('assetAllTime')
            };

            // Mock performance data (in real app, would come from API)
            const mockPerformance = {
                '24h': (Math.random() * 10 - 5).toFixed(2),
                '1y': (Math.random() * -50 - 10).toFixed(2),
                '5y': (Math.random() * -80 - 20).toFixed(2),
                'all': (Math.random() * -95 - 5).toFixed(2)
            };

            // Update each metric
            Object.keys(metrics).forEach(period => {
                const element = metrics[period];
                if (element) {
                    const value = mockPerformance[period];
                    element.textContent = `${value > 0 ? '+' : ''}${value}%`;
                    element.className = `font-semibold ${value > 0 ? 'text-green-600' : 'text-red-600'}`;
                }
            });

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
            'WTI': 'TVC:USOIL/BITSTAMP:BTCUSD'
        };

        const symbolMapUSD = {
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
            'WTI': 'TVC:USOIL'
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

    updateNavForLoggedInUser() {
        document.getElementById('navLoginBtn').classList.add('hidden');
        document.getElementById('navUserInfo').classList.remove('hidden');
        if (this.user && this.user.username) {
            document.getElementById('navUsername').textContent = this.user.username;
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
            this.loadTradeHistory()
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
            'BTC': 'BITSTAMP:BTCUSD',
            'AAPL': 'NASDAQ:AAPL',
            'TSLA': 'NASDAQ:TSLA',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'NVDA': 'NASDAQ:NVDA',
            'XAU': 'TVC:GOLD',
            'XAG': 'TVC:SILVER',
            'WTI': 'TVC:USOIL'
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
}

// Initialize the app
new BitcoinGame();