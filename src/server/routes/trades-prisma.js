const express = require('express');
const TradeController = require('../controllers/trade-controller');
const authenticateToken = require('../../../middleware/auth');
const { asyncHandler } = require('../utils/error-handlers');
const router = express.Router();

// Initialize controller
const tradeController = new TradeController();

// Execute a trade between assets
router.post('/execute', authenticateToken, asyncHandler(async (req, res) => {
    await tradeController.executeTrade(req, res);
}));

// Preview a trade (calculate amounts without executing)
router.post('/preview', authenticateToken, asyncHandler(async (req, res) => {
    await tradeController.previewTrade(req, res);
}));

// Get user's trade history
router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
    await tradeController.getTradeHistory(req, res);
}));

// Get trade statistics for user
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
    await tradeController.getTradeStats(req, res);
}));

// Get asset lock information
router.get('/lock-info/:symbol', authenticateToken, asyncHandler(async (req, res) => {
    await tradeController.getAssetLockInfo(req, res);
}));

module.exports = router;