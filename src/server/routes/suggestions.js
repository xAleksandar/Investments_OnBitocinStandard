const express = require('express');
const AdminController = require('../controllers/admin-controller');
const authenticateToken = require('../../../middleware/auth');
const requireAdmin = require('../../../middleware/requireAdmin');
const { asyncHandler } = require('../utils/error-handlers');
const router = express.Router();

// Initialize controller
const adminController = new AdminController();

// ===== USER ENDPOINTS =====

// Submit new suggestion or bug report
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    await adminController.submitSuggestion(req, res);
}));

// Get user's own suggestions
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    await adminController.getUserSuggestions(req, res);
}));

// Check rate limit status for current user
router.get('/rate-limit', authenticateToken, asyncHandler(async (req, res) => {
    await adminController.checkSuggestionRateLimit(req, res);
}));

// Get all suggestions (public view)
router.get('/all', asyncHandler(async (req, res) => {
    await adminController.getAllSuggestionsPublic(req, res);
}));

// ===== ADMIN ENDPOINTS =====

// Get all suggestions for admin dashboard (with pagination and filters)
router.get('/admin/suggestions', requireAdmin, asyncHandler(async (req, res) => {
    await adminController.getAllSuggestions(req, res);
}));

// Add admin reply to suggestion
router.put('/admin/suggestions/:id/reply', requireAdmin, asyncHandler(async (req, res) => {
    await adminController.replySuggestion(req, res);
}));

// Update suggestion status
router.put('/admin/suggestions/:id/status', requireAdmin, asyncHandler(async (req, res) => {
    await adminController.updateSuggestionStatus(req, res);
}));

// Update suggestion status and/or add admin reply (legacy endpoint)
router.put('/:id', asyncHandler(async (req, res) => {
    await adminController.updateSuggestion(req, res);
}));

// Get admin dashboard statistics
router.get('/admin/stats', requireAdmin, asyncHandler(async (req, res) => {
    await adminController.getSuggestionStats(req, res);
}));

// Promote user to admin via database flag
router.post('/admin/users/:id/promote', requireAdmin, asyncHandler(async (req, res) => {
    await adminController.promoteUser(req, res);
}));

module.exports = router;