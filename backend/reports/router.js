'use strict';
/**
 * reports/router.js
 *
 * Ana rapor router'ı. Tüm /api/reports/* endpoint'lerini bir araya getirir:
 *   - Draft & Images  → ./draft
 *   - DOCX üretme     → POST /generate/:projectId
 *   - Başvuru raporu  → POST /generate-for-application/:applicationId
 */

const express = require('express');
const { pool } = require('../db');
const { authMiddleware, officerMiddleware } = require('../auth');
const { router: draftRouter, fetchProjectImages } = require('./draft');
const { generateVerifyCode } = require('./verifyCode');
const { buildReportDOCX, Packer } = require('./docxBuilder');

const router = express.Router();

// Tüm rapor endpoint'lerine auth zorunlu
router.use(authMiddleware);

// Draft & Images route'larını bağla
router.use('/', draftRouter);

// ── POST /api/reports/generate/:projectId ─────────────────────────────────────
router.post('/generate/:projectId', async (req, res) => {
  try {
    const projectResult = await pool.query(
      `SELECT id, name, description, parameters, soil_layers, results
       FROM projects WHERE id = $1 AND user_id = $2`,
      [req.params.projectId, req.userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }

    const project = projectResult.rows[0];
    const lockedParams = project.parameters || {};
    const lockedResults = project.results || null;

    if (!lockedResults) {
      return res.status(400).json({
        success: false,
        error: 'Hesaplama sonuçları bulunamadı. Lütfen önce hesaplama yapın.',
      });
    }

    const draftResult = await pool.query(
      `SELECT sections FROM report_drafts WHERE project_id = $1 AND user_id = $2`,
      [req.params.projectId, req.userId]
    );
    const sections = draftResult.rows.length > 0 ? draftResult.rows[0].sections : {};

    // Doğrulama kodu üret ve DB'ye kaydet
    const verifyCode = generateVerifyCode(project.id);
    try {
      await pool.query(
        `INSERT INTO report_verifications (code, project_id, user_id, project_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        [verifyCode, project.id, req.userId, project.name || null]
      );
    } catch (verifyErr) {
      console.warn('Verify code kayıt hatası (rapor yine de oluşturulacak):', verifyErr.message);
    }

    // report_images tablosundan bu projeye ait tüm görselleri önceden çek
    const dbImages = await fetchProjectImages(req.params.projectId);

    const doc = buildReportDOCX({ project, lockedParams, lockedResults, sections, verifyCode, dbImages });
    const docxBuffer = await Packer.toBuffer(doc);

    const safeName = (project.name || 'rapor')
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}_JG_Raporu.docx`
    );
    res.send(docxBuffer);
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ success: false, error: 'Rapor oluşturulamadı: ' + err.message });
  }
});

// ── POST /api/reports/generate-for-application/:applicationId ─────────────────
// Belediye personelinin bir başvuruya ait projenin raporunu oluşturmasını sağlar.
// Hem başvuran sahibi hem de yetkili belediye personeli bu endpoint'e erişebilir.
router.post('/generate-for-application/:applicationId', async (req, res) => {
  try {
    // Başvuruyu ve ilgili projeyi getir
    const appResult = await pool.query(
      `SELECT
         a.id, a.municipality, a.status, a.user_id,
         p.id AS project_id, p.name AS project_name, p.description,
         p.parameters, p.soil_layers, p.results,
         u.full_name AS applicant_name, u.email AS applicant_email
       FROM project_applications a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [req.params.applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Başvuru bulunamadı' });
    }

    const row = appResult.rows[0];

    // Erişim kontrolü: başvuran sahibi veya yetkili belediye personeli
    const isOwner = row.user_id === req.userId;
    const isOfficer = req.userRole === 'municipal_officer';

    if (!isOwner && !isOfficer) {
      return res.status(403).json({ success: false, error: 'Bu rapora erişim izniniz yok' });
    }

    // Officer ise kendi belediyesine ait mi kontrol et
    if (isOfficer && !isOwner) {
      const officerResult = await pool.query(
        'SELECT municipality FROM users WHERE id = $1',
        [req.userId]
      );
      const officerMunicipality = officerResult.rows[0]?.municipality;
      if (officerMunicipality && officerMunicipality !== row.municipality) {
        return res.status(403).json({ success: false, error: 'Bu başvuru kendi belediyenize ait değil' });
      }
    }

    const project = {
      id: row.project_id,
      name: row.project_name,
      description: row.description,
    };

    const lockedParams = row.parameters || {};
    const lockedResults = row.results || null;

    if (!lockedResults) {
      return res.status(400).json({
        success: false,
        error: 'Bu proje için hesaplama sonuçları bulunamadı. Başvuru sahibi henüz hesaplama yapmamış olabilir.',
      });
    }

    // Başvuran kullanıcının kaydettiği rapor taslağını getir (varsa)
    const draftResult = await pool.query(
      `SELECT sections FROM report_drafts WHERE project_id = $1 AND user_id = $2`,
      [row.project_id, row.user_id]
    );
    const sections = draftResult.rows.length > 0 ? draftResult.rows[0].sections : {};

    // Doğrulama kodu üret ve DB'ye kaydet
    const verifyCode = generateVerifyCode(project.id);
    try {
      await pool.query(
        `INSERT INTO report_verifications (code, project_id, user_id, project_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        [verifyCode, project.id, row.user_id, project.name || null]
      );
    } catch (verifyErr) {
      console.warn('Verify code kayıt hatası (rapor yine de oluşturulacak):', verifyErr.message);
    }

    // report_images tablosundan bu projeye ait tüm görselleri önceden çek
    const dbImages = await fetchProjectImages(row.project_id);

    const doc = buildReportDOCX({ project, lockedParams, lockedResults, sections, verifyCode, dbImages });
    const docxBuffer = await Packer.toBuffer(doc);

    const safeName = (project.name || 'rapor')
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}_JG_Raporu.docx`
    );
    res.send(docxBuffer);
  } catch (err) {
    console.error('Generate report for application error:', err);
    res.status(500).json({ success: false, error: 'Rapor oluşturulamadı: ' + err.message });
  }
});

module.exports = router;
