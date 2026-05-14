const express = require('express');
const { pool } = require('./db');
const { authMiddleware } = require('./auth');
const HTMLtoDOCX = require('html-to-docx');

const router = express.Router();

// Tüm rapor endpoint'leri authentication gerektirir
router.use(authMiddleware);

// GET /api/reports/draft/:projectId
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

// PUT /api/reports/draft/:projectId
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

// POST /api/reports/generate/:projectId
// Nihai .docx raporunu oluştur ve indir
// GÜVENLİK: Kilitli veriler (parameters, results) YALNIZCA DB'den alınır.
// Frontend'den gelen hiçbir hesaplama değeri rapora dahil edilmez.
router.post('/generate/:projectId', async (req, res) => {
  try {
    // 1. Proje sahipliğini doğrula ve kilitli verileri çek
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
        error: 'Hesaplama sonuçları bulunamadı. Lütfen önce hesaplama yapın.',
      });
    }

    // 2. Kullanıcının editör içeriğini (taslak) çek
    const draftResult = await pool.query(
      `SELECT sections FROM report_drafts WHERE project_id = $1 AND user_id = $2`,
      [req.params.projectId, req.userId]
    );
    const sections = draftResult.rows.length > 0 ? draftResult.rows[0].sections : {};

    // 3. HTML raporu oluştur
    let html = buildReportHTML({ project, lockedParams, lockedResults, sections });

    // TEMİZLİK: MS Word'den kopyala-yapıştır yapıldığında gelen geçersiz namespace'leri temizle
    // (html-to-docx xmlbuilder2 hatasını önlemek için: "Invalid XML name: @w")
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    html = html.replace(/<[^>]+>/g, (tag) => {
      if (/^<\/?(?:[a-zA-Z0-9_-]+):/.test(tag)) {
        return '';
      }
      let cleaned = tag.replace(/\s+[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+(?:=(?:'[^']*'|"[^"]*"|[^\s>]+))?/gi, '');
      cleaned = cleaned.replace(/\s+@[a-zA-Z0-9_-]+(?:=(?:'[^']*'|"[^"]*"|[^\s>]+))?/gi, '');
      return cleaned;
    });

    // 4. HTML → DOCX dönüşümü
    const docxBuffer = await HTMLtoDOCX(html, null, {
      title: project.name || 'Geoteknik Rapor',
      orientation: 'portrait',
      pageSize: { width: 12240, height: 15840 },
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1800, header: 720, footer: 720, gutter: 0 },
      font: 'Times New Roman',
      fontSize: 24,
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

// HTML Rapor Oluşturma
function buildReportHTML({ project, lockedParams, lockedResults, sections }) {
  const date = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getSection = (key, fallback = '') => {
    const value = sections?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  const projectName = sections?.projectName || project?.name || 'Jet Grout Zemin İyileştirme Projesi';
  const projectLocation = sections?.location || project?.description || '';
  const reportNumber = sections?.docNumber || '';
  const preparedBy = sections?.preparedBy || 'ZEMSIS Mühendislik Yazılımı';
  const engineer = sections?.engineer || '';
  const employer = sections?.employer || '';
  const revision = sections?.revision || '0';

  const defaultIntro = `
    <p>Söz konusu rapor, ${esc(projectLocation || 'inceleme alanı')} kapsamında hazırlanan ${esc(projectName)} hesap raporunu içermektedir.</p>
    <p>Yukarıda bilgileri verilen yapının zemin iyileştirme projesinin hazırlanması talebinde bulunulmuştur. İlgili yapının zemin iyileştirme projesi ve hesap raporu ${esc(date)} tarihinde hazırlanmıştır.</p>
    <p>Zemin iyileştirme projesi ve hesap raporu hazırlanırken Türkiye Bina Deprem Yönetmeliği (TBDY-2018), Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı ile ilgili yürürlükteki hükümler dikkate alınmıştır.</p>
  `;

  const defaultAreaInfo = `
    <p>İnceleme alanı ${esc(projectLocation || 'ilgili parsel')} üzerinde yer almaktadır. İnceleme alanına ait genel uydu haritası ve vaziyet bilgileri ilgili şekillerde verilmiştir.</p>
  `;

  const defaultStructureInfo = `
    <p>${esc(projectLocation || 'İnceleme alanı')} üzerinde, ${esc(projectName)} kapsamında değerlendirilen yapının kullanım amacına göre bina kullanım sınıfı, bina önem katsayısı ve bina yükseklik sınıfı belirlenmiştir. Yapıya ait vaziyet planı ve temel yerleşim bilgileri ilgili şekillerde sunulmuştur.</p>
  `;

  const defaultExistingResearch = `
    <p>İnşaat yapılacak alanda gerçekleştirilen sondaj çalışmaları ve laboratuvar deneyleri kapsamında elde edilen veriler değerlendirilmiştir. Alınan numuneler üzerinde zeminlerin fiziksel ve mekanik özelliklerinin belirlenmesi amacıyla gerekli deneyler yapılmıştır.</p>
    <p>İnceleme alanında yapılan sondajlara ait SPT ve düzeltilmiş SPT değerleri ile laboratuvar deney sonuçları tablo halinde verilmiştir.</p>
  `;

  const defaultAdditionalResearch = '<p>İlave bir zemin araştırması yapılmamıştır.</p>';

  const defaultSoilProfile = `
    <p>Yapının yapılacağı temel altı zemini için sondaj verileri ve mevcut sismik veriler kullanılarak idealize zemin profili oluşturulmuştur. Zemin profili incelendiğinde üstte dolgu tabaka, altında ise değişen oranlarda ince taneli ve karışık zemin tabakaları bulunduğu değerlendirilmiştir. İnceleme alanında yeraltı suyu seviyesine rastlanmıştır.</p>
  `;

  const defaultSeismicity = `
    <p>01/01/2019 tarihinde yürürlüğe giren TBDY-2018 hükümleri doğrultusunda geoteknik ve yapı tasarımında ilgili deprem parametreleri dikkate alınmaktadır. Yapının bulunduğu bölge için deprem tehlike haritası ve yerel zemin sınıfı değerlendirilmiş, tasarım spektral ivme katsayıları ile yerel zemin etki katsayıları birlikte ele alınmıştır.</p>
    <p>Deprem tasarım sınıfı ve yerel zemin sınıfı, proje kapsamında kullanılan parametreler ile uyumlu şekilde belirlenmiştir.</p>
  `;

  const defaultFoundationSystem = `
    <p>Yapılan değerlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun olduğu görülmüştür.</p>
  `;

  const defaultConclusions = `
    <p>${esc(projectLocation || 'İnceleme alanı')} kapsamında yapılan analiz ve değerlendirmeler sonucunda, zemin iyileştirme ihtiyacı ve uygulanacak yöntem belirlenmiştir. Sıvılaşma ve oturma davranışı birlikte değerlendirilmiş, uygun iyileştirme yaklaşımı seçilmiştir.</p>
    <p>Hazırlanan bu zemin iyileştirme projesi ve raporu, yürürlükteki yönetmelik ve uygulama esaslarına uygun şekilde düzenlenmiştir.</p>
  `;

  const defaultReferences = `
    <p>TBDY-2018, Türkiye Bina Deprem Yönetmeliği, 2018.</p>
    <p>Çevre ve Şehircilik Bakanlığı, Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı, Mart 2019.</p>
    <p>Kazı Güvenliği ve Alınacak Önlemler, Çevre ve Şehircilik Bakanlığı Yapı İşleri Genel Müdürlüğü, 2018.</p>
    <p>Foundation Analysis and Design, Bowles, 5th Edition.</p>
  `;

  const topLocation = projectLocation ? esc(projectLocation) : 'PROJE ALANI';
  const projectTitle = esc(projectName);
  const reportNoLine = reportNumber ? `Rapor No: ${esc(reportNumber)}` : `Rapor No: ${esc(project.id || 'N/A')}`;
  const authorLine = engineer ? esc(engineer) : esc(preparedBy);

  const section7Intro = `
    <p>Geoteknik analizler kapsamında kullanılacak zemin parametreleri belirlenirken zemin etüt raporu, arazi verileri ve güncel literatür bilgileri birlikte değerlendirilmiştir.</p>
    <p>Aşağıdaki değerler sistem tarafından hesaplanmış ve veritabanına kilitlenmiştir. Bu değerler kullanıcı tarafından değiştirilemez.</p>
  `;

  const tocRows = [
    ['1. GİRİŞ', '3'],
    ['2. İNCELEME ALANI HAKKINDA BİLGİLER', '3'],
    ['3. YAPI HAKKINDA BİLGİLER', '4'],
    ['4. MEVCUT ZEMİN ARAŞTIRMALARI', '4'],
    ['5. İLAVE ZEMİN ARAŞTIRMALARI', '5'],
    ['6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU', '5'],
    ['7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ', '6'],
    ['8. DEPREMSELLİK', '7'],
    ['9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ', '8'],
    ['10. ÖNERİLEN TEMEL SİSTEMİ', '10'],
    ['11. SONUÇ VE ÖNERİLER', '10'],
    ['12. YARARLANILAN KAYNAKLAR', '11'],
  ];

  const tableRows = [
    'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları',
    'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıfları',
    'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve düzeltilmiş SPT değerleri',
    'Tablo 4.2. Laboratuvar toplu deney sonuçları',
    'Tablo 7.1. Geoteknik hesaplarında kullanılması önerilen geoteknik parametreler',
    'Tablo 8.1. Yerel zemin sınıfı',
    'Tablo 8.2. İnceleme alanı deprem parametreleri',
    'Tablo 8.3. Yerel zemin katsayıları',
    'Tablo 8.4. Kısa periyot bölgesi için yerel zemin etki katsayıları',
    'Tablo 8.5. 1.0 saniye periyot için yerel zemin etki katsayıları',
    'Tablo 8.6. Elde edilen yatay ve düşey elastik tasarım spektrumu',
    'Tablo 8.7. Deprem tasarım sınıfları',
  ];

  const figureRows = [
    'Şekil 2.1. İnceleme alanına ait genel uydu haritası',
    'Şekil 3.1. Vaziyet planı',
    'Şekil 6.1. İdealize zemin profilinde alınan kesitler',
    'Şekil 6.2. İdealize zemin profilinin çıkarılması',
    'Şekil 8.1. Türkiye deprem tehlike haritası',
    'Şekil 9.1. Düzce depremi ivme kayıtları',
  ];

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
      line-height: 1.55;
      color: #000;
      margin: 0;
      padding: 0;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 8pt 0 6pt;
      line-height: 1.2;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 18pt 0 8pt;
      padding-bottom: 3pt;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 12pt 0 6pt;
    }
    p {
      text-align: justify;
      margin: 0 0 8pt 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 11pt;
    }
    th, td {
      border: 1px solid #333;
      padding: 5pt 8pt;
      vertical-align: middle;
    }
    th {
      background-color: #d9d9d9;
      text-align: center;
      font-weight: bold;
    }
    td.num {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    td.center {
      text-align: center;
    }
    .page-break {
      page-break-after: always;
    }
    .cover-page {
      text-align: center;
      margin-top: 40pt;
    }
    .cover-location {
      font-size: 14pt;
      font-weight: bold;
      background-color: yellow;
      display: inline-block;
      margin-bottom: 40pt;
      padding: 5px;
    }
    .cover-title {
      font-size: 18pt;
      font-weight: bold;
      line-height: 1.5;
      margin-bottom: 80pt;
    }
    .cover-prepared-by {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 20pt;
    }
    .cover-author {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10pt;
    }
    .cover-org {
      font-size: 12pt;
      margin-bottom: 5pt;
    }
    .cover-date-no {
      margin-top: 60pt;
      font-size: 12pt;
    }
    .toc-list, .catalog-list {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 12pt;
    }
    .toc-list td, .catalog-list td {
      border: none;
      padding: 2pt 0;
    }
    .toc-page {
      text-align: right;
      white-space: nowrap;
      width: 18%;
    }
    .toc-dot {
      border-bottom: 1px dotted #666;
      width: 100%;
      display: inline-block;
      transform: translateY(-2px);
    }
    .locked-notice {
      background: #fff8e1;
      border-left: 4px solid #f59e0b;
      padding: 6pt 10pt;
      font-size: 10pt;
      font-style: italic;
      margin: 8pt 0 10pt;
    }
    .subheading {
      font-weight: bold;
      margin: 10pt 0 4pt;
    }
    .footer-note {
      font-size: 9pt;
      text-align: center;
      color: #555;
      margin-top: 18pt;
      border-top: 1px solid #999;
      padding-top: 8pt;
    }
  </style>
</head>
<body>

<div class="cover-page">
  <div style="margin-bottom: 40pt;"></div>
  <div>
    <span class="cover-location">${topLocation}</span>
  </div>
  <div class="cover-title">
    ${projectTitle}<br>ZEMİN İYİLEŞTİRME PROJESİ HESAP RAPORU
  </div>
  
  <div class="cover-prepared-by">HAZIRLAYAN</div>
  
  <div class="cover-author">${authorLine}</div>
  <div class="cover-org">${esc(preparedBy)}</div>
  ${employer ? `<div class="cover-org">İşveren: ${esc(employer)}</div>` : ''}
  
  <div class="cover-date-no">
    <div>${esc(date)}</div>
    <div>${reportNoLine}</div>
  </div>
</div>

<div class="page-break"></div>

<h2>İÇİNDEKİLER</h2>
<table class="toc-list">
  ${tocRows.map(([label, page]) => `<tr><td>${esc(label)}</td><td class="toc-page">${esc(page)}</td></tr>`).join('')}
</table>

<h2>TABLOLAR LİSTESİ</h2>
<table class="catalog-list">
  ${tableRows.map((row) => `<tr><td>${esc(row)}</td><td class="toc-page"><span class="toc-dot"></span></td></tr>`).join('')}
</table>

<h2>ŞEKİLLER LİSTESİ</h2>
<table class="catalog-list">
  ${figureRows.map((row) => `<tr><td>${esc(row)}</td><td class="toc-page"><span class="toc-dot"></span></td></tr>`).join('')}
</table>

<div class="page-break"></div>

<h2>1. GİRİŞ</h2>
${getSection('intro', defaultIntro)}

<h2>2. İNCELEME ALANI HAKKINDA BİLGİLER</h2>
${getSection('areaInfo', defaultAreaInfo)}

<h2>3. YAPI HAKKINDA BİLGİLER</h2>
${getSection('structureInfo', defaultStructureInfo)}

<h2>4. MEVCUT ZEMİN ARAŞTIRMALARI</h2>
${getSection('existingResearch', defaultExistingResearch)}

<h2>5. İLAVE ZEMİN ARAŞTIRMALARI</h2>
${getSection('additionalResearch', defaultAdditionalResearch)}

<h2>6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU</h2>
${getSection('soilProfile', defaultSoilProfile)}

<h2>7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ</h2>
${section7Intro}
<table>
  <tr>
    <th>Parametre</th>
    <th>Değer</th>
    <th>Birim</th>
  </tr>
  ${paramTableRows}
</table>

<h2>8. DEPREMSELLİK</h2>
${getSection('seismicity', defaultSeismicity)}

<h2>9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ</h2>
<div class="locked-notice">
  Aşağıdaki sonuçlar ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.
  Bu değerler kullanıcı tarafından değiştirilemez.
</div>
${resultSections}
<div class="subheading">Tercih Edilen İyileştirme Tekniği</div>
${getSection('seismicityMethod', '<p>Alanda yapılan incelemede zeminin sıvılaşma riskinin bulunduğu görülmektedir. Sıvılaşma riskinin ortadan kaldırılması için temel zemininde iyileştirme yapılması gerekmektedir. Bu kapsamda Jet-Grout yöntemi tercih edilmiştir.</p>')}
<div class="subheading">Jet Grout Yapım Yöntemi</div>
<p>Jet-grout yöntemi yüksek basınç altında zemine enjekte edilen çimento esaslı karışım ile zemin içinde silindirik kolonlar oluşturulması esasına dayanır. Oluşturulan kolonlar zeminin taşıma kapasitesini artırmakta ve sıkışabilirliğini azaltmaktadır.</p>
<div class="subheading">Kullanılacak Ekip ve Ekipman</div>
<p>Delgi makinesi, jet grout pompa ünitesi, mikser ünitesi ve su tankı gibi ekipmanların uygun kapasitede seçilmesi gerekir. İmalat boyunca jet grout kolon çapı, enjeksiyon basıncı, rotasyon ve çekme hızı kontrol altında tutulmalıdır.</p>
<div class="subheading">Kalite Kontrol Deneyleri</div>
<p>Sahada test kolonu yapılmalı, kolon sürekliliği ve karot dayanımı kontrol edilmeli, mevcut altyapılar göz önünde bulundurulmalıdır.</p>

<h2>10. ÖNERİLEN TEMEL SİSTEMİ</h2>
${getSection('foundationSystem', defaultFoundationSystem)}

<h2>11. SONUÇ VE ÖNERİLER</h2>
${getSection('conclusions', defaultConclusions)}

<h2>12. YARARLANILAN KAYNAKLAR</h2>
${getSection('references', defaultReferences)}

<p class="footer-note">
  ZEMSIS © ${new Date().getFullYear()} - Bu belge elektronik olarak üretilmiştir.
  Proje ID: ${esc(sections?.docNumber || project?.id || 'N/A')} - Tarih: ${esc(date)}
</p>

</body>
</html>`;
}

// Yardımcı fonksiyonlar

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
  if (Number.isNaN(n)) return String(val);
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
      const rowLabel = typeof item === 'object' && item !== null ? (item.label || key) : key;
      return `<tr>
        <td>${esc(rowLabel)}</td>
        <td class="num">${fmtNum(val)}</td>
        <td class="center">${esc(unit)}</td>
      </tr>`;
    }).join('');

    return `
<h3>${esc(label)}</h3>
<table>
  <tr>
    <th>Parametre</th>
    <th>Değer</th>
    <th>Birim</th>
  </tr>
  ${rows}
</table>`;
  }).join('');
}

module.exports = router;
