const { z } = require('zod');

// ── 1. Hesaplama Şemaları ────────────────────────────────────
const calculateSchema = z.object({
    parameters: z.object({
        D: z.coerce.number({ invalid_type_error: 'Kolon çapı (D) sayısal bir değer olmalıdır' }).positive('Kolon çapı (D) pozitif bir sayı olmalıdır'),
        s: z.coerce.number({ invalid_type_error: 'Kolon aralığı (s) sayısal bir değer olmalıdır' }).positive('Kolon aralığı (s) pozitif bir sayı olmalıdır'),
        cu: z.coerce.number({ invalid_type_error: 'Kohezyon (cu) sayısal bir değer olmalıdır' }).nonnegative('Kohezyon (cu) değeri negatif olamaz'),
        sigmaJet: z.coerce.number({ invalid_type_error: 'Jet Grout mukavemeti (sigmaJet) sayısal bir değer olmalıdır' }).positive('Jet Grout mukavemeti (sigmaJet) pozitif olmalıdır'),
        Es: z.coerce.number({ invalid_type_error: 'Zemin elastisite modülü (Es) sayısal bir değer olmalıdır' }).positive('Zemin elastisite modülü (Es) pozitif olmalıdır'),
        Ejg: z.coerce.number({ invalid_type_error: 'Jet Grout elastisite modülü (Ejg) sayısal bir değer olmalıdır' }).positive('Jet Grout elastisite modülü (Ejg) pozitif olmalıdır').optional().nullable(),
        H: z.coerce.number({ invalid_type_error: 'Kolon derinliği (H) sayısal bir değer olmalıdır' }).positive('Kolon derinliği (H) pozitif bir sayı olmalıdır'),
        qtemel: z.coerce.number({ invalid_type_error: 'Temel taban gerilmesi (qtemel) sayısal bir değer olmalıdır' }).nonnegative('Temel taban gerilmesi (qtemel) negatif olamaz'),
        Fs: z.coerce.number().positive().optional().default(2.0),
        FS: z.coerce.number().positive().optional(),
        FS_shaft: z.coerce.number().positive().optional(),
        FS_endbearing: z.coerce.number().positive().optional(),
        FS_improved: z.coerce.number().positive().optional(),
        alpha: z.coerce.number().positive().optional(),
        Nc: z.coerce.number().positive().optional(),
        qnet: z.coerce.number().optional().nullable(),
        EjgMultiplier: z.coerce.number().optional(),
        Hkazi: z.coerce.number().optional(),
        gamma: z.coerce.number().optional(),
        qtemelStatik: z.coerce.number().optional(),
        maxSettlementMm: z.coerce.number().optional(),
        maxSettlementCm: z.coerce.number().optional(),
    }, { required_error: 'Parametreler objesi zorunludur' }),
    lang: z.enum(['tr', 'en']).optional().default('tr')
});

const layerSchema = z.object({
    soilType: z.string().optional(),
    thickness: z.coerce.number().positive('Zemin tabaka kalınlığı pozitif olmalıdır'),
    gamma: z.coerce.number().positive('Birim hacim ağırlık (γ) pozitif olmalıdır'),
    phi: z.coerce.number().nonnegative('İçsel sürtünme açısı (φ) negatif olamaz'),
    cohesion: z.coerce.number().nonnegative('Kohezyon (c) değeri negatif olamaz'),
    elasticity: z.coerce.number().positive('Elastisite modülü (E) pozitif olmalıdır'),
    poisson: z.coerce.number().min(0, 'Poisson oranı (ν) negatif olamaz').max(0.5, 'Poisson oranı (ν) 0.5 değerini geçemez'),
});

const calculateLayersSchema = z.object({
    layers: z.array(layerSchema).min(1, 'En az 1 adet zemin tabakası girilmelidir')
});

// ── 2. Kullanıcı & Auth Şemaları ────────────────────────────
const registerSchema = z.object({
    email: z.string().email('Geçerli bir e-posta adresi giriniz'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
    fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
    role: z.enum(['user', 'municipal_officer']).optional().default('user'),
    municipality: z.string().nullable().optional()
}).refine(data => {
    if (data.role === 'municipal_officer' && (!data.municipality || data.municipality.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'Belediye personelleri için belediye adı zorunludur',
    path: ['municipality']
});

const loginSchema = z.object({
    email: z.string().email('Geçerli bir e-posta adresi giriniz'),
    password: z.string().min(1, 'Şifre alanı zorunludur')
});

// ── 3. Proje Şemaları ────────────────────────────────────────
const projectSchema = z.object({
    name: z.string().min(1, 'Proje adı zorunludur'),
    description: z.string().optional().default(''),
    parameters: z.record(z.any()),
    soilLayers: z.array(z.any()).optional().default([]),
    results: z.any().optional().nullable(),
    drawingData: z.any().optional().nullable(),
    extraParams: z.record(z.any()).optional().default({}),
    units: z.record(z.any()).optional().default({}),
    improvementMethod: z.enum(['jet_grout', 'stone_column', 'pile', 'dsm']).optional().default('jet_grout'),
});

// ── Kurşun Geçirmez Validation Middleware (Direct HTTP 400 Response) ──
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            const errors = err.issues || err.errors || [];
            const fieldErrors = errors.map(e => ({
                field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
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
    };
}

module.exports = {
    calculateSchema,
    calculateLayersSchema,
    registerSchema,
    loginSchema,
    projectSchema,
    validateBody
};
