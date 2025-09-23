const {
    sendSuccess,
    sendError,
    logOperation,
    ValidationError,
    AuthenticationError,
    AuthorizationError
} = require('../utils/error-handlers');

const { sanitizeInput } = require('../utils/validation-helpers');

class BaseController {
    constructor() {
        // Controllers will inject their required services in constructors
    }

    /**
     * Standard error handling for controllers using centralized error handler
     * @param {Error} error - The error object
     * @param {Response} res - Express response object
     * @param {string} context - Context for logging
     */
    handleError(error, res, context = '') {
        sendError(res, error, context);
    }

    /**
     * Validate required fields in request body
     * @param {Object} body - Request body
     * @param {string[]} requiredFields - Array of required field names
     * @throws {ValidationError} If validation fails
     */
    validateRequiredFields(body, requiredFields) {
        const missing = requiredFields.filter(field =>
            body[field] === undefined || body[field] === null || body[field] === ''
        );

        if (missing.length > 0) {
            throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Extract user info from authenticated request
     * @param {Request} req - Express request object
     * @returns {Object} User information from JWT
     * @throws {AuthenticationError} If user is not authenticated
     */
    getUserFromRequest(req) {
        if (!req.user) {
            throw new AuthenticationError('User not authenticated');
        }
        return req.user;
    }

    /**
     * Check if user is admin
     * @param {Request} req - Express request object
     * @throws {AuthenticationError|AuthorizationError} If user is not admin
     */
    requireAdmin(req) {
        const user = this.getUserFromRequest(req);
        if (!user.isAdmin) {
            throw new AuthorizationError('Admin access required');
        }
    }

    /**
     * Sanitize input data using standardized helper
     * @param {any} data - Data to sanitize
     * @returns {any} Sanitized data
     */
    sanitizeInput(data) {
        return sanitizeInput(data);
    }

    /**
     * Send successful response using standardized handler
     * @param {Response} res - Express response object
     * @param {any} data - Data to send
     * @param {number} status - HTTP status code
     * @param {string} message - Optional success message
     */
    sendSuccess(res, data, status = 200, message = null) {
        sendSuccess(res, data, status, message);
    }

    /**
     * Log successful operation for audit purposes
     * @param {string} operation - Operation performed
     * @param {Object} req - Express request object (to get user info)
     * @param {Object} details - Additional operation details
     */
    logOperation(operation, req = null, details = {}) {
        const user = req && req.user ? req.user : null;
        logOperation(operation, user, details);
    }

    /**
     * Validate pagination parameters
     * @param {Object} query - Request query parameters
     * @returns {Object} Validated pagination params
     */
    validatePagination(query) {
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
        const offset = (page - 1) * limit;

        return { page, limit, offset };
    }

    /**
     * Validate and parse ID parameter
     * @param {string} id - ID parameter
     * @param {string} name - Name of the parameter for error messages
     * @returns {number} Parsed integer ID
     */
    validateId(id, name = 'ID') {
        const parsedId = parseInt(id);
        if (isNaN(parsedId) || parsedId <= 0) {
            throw new Error(`Invalid ${name}: must be a positive integer`);
        }
        return parsedId;
    }

    /**
     * Async wrapper for route handlers to catch errors
     * @param {Function} handler - Route handler function
     * @returns {Function} Wrapped handler with error catching
     */
    asyncHandler(handler) {
        return (req, res, next) => {
            Promise.resolve(handler(req, res, next))
                .catch(error => this.handleError(error, res, handler.name));
        };
    }
}

module.exports = BaseController;