require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const calculations = require('./calculations');
const { migrate } = require('./db');
const { router: authRouter } = require('./auth');
const projectsRouter = require('./projects');
const reportsRouter = require('./reports');
const applicationsRouter = require('./applications');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ────────────────────────────────────────
app.use(helmet());

// ── CORS — sadece izin verilen originlere ───────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Postman / curl gibi origin'siz isteklere izin ver (development)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// ── Rate Limiting ────────────────────────────────────────────
// Auth endpoint'leri için sıkı limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 20,                   // 15 dakikada en fazla 20 istek
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Hesaplama endpoint'leri için genel limit
const calcLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded.' }
});

// ── Auth & Project & Report & Application routes ─────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/calculate', calcLimiter);
app.use('/api/calculate-layers', calcLimiter);

// ── Rapor Doğrulama (public — auth gerektirmez) ──────────────
app.get('/api/verify/:code', async (req, res) => {
  try {
    const { pool } = require('./db');
    const code = (req.params.code || '').toUpperCase().trim();

    if (!code || !/^ZMS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Geçersiz doğrulama kodu formatı.' });
    }

    const result = await pool.query(
      `SELECT rv.code, rv.project_name, rv.created_at,
              p.name AS project_name_db, p.id AS project_id,
              u.full_name AS owner_name
       FROM report_verifications rv
       LEFT JOIN projects p ON p.id = rv.project_id
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Bu doğrulama koduna ait rapor bulunamadı. Belge değiştirilmiş veya geçersiz olabilir.',
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      valid: true,
      code: row.code,
      projectName: row.project_name_db || row.project_name || 'Bilinmiyor',
      ownerName: row.owner_name || 'Bilinmiyor',
      createdAt: row.created_at,
      message: 'Bu rapor ZEMSIS platformunda kayıtlı ve doğrulanmıştır.',
    });
  } catch (err) {
    console.error('Verify endpoint error:', err);
    res.status(500).json({ success: false, error: 'Doğrulama sırasında bir hata oluştu.' });
  }
});

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ZEMSIS API is running',
    version: '1.0.0'
  });
});

// ── Main calculation endpoint ───────────────────────────────
app.post('/api/calculate', (req, res) => {
  try {
    const { parameters } = req.body;

    const required = ['D', 's', 'cu', 'sigmaJet', 'Es', 'Ejg', 'H', 'qtemel', 'FS'];
    const missing = required.filter(param =>
      parameters[param] === undefined || parameters[param] === null || parameters[param] === ''
    );

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required parameters: ${missing.join(', ')}`
      });
    }

    const numericParams = {};
    for (const key in parameters) {
      numericParams[key] = parseFloat(parameters[key]);
      if (isNaN(numericParams[key])) {
        return res.status(400).json({
          success: false,
          error: `Invalid numeric value for parameter: ${key}`
        });
      }
    }

    const results = calculations.calculateAll(numericParams, req.body.lang || 'en');

    res.json({
      success: true,
      message: 'Calculation completed successfully',
      results
    });

  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Calculation failed: ' + error.message
    });
  }
});

// ── Soil layer profile calculation endpoint ─────────────────
app.post('/api/calculate-layers', (req, res) => {
  try {
    const { layers } = req.body;

    if (!layers || !Array.isArray(layers) || layers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one soil layer is required'
      });
    }

    const requiredFields = ['thickness', 'gamma', 'phi', 'cohesion', 'elasticity', 'poisson'];
    for (let i = 0; i < layers.length; i++) {
      const missing = requiredFields.filter(f =>
        layers[i][f] === undefined || layers[i][f] === null || layers[i][f] === ''
      );
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Layer ${i + 1}: Missing fields: ${missing.join(', ')}`
        });
      }
    }

    const results = calculations.calculateSoilProfile(layers);

    res.json({
      success: true,
      message: 'Soil profile calculation completed',
      results
    });

  } catch (error) {
    console.error('Layer calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Layer calculation failed: ' + error.message
    });
  }
});

// ── Get default parameters ──────────────────────────────────
app.get('/api/defaults', (req, res) => {
  res.json({
    D: 0.6,
    s: 1.6,
    cu: 45,
    sigmaJet: 3000,
    Es: 10000,
    Ejg: 450000,
    H: 12,
    qtemel: 120,
    qnet: 60,
    Fs: 2.0,
    FS: 1.5,
    alpha: 0.5,
    Nc: 5.14
  });
});

// ── Soil type defaults ──────────────────────────────────────
app.get('/api/soil-defaults', (req, res) => {
  res.json({
    kum:   { gamma: 17, phi: 35, cohesion: 5,    elasticity: 30000,  poisson: 0.25 },
    kil:   { gamma: 18, phi: 15, cohesion: 80,   elasticity: 25000,  poisson: 0.3  },
    silt:  { gamma: 19, phi: 28, cohesion: 10,   elasticity: 35000,  poisson: 0.25 },
    kaya:  { gamma: 22, phi: 15, cohesion: 3000, elasticity: 300000, poisson: 0.2  },
    cakil: { gamma: 20, phi: 40, cohesion: 0,    elasticity: 50000,  poisson: 0.2  }
  });
});

// ── Parameter info ──────────────────────────────────────────
app.get('/api/parameters', (req, res) => {
  res.json({
    geometry: [
      { key: 'D', label: 'Column Diameter', unit: 'm', description: 'Jet grout column diameter', min: 0.3, max: 3.0 },
      { key: 's', label: 'Column Spacing', unit: 'm', description: 'Grid spacing between columns', min: 0.5, max: 5.0 },
      { key: 'H', label: 'Column Height', unit: 'm', description: 'Treatment depth / column length', min: 1, max: 50 }
    ],
    soil: [
      { key: 'cu', label: 'Undrained Cohesion', unit: 'kPa', description: 'Soil undrained shear strength', min: 5, max: 200 },
      { key: 'Es', label: 'Soil Modulus', unit: 'kPa', description: 'Soil elastic modulus', min: 1000, max: 100000 }
    ],
    jetGrout: [
      { key: 'sigmaJet', label: 'Jet Grout Strength', unit: 'kPa', description: 'UCS of jet grout', min: 1000, max: 20000 }
    ],
    loading: [
      { key: 'qtemel', label: 'Foundation Pressure', unit: 'kPa', description: 'Applied foundation pressure', min: 50, max: 1000 }
    ],
    safety: [
      { key: 'FS', label: 'Factor of Safety', unit: '-', description: 'Global factor of safety', min: 1.5, max: 5.0 },
      { key: 'alpha', label: 'Adhesion Factor', unit: '-', description: 'Shaft adhesion factor', min: 0.3, max: 1.0 },
      { key: 'Nc', label: 'Bearing Capacity Factor', unit: '-', description: 'Nc factor', min: 5.14, max: 9 }
    ]
  });
});

// ── Start server ────────────────────────────────────────────
async function start() {
  try {
    await migrate();
    app.listen(PORT, () => {
      console.log(`🏗️  ZEMSIS API running at http://localhost:${PORT}`);
      console.log(`📊 Endpoints:`);
      console.log(`   GET  /api/health         - Health check`);
      console.log(`   POST /api/auth/register   - Register`);
      console.log(`   POST /api/auth/login      - Login`);
      console.log(`   GET  /api/auth/me         - Current user`);
      console.log(`   CRUD /api/projects        - Projects`);
      console.log(`   POST /api/calculate       - Perform calculations`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
