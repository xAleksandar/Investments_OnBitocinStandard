class BaseController {
    constructor() {
        // Controllers will inject their required services in constructors
    }

    /**
     * Standard error handling for controllers
     * @param {Error} error - The error object
     * @param {Response} res - Express response object
     * @param {string} context - Context for logging
     */
    handleError(error, res, context = '') {
        console.error(`Controller error in ${context}:`, error);

        // Handle known error types
        if (error.message.includes('User not found')) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            return res.status(409).json({ error: 'Resource already exists' });
        }

        if (error.message.includes('Invalid') || error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message.includes('Unauthorized') || error.message.includes('token')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (error.message.includes('Forbidden') || error.message.includes('admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Default server error
        res.status(500).json({
            error: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
    }

    /**
     * Validate required fields in request body
     * @param {Object} body - Request body
     * @param {string[]} requiredFields - Array of required field names
     * @throws {Error} If validation fails
     */
    validateRequiredFields(body, requiredFields) {
        const missing = requiredFields.filter(field =>
            body[field] === undefined || body[field] === null || body[field] === ''
        );

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Extract user info from authenticated request
     * @param {Request} req - Express request object
     * @returns {Object} User information from JWT
     */
    getUserFromRequest(req) {
        if (!req.user) {
            throw new Error('User not authenticated');
        }
        return req.user;
    }

    /**
     * Check if user is admin
     * @param {Request} req - Express request object
     * @throws {Error} If user is not admin
     */
    requireAdmin(req) {
        const user = this.getUserFromRequest(req);
        if (!user.isAdmin) {
            throw new Error('Admin access required');
        }
    }

    /**
     * Sanitize input data
     * @param {any} data - Data to sanitize
     * @returns {any} Sanitized data
     */
    sanitizeInput(data) {
        if (typeof data === 'string') {
            return data.trim();
        }

        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') {
                    sanitized[key] = value.trim();
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        }

        return data;
    }

    /**
     * Send successful response
     * @param {Response} res - Express response object
     * @param {any} data - Data to send
     * @param {number} status - HTTP status code
     */
    sendSuccess(res, data, status = 200) {
        res.status(status).json(data);
    }

    /**
     * Send successful response with message
     * @param {Response} res - Express response object
     * @param {string} message - Success message
     * @param {any} data - Optional data to include
     * @param {number} status - HTTP status code
     */
    sendSuccessMessage(res, message, data = null, status = 200) {
        const response = { message };
        if (data !== null) {
            response.data = data;
        }
        res.status(status).json(response);
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