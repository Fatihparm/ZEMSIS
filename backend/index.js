require('dotenv').config();

const express = require('express');
const cors = require('cors');
const calculations = require('./calculations');
const { migrate } = require('./db');
const { router: authRouter } = require('./auth');
const projectsRouter = require('./projects');
const reportsRouter = require('./reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── Auth & Project & Report routes ───────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/reports', reportsRouter);

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
    kum: { gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.25 },
    kil: { gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 },
    silt: { gamma: 19, phi: 28, cohesion: 10, elasticity: 35000, poisson: 0.25 },
    kaya: { gamma: 22, phi: 15, cohesion: 3000, elasticity: 300000, poisson: 0.2 }
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
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
