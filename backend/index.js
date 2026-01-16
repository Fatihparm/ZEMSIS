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
    const required = ['D', 's', 'cu', 'sigmaJet', 'Es', 'H', 'qtemel', 'FS'];
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
    const results = calculations.calculateAll(numericParams);

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

// Get default parameters
app.get('/api/defaults', (req, res) => {
  res.json({
    D: 0.8,           // Column diameter (m)
    s: 1.5,           // Column spacing (m)
    cu: 25,           // Undrained cohesion (kPa)
    sigmaJet: 5000,   // Jet grout strength (kPa)
    Es: 5000,         // Soil elastic modulus (kPa)
    H: 10,            // Column height (m)
    qtemel: 150,      // Foundation pressure (kPa)
    FS: 2.5,          // Factor of safety
    alpha: 0.5,       // Adhesion factor
    Nc: 9,            // Bearing capacity factor
    gammaRsb: 1.4,    // Partial factor for base resistance
    gammaRu: 1.4      // Partial factor for shaft resistance
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
