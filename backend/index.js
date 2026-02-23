const express = require('express');
const cors = require('cors');
const calculations = require('./calculations');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Jet-Grout-Calc API is running',
    version: '1.0.0'
  });
});

// Main calculation endpoint
app.post('/api/calculate', (req, res) => {
  try {
    const { parameters } = req.body;

    // Validate required parameters
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

    // Convert string inputs to numbers
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

    // Perform calculations
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

// Soil layer profile calculation endpoint
app.post('/api/calculate-layers', (req, res) => {
  try {
    const { layers } = req.body;

    // Validate layers array
    if (!layers || !Array.isArray(layers) || layers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one soil layer is required'
      });
    }

    // Validate each layer has required fields
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

    // Perform soil profile calculations
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

// Get default parameters
app.get('/api/defaults', (req, res) => {
  res.json({
    D: 0.6,           // Column diameter (m)
    s: 1.6,           // Column spacing (m)
    cu: 45,           // Undrained cohesion (kPa)
    sigmaJet: 3000,   // Jet grout strength (kPa) = 3 MPa
    Es: 10000,        // Soil elastic modulus (kPa) = 10 MPa
    Ejg: 450000,      // Jet grout elastic modulus (kPa) = 450 MPa
    H: 12,            // Column height (m)
    qtemel: 120,      // Foundation pressure (kPa)
    qnet: 60,         // Net pressure for settlement (kPa)
    Fs: 2.0,          // Material safety factor
    FS: 1.5,          // Bearing capacity factor of safety
    alpha: 0.5,       // Adhesion factor
    Nc: 5.14          // Bearing capacity factor (Skempton/Prandtl)
  });
});

// Get soil type default parameters (Mohr-Coulomb)
app.get('/api/soil-defaults', (req, res) => {
  res.json({
    kum: {
      gamma: 17,      // kN/m³ - Unit Weight
      phi: 35,        // ° - Friction Angle
      cohesion: 5,    // kPa - Cohesion
      elasticity: 30000,  // kN/m² - Elastic Modulus
      poisson: 0.25   // - Poisson's Ratio
    },
    kil: {
      gamma: 18,
      phi: 15,
      cohesion: 80,
      elasticity: 25000,
      poisson: 0.3
    },
    silt: {
      gamma: 19,
      phi: 28,
      cohesion: 10,
      elasticity: 35000,
      poisson: 0.25
    },
    kaya: {
      gamma: 22,
      phi: 15,
      cohesion: 3000,
      elasticity: 300000,
      poisson: 0.2
    }
  });
});

// Parameter info endpoint
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
      { key: 'sigmaJet', label: 'Jet Grout Strength', unit: 'kPa', description: 'Unconfined compressive strength of jet grout', min: 1000, max: 20000 }
    ],
    loading: [
      { key: 'qtemel', label: 'Foundation Pressure', unit: 'kPa', description: 'Applied foundation pressure', min: 50, max: 1000 }
    ],
    safety: [
      { key: 'FS', label: 'Factor of Safety', unit: '-', description: 'Global factor of safety', min: 1.5, max: 5.0 },
      { key: 'alpha', label: 'Adhesion Factor', unit: '-', description: 'Shaft adhesion factor (α)', min: 0.3, max: 1.0 },
      { key: 'Nc', label: 'Bearing Capacity Factor', unit: '-', description: 'Nc factor (typically 9 for clay)', min: 5.14, max: 9 }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🏗️  Jet-Grout-Calc API running at http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /api/health     - Health check`);
  console.log(`   GET  /api/defaults   - Default parameter values`);
  console.log(`   GET  /api/parameters - Parameter definitions`);
  console.log(`   POST /api/calculate  - Perform calculations`);
});
