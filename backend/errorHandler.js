const { ZodError } = require('zod');

/**
 * Express Global Error Handling Middleware
 * Standardizes API error responses and prevents sensitive stack leaks in production.
 */
function errorHandler(err, req, res, next) {
    // 1. Zod Validation Errors
    if (err instanceof ZodError) {
        const fieldErrors = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));

        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: fieldErrors.map(f => f.message).join('; '),
            details: fieldErrors
        });
    }

    // 2. Custom Application Operational Errors (with statusCode)
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message || 'Error occurred'
        });
    }

    // 3. Syntax / JSON Parse Error from Body Parser
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON payload'
        });
    }

    // 4. CORS Error
    if (err.message === 'CORS policy violation') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy violation: Origin not allowed'
        });
    }

    // 5. Unexpected / System 500 Errors
    console.error('🔥 [Unhandled Error]:', err);

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        success: false,
        error: isProduction ? 'Internal Server Error' : err.message
    });
}

module.exports = errorHandler;
