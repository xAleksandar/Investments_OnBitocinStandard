/**
 * Homepage Assets Dynamic Rendering
 * Replaces the 6 hardcoded asset cards with dynamic AssetCard components
 */

// Popular assets configuration (matches the hardcoded assets in homepage)
const POPULAR_ASSETS = [
    {
        symbol: 'XAU',
        name: 'Gold',
        chartId: 'chartGold',
        priceId: 'goldPrice',
        changeId: 'goldChange',
        titleKey: 'home.goldBitcoin',
        icon: '🥇'
    },
    {
        symbol: 'SPY',
        name: 'S&P 500',
        chartId: 'chartSPY',
        priceId: 'spyPrice',
        changeId: 'spyChange',
        titleKey: 'home.spBitcoin',
        icon: '📈'
    },
    {
        symbol: 'AAPL',
        name: 'Apple',
        chartId: 'chartAAPL',
        priceId: 'aaplPrice',
        changeId: 'aaplChange',
        titleKey: 'home.appleBitcoin',
        icon: '🍎'
    },
    {
        symbol: 'TSLA',
        name: 'Tesla',
        chartId: 'chartTSLA',
        priceId: 'tslaPrice',
        changeId: 'tslaChange',
        titleKey: 'home.teslaBitcoin',
        icon: '🚗'
    },
    {
        symbol: 'VNQ',
        name: 'Real Estate',
        chartId: 'chartVNQ',
        priceId: 'vnqPrice',
        changeId: 'vnqChange',
        titleKey: 'home.realEstateBitcoin',
        icon: '🏢'
    },
    {
        symbol: 'WTI',
        name: 'Oil',
        chartId: 'chartOil',
        priceId: 'oilPrice',
        changeId: 'oilChange',
        titleKey: 'home.oilBitcoin',
        icon: '🛢️'
    }
];

/**
 * Create a single homepage asset card
 * @param {Object} assetConfig - Asset configuration
 * @returns {HTMLElement} Asset card element
 */
function createHomepageAssetCard(assetConfig) {
    const cardElement = document.createElement('div');
    cardElement.className = 'border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow relative';
    cardElement.style.zIndex = '10';
    cardElement.setAttribute('data-asset', assetConfig.symbol);
    cardElement.onclick = () => {
        if (window.app?.navigateToAsset) {
            window.app.navigateToAsset(assetConfig.symbol);
        }
    };

    cardElement.innerHTML = `
        <h3 class="font-semibold mb-2" data-translate="${assetConfig.titleKey}">
            ${assetConfig.icon} ${assetConfig.name} / Bitcoin
        </h3>
        <div id="${assetConfig.chartId}" class="h-48 bg-gray-100 rounded mb-3"></div>
        <div class="space-y-1">
            <div class="flex justify-between text-sm">
                <span class="text-gray-600" data-translate="home.currentPrice">Current Price:</span>
                <span id="${assetConfig.priceId}" class="font-mono">0.00000000</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-gray-600" data-translate="time.fiveYear">5 Year:</span>
                <span id="${assetConfig.changeId}" class="font-semibold">-</span>
            </div>
        </div>
    `;

    return cardElement;
}

/**
 * Initialize homepage asset cards
 */
function initializeHomepageAssets() {
    console.log('🎬 [HomepageAssets] Starting initialization...');

    // Find the container where asset cards should be rendered
    const assetGridContainer = document.querySelector('#popularAssetsGrid');

    if (!assetGridContainer) {
        console.error('❌ [HomepageAssets] Popular assets grid container #popularAssetsGrid not found in DOM');
        return;
    }

    console.log('✓ [HomepageAssets] Found container #popularAssetsGrid');

    // Clear existing hardcoded cards (if any)
    assetGridContainer.innerHTML = '';
    console.log('✓ [HomepageAssets] Cleared container');

    // Create asset cards dynamically
    const assetCards = POPULAR_ASSETS.map(assetConfig => {
        console.log(`  → Creating card for ${assetConfig.symbol} (${assetConfig.name})`);
        return createHomepageAssetCard(assetConfig);
    });

    // Add cards to container
    assetCards.forEach((card, index) => {
        assetGridContainer.appendChild(card);
        console.log(`  ✓ Added card ${index + 1}/${assetCards.length} to DOM`);
    });

    console.log(`✅ [HomepageAssets] Successfully created ${POPULAR_ASSETS.length} asset cards`);

    // Verify chart containers exist
    POPULAR_ASSETS.forEach(asset => {
        const chartContainer = document.getElementById(asset.chartId);
        if (chartContainer) {
            console.log(`  ✓ Chart container #${asset.chartId} exists, innerHTML: "${chartContainer.innerHTML}"`);
        } else {
            console.error(`  ❌ Chart container #${asset.chartId} NOT FOUND`);
        }
    });

    // Trigger chart initialization if HomePage component is available
    triggerChartInitialization();
}

/**
 * Trigger chart initialization for the cards we just created
 */
function triggerChartInitialization() {
    console.log('⏱️ [HomepageAssets] Waiting 100ms for DOM to settle before initializing charts...');

    // Wait a bit for DOM to settle, then try to initialize charts
    setTimeout(() => {
        console.log('🔍 [HomepageAssets] Checking for window.app.homePage.initializeMiniCharts...');
        console.log(`   window.app exists: ${!!window.app}`);
        console.log(`   window.app.homePage exists: ${!!(window.app && window.app.homePage)}`);
        console.log(`   initializeMiniCharts exists: ${!!(window.app && window.app.homePage && window.app.homePage.initializeMiniCharts)}`);

        // Check if the app's HomePage component is available
        if (window.app && window.app.homePage && typeof window.app.homePage.initializeMiniCharts === 'function') {
            console.log('✓ [HomepageAssets] Using app.homePage.initializeMiniCharts()');
            window.app.homePage.initializeMiniCharts();
        } else {
            // Alternative: Try to initialize charts directly using the same logic as home-page.js
            console.log('⚠️ [HomepageAssets] app.homePage not available, using fallback direct initialization');
            initializeChartsDirectly();
        }
    }, 100);
}

