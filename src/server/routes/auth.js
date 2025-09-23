const express = require('express');
const AuthController = require('../controllers/auth-controller');
const { asyncHandler } = require('../utils/error-handlers');
const router = express.Router();

// Initialize controller
const authController = new AuthController();

// Check if user exists
router.post('/check-user', asyncHandler(async (req, res) => {
    await authController.checkUser(req, res);
}));

// Request magic link
router.post('/request-link', asyncHandler(async (req, res) => {
    await authController.requestMagicLink(req, res);
}));

// Verify magic link
router.get('/verify', asyncHandler(async (req, res) => {
    await authController.verifyMagicLink(req, res);
}));

// Verify JWT token (for frontend auth checks)
router.post('/verify-token', asyncHandler(async (req, res) => {
    await authController.verifyToken(req, res);
}));

// Get current user info (requires authentication)
router.get('/me', asyncHandler(async (req, res) => {
    await authController.getCurrentUser(req, res);
}));

module.exports = router;