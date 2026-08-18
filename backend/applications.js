const express = require('express');
const { pool } = require('./db');
const { authMiddleware, officerMiddleware } = require('./auth');

const router = express.Router();

// Tüm route'lar authentication gerektiriyor
router.use(authMiddleware);

const VALID_MUNICIPALITIES = [
  'Bursa Büyükşehir Belediyesi',
  'Osmangazi Belediyesi',
  'Nilüfer Belediyesi',
  'Kestel Belediyesi',
];

// ── POST /api/applications ─────────────────────────────────────
// Kullanıcı bir projesini belediyeye başvurur.
// Bir proje sadece bir belediyeye başvurulabilir (UNIQUE project_id).
router.post('/', async (req, res) => {
  try {
    const { projectId, municipality } = req.body;

    if (!projectId || !municipality) {
      return res.status(400).json({ success: false, error: 'projectId ve municipality zorunlu' });
    }

    if (!VALID_MUNICIPALITIES.includes(municipality)) {
      return res.status(400).json({ success: false, error: 'Geçersiz belediye seçimi' });
    }

    // Projenin bu kullanıcıya ait olup olmadığını doğrula
    const projectCheck = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.userId]
    );
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }

    // Daha önce başvuru yapılmış mı?
    const existing = await pool.query(
      'SELECT id, status FROM project_applications WHERE project_id = $1',
      [projectId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Bu proje için zaten başvuru yapılmış',
        application: existing.rows[0]
      });
    }

    const result = await pool.query(
      `INSERT INTO project_applications (project_id, user_id, municipality)
       VALUES ($1, $2, $3)
       RETURNING id, project_id, municipality, status, applied_at`,
      [projectId, req.userId, municipality]
    );

    res.status(201).json({ success: true, application: result.rows[0] });
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ success: false, error: 'Başvuru oluşturulamadı' });
  }
});

// ── GET /api/applications/my ──────────────────────────────────
// Kullanıcının kendi tüm başvurularını listeler.
router.get('/my', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.municipality, a.status, a.rejection_note,
         a.applied_at, a.reviewed_at,
         p.id AS project_id, p.name AS project_name
       FROM project_applications a
       JOIN projects p ON p.id = a.project_id
       WHERE a.user_id = $1
       ORDER BY a.applied_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      applications: result.rows.map(r => ({
        id:             r.id,
        municipality:   r.municipality,
        status:         r.status,
        rejectionNote:  r.rejection_note,
        appliedAt:      r.applied_at,
        reviewedAt:     r.reviewed_at,
        projectId:      r.project_id,
        projectName:    r.project_name,
      }))
    });
  } catch (err) {
    console.error('List my applications error:', err);
    res.status(500).json({ success: false, error: 'Başvurular listelenemedi' });
  }
});

// ── GET /api/applications/municipality ────────────────────────
// Sadece municipal_officer — kendi belediyesine gelen başvurular.
// Officer'ın municipality bilgisi JWT payload'ından (req.userMunicipality) alınır.
router.get('/municipality', officerMiddleware, async (req, res) => {
  try {
    // JWT'den al — ayrı DB sorgusu gereksiz
    const officerMunicipality = req.userMunicipality;
    if (!officerMunicipality) {
      return res.status(400).json({ success: false, error: 'Bu hesabın belediye bilgisi yok' });
    }

    const result = await pool.query(
      `SELECT
         a.id, a.municipality, a.status, a.rejection_note,
         a.applied_at, a.reviewed_at,
         p.id AS project_id, p.name AS project_name,
         u.full_name AS applicant_name, u.email AS applicant_email
       FROM project_applications a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = a.user_id
       WHERE a.municipality = $1
       ORDER BY a.applied_at DESC`,
      [officerMunicipality]
    );

    res.json({
      success: true,
      municipality: officerMunicipality,
      applications: result.rows.map(r => ({
        id:             r.id,
        municipality:   r.municipality,
        status:         r.status,
        rejectionNote:  r.rejection_note,
        appliedAt:      r.applied_at,
        reviewedAt:     r.reviewed_at,
        projectId:      r.project_id,
        projectName:    r.project_name,
        applicantName:  r.applicant_name,
        applicantEmail: r.applicant_email,
      }))
    });
  } catch (err) {
    console.error('List municipality applications error:', err);
    res.status(500).json({ success: false, error: 'Başvurular listelenemedi' });
  }
});

// ── GET /api/applications/:id ─────────────────────────────────
// Başvuru detayı — proje tüm verileriyle birlikte döner.
// Kullanıcı kendi başvurusunu, officer belediyesine gelen başvuruyu görebilir.
router.get('/:id', async (req, res) => {
  try {
    const appResult = await pool.query(
      `SELECT
         a.id, a.municipality, a.status, a.rejection_note,
         a.applied_at, a.reviewed_at,
         a.user_id,
         p.id AS project_id, p.name AS project_name, p.description,
         p.parameters, p.soil_layers, p.results, p.extra_params, p.units,
         u.full_name AS applicant_name, u.email AS applicant_email
       FROM project_applications a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Başvuru bulunamadı' });
    }

    const row = appResult.rows[0];

    // Erişim kontrolü: ya başvuranın kendisi ya da yetkili officer
    const isOwner = row.user_id === req.userId;
    const isOfficer = req.userRole === 'municipal_officer';

    if (!isOwner && !isOfficer) {
      return res.status(403).json({ success: false, error: 'Bu başvuruya erişim izniniz yok' });
    }

    // Officer ise kendi belediyesine ait mi kontrol et — JWT'den al
    if (isOfficer && !isOwner) {
      const officerMunicipality = req.userMunicipality;
      if (officerMunicipality && officerMunicipality !== row.municipality) {
        return res.status(403).json({ success: false, error: 'Bu başvuru kendi belediyenize ait değil' });
      }
    }

    res.json({
      success: true,
      application: {
        id:             row.id,
        municipality:   row.municipality,
        status:         row.status,
        rejectionNote:  row.rejection_note,
        appliedAt:      row.applied_at,
        reviewedAt:     row.reviewed_at,
        applicantName:  row.applicant_name,
        applicantEmail: row.applicant_email,
        project: {
          id:          row.project_id,
          name:        row.project_name,
          description: row.description,
          parameters:  row.parameters,
          soilLayers:  row.soil_layers,
          results:     row.results,
          extraParams: row.extra_params,
          units:       row.units,
        }
      }
    });
  } catch (err) {
    console.error('Get application detail error:', err);
    res.status(500).json({ success: false, error: 'Başvuru detayı getirilemedi' });
  }
});

// ── PATCH /api/applications/:id/review ────────────────────────
// Sadece municipal_officer — başvuruyu onayla veya reddet.
router.patch('/:id/review', officerMiddleware, async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: "action 'approve' veya 'reject' olmalı" });
    }

    if (action === 'reject' && (!note || note.trim().length < 5)) {
      return res.status(400).json({ success: false, error: 'Red gerekçesi en az 5 karakter olmalı' });
    }

    // JWT'den al — ayrı DB sorgusu gereksiz
    const officerMunicipality = req.userMunicipality;

    // Başvuruyu bul ve belediye kontrolü yap
    const appResult = await pool.query(
      'SELECT id, status, municipality FROM project_applications WHERE id = $1',
      [req.params.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Başvuru bulunamadı' });
    }

    const app = appResult.rows[0];

    if (officerMunicipality && app.municipality !== officerMunicipality) {
      return res.status(403).json({ success: false, error: 'Bu başvuru kendi belediyenize ait değil' });
    }

    if (app.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Bu başvuru zaten değerlendirilmiş' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updated = await pool.query(
      `UPDATE project_applications
       SET status = $1,
           rejection_note = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $3
       WHERE id = $4
       RETURNING id, status, reviewed_at`,
      [newStatus, action === 'reject' ? note.trim() : null, req.userId, req.params.id]
    );

    res.json({ success: true, application: updated.rows[0] });
  } catch (err) {
    console.error('Review application error:', err);
    res.status(500).json({ success: false, error: 'Değerlendirme kaydedilemedi' });
  }
});

module.exports = router;
