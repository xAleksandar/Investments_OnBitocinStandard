const express = require('express');
const PortfolioController = require('../controllers/portfolio-controller');
const authenticateToken = require('../../../middleware/auth');
const { asyncHandler } = require('../utils/error-handlers');
const router = express.Router();

// Initialize controller
const portfolioController = new PortfolioController();

// Get user's complete portfolio
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getPortfolio(req, res);
}));

// Get portfolio value calculation
router.get('/value', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getPortfolioValue(req, res);
}));

// Get portfolio summary stats
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getPortfolioSummary(req, res);
}));

// Get portfolio performance data
router.get('/performance', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getPortfolioPerformance(req, res);
}));

// Get locked asset information
router.get('/locked-assets', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getLockedAssets(req, res);
}));

// Get detailed asset information
router.get('/asset/:symbol', authenticateToken, asyncHandler(async (req, res) => {
    await portfolioController.getAssetDetails(req, res);
}));

module.exports = router;