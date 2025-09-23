/**
 * Centralized Asset Configuration
 *
 * This file contains all asset metadata that was previously stored in the database.
 * After database unification, asset names, types, and categories are defined here
 * to keep the codebase DRY and maintainable.
 */

// Asset metadata mapping
const ASSET_METADATA = {
  // Cryptocurrency
  'BTC': { name: 'Bitcoin', type: 'crypto', category: 'Cryptocurrency' },

  // Technology Stocks
  'AAPL': { name: 'Apple Inc.', type: 'stock', category: 'Technology' },
  'MSFT': { name: 'Microsoft Corp.', type: 'stock', category: 'Technology' },
  'GOOGL': { name: 'Alphabet Inc.', type: 'stock', category: 'Technology' },
  'AMZN': { name: 'Amazon.com Inc.', type: 'stock', category: 'Technology' },
  'NVDA': { name: 'NVIDIA Corp.', type: 'stock', category: 'Technology' },
  'TSLA': { name: 'Tesla Inc.', type: 'stock', category: 'Technology' },

  // Commodities
  'XAU': { name: 'Gold', type: 'commodity', category: 'Precious Metals' },
  'XAG': { name: 'Silver', type: 'commodity', category: 'Precious Metals' },
  'WTI': { name: 'Crude Oil WTI', type: 'commodity', category: 'Energy' },
  'CPER': { name: 'United States Copper Index Fund', type: 'commodity', category: 'Industrial Metals' },

  // Additional stocks that might be in database
  'META': { name: 'Meta Platforms Inc.', type: 'stock', category: 'Technology' },
  'NFLX': { name: 'Netflix Inc.', type: 'stock', category: 'Technology' },
  'AMD': { name: 'Advanced Micro Devices', type: 'stock', category: 'Technology' },
  'INTC': { name: 'Intel Corp.', type: 'stock', category: 'Technology' },
  'CRM': { name: 'Salesforce Inc.', type: 'stock', category: 'Technology' },
  'ADBE': { name: 'Adobe Inc.', type: 'stock', category: 'Technology' },
  'PYPL': { name: 'PayPal Holdings Inc.', type: 'stock', category: 'Technology' },
  'UBER': { name: 'Uber Technologies Inc.', type: 'stock', category: 'Technology' },
  'SPOT': { name: 'Spotify Technology SA', type: 'stock', category: 'Technology' },
  'ZOOM': { name: 'Zoom Video Communications', type: 'stock', category: 'Technology' },

  // Finance
  'JPM': { name: 'JPMorgan Chase & Co.', type: 'stock', category: 'Finance' },
  'BAC': { name: 'Bank of America Corp.', type: 'stock', category: 'Finance' },
  'WFC': { name: 'Wells Fargo & Co.', type: 'stock', category: 'Finance' },
  'GS': { name: 'Goldman Sachs Group Inc.', type: 'stock', category: 'Finance' },
  'V': { name: 'Visa Inc.', type: 'stock', category: 'Finance' },
  'MA': { name: 'Mastercard Inc.', type: 'stock', category: 'Finance' },

  // Healthcare
  'JNJ': { name: 'Johnson & Johnson', type: 'stock', category: 'Healthcare' },
  'PFE': { name: 'Pfizer Inc.', type: 'stock', category: 'Healthcare' },
  'UNH': { name: 'UnitedHealth Group Inc.', type: 'stock', category: 'Healthcare' },
  'MRNA': { name: 'Moderna Inc.', type: 'stock', category: 'Healthcare' },

  // Consumer
  'KO': { name: 'Coca-Cola Co.', type: 'stock', category: 'Consumer Goods' },
  'PEP': { name: 'PepsiCo Inc.', type: 'stock', category: 'Consumer Goods' },
  'NKE': { name: 'Nike Inc.', type: 'stock', category: 'Consumer Goods' },
  'MCD': { name: 'McDonald\'s Corp.', type: 'stock', category: 'Consumer Goods' }
};

