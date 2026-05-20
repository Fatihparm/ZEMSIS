const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { authMiddleware } = require('./auth');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  TableOfContents,
  VerticalAlign,
  TextDirection,
  Header,
  Footer
} = require('docx');

const router = express.Router();

router.use(authMiddleware);

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

    const doc = buildReportDOCX({ project, lockedParams, lockedResults, sections });

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

function getSec(sections, key, fallback) {
  const v = sections && sections[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function buildReportSectionDefaults({ parcelName, parcelOwner, dateStr }) {
  return {
    intro: `Söz konusu rapor, ${parcelName} parselde, inşası düşünülen, ${parcelOwner} ait taşınmazın Zemin İyileştirme Projesi Hesap Raporunu içermektedir.

Yukarıda bilgileri verilen yapının Zemin İyileştirme Projesinin tarafımdan hazırlanması talebinde bulunulmuştur. İlgili yapının Zemin İyileştirme Projesi ve Hesap Raporu ${dateStr} tarihinde tarafımdan hazırlanmıştır.

Zemin İyileştirme Projesi ve Hesap Raporu hazırlanırken 1 Ocak 2019’da yürürlülüğe giren Türkiye Bina Deprem Yönetmeliği (TBDY-2018), 9 Mart 2019’da yürürlüğe giren Çevre ve Şehircilik Bakanlığı Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı’ ve 2018’de yürürlülüğe giren Çevre ve Şehircilik Bakanlığı Kazı Çukurlarının Desteklenmesi ile İlgili Uyulacak Esaslar Genelgesine (2018) uyulmuştur.`,
    areaInfo: `İnceleme alanı ${parcelName} parsel üzerinde yer almaktadır`,
    structureInfo: `${parcelName} parselde, ${parcelOwner} ait parselde 3 bloklu konut amaçlı betonarme yapı yapılması planlanmaktadır.

Yapılması planlanan yapıya ait (TBDY-2018) Bina kullanım sınıfı (BKS), Bina önem katsayısı (I) ve Bina yükseklik sınıfı (BYS) belirlenmiştir. Tablo 3.1.'den BKS değeri 3, I değeri 1 olarak alınmıştır. Tablo 3.2'den BYS ise 6 olarak belirlenmiştir. Yapılara ait vaziyet planı Şekil 3.1'de verilmiştir.`,
    existingResearch: `İnşaat yapılacak alanda, ---------- tarafından -------------- derinliğinde sondaj yapılmıştır. Ayrıca arazide --- adet temel sondaj kuyusu açılmış ve --- adet örselenmiş (SPT), --- adet örselenmemiş (UD) numune alınmıştır. Alınan numuneler üzerinde -------------------- laboratuvarlarında zeminlerin fiziksel ve mekanik özelliklerinin belirlenmesi amacıyla örselenmiş ve örselenmemiş numuneler üzerinde laboratuvar deneyleri yapılmıştır.`,
    additionalResearch: 'İlave bir zemin araştırması yapılmamıştır.',
    soilProfile: `Yapının yapılacağı temel altı zemini için sondaj verileri ve sismik veriler kullanılarak idealize zemin profilleri (A-A Kesiti) çıkartılmıştır (Şekil 6.1. ve Şekil 6.2). Zemin profili incelendiğinde 0,00-0,50 metre arasında Dolgu tabaka, 0,50-7,50 metre arasında Siltli Kil tabaka, 7,50-12,00 metre arasında Siltli Kum tabaka ve 12,00-20,00 metre arasında Siltli Kil tabaka yer almaktadır. İnceleme alanında 3.50 m’de yeraltı suyuna rastlanmıştır.`,
    seismicity: `Geoteknik analizler kapsamında kullanılacak olan zemin parametreleri belirlenirken, zemin etüt raporu, güncel literatür bilgileri ve TBDY-2018 esas alınmıştır.

İnceleme alanı için deprem parametreleri olarak DD-2 deprem yer hareketi düzeyi, ZE yerel zemin sınıfı ve koordinatlar E=40.4285°, B=29.1767° dikkate alınmıştır.

Elde edilen spektral ivme katsayıları ışığında kısa periyot ve 1.0 saniye periyot için Yerel Zemin Etki Katsayıları TBDY-2018 Tablo 2.1 ve Tablo 2.2'den seçilmiş; tasarım spektrumları buna göre değerlendirilmiştir.`,
    foundationSystem: 'Yapılan değerlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun olduğu görülmüştür.',
    conclusions: 'İnceleme alanı kapsamında yapılan analiz ve değerlendirmeler sonucunda, zemin iyileştirme ihtiyacı ve uygulanacak yöntem belirlenmiştir.',
    references: `TBDY-2018, Türkiye Bina Deprem Yönetmeliği, 2018.
Çevre ve Şehircilik Bakanlığı, Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı, Mart 2019.`,
  };
}

function createParagraphs(text) {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim().length > 0).map(line => {
    const isSubHeading = /^\d+\.\d+\./.test(line.trim());
    return new Paragraph({
      children: [new TextRun({ text: line.trim(), bold: isSubHeading })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120 }
    });
  });
}

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '-';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val);
  if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString('tr-TR');
  return n.toFixed(3);
}

function createDataTable(dataRows, headers = ["Parametre", "Değer", "Birim"]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
    },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: "D9D9D9" },
          verticalAlign: VerticalAlign.CENTER,
        })),
      }),
      ...dataRows.map(r => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(r.label)], verticalAlign: VerticalAlign.CENTER }),
          new TableCell({ children: [new Paragraph({ text: String(r.val), alignment: AlignmentType.RIGHT })], verticalAlign: VerticalAlign.CENTER }),
          new TableCell({ children: [new Paragraph({ text: r.unit, alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER })
        ]
      }))
    ]
  });
}

function createListParagraphs(items) {
  return items.map(item => {
    return new Paragraph({
      children: [
        new TextRun(item.label),
        new TextRun("\t"),
        new TextRun(item.page)
      ],
      tabStops: [{ type: "right", position: 9000, leader: "dot" }],
      spacing: { after: 60 }
    });
  });
}

const PAGE_MARGINS = { top: 1440, right: 1440, bottom: 1800, left: 1800 };
const DEFAULT_LOGO_PATH = path.join(__dirname, '..', 'frontend', 'public', 'zemsis-logo.png');
let defaultLogoBuffer = null;

function loadDefaultLogoBuffer() {
  if (defaultLogoBuffer) return defaultLogoBuffer;
  if (!fs.existsSync(DEFAULT_LOGO_PATH)) return null;
  defaultLogoBuffer = fs.readFileSync(DEFAULT_LOGO_PATH);
  return defaultLogoBuffer;
}

function parseImageInput(image) {
  if (!image || typeof image !== 'object' || typeof image.dataUrl !== 'string') return null;
  const match = /^data:([^;]+);base64,(.+)$/i.exec(image.dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
    width: Number(image.width) || 0,
    height: Number(image.height) || 0,
  };
}

function getLogoAsset(sections) {
  const uploaded = parseImageInput(sections && sections.coverLogo);
  if (uploaded) return uploaded;

  const fallback = loadDefaultLogoBuffer();
  if (!fallback) return null;
  return {
    mimeType: 'image/png',
    buffer: fallback,
    width: 512,
    height: 512,
  };
}

function createLogoRun(logoAsset, targetWidth) {
  if (!logoAsset || !logoAsset.buffer) return null;
  const width = targetWidth;
  const height = logoAsset.width && logoAsset.height
    ? Math.max(1, Math.round((logoAsset.height / logoAsset.width) * targetWidth))
    : targetWidth;

  return new ImageRun({
    data: logoAsset.buffer,
    transformation: { width, height },
  });
}

function createCoverLogoParagraph(logoAsset) {
  const logoRun = createLogoRun(logoAsset, 130);
  if (!logoRun) return null;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 220 },
    children: [logoRun],
  });
}

function createFooterTable(logoAsset, dateStr) {
  const logoRun = createLogoRun(logoAsset, 28);
  const logoParagraph = logoRun
    ? new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [logoRun],
      })
    : new Paragraph({ text: '', spacing: { before: 0, after: 0 } });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [logoParagraph],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: `ZEMSIS © ${new Date().getFullYear()} - Tarih: ${dateStr}`, size: 16, color: '555555' }),
                ],
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
    ],
  });
}

function hasSectionContent(sections, key) {
  const value = sections && sections[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function buildTableRows({ sections, pRows, resCategories }) {
  const rows = TABLE_CATALOG.filter(item => {
    if (item.condition) return item.condition(pRows || []);
    return hasSectionContent(sections, item.section);
  }).map(({ label, page }) => ({ label, page }));

  if (Array.isArray(resCategories) && resCategories.length > 0) {
    resCategories.forEach((cat, index) => {
      rows.push({
        label: `Tablo 9.${index + 1}. ${cat.title}`,
        page: '21',
      });
    });
  }

  return rows;
}

function buildFigureRows({ sections }) {
  const rows = FIGURE_CATALOG
    .filter(item => hasSectionContent(sections, item.section))
    .map(({ label, page }) => ({ label, page }));

  const fallbackPages = {
    intro: '5',
    areaInfo: '6',
    structureInfo: '7',
    existingResearch: '10',
    additionalResearch: '11',
    soilProfile: '12',
    seismicity: '14',
    foundationSystem: '23',
    conclusions: '24',
    references: '25',
  };

  const sectionOrder = ['intro', 'areaInfo', 'structureInfo', 'existingResearch', 'additionalResearch', 'soilProfile', 'seismicity', 'foundationSystem', 'conclusions'];

  for (const sectionKey of sectionOrder) {
    const images = getSectionImages(sections, sectionKey);
    if (!images.length) continue;

    const sectionNumber = getSectionNumber(sectionKey);
    const fallbackPage = FIGURE_CATALOG.find(item => item.section === sectionKey)?.page || fallbackPages[sectionKey] || '';
    images.forEach((img, index) => {
      const figureNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
      const caption = typeof img.caption === 'string' && img.caption.trim() ? img.caption.trim() : 'Ek görsel';
      rows.push({
        label: `Şekil ${figureNumber}. ${caption}`,
        page: fallbackPage,
      });
    });
  }

  return rows;
}

function buildTableRowsDynamic({ sections, pRows, resCategories }) {
  const rows = [];

  if (hasSectionContent(sections, 'structureInfo')) {
    rows.push(
      { label: 'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları (TBDY-2018 Tablo 3.1)', page: '8' },
      { label: 'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıflarına göre tanımlanan bina yükseklik aralıkları (TBDY-2018 Tablo 3.3)', page: '8' }
    );
  }

  if (hasSectionContent(sections, 'existingResearch')) {
    rows.push(
      { label: 'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve Düzeltilmiş SPT Değerleri', page: '10' },
      { label: 'Tablo 4.2. Laboratuvar toplu deney sonuçları', page: '11' }
    );
  }

  if (Array.isArray(pRows) && pRows.length > 0) {
    rows.push({ label: 'Tablo 7.1. Geoteknik Hesaplarında Kullanılması Önerilen Geoteknik Parametreler', page: '13' });
  }

  if (hasSectionContent(sections, 'seismicity')) {
    rows.push(
      { label: 'Tablo 8.1. Yerel Zemin Sınıfı (TBDY-2018 Tablo 16.1)', page: '19' },
      { label: 'Tablo 8.2. İnceleme Alanı Deprem Parametreleri', page: '20' },
      { label: 'Tablo 8.3. Yerel Zemin Katsayıları', page: '20' },
      { label: 'Tablo 8.4. Kısa periyot bölgesi için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.1)', page: '20' },
      { label: 'Tablo 8.5. 1.0 saniye periyot için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.2)', page: '20' },
      { label: 'Tablo 8.6. Elde Edilen Yatay ve Düşey Elastik Tasarım Spektrumu', page: '21' },
      { label: 'Tablo 8.7. Deprem Tasarım Sınıfları', page: '21' }
    );
  }

  if (Array.isArray(resCategories) && resCategories.length > 0) {
    resCategories.forEach((cat, index) => {
      rows.push({
        label: `Tablo 9.${index + 1}. ${cat.title}`,
        page: '21',
      });
    });
  }

  return rows;
}

function buildFigureRowsDynamic({ sections }) {
  const rows = [];

  if (hasSectionContent(sections, 'areaInfo')) {
    rows.push({ label: 'Şekil 2.1. İnceleme alanına ait genel uydu haritası', page: '6' });
  }
  if (hasSectionContent(sections, 'structureInfo')) {
    rows.push({ label: 'Şekil 3.1. Vaziyet Planı', page: '7' });
  }
  if (hasSectionContent(sections, 'soilProfile')) {
    rows.push(
      { label: 'Şekil 6.1. İdealize zemin profilinde alınan kesitler', page: '12' },
      { label: 'Şekil 6.2. İdealize Zemin profilinin çıkarılması A-A Kesiti', page: '12' }
    );
  }
  if (hasSectionContent(sections, 'seismicity')) {
    rows.push(
      { label: 'Şekil 8.1. Türkiye ve çevresinin başlıca neotektonik yapıları', page: '14' },
      { label: 'Şekil 8.2. Türkiye Deprem Tehlike Haritası', page: '16' },
      { label: 'Şekil 8.3. İnceleme Alanı Deprem Tehlike Haritası (AFAD,2018)', page: '16' },
      { label: 'Şekil 8.4. İnceleme alanının Deprem Tehlike Haritası', page: '17' },
      { label: 'Şekil 8.5. Ss (Kısa Periyot Harita Spektral İvme Katsayısı)', page: '17' },
      { label: 'Şekil 8.6. S1 (1.0 Saniye Periyot Harita Spektral İvme Katsayısı)', page: '18' },
      { label: 'Şekil 8.7. PGA (En büyük yer ivmesi)', page: '18' },
      { label: 'Şekil 8.8. PGV (En büyük yer hızı)', page: '19' },
      { label: 'Şekil 8.9. Yatay Elastik Tasarım Spektrumu', page: '22' },
      { label: 'Şekil 8.10. Düşey Elastik Tasarım Spektrumu', page: '22' }
    );
  }

  const sectionOrder = ['intro', 'areaInfo', 'structureInfo', 'existingResearch', 'additionalResearch', 'soilProfile', 'seismicity', 'foundationSystem', 'conclusions'];
  for (const sectionKey of sectionOrder) {
    const images = getSectionImages(sections, sectionKey);
    if (!images.length) continue;
    const sectionNumber = getSectionNumber(sectionKey);
    const fallbackPage = sectionKey === 'intro' ? '5' :
      sectionKey === 'areaInfo' ? '6' :
      sectionKey === 'structureInfo' ? '7' :
      sectionKey === 'existingResearch' ? '10' :
      sectionKey === 'additionalResearch' ? '11' :
      sectionKey === 'soilProfile' ? '12' :
      sectionKey === 'seismicity' ? '14' :
      sectionKey === 'foundationSystem' ? '23' :
      sectionKey === 'conclusions' ? '24' : '';
    images.forEach((img, index) => {
      const figureNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
      const caption = typeof img.caption === 'string' && img.caption.trim() ? img.caption.trim() : 'Ek görsel';
      rows.push({
        label: `Şekil ${figureNumber}. ${caption}`,
        page: fallbackPage,
      });
    });
  }

  return rows;
}

function buildTableRows({ sections, pRows, resCategories }) {
  return buildTableRowsDynamic({ sections, pRows, resCategories, reportDefaults: {}, pageMap: null });
}

function buildFigureRows({ sections }) {
  return buildFigureRowsDynamic({ sections, reportDefaults: {}, pageMap: null });
}

const REPORT_SECTION_NUMBERS = {
  intro: '1',
  areaInfo: '2',
  structureInfo: '3',
  existingResearch: '4',
  additionalResearch: '5',
  soilProfile: '6',
  _params: '7',
  seismicity: '8',
  _results: '9',
  foundationSystem: '10',
  conclusions: '11',
  references: '12',
};

function getSectionNumber(sectionKey) {
  return REPORT_SECTION_NUMBERS[sectionKey] || '';
}

function getSectionImages(sections, sectionKey) {
  const images = sections && sections[`${sectionKey}Images`];
  return Array.isArray(images) ? images.filter(img => img && typeof img === 'object') : [];
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function scaleToFit(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function createImageBlocks(sectionKey, images) {
  if (!images || !images.length) return [];
  const sectionNumber = getSectionNumber(sectionKey);
  const maxWidth = 520;
  const maxHeight = 380;

  return images.flatMap((img, index) => {
    const parsed = parseDataUrl(img.dataUrl);
    if (!parsed) return [];

    const width = Number(img.width) || maxWidth;
    const height = Number(img.height) || maxHeight;
    const scaled = scaleToFit(width, height, maxWidth, maxHeight);
    const figureNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
    const caption = typeof img.caption === 'string' && img.caption.trim() ? img.caption.trim() : 'Görsel';

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [
          new ImageRun({
            data: parsed.buffer,
            transformation: {
              width: scaled.width,
              height: scaled.height,
            },
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Şekil ${figureNumber}. ${caption}`,
            italics: true,
          }),
        ],
      }),
    ];
  });
}

function createSectionBlocks(sectionKey, title, text, images = []) {
  return [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    ...createParagraphs(text),
    ...createImageBlocks(sectionKey, images),
  ];
}

function buildReportDOCX({ project, lockedParams, lockedResults, sections }) {
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const coverDate = dateObj.toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase() + ", " + dateObj.getFullYear();
  const logoAsset = getLogoAsset(sections);
  const coverLogoParagraph = createCoverLogoParagraph(logoAsset);

  const projectName = (sections && sections.projectName) || (project && project.name) || 'Zemin İyileştirme Projesi';
  const parcelName = (sections && sections.parcelName) || (sections && sections.location) || (project && project.description) || '[Parsel adı]';
  const parcelOwner = (sections && sections.parcelOwner) || (sections && sections.employer) || '[Parsel sahibi]';
  const projectLocation = parcelName;
  const reportNumber = (sections && sections.docNumber) || '';
  const preparedBy = (sections && sections.preparedBy) || 'Bursa Teknik Üniversitesi';
  const engineer = (sections && sections.engineer) || 'Prof. Dr. Eyübhan AVCI';
  const employer = (sections && sections.employer) || parcelOwner;
  const reportDefaults = buildReportSectionDefaults({ parcelName, parcelOwner, dateStr });

  const paramDefs = [
    { label: 'Kolon Çapı (D)', key: 'D', unit: 'm' },
    { label: 'Kolon Aralığı (s)', key: 's', unit: 'm' },
    { label: 'Kolon Yüksekliği (H)', key: 'H', unit: 'm' },
    { label: 'Drenajsız Kohezyon (cu)', key: 'cu', unit: 'kPa' },
    { label: 'Zemin Elastisite Modülü (Es)', key: 'Es', unit: 'kPa' },
    { label: 'Aderans Faktörü (α)', key: 'alpha', unit: '-' },
    { label: 'Taşıma Kapasitesi Katsayısı (Nc)', key: 'Nc', unit: '-' },
    { label: 'Jet Grout Dayanımı (σjet)', key: 'sigmaJet', unit: 'kPa' },
    { label: 'Jet Grout Elastisite Modülü (Ejg)', key: 'Ejg', unit: 'kPa' },
    { label: 'Temel Basıncı (qtemel)', key: 'qtemel', unit: 'kPa' },
    { label: 'Net Basınç (qnet)', key: 'qnet', unit: 'kPa' },
    { label: 'Malzeme Güvenlik Faktörü (Fs)', key: 'Fs', unit: '-' },
    { label: 'Taşıma Kap. Güvenlik Faktörü (FS)', key: 'FS', unit: '-' },
  ];

  const pRows = paramDefs
    .filter(d => lockedParams[d.key] !== undefined && lockedParams[d.key] !== null)
    .map(d => ({ label: d.label, val: fmtNum(lockedParams[d.key]), unit: d.unit }));

  const resCategories = [];
  if (lockedResults) {
    const CATEGORY_LABELS = {
      geometry: 'Geometri Sonuçları',
      material: 'Malzeme Parametreleri',
      capacity: 'Taşıma Kapasitesi',
      improvedSoil: 'İyileştirilmiş Zemin Özellikleri',
      settlement: 'Oturma Hesapları',
    };
    for (const [cat, items] of Object.entries(lockedResults)) {
      if (!items || typeof items !== 'object') continue;
      const catRows = [];
      for (const [key, item] of Object.entries(items)) {
        const val = typeof item === 'object' && item !== null ? item.value : item;
        const unit = typeof item === 'object' && item !== null ? (item.unit || '-') : '-';
        const rowLabel = typeof item === 'object' && item !== null ? (item.label || key) : key;
        catRows.push({ label: rowLabel, val: fmtNum(val), unit });
      }
      resCategories.push({ title: CATEGORY_LABELS[cat] || cat, rows: catRows });
    }
  }

  const tableRows = buildTableRows({ sections: generatedSections, pRows, resCategories });
  const figureRows = buildFigureRows({ sections: generatedSections });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: { spacing: { before: 120, after: 120 } }
        }
      ]
    },
    sections: [
      // Kapak Sayfası
      {
        properties: {
          page: { margin: PAGE_MARGINS }
        },
        children: [
          ...(coverLogoParagraph ? [coverLogoParagraph] : []),
          ...(projectName ? [new Paragraph({ text: projectName.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 36, bold: true }, spacing: { before: 900, after: 500 } })] : []),
          ...(projectLocation ? [new Paragraph({ text: projectLocation.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 300 } })] : []),
          ...(parcelOwner ? [new Paragraph({ text: parcelOwner.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 300 } })] : []),
          ...(employer && employer !== parcelOwner ? [new Paragraph({ text: employer.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 900 } })] : []),
          new Paragraph({ text: "ZEMİN İYİLEŞTİRME PROJESİ HESAP RAPORU", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 1200 } }),
          
          new Paragraph({ text: "HAZIRLAYAN", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true, underline: { type: "single" } }, spacing: { after: 300 } }),
          new Paragraph({ text: engineer, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 100 } }),
          new Paragraph({ text: preparedBy, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Mühendislik ve Doğa Bilimleri Fakültesi", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "İnşaat Mühendisliği Bölümü", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Geoteknik Anabilim Dalı Başkanı", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 1000 } }),
          
          new Paragraph({ text: coverDate, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { before: 900 } }),
          new Paragraph({ text: reportNumber ? "Rapor No: " + reportNumber : "Rapor No: " + project.id, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { before: 300 } }),
        ]
      },
      // İçindekiler, Tablolar ve Şekiller Listesi
      {
        properties: {
          page: { margin: PAGE_MARGINS }
        },
        children: [
          new Paragraph({ text: "İÇİNDEKİLER", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, bold: true } }),
          new TableOfContents("İÇİNDEKİLER", {
            hyperlink: true,
            headingStyleRange: "1-2",
          }),
          new Paragraph({ children: [new PageBreak()] }),
          
          new Paragraph({ text: "TABLOLAR LİSTESİ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, bold: true } }),
          ...createListParagraphs(tableRows),
          new Paragraph({ children: [new PageBreak()] }),
          
          new Paragraph({ text: "ŞEKİLLER LİSTESİ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, bold: true } }),
          ...createListParagraphs(figureRows)
        ]
      },
      // Ana Metin
      {
        properties: {
          page: { margin: PAGE_MARGINS }
        },
        footers: {
          default: new Footer({
            children: [createFooterTable(logoAsset, dateStr)]
          })
        },
        children: [
          ...createSectionBlocks('intro', "1. GİRİŞ", getSec(sections, 'intro', reportDefaults.intro), getSectionImages(sections, 'intro')),
          
          ...createSectionBlocks('areaInfo', "2. İNCELEME ALANI HAKKINDA BİLGİLER", getSec(sections, 'areaInfo', reportDefaults.areaInfo), getSectionImages(sections, 'areaInfo')),
          
          ...createSectionBlocks('structureInfo', "3. YAPI HAKKINDA BİLGİLER", getSec(sections, 'structureInfo', reportDefaults.structureInfo), getSectionImages(sections, 'structureInfo')),
          
          ...createSectionBlocks('existingResearch', "4. MEVCUT ZEMİN ARAŞTIRMALARI", getSec(sections, 'existingResearch', reportDefaults.existingResearch), getSectionImages(sections, 'existingResearch')),
          
          ...createSectionBlocks('additionalResearch', "5. İLAVE ZEMİN ARAŞTIRMALARI", getSec(sections, 'additionalResearch', reportDefaults.additionalResearch), getSectionImages(sections, 'additionalResearch')),
          
          ...createSectionBlocks('soilProfile', "6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU", getSec(sections, 'soilProfile', reportDefaults.soilProfile), getSectionImages(sections, 'soilProfile')),
          
          new Paragraph({ text: "7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki değerler sistem tarafından hesaplanmış ve veritabanına kilitlenmiştir. Bu değerler kullanıcı tarafından değiştirilemez.", italics: true }),
          createDataTable(pRows),
          
          ...createSectionBlocks('seismicity', "8. DEPREMSELLİK", getSec(sections, 'seismicity', reportDefaults.seismicity), getSectionImages(sections, 'seismicity')),
          
          new Paragraph({ text: "9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki sonuçlar ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.", italics: true }),
          ...resCategories.map(cat => {
            return [
              new Paragraph({ text: cat.title, heading: HeadingLevel.HEADING_2 }),
              createDataTable(cat.rows)
            ];
          }).flat(),
          ...createImageBlocks('_results', getSectionImages(sections, '_results')),
          
          ...createSectionBlocks('foundationSystem', "10. ÖNERİLEN TEMEL SİSTEMİ", getSec(sections, 'foundationSystem', reportDefaults.foundationSystem), getSectionImages(sections, 'foundationSystem')),
          
          ...createSectionBlocks('conclusions', "11. SONUÇ VE ÖNERİLER", getSec(sections, 'conclusions', reportDefaults.conclusions), getSectionImages(sections, 'conclusions')),
          
          ...createSectionBlocks('references', "12. YARARLANILAN KAYNAKLAR", getSec(sections, 'references', reportDefaults.references), getSectionImages(sections, 'references')),
        ]
      }
    ]
  });

  return doc;
}

module.exports = router;
