const { ZodError } = require('zod');

/**
 * Express Global Hata Yönetimi Middleware'i (Global Error Handler)
 * Tüm API hatalarını Türkçe mesajlarla standartlaştırır.
 */
function errorHandler(err, req, res, next) {
    // 1. Zod Doğrulama Hataları (Validation Errors)
    if (err instanceof ZodError) {
        const fieldErrors = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));

        const combinedMessage = fieldErrors.map(f => f.message).join('; ');

        return res.status(400).json({
            success: false,
            error: combinedMessage || 'Doğrulama Hatası',
            message: combinedMessage,
            details: fieldErrors
        });
    }

    // 2. Özel Uygulama İçi Hatalar (statusCode tanımlı)
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message || 'İşlem gerçekleştirilemedi'
        });
    }

    // 3. Geçersiz JSON Body Hataları
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Geçersiz JSON verisi gönderildi'
        });
    }

    // 4. CORS Politikası İhlali
    if (err.message === 'CORS policy violation') {
        return res.status(403).json({
            success: false,
            error: 'CORS Güvenlik İhlali: Bu alan adından istek atılamaz'
        });
    }

    // 5. Beklenmeyen Sunucu (500) Hataları
    console.error('🔥 [Unhandled Error]:', err);

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        success: false,
        error: isProduction ? 'Sunucuda beklenmeyen bir hata oluştu' : err.message
    });
}

module.exports = errorHandler;
