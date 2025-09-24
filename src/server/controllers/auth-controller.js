const BaseController = require('./base-controller');
const AuthService = require('../services/auth-service');

class AuthController extends BaseController {
    constructor() {
        super();
        this.authService = new AuthService();
    }

    /**
     * Check if user exists by email
     * POST /api/auth/check-user
     */
    async checkUser(req, res) {
        try {
            this.validateRequiredFields(req.body, ['email']);
            const { email } = this.sanitizeInput(req.body);

            const exists = await this.authService.checkUserExists(email);

            // Log successful operation
            this.logOperation('auth.checkUser', req, { email, exists });

            this.sendSuccess(res, { exists });
        } catch (error) {
            this.handleError(error, res, 'checkUser');
        }
    }

    /**
     * Request magic link for authentication
     * POST /api/auth/request-magic-link
     */
    async requestMagicLink(req, res) {
        try {
            this.validateRequiredFields(req.body, ['email']);
            const { email, username } = this.sanitizeInput(req.body);

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }

            // Username validation if provided
            if (username && (username.length < 2 || username.length > 50)) {
                throw new Error('Username must be between 2 and 50 characters');
            }

            const result = await this.authService.requestMagicLink(email, username);

            // Log successful operation
            this.logOperation('auth.requestMagicLink', req, { email, hasUsername: !!username, isNewUser: result.isNewUser });

            // In production, we would send the email here
            // For development, we return the magic link URL
            const response = {
                message: 'Magic link sent successfully',
                ...(process.env.NODE_ENV === 'development' && {
                    magicLinkUrl: result.magicLinkUrl,
                    token: result.token
                })
            };

            this.sendSuccess(res, response, 201);
        } catch (error) {
            this.handleError(error, res, 'requestMagicLink');
        }
    }

    /**
     * Verify magic link token and authenticate user
     * Accepts both GET (token in query) and POST (token in body)
     * GET /api/auth/verify?token=...
     * POST /api/auth/verify-magic-link { token }
     */
    async verifyMagicLink(req, res) {
        try {
            // Support both GET (query param) and POST (body) usages
            const tokenFromQuery = req.query?.token;
            const tokenFromBody = req.body?.token;

            const rawToken = tokenFromQuery || tokenFromBody;
            if (!rawToken) {
                throw new Error('Missing required field: token');
            }

            const { token } = this.sanitizeInput({ token: rawToken });

            const result = await this.authService.verifyMagicLink(token);

            // Update last login timestamp
            await this.authService.updateLastLogin(result.user.id);

            this.sendSuccess(res, {
                message: 'Authentication successful',
                token: result.token,
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    isAdmin: result.user.isAdmin,
                    createdAt: result.user.createdAt
                }
            });
        } catch (error) {
            this.handleError(error, res, 'verifyMagicLink');
        }
    }

    /**
     * Verify JWT token (for middleware use)
     * GET /api/auth/verify-token
     */
    async verifyToken(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Invalid authorization header');
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            const decoded = await this.authService.verifyJWT(token);

            this.sendSuccess(res, {
                valid: true,
                user: {
                    id: decoded.user.id,
                    username: decoded.user.username,
                    email: decoded.user.email,
                    isAdmin: decoded.isAdmin
                }
            });
        } catch (error) {
            this.handleError(error, res, 'verifyToken');
        }
    }

    /**
     * Get current user info from JWT token
     * GET /api/auth/me
     */
    async getCurrentUser(req, res) {
        try {
            const user = this.getUserFromRequest(req);

            this.sendSuccess(res, {
                user: {
                    id: user.userId,
                    username: user.user?.username,
                    email: user.email,
                    isAdmin: user.isAdmin
                }
            });
        } catch (error) {
            this.handleError(error, res, 'getCurrentUser');
        }
    }

    /**
     * Logout user (client-side token removal, server logs the action)
     * POST /api/auth/logout
     */
    async logout(req, res) {
        try {
            const user = this.getUserFromRequest(req);

            // Log the logout action
            console.log(`User ${user.email} logged out at ${new Date().toISOString()}`);

            this.sendSuccessMessage(res, 'Logged out successfully');
        } catch (error) {
            this.handleError(error, res, 'logout');
        }
    }

    /**
     * Check admin status
     * GET /api/auth/admin-status
     */
    async checkAdminStatus(req, res) {
        try {
            const user = this.getUserFromRequest(req);

            this.sendSuccess(res, {
                isAdmin: user.isAdmin,
                userId: user.userId,
                email: user.email
            });
        } catch (error) {
            this.handleError(error, res, 'checkAdminStatus');
        }
    }

    /**
     * Refresh user data (useful after admin status changes)
     * POST /api/auth/refresh
     */
    async refreshUser(req, res) {
        try {
            const currentUser = this.getUserFromRequest(req);

            // Get fresh user data
            const decoded = await this.authService.verifyJWT(req.headers.authorization.substring(7));

            // Check current admin status
            const isAdmin = this.authService.checkAdminStatus(decoded.user.email, decoded.user.isAdmin);

            this.sendSuccess(res, {
                user: {
                    id: decoded.user.id,
                    username: decoded.user.username,
                    email: decoded.user.email,
                    isAdmin: isAdmin,
                    lastLoginAt: decoded.user.lastLoginAt
                }
            });
        } catch (error) {
            this.handleError(error, res, 'refreshUser');
        }
    }
}

module.exports = AuthController;
