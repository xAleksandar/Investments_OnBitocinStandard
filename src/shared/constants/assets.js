// Enhanced asset metadata moved from config/assets.js
// Shared between client and server for consistent asset handling

const ASSET_METADATA = {
    'BTC': {
        name: 'Bitcoin',
        type: 'crypto',
        category: 'Cryptocurrency',
        symbol: 'BTC',
        description: 'The original cryptocurrency and digital gold'
    },
    'AAPL': {
        name: 'Apple Inc.',
        type: 'stock',
        category: 'Technology',
        symbol: 'AAPL',
        description: 'Technology company known for consumer electronics'
    },
    'GOOGL': {
        name: 'Alphabet Inc.',
        type: 'stock',
        category: 'Technology',
        symbol: 'GOOGL',
        description: 'Internet services and technology company'
    },
    'MSFT': {
        name: 'Microsoft Corporation',
        type: 'stock',
        category: 'Technology',
        symbol: 'MSFT',
        description: 'Software and technology services company'
    },
    'TSLA': {
        name: 'Tesla, Inc.',
        type: 'stock',
        category: 'Automotive',
        symbol: 'TSLA',
        description: 'Electric vehicle and clean energy company'
    },
    'NVDA': {
        name: 'NVIDIA Corporation',
        type: 'stock',
        category: 'Technology',
        symbol: 'NVDA',
        description: 'Graphics processing and AI chip manufacturer'
    },
    'GOLD': {
        name: 'Gold',
        type: 'commodity',
        category: 'Precious Metals',
        symbol: 'GOLD',
        description: 'Precious metal traditionally used as store of value'
    },
    'SPY': {
        name: 'SPDR S&P 500 ETF',
        type: 'etf',
        category: 'Index Fund',
        symbol: 'SPY',
        description: 'ETF tracking the S&P 500 index'
    }
};

const ASSET_CATEGORIES = {
    CRYPTO: 'Cryptocurrency',
    TECHNOLOGY: 'Technology',
    FINANCE: 'Finance',
    HEALTHCARE: 'Healthcare',
    COMMODITIES: 'Commodities',
    AUTOMOTIVE: 'Automotive',
    INDEX_FUND: 'Index Fund',
    PRECIOUS_METALS: 'Precious Metals'
};

const ASSET_TYPES = {
    STOCK: 'stock',
    CRYPTO: 'crypto',
    ETF: 'etf',
    COMMODITY: 'commodity'
};

// Helper functions for asset management
function getAssetsByCategory(category) {
    return Object.values(ASSET_METADATA).filter(asset => asset.category === category);
}

function getAssetsByType(type) {
    return Object.values(ASSET_METADATA).filter(asset => asset.type === type);
}

function isValidAssetSymbol(symbol) {
    return symbol && ASSET_METADATA.hasOwnProperty(symbol.toUpperCase());
}

function getAssetMetadata(symbol) {
    return ASSET_METADATA[symbol?.toUpperCase()] || null;
}

module.exports = {
    ASSET_METADATA,
    ASSET_CATEGORIES,
    ASSET_TYPES,
    getAssetsByCategory,
    getAssetsByType,
    isValidAssetSymbol,
    getAssetMetadata
};