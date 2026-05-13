const express = require('express');
const { pool } = require('./db');
const { authMiddleware } = require('./auth');
const HTMLtoDOCX = require('html-to-docx');

const router = express.Router();

// Tüm rapor endpoint'leri authentication gerektirir
router.use(authMiddleware);

// ── GET /api/reports/draft/:projectId ──────────────────────────
// Kayıtlı taslağı getir
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

// ── PUT /api/reports/draft/:projectId ──────────────────────────
// Editör içeriğini taslak olarak kaydet
router.put('/draft/:projectId', async (req, res) => {
  try {
    const { sections } = req.body;

    if (!sections || typeof sections !== 'object') {
      return res.status(400).json({ success: false, error: 'Geçersiz sections verisi' });
    }

    // Proje sahipliğini doğrula
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

// ── POST /api/reports/generate/:projectId ──────────────────────
// Nihai .docx raporunu oluştur ve indir
// GÜVENLİK: Kilitli veriler (parameters, results) YALNIZCA DB'den alınır.
// Frontend'den gelen hiçbir hesaplama değeri rapora dahil edilmez.
router.post('/generate/:projectId', async (req, res) => {
  try {
    // 1. Proje sahipliği doğrula ve kilitli verileri çek
    const projectResult = await pool.query(
      `SELECT name, description, parameters, soil_layers, results
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
        error: 'Hesaplama sonuçları bulunamadı. Lütfen önce hesaplama yapın.'
      });
    }

    // 2. Kullanıcının editör içeriğini (taslak) çek
    const draftResult = await pool.query(
      `SELECT sections FROM report_drafts WHERE project_id = $1 AND user_id = $2`,
      [req.params.projectId, req.userId]
    );
    const sections = draftResult.rows.length > 0 ? draftResult.rows[0].sections : {};

    // 3. HTML raporu oluştur (kilitli veriler doğrudan DB'den)
    const html = buildReportHTML({ project, lockedParams, lockedResults, sections });

    // 4. HTML → DOCX dönüşümü
    const docxBuffer = await HTMLtoDOCX(html, null, {
      title: project.name || 'Geoteknik Rapor',
      orientation: 'portrait',
      pageSize: { width: 12240, height: 15840 }, // A4
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
      font: 'Times New Roman',
      fontSize: 24, // 12pt (half-points)
      complexScriptFontSize: 24,
    });

    // 5. Dosyayı stream et
    const safeName = (project.name || 'rapor')
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-_]/g, '')
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

// ── HTML Rapor Oluşturma ────────────────────────────────────────
function buildReportHTML({ project, lockedParams, lockedResults, sections }) {
  const date = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const paramTableRows = buildParamRows(lockedParams);
  const resultSections = buildResultSections(lockedResults);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 6pt; }
    h2 { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #000; margin-top: 18pt; margin-bottom: 8pt; padding-bottom: 3pt; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
    p { text-align: justify; margin: 0 0 8pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 11pt; }
    th, td { border: 1px solid #333; padding: 5pt 8pt; vertical-align: middle; }
    th { background-color: #d9d9d9; text-align: center; font-weight: bold; }
    td.num { text-align: right; font-family: 'Courier New', monospace; }
    td.center { text-align: center; }
    .cover-block { margin: 20pt auto; width: 80%; }
    .cover-block table { border: 1px solid #000; }
    .cover-block td { padding: 6pt 10pt; border: 1px solid #ccc; }
    .cover-label { font-weight: bold; width: 40%; }
    .locked-notice {
      background: #fff8e1;
      border-left: 4px solid #f59e0b;
      padding: 6pt 10pt;
      font-size: 10pt;
      font-style: italic;
      margin: 8pt 0;
    }
    .divider { border: none; border-top: 1px solid #999; margin: 16pt 0; }
    .page-break { page-break-after: always; }
    .header-logo { text-align: right; font-size: 10pt; color: #555; margin-bottom: 10pt; }
    .title-block {
      text-align: center;
      border: 2px solid #000;
      padding: 20pt;
      margin-bottom: 20pt;
    }
    .subtitle { text-align: center; font-size: 13pt; margin-top: 4pt; }
    .doc-info { text-align: center; font-size: 10pt; color: #555; margin-top: 8pt; }
  </style>
</head>
<body>

<!-- ═══════════════ KAPAK SAYFASI ═══════════════ -->
<div class="title-block">
  <p style="font-size:11pt; margin:0; letter-spacing:2px;">ZEMİN MEKANİĞİ VE GEOTEKNİK</p>
  <h1>JET GROUT ZEMİN İYİLEŞTİRMESİ<br>GEOTEKNİK HESAP RAPORU</h1>
  <p class="subtitle">${esc(sections.projectName || project.name || '')}</p>
  <p class="doc-info">ZEMSIS Mühendislik Yazılımı ile Hazırlanmıştır</p>
</div>

<div class="cover-block">
  <table>
    <tr><td class="cover-label">Proje Adı</td><td>${esc(sections.projectName || project.name || '')}</td></tr>
    <tr><td class="cover-label">İşveren / İdare</td><td>${esc(sections.employer || '')}</td></tr>
    <tr><td class="cover-label">Proje Yeri / İl</td><td>${esc(sections.location || '')}</td></tr>
    <tr><td class="cover-label">Hazırlayan Kuruluş</td><td>${esc(sections.preparedBy || '')}</td></tr>
    <tr><td class="cover-label">Sorumlu Mühendis</td><td>${esc(sections.engineer || '')}</td></tr>
    <tr><td class="cover-label">Rapor Tarihi</td><td>${date}</td></tr>
    <tr><td class="cover-label">Revizyon No</td><td>${esc(sections.revision || '0')}</td></tr>
    <tr><td class="cover-label">Belge No</td><td>${esc(sections.docNumber || '')}</td></tr>
  </table>
</div>

<div class="page-break"></div>

<!-- ═══════════════ İÇİNDEKİLER ═══════════════ -->
<h2>İÇİNDEKİLER</h2>
<table style="border:none;">
  <tr style="border:none;"><td style="border:none; width:60%;">1. Giriş ve Kapsam</td><td style="border:none; text-align:right;">3</td></tr>
  <tr style="border:none;"><td style="border:none;">2. Arazi ve Laboratuvar Çalışmaları</td><td style="border:none; text-align:right;">3</td></tr>
  <tr style="border:none;"><td style="border:none;">3. Zemin Profili ve Mühendislik Özellikleri</td><td style="border:none; text-align:right;">4</td></tr>
  <tr style="border:none;"><td style="border:none;">4. Jet Grout Tasarım Parametreleri</td><td style="border:none; text-align:right;">5</td></tr>
  <tr style="border:none;"><td style="border:none;">5. Hesaplama Sonuçları</td><td style="border:none; text-align:right;">6</td></tr>
  <tr style="border:none;"><td style="border:none;">6. Değerlendirme ve Öneriler</td><td style="border:none; text-align:right;">8</td></tr>
  <tr style="border:none;"><td style="border:none;">7. Sonuç</td><td style="border:none; text-align:right;">9</td></tr>
</table>

<div class="page-break"></div>

<!-- ═══════════════ 1. GİRİŞ ═══════════════ -->
<h2>1. GİRİŞ VE KAPSAM</h2>
${sections.intro || '<p><em>[Bu alan kullanıcı tarafından doldurulacaktır.]</em></p>'}

<!-- ═══════════════ 2. ARAZİ ÇALIŞMALARI ═══════════════ -->
<h2>2. ARAZİ VE LABORATUVAR ÇALIŞMALARI</h2>
${sections.fieldwork || '<p><em>[Bu alan kullanıcı tarafından doldurulacaktır.]</em></p>'}

<!-- ═══════════════ 3. ZEMİN PROFİLİ ═══════════════ -->
<h2>3. ZEMİN PROFİLİ VE MÜHENDİSLİK ÖZELLİKLERİ</h2>
${sections.soilProfile || '<p><em>[Bu alan kullanıcı tarafından doldurulacaktır.]</em></p>'}

<!-- ═══════════════ 4. JET GROUT PARAMETRELERİ (KİLİTLİ) ═══════════════ -->
<h2>4. JET GROUT TASARIM PARAMETRELERİ</h2>
<div class="locked-notice">
  ⚠ Aşağıdaki değerler ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.
  Bu değerler kullanıcı tarafından değiştirilemez.
</div>
<table>
  <tr>
    <th style="width:55%;">Parametre</th>
    <th style="width:25%;">Değer</th>
    <th style="width:20%;">Birim</th>
  </tr>
  ${paramTableRows}
</table>

<!-- ═══════════════ 5. HESAPLAMA SONUÇLARI (KİLİTLİ) ═══════════════ -->
<h2>5. HESAPLAMA SONUÇLARI</h2>
<div class="locked-notice">
  ⚠ Aşağıdaki sonuçlar ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.
  Bu değerler kullanıcı tarafından değiştirilemez.
</div>
${resultSections}

<!-- ═══════════════ 6. DEĞERLENDİRME ═══════════════ -->
<h2>6. DEĞERLENDİRME VE ÖNERİLER</h2>
${sections.conclusions || '<p><em>[Bu alan kullanıcı tarafından doldurulacaktır.]</em></p>'}

<!-- ═══════════════ 7. SONUÇ ═══════════════ -->
<h2>7. SONUÇ</h2>
<p>
  Bu rapor, ZEMSIS Geoteknik Mühendislik Yazılımı (v1.0) kullanılarak
  ${date} tarihinde hazırlanmıştır. Sunulan hesaplama sonuçları, girdi
  parametrelerine bağlı olup uygulama aşamasında yetkili bir geoteknik mühendisi
  tarafından yerinde koşullar göz önünde bulundurularak gözden geçirilmesi tavsiye edilir.
</p>
${sections.additionalNotes ? `<h3>Ek Notlar</h3>${sections.additionalNotes}` : ''}

<hr class="divider">
<p style="font-size:9pt; text-align:center; color:#555; margin-top:20pt;">
  ZEMSIS © ${new Date().getFullYear()} — Bu belge elektronik olarak üretilmiştir. —
  Proje ID: ${sections.docNumber || 'N/A'} — Tarih: ${date}
</p>

</body>
</html>`;
}

// ── Yardımcı fonksiyonlar ────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  // Büyük tam sayılar için decimal gösterme
  if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString('tr-TR');
  return n.toFixed(3);
}

function buildParamRows(p) {
  if (!p || typeof p !== 'object') return '<tr><td colspan="3">Parametre verisi yok.</td></tr>';

  const paramDefs = [
    { label: 'Kolon Çapı (D)', key: 'D', unit: 'm' },
    { label: 'Kolon Aralığı (s)', key: 's', unit: 'm' },
    { label: 'Kolon Yüksekliği (H)', key: 'H', unit: 'm' },
    { label: 'Drenajsız Kohezyon (cu)', key: 'cu', unit: 'kPa' },
    { label: 'Zemin Elastisite Modülü (Es)', key: 'Es', unit: 'kPa' },
    { label: 'Aderans Faktörü (α)', key: 'alpha', unit: '-' },
    { label: 'Taşıma Kapasitesi Katsayısı (Nc)', key: 'Nc', unit: '-' },
    { label: 'Jet Grout Dayanımı (σ<sub>jet</sub>)', key: 'sigmaJet', unit: 'kPa' },
    { label: 'Jet Grout Elastisite Modülü (E<sub>jg</sub>)', key: 'Ejg', unit: 'kPa' },
    { label: 'Temel Basıncı (q<sub>temel</sub>)', key: 'qtemel', unit: 'kPa' },
    { label: 'Net Basınç (q<sub>net</sub>)', key: 'qnet', unit: 'kPa' },
    { label: 'Malzeme Güvenlik Faktörü (Fs)', key: 'Fs', unit: '-' },
    { label: 'Taşıma Kap. Güvenlik Faktörü (FS)', key: 'FS', unit: '-' },
  ];

  return paramDefs
    .filter(d => p[d.key] !== undefined && p[d.key] !== null)
    .map(d => `<tr>
      <td>${d.label}</td>
      <td class="num">${fmtNum(p[d.key])}</td>
      <td class="center">${d.unit}</td>
    </tr>`)
    .join('');
}

const CATEGORY_LABELS = {
  geometry: 'Geometri Sonuçları',
  material: 'Malzeme Parametreleri',
  capacity: 'Taşıma Kapasitesi',
  improvedSoil: 'İyileştirilmiş Zemin Özellikleri',
  settlement: 'Oturma Hesapları',
};

function buildResultSections(results) {
  if (!results || typeof results !== 'object') {
    return '<p>Hesaplama sonuçları mevcut değil. Lütfen hesaplama yapın.</p>';
  }

  return Object.entries(results).map(([cat, items]) => {
    if (!items || typeof items !== 'object') return '';
    const label = CATEGORY_LABELS[cat] || cat;

    const rows = Object.entries(items).map(([key, item]) => {
      const val = typeof item === 'object' && item !== null ? item.value : item;
      const unit = typeof item === 'object' && item !== null ? (item.unit || '-') : '-';
      const label = typeof item === 'object' && item !== null ? (item.label || key) : key;
      return `<tr>
        <td>${esc(label)}</td>
        <td class="num">${fmtNum(val)}</td>
        <td class="center">${esc(unit)}</td>
      </tr>`;
    }).join('');

    return `
<h3>${esc(label)}</h3>
<table>
  <tr>
    <th style="width:55%;">Parametre</th>
    <th style="width:25%;">Değer</th>
    <th style="width:20%;">Birim</th>
  </tr>
  ${rows}
</table>`;
  }).join('');
}

module.exports = router;
