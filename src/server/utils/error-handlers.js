/**
 * Standardized error handling utilities for consistent API responses
 */

const {
    HTTP_STATUS,
    ERROR_MESSAGES
} = require('./constants');

/**
 * Custom error classes for different types of application errors
 */

class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = HTTP_STATUS.BAD_REQUEST;
        this.field = field;
    }
}

class AuthenticationError extends Error {
    constructor(message = ERROR_MESSAGES.UNAUTHORIZED) {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = HTTP_STATUS.UNAUTHORIZED;
    }
}

class AuthorizationError extends Error {
    constructor(message = ERROR_MESSAGES.ADMIN_REQUIRED) {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = HTTP_STATUS.FORBIDDEN;
    }
}

class NotFoundError extends Error {
    constructor(message = ERROR_MESSAGES.NOT_FOUND) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = HTTP_STATUS.NOT_FOUND;
    }
}

class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = HTTP_STATUS.CONFLICT;
    }
}

class BusinessRuleError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BusinessRuleError';
        this.statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    }
}

class ServiceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ServiceUnavailableError';
        this.statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    }
}

/**
 * Determines the appropriate HTTP status code for an error
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
function getErrorStatusCode(error) {
    // If error has explicit status code, use it
    if (error.statusCode) {
        return error.statusCode;
    }

    // Check error type and message for common patterns
    const errorMessage = error.message.toLowerCase();

    // Authentication/Authorization errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid token') || errorMessage.includes('expired token')) {
        return HTTP_STATUS.UNAUTHORIZED;
    }

    if (errorMessage.includes('admin') || errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
        return HTTP_STATUS.FORBIDDEN;
    }

    // Validation errors
    if (errorMessage.includes('missing required') || errorMessage.includes('invalid') || errorMessage.includes('must be')) {
        return HTTP_STATUS.BAD_REQUEST;
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return HTTP_STATUS.NOT_FOUND;
    }

    // Business rule violations
    if (errorMessage.includes('insufficient') || errorMessage.includes('locked') || errorMessage.includes('cannot trade')) {
        return HTTP_STATUS.UNPROCESSABLE_ENTITY;
    }

    // Prisma errors
    if (error.code) {
        switch (error.code) {
            case 'P2002': // Unique constraint violation
                return HTTP_STATUS.CONFLICT;
            case 'P2025': // Record not found
                return HTTP_STATUS.NOT_FOUND;
            case 'P2003': // Foreign key constraint violation
                return HTTP_STATUS.BAD_REQUEST;
            default:
                return HTTP_STATUS.INTERNAL_SERVER_ERROR;
        }
    }

    // Default to internal server error
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Formats error response object
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred (for logging)
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, context = '') {
    const statusCode = getErrorStatusCode(error);
    const timestamp = new Date().toISOString();

    // Log error details (but not to client)
    console.error(`Error in ${context}:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode,
        timestamp
    });

    // Create client-safe error response
    const response = {
        error: true,
        message: sanitizeErrorMessage(error.message),
        timestamp,
        statusCode
    };

    // Add additional context for validation errors
    if (error instanceof ValidationError && error.field) {
        response.field = error.field;
    }

    // Add error code for specific error types
    if (error.code) {
        response.code = error.code;
    }

    return response;
}

/**
 * Sanitizes error messages to prevent sensitive information leakage
 * @param {string} message - Original error message
 * @returns {string} Sanitized error message
 */
function sanitizeErrorMessage(message) {
    // Remove potential sensitive information
    const sensitivePatterns = [
        /password/gi,
        /token/gi,
        /secret/gi,
        /key/gi,
        /connection string/gi
    ];

    let sanitized = message;

    sensitivePatterns.forEach(pattern => {
        if (pattern.test(sanitized)) {
            sanitized = ERROR_MESSAGES.SERVER_ERROR;
        }
    });

    // Limit message length
    if (sanitized.length > 200) {
        sanitized = ERROR_MESSAGES.SERVER_ERROR;
    }

    return sanitized;
}

/**
 * Express error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(error, req, res, next) {
    const errorResponse = formatErrorResponse(error, `${req.method} ${req.path}`);

    res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Handles async route errors by wrapping route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler with error catching
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Sends standardized success response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 */
function sendSuccess(res, data, statusCode = HTTP_STATUS.OK, message = null) {
    const response = {
        success: true,
        data,
        timestamp: new Date().toISOString()
    };

    if (message) {
        response.message = message;
    }

    res.status(statusCode).json(response);
}

/**
 * Sends standardized error response
 * @param {Object} res - Express response object
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context for logging
 * @param {number} statusCode - Override status code
 */
function sendError(res, error, context = '', statusCode = null) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    if (statusCode) {
        errorObj.statusCode = statusCode;
    }

    const errorResponse = formatErrorResponse(errorObj, context);
    res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Validates that a user exists and is authenticated
 * @param {Object} req - Express request object
 * @throws {AuthenticationError} If user is not authenticated
 * @returns {Object} User object from request
 */
function requireAuth(req) {
    if (!req.user || !req.user.userId) {
        throw new AuthenticationError(ERROR_MESSAGES.UNAUTHORIZED);
    }
    return req.user;
}

/**
 * Validates that a user has admin privileges
 * @param {Object} req - Express request object
 * @throws {AuthenticationError|AuthorizationError} If user is not admin
 * @returns {Object} User object from request
 */
function requireAdmin(req) {
    const user = requireAuth(req);

    if (!user.isAdmin) {
        throw new AuthorizationError(ERROR_MESSAGES.ADMIN_REQUIRED);
    }

    return user;
}

/**
 * Logs successful operations for audit purposes
 * @param {string} operation - Operation performed
 * @param {Object} user - User who performed operation
 * @param {Object} details - Additional operation details
 */
function logOperation(operation, user = null, details = {}) {
    const logEntry = {
        operation,
        timestamp: new Date().toISOString(),
        userId: user?.userId || 'anonymous',
        username: user?.username || 'anonymous',
        ...details
    };

    console.log('Operation logged:', JSON.stringify(logEntry));
}

/**
 * Not found handler middleware for unmatched routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
    next(error);
}

module.exports = {
    // Error classes
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BusinessRuleError,
    ServiceUnavailableError,

    // Error handling functions
    getErrorStatusCode,
    formatErrorResponse,
    sanitizeErrorMessage,
    errorHandler,
    notFoundHandler,
    asyncHandler,

    // Response helpers
    sendSuccess,
    sendError,

    // Authentication helpers
    requireAuth,
    requireAdmin,

    // Logging
    logOperation
};