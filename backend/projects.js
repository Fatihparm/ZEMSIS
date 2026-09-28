const express = require('express');
const { pool } = require('./db');
const { authMiddleware } = require('./auth');
const { validateBody, projectSchema } = require('./schemas');

const router = express.Router();

// All project routes require authentication
router.use(authMiddleware);


// ── GET /api/projects — List user's projects ────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, improvement_method, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      projects: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        improvementMethod: row.improvement_method,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
});

// ── GET /api/projects/:id — Get single project ──────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, parameters, soil_layers, results,
              drawing_data, extra_params, units, improvement_method, created_at, updated_at
       FROM projects
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        soilLayers: row.soil_layers,
        results: row.results,
        drawingData: row.drawing_data,
        extraParams: row.extra_params,
        units: row.units,
        improvementMethod: row.improvement_method,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ success: false, error: 'Failed to get project' });
  }
});

// ── POST /api/projects — Create new project ─────────────────
router.post('/', validateBody(projectSchema), async (req, res, next) => {
  try {
    const { name, description, parameters, soilLayers, results, drawingData, extraParams, units, improvementMethod } = req.body;


    if (!name || !parameters) {
      return res.status(400).json({
        success: false,
        error: 'Project name and parameters are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, parameters, soil_layers, results, drawing_data, extra_params, units, improvement_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, description, improvement_method, created_at, updated_at`,
      [
        req.userId,
        name,
        description || '',
        JSON.stringify(parameters),
        JSON.stringify(soilLayers || []),
        results ? JSON.stringify(results) : null,
        drawingData ? JSON.stringify(drawingData) : null,
        JSON.stringify(extraParams || {}),
        JSON.stringify(units || {}),
        improvementMethod || 'jet_grout'
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        improvementMethod: row.improvement_method,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create project' });
  }
});

// ── PUT /api/projects/:id — Update existing project ─────────
// validateBody(projectSchema) — gelen veriyi Zod ile doğrula (POST gibi)
router.put('/:id', validateBody(projectSchema), async (req, res) => {
  try {
    const { name, description, parameters, soilLayers, results, drawingData, extraParams, units, improvementMethod } = req.body;

    // Sahiplik kontrolü + güncelleme tek sorguda — ayrı SELECT gereksiz
    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        parameters = COALESCE($3, parameters),
        soil_layers = COALESCE($4, soil_layers),
        results = COALESCE($5, results),
        drawing_data = COALESCE($6, drawing_data),
        extra_params = COALESCE($7, extra_params),
        units = COALESCE($8, units),
        improvement_method = COALESCE($9, improvement_method),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING id, name, description, improvement_method, updated_at`,
      [
        name || null,
        description !== undefined ? description : null,
        parameters ? JSON.stringify(parameters) : null,
        soilLayers ? JSON.stringify(soilLayers) : null,
        results ? JSON.stringify(results) : null,
        drawingData ? JSON.stringify(drawingData) : null,
        extraParams ? JSON.stringify(extraParams) : null,
        units ? JSON.stringify(units) : null,
        improvementMethod || null,
        req.params.id,
        req.userId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      project: {
        id: row.id,
        name: row.name,
        description: row.description,
        improvementMethod: row.improvement_method,
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// ── DELETE /api/projects/:id — Delete project ───────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

module.exports = router;
