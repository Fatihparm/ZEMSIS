const express = require('express');
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

function getSec(sections, key, fallback) {
  const v = sections?.[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function createParagraphs(text) {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim().length > 0).map(line => {
    return new Paragraph({
      children: [new TextRun(line.trim())],
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

function createListParagraphs(items, isFigure = false) {
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

function buildReportDOCX({ project, lockedParams, lockedResults, sections }) {
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const monthNames = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
  const coverDate = `${monthNames[dateObj.getMonth()]}, ${dateObj.getFullYear()}`;

  const projectName = sections?.projectName || project?.name || 'Jet Grout Zemin İyileştirme Projesi';
  const projectLocation = sections?.location || project?.description || 'PROJE ALANI';
  const reportNumber = sections?.docNumber || '';
  const preparedBy = sections?.preparedBy || 'Bursa Teknik Üniversitesi';
  const engineer = sections?.engineer || 'Prof. Dr. Eyübhan AVCI';
  const employer = sections?.employer || '';

  const defaultIntro = `Söz konusu rapor, ${projectLocation} kapsamında hazırlanan ${projectName} hesap raporunu içermektedir.
Yukarıda bilgileri verilen yapının zemin iyileştirme projesinin hazırlanması talebinde bulunulmuştur. İlgili yapının zemin iyileştirme projesi ve hesap raporu ${dateStr} tarihinde hazırlanmıştır.
Zemin iyileştirme projesi ve hesap raporu hazırlanırken Türkiye Bina Deprem Yönetmeliği (TBDY-2018), Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı ile ilgili yürürlükteki hükümler dikkate alınmıştır.`;

  const defaultAreaInfo = `İnceleme alanı ${projectLocation} üzerinde yer almaktadır. İnceleme alanına ait genel uydu haritası ve vaziyet bilgileri ilgili şekillerde verilmiştir.`;
  const defaultStructureInfo = `İnceleme alanı üzerinde, ${projectName} kapsamında değerlendirilen yapının kullanım amacına göre bina kullanım sınıfı, bina önem katsayısı ve bina yükseklik sınıfı belirlenmiştir.`;
  const defaultExistingResearch = `İnşaat yapılacak alanda gerçekleştirilen sondaj çalışmaları ve laboratuvar deneyleri kapsamında elde edilen veriler değerlendirilmiştir.`;
  const defaultAdditionalResearch = 'İlave bir zemin araştırması yapılmamıştır.';
  const defaultSoilProfile = 'Yapının yapılacağı temel altı zemini için sondaj verileri ve mevcut sismik veriler kullanılarak idealize zemin profili oluşturulmuştur.';
  const defaultSeismicity = '01/01/2019 tarihinde yürürlüğe giren TBDY-2018 hükümleri doğrultusunda geoteknik ve yapı tasarımında ilgili deprem parametreleri dikkate alınmaktadır.';
  const defaultFoundationSystem = 'Yapılan değerlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun olduğu görülmüştür.';
  const defaultConclusions = 'İnceleme alanı kapsamında yapılan analiz ve değerlendirmeler sonucunda, zemin iyileştirme ihtiyacı ve uygulanacak yöntem belirlenmiştir.';
  const defaultReferences = `TBDY-2018, Türkiye Bina Deprem Yönetmeliği, 2018.
Çevre ve Şehircilik Bakanlığı, Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı, Mart 2019.`;

  const tableRows = [
    { label: 'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları', page: '7' },
    { label: 'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıfları', page: '8' },
    { label: 'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve düzeltilmiş SPT değerleri', page: '11' },
    { label: 'Tablo 4.2. Laboratuvar toplu deney sonuçları', page: '11' },
    { label: 'Tablo 7.1. Geoteknik hesaplarında kullanılması önerilen geoteknik parametreler', page: '13' },
    { label: 'Tablo 8.1. Yerel zemin sınıfı', page: '19' },
    { label: 'Tablo 8.2. İnceleme alanı deprem parametreleri', page: '19' },
    { label: 'Tablo 8.3. Yerel zemin katsayıları', page: '20' },
  ];

  const figureRows = [
    { label: 'Şekil 2.1. İnceleme alanına ait genel uydu haritası', page: '6' },
    { label: 'Şekil 3.1. Vaziyet planı', page: '7' },
    { label: 'Şekil 6.1. İdealize zemin profilinde alınan kesitler', page: '12' },
    { label: 'Şekil 6.2. İdealize zemin profilinin çıkarılması', page: '12' },
    { label: 'Şekil 8.1. Türkiye deprem tehlike haritası', page: '19' },
  ];

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

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } }, // 12pt
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          run: { size: 28, bold: true }, // 14pt
          paragraph: { spacing: { before: 360, after: 120 } }
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          run: { size: 26, bold: true }, // 13pt
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
          run: { size: 24, bold: true }, // 12pt
          paragraph: { spacing: { before: 240, after: 120 } }
        }
      ]
    },
    sections: [
      // Kapak Sayfası
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
        },
        children: [
          new Paragraph({ text: projectLocation.toUpperCase(), alignment: AlignmentType.CENTER, run: { size: 28, bold: true }, spacing: { before: 1000, after: 1000 } }),
          new Paragraph({ text: projectName.toUpperCase(), alignment: AlignmentType.CENTER, run: { size: 32, bold: true }, spacing: { after: 200 } }),
          new Paragraph({ text: "ZEMİN İYİLEŞTİRME PROJESİ HESAP RAPORU", alignment: AlignmentType.CENTER, run: { size: 32, bold: true }, spacing: { after: 1000 } }),
          
          new Paragraph({ text: "HAZIRLAYAN", alignment: AlignmentType.CENTER, run: { size: 28, bold: true, underline: { type: "single" } }, spacing: { after: 300 } }),
          new Paragraph({ text: engineer, alignment: AlignmentType.CENTER, run: { size: 28, bold: true }, spacing: { after: 100 } }),
          new Paragraph({ text: preparedBy, alignment: AlignmentType.CENTER, run: { size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Mühendislik ve Doğa Bilimleri Fakültesi", alignment: AlignmentType.CENTER, run: { size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "İnşaat Mühendisliği Bölümü", alignment: AlignmentType.CENTER, run: { size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Geoteknik Anabilim Dalı Başkanı", alignment: AlignmentType.CENTER, run: { size: 24, italics: true }, spacing: { after: 400 } }),
          
          ...(employer ? [new Paragraph({ text: "İşveren: " + employer, alignment: AlignmentType.CENTER, run: { size: 24 } })] : []),
          
          new Paragraph({ text: coverDate, alignment: AlignmentType.CENTER, run: { size: 24, bold: true }, spacing: { before: 1000 } }),
          new Paragraph({ text: reportNumber ? "Rapor No: " + reportNumber : "Rapor No: " + project.id, alignment: AlignmentType.RIGHT, spacing: { before: 500 } }),
        ]
      },
      // İçindekiler, Tablolar ve Şekiller Listesi
      {
        children: [
          new Paragraph({ text: "İÇİNDEKİLER", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          new TableOfContents("İÇİNDEKİLER", {
            hyperlink: true,
            headingStyleRange: "1-2",
          }),
          new Paragraph({ children: [new PageBreak()] }),
          
          new Paragraph({ text: "TABLOLAR LİSTESİ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          ...createListParagraphs(tableRows),
          new Paragraph({ children: [new PageBreak()] }),
          
          new Paragraph({ text: "ŞEKİLLER LİSTESİ", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          ...createListParagraphs(figureRows)
        ]
      },
      // Ana Metin
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                text: `ZEMSIS © ${new Date().getFullYear()} - Proje ID: ${project.id} - Tarih: ${dateStr}`,
                alignment: AlignmentType.CENTER,
                style: "Normal",
                run: { size: 18, color: "555555" }
              })
            ]
          })
        },
        children: [
          new Paragraph({ text: "1. GİRİŞ", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'intro', defaultIntro)),
          
          new Paragraph({ text: "2. İNCELEME ALANI HAKKINDA BİLGİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'areaInfo', defaultAreaInfo)),
          
          new Paragraph({ text: "3. YAPI HAKKINDA BİLGİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'structureInfo', defaultStructureInfo)),
          
          new Paragraph({ text: "4. MEVCUT ZEMİN ARAŞTIRMALARI", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'existingResearch', defaultExistingResearch)),
          
          new Paragraph({ text: "5. İLAVE ZEMİN ARAŞTIRMALARI", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'additionalResearch', defaultAdditionalResearch)),
          
          new Paragraph({ text: "6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'soilProfile', defaultSoilProfile)),
          
          new Paragraph({ text: "7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki değerler sistem tarafından hesaplanmış ve veritabanına kilitlenmiştir. Bu değerler kullanıcı tarafından değiştirilemez.", italics: true }),
          createDataTable(pRows),
          
          new Paragraph({ text: "8. DEPREMSELLİK", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'seismicity', defaultSeismicity)),
          
          new Paragraph({ text: "9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki sonuçlar ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.", italics: true }),
          ...resCategories.map(cat => {
            return [
              new Paragraph({ text: cat.title, heading: HeadingLevel.HEADING_2 }),
              createDataTable(cat.rows)
            ];
          }).flat(),
          
          new Paragraph({ text: "10. ÖNERİLEN TEMEL SİSTEMİ", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'foundationSystem', defaultFoundationSystem)),
          
          new Paragraph({ text: "11. SONUÇ VE ÖNERİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'conclusions', defaultConclusions)),
          
          new Paragraph({ text: "12. YARARLANILAN KAYNAKLAR", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'references', defaultReferences)),
        ]
      }
    ]
  });

  return doc;
}

module.exports = router;
