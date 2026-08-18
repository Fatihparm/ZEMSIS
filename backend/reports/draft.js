'use strict';
/**
 * reports/draft.js
 *
 * Rapor taslakları ve görsel yükleme/sunma route handler'ları.
 *
 * Endpoint'ler:
 *   GET    /draft/:projectId
 *   PUT    /draft/:projectId
 *   POST   /images/:projectId
 *   GET    /images/:imageId
 *   DELETE /images/:imageId
 */

const express = require('express');
const { pool } = require('../db');

const router = express.Router({ mergeParams: true });

// ── GET /draft/:projectId ────────────────────────────────────────────────────
router.get('/draft/:projectId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sections FROM report_drafts WHERE project_id = $1 AND user_id = $2`,
      [req.params.projectId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, sections: null });
    }
    res.json({ success: true, sections: result.rows[0].sections });
  } catch (err) {
    console.error('Get draft error:', err);
    res.status(500).json({ success: false, error: 'Taslak getirilemedi' });
  }
});

// ── PUT /draft/:projectId ────────────────────────────────────────────────────
router.put('/draft/:projectId', async (req, res) => {
  try {
    const { sections } = req.body;

    if (!sections || typeof sections !== 'object') {
      return res.status(400).json({ success: false, error: 'Geçersiz sections verisi' });
    }

    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.projectId, req.userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }

    await pool.query(
      `INSERT INTO report_drafts (project_id, user_id, sections)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET sections = $3, updated_at = CURRENT_TIMESTAMP`,
      [req.params.projectId, req.userId, JSON.stringify(sections)]
    );

    res.json({ success: true, message: 'Taslak kaydedildi' });
  } catch (err) {
    console.error('Save draft error:', err);
    res.status(500).json({ success: false, error: 'Taslak kaydedilemedi' });
  }
});

// ── POST /images/:projectId ──────────────────────────────────────────────────
// Görsel yükle; base64 dataUrl kabul et, BYTEA olarak sakla, UUID döndür.
// Frontend canvas → dataUrl → buraya gönderir; JSONB'de büyük base64 blob kalmaz.
router.post('/images/:projectId', async (req, res) => {
  try {
    const { dataUrl, width, height, mimeType, name, caption, sectionKey } = req.body || {};

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'dataUrl gereklidir' });
    }

    // Projenin bu kullanıcıya ait olduğunu doğrula
    const check = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.projectId, req.userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
    }

    // base64 → binary buffer
    const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Geçersiz dataUrl formatı' });
    }
    const detectedMime = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    const result = await pool.query(
      `INSERT INTO report_images
         (project_id, user_id, section_key, data, mime_type, width, height, file_size, original_name, caption)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        req.params.projectId,
        req.userId,
        sectionKey || 'unknown',
        buffer,
        mimeType || detectedMime,
        Number(width) || 0,
        Number(height) || 0,
        buffer.length,
        name || null,
        caption || '',
      ]
    );

    const imageId = result.rows[0].id;
    res.json({ success: true, imageId });
  } catch (err) {
    // Tablo yoksa anlaşılır hata ver
    const isTableMissing = err.message && err.message.includes('relation "report_images" does not exist');
    console.error('Image upload error:', err.message);
    if (isTableMissing) {
      return res.status(500).json({
        success: false,
        error: 'Veritabanı migrasyonu henüz çalıştırılmadı. Lütfen "docker compose exec backend node migrate.js" komutunu çalıştırın.',
      });
    }
    res.status(500).json({ success: false, error: 'Görsel kaydedilemedi: ' + err.message });
  }
});

// ── GET /images/:imageId ─────────────────────────────────────────────────────
// Görsel binary'sini serve eder.
// ?token=... query param ile auth — tarayıcı native <img src> için.
router.get('/images/:imageId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT data, mime_type, user_id FROM report_images WHERE id = $1`,
      [req.params.imageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Görsel bulunamadı' });
    }

    const img = result.rows[0];

    // Kullanıcı kendi görseline erişiyor mu kontrol et
    if (img.user_id !== req.userId) {
      return res.status(403).json({ success: false, error: 'Bu görsele erişim izniniz yok' });
    }

    res.setHeader('Content-Type', img.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(img.data);
  } catch (err) {
    console.error('Image serve error:', err);
    res.status(500).json({ success: false, error: 'Görsel getirilemedi' });
  }
});

// ── DELETE /images/:imageId ──────────────────────────────────────────────────
// Görseli sil — sadece sahibi silebilir.
router.delete('/images/:imageId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM report_images WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.imageId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Görsel bulunamadı veya erişim izniniz yok' });
    }

    res.json({ success: true, message: 'Görsel silindi' });
  } catch (err) {
    console.error('Image delete error:', err);
    res.status(500).json({ success: false, error: 'Görsel silinemedi' });
  }
});

// ── fetchProjectImages ───────────────────────────────────────────────────────
/**
 * Bir projeye ait tüm görsel kayıtlarını DB'den çeker.
 * Dönen değer: { [imageId]: { buffer, mimeType, width, height, caption } }
 * buildReportDOCX bu haritayı getSectionImages'a geçirir.
 */
async function fetchProjectImages(projectId) {
  try {
    const result = await pool.query(
      `SELECT id, data, mime_type, width, height, caption FROM report_images WHERE project_id = $1`,
      [projectId]
    );
    const map = {};
    for (const row of result.rows) {
      map[row.id] = {
        buffer: row.data,
        mimeType: row.mime_type,
        width: row.width,
        height: row.height,
        caption: row.caption || '',
      };
    }
    return map;
  } catch (err) {
    console.error('fetchProjectImages error:', err.message);
    return {};
  }
}

module.exports = { router, fetchProjectImages };