/**
 * Initialize TradingView charts directly (fallback method)
 */
async function initializeChartsDirectly() {
    console.log('📊 [ChartInit] Starting direct chart initialization...');

    try {
        // Load TradingView library if needed
        console.log('📚 [ChartInit] Loading TradingView library...');
        await ensureTradingViewLoaded();
        console.log('✓ [ChartInit] TradingView library loaded');

        // Initialize charts for each asset
        console.log(`🎨 [ChartInit] Initializing ${POPULAR_ASSETS.length} charts...`);
        POPULAR_ASSETS.forEach((assetConfig, index) => {
            const symbol = getTradingViewSymbol(assetConfig.symbol);
            const tvSymbol = `${symbol}/BITSTAMP:BTCUSD`;
            console.log(`  [${index + 1}/${POPULAR_ASSETS.length}] Initializing ${assetConfig.symbol}: ${tvSymbol} → #${assetConfig.chartId}`);
            initMiniChart(assetConfig.chartId, tvSymbol, assetConfig.name, assetConfig.symbol);
        });

        console.log('✅ [ChartInit] All charts initialized successfully');
    } catch (error) {
        console.error('❌ [ChartInit] Failed to initialize charts:', error);
        console.error('   Error details:', error.stack);
    }
}

/**
 * Ensure TradingView library is loaded
 */
function ensureTradingViewLoaded() {
    if (typeof TradingView !== 'undefined') {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.onload = () => resolve();
        script.onerror = () => resolve(); // Resolve anyway to allow fallbacks
        document.head.appendChild(script);
    });
}

/**
 * Get TradingView symbol for asset
 */
function getTradingViewSymbol(assetSymbol) {
    const map = {
        'XAU': 'TVC:GOLD',
        'SPY': 'AMEX:SPY',
        'AAPL': 'NASDAQ:AAPL',
        'TSLA': 'NASDAQ:TSLA',
        'VNQ': 'AMEX:VNQ',
        'WTI': 'TVC:USOIL'
    };
    return map[assetSymbol] || `NASDAQ:${assetSymbol}`;
}

/**
 * Initialize a mini chart (simplified version from home-page.js)
 */
function initMiniChart(containerId, symbol, name, assetSymbol) {
    console.log(`  🎯 [initMiniChart] Called for ${assetSymbol} (container: #${containerId})`);

    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`  ❌ [initMiniChart] Container #${containerId} not found in DOM!`);
        return;
    }

    console.log(`  ✓ [initMiniChart] Found container #${containerId}`);
    console.log(`     innerHTML length: ${container.innerHTML.length}`);
    console.log(`     innerHTML trimmed: "${container.innerHTML.trim()}"`);
    console.log(`     isEmpty check: ${container.innerHTML.trim() === ''}`);

    if (container.innerHTML.trim() !== '') {
        console.warn(`  ⚠️ [initMiniChart] Container #${containerId} is not empty, skipping chart creation`);
        console.warn(`     Content: "${container.innerHTML}"`);
        return;
    }

    console.log(`  ⚙️ [initMiniChart] Creating TradingView widget for ${symbol}...`);

    // Create TradingView mini widget
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';

    const config = {
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
    };

    script.innerHTML = JSON.stringify(config);
    console.log(`  📝 [initMiniChart] Widget config:`, config);

    container.appendChild(script);
    console.log(`  ✅ [initMiniChart] Chart widget script added to #${containerId}`);
}

/**
 * Update asset prices and performance data
 * @param {Object} assetPrices - Price data for assets
 */
function updateHomepageAssetPrices(assetPrices) {
    POPULAR_ASSETS.forEach(assetConfig => {
        const priceData = assetPrices[assetConfig.symbol];
        if (!priceData) return;

        // Update price display
        const priceElement = document.getElementById(assetConfig.priceId);
        if (priceElement && priceData.btcPrice) {
            priceElement.textContent = Number(priceData.btcPrice).toFixed(8);
        }

        // Update 5-year change
        const changeElement = document.getElementById(assetConfig.changeId);
        if (changeElement && priceData.change5y !== undefined) {
            const change5y = Number(priceData.change5y);
            changeElement.textContent = change5y >= 0 ? `+${change5y.toFixed(1)}%` : `${change5y.toFixed(1)}%`;

            // Add color classes based on performance
            changeElement.classList.remove('text-green-600', 'text-red-600', 'text-gray-600');
            if (change5y > 0) {
                changeElement.classList.add('text-green-600');
            } else if (change5y < 0) {
                changeElement.classList.add('text-red-600');
            } else {
                changeElement.classList.add('text-gray-600');
            }
        }
    });
}

/**
 * Initialize when DOM is ready
 */
function initWhenReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHomepageAssets);
    } else {
        initializeHomepageAssets();
    }
}

// Export functions for external use
window.HomepageAssets = {
    initialize: initializeHomepageAssets,
    updatePrices: updateHomepageAssetPrices,
    POPULAR_ASSETS: POPULAR_ASSETS
};

// Auto-initialize when script loads
initWhenReady();

console.log('📦 Homepage Assets module loaded');