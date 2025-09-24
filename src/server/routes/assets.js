const express = require('express');
const AssetController = require('../controllers/asset-controller');
const authenticateToken = require('../../../middleware/auth');
const { asyncHandler } = require('../utils/error-handlers');
const router = express.Router();

// Initialize controller
const assetController = new AssetController();

// Get all available assets with their current prices
router.get('/', asyncHandler(async (req, res) => {
    await assetController.getAllAssets(req, res);
}));

// Search assets by name or symbol
router.get('/search', asyncHandler(async (req, res) => {
    await assetController.searchAssets(req, res);
}));

// Get current prices for all assets (GET) - Must come BEFORE /:symbol
router.get('/prices', asyncHandler(async (req, res) => {
    await assetController.getAllPrices(req, res);
}));

// Get asset performance vs BTC for a period
router.get('/performance/:symbol/:period', asyncHandler(async (req, res) => {
    await assetController.getAssetPerformance(req, res);
}));

// Get specific asset information
router.get('/:symbol', asyncHandler(async (req, res) => {
    await assetController.getAsset(req, res);
}));

// Get current price for a specific asset
router.get('/:symbol/price', asyncHandler(async (req, res) => {
    await assetController.getAssetPrice(req, res);
}));

// Get asset price history (limited functionality)
router.get('/:symbol/history', asyncHandler(async (req, res) => {
    await assetController.getAssetHistory(req, res);
}));

// Get prices for multiple assets (POST)
router.post('/prices', asyncHandler(async (req, res) => {
    await assetController.getMultiplePrices(req, res);
}));

// Update all asset prices (admin only)
router.post('/update-prices', authenticateToken, asyncHandler(async (req, res) => {
    await assetController.updateAllPrices(req, res);
}));

module.exports = router;