// Asset categories for filtering and grouping
const ASSET_CATEGORIES = {
  'Cryptocurrency': ['BTC'],
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'ADBE', 'PYPL', 'UBER', 'SPOT', 'ZOOM'],
  'Finance': ['JPM', 'BAC', 'WFC', 'GS', 'V', 'MA'],
  'Healthcare': ['JNJ', 'PFE', 'UNH', 'MRNA'],
  'Consumer Goods': ['KO', 'PEP', 'NKE', 'MCD'],
  'Precious Metals': ['XAU', 'XAG'],
  'Energy': ['WTI'],
  'Industrial Metals': ['CPER']
};

// Asset types for filtering
const ASSET_TYPES = {
  crypto: ['BTC'],
  stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'ADBE', 'PYPL', 'UBER', 'SPOT', 'ZOOM', 'JPM', 'BAC', 'WFC', 'GS', 'V', 'MA', 'JNJ', 'PFE', 'UNH', 'MRNA', 'KO', 'PEP', 'NKE', 'MCD'],
  commodity: ['XAU', 'XAG', 'WTI', 'CPER']
};

/**
 * Get asset metadata by symbol
 * @param {string} symbol - Asset symbol (e.g., 'AAPL')
 * @returns {Object|null} Asset metadata or null if not found
 */
function getAssetMetadata(symbol) {
  return ASSET_METADATA[symbol] || null;
}

/**
 * Get asset name by symbol
 * @param {string} symbol - Asset symbol
 * @returns {string} Asset name or symbol if not found
 */
function getAssetName(symbol) {
  const metadata = getAssetMetadata(symbol);
  return metadata ? metadata.name : symbol;
}

/**
 * Get asset type by symbol
 * @param {string} symbol - Asset symbol
 * @returns {string} Asset type or 'unknown' if not found
 */
function getAssetType(symbol) {
  const metadata = getAssetMetadata(symbol);
  return metadata ? metadata.type : 'unknown';
}

/**
 * Get asset category by symbol
 * @param {string} symbol - Asset symbol
 * @returns {string} Asset category or 'Other' if not found
 */
function getAssetCategory(symbol) {
  const metadata = getAssetMetadata(symbol);
  return metadata ? metadata.category : 'Other';
}

/**
 * Get all assets by category
 * @param {string} category - Category name
 * @returns {Array} Array of asset symbols in the category
 */
function getAssetsByCategory(category) {
  return ASSET_CATEGORIES[category] || [];
}

/**
 * Get all assets by type
 * @param {string} type - Asset type ('crypto', 'stock', 'commodity')
 * @returns {Array} Array of asset symbols of the specified type
 */
function getAssetsByType(type) {
  return ASSET_TYPES[type] || [];
}

/**
 * Get all available categories
 * @returns {Array} Array of category names
 */
function getAllCategories() {
  return Object.keys(ASSET_CATEGORIES);
}

/**
 * Get all available types
 * @returns {Array} Array of asset types
 */
function getAllTypes() {
  return Object.keys(ASSET_TYPES);
}

/**
 * Enrich asset data from database with metadata
 * @param {Array} dbAssets - Assets from database (symbol, current_price_usd, last_updated)
 * @returns {Array} Enriched assets with name, type, category
 */
function enrichAssetData(dbAssets) {
  return dbAssets.map(asset => ({
    ...asset,
    ...getAssetMetadata(asset.symbol),
    // Fallback to symbol if metadata not found
    name: getAssetName(asset.symbol),
    type: getAssetType(asset.symbol),
    category: getAssetCategory(asset.symbol)
  }));
}

module.exports = {
  ASSET_METADATA,
  ASSET_CATEGORIES,
  ASSET_TYPES,
  getAssetMetadata,
  getAssetName,
  getAssetType,
  getAssetCategory,
  getAssetsByCategory,
  getAssetsByType,
  getAllCategories,
  getAllTypes,
  enrichAssetData
};