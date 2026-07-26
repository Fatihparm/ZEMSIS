const { z } = require('zod');

// ── 1. Calculation schemas ──────────────────────────────────
const calculateSchema = z.object({
    parameters: z.object({
        D: z.coerce.number({ invalid_type_error: 'D must be a number' }).positive('Column diameter (D) must be positive'),
        s: z.coerce.number({ invalid_type_error: 's must be a number' }).positive('Column spacing (s) must be positive'),
        cu: z.coerce.number({ invalid_type_error: 'cu must be a number' }).nonnegative('Cohesion (cu) must be non-negative'),
        sigmaJet: z.coerce.number({ invalid_type_error: 'sigmaJet must be a number' }).positive('Jet grout strength (sigmaJet) must be positive'),
        Es: z.coerce.number({ invalid_type_error: 'Es must be a number' }).positive('Soil elastic modulus (Es) must be positive'),
        Ejg: z.coerce.number({ invalid_type_error: 'Ejg must be a number' }).positive('Jet grout elastic modulus (Ejg) must be positive').optional().nullable(),
        H: z.coerce.number({ invalid_type_error: 'H must be a number' }).positive('Column height (H) must be positive'),
        qtemel: z.coerce.number({ invalid_type_error: 'qtemel must be a number' }).nonnegative('Foundation pressure (qtemel) must be non-negative'),
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
    }, { required_error: 'parameters object is required' }),
    lang: z.enum(['tr', 'en']).optional().default('tr')
});

const layerSchema = z.object({
    soilType: z.string().optional(),
    thickness: z.coerce.number().positive('Layer thickness must be positive'),
    gamma: z.coerce.number().positive('Unit weight (gamma) must be positive'),
    phi: z.coerce.number().nonnegative('Friction angle (phi) must be non-negative'),
    cohesion: z.coerce.number().nonnegative('Cohesion must be non-negative'),
    elasticity: z.coerce.number().positive('Elasticity modulus must be positive'),
    poisson: z.coerce.number().min(0, 'Poisson ratio cannot be negative').max(0.5, 'Poisson ratio cannot exceed 0.5'),
});

const calculateLayersSchema = z.object({
    layers: z.array(layerSchema).min(1, 'At least one soil layer is required')
});

// ── 2. Auth schemas ─────────────────────────────────────────
const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    role: z.enum(['user', 'municipal_officer']).optional().default('user'),
    municipality: z.string().nullable().optional()
}).refine(data => {
    if (data.role === 'municipal_officer' && (!data.municipality || data.municipality.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'Municipality is required for municipal officers',
    path: ['municipality']
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

// ── 3. Project schemas ──────────────────────────────────────
const projectSchema = z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional().default(''),
    parameters: z.record(z.any()),
    soilLayers: z.array(z.any()).optional().default([]),
    results: z.any().optional().nullable(),
    drawingData: z.any().optional().nullable(),
    extraParams: z.record(z.any()).optional().default({}),
    units: z.record(z.any()).optional().default({})
});

// ── Validation Middleware Factory ───────────────────────────
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            next(err);
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
