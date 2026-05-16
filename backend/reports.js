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
    areaInfo: `İnceleme alanı ${parcelName} parsel üzerinde yer almaktadır. İnceleme alanı koordinatları: E= 40.4285°, B= 29.1767°’dir (Şekil 2.1).`,
    structureInfo: `${parcelName} parselde, ${parcelOwner} ait parselde 3 bloklu konut amaçlı betonarme yapı yapılması planlanmaktadır. Parsel toplam alanı 562,32 m² alana sahip arsa içerisinde; bodrum, zemin ve iki normal kattan oluşan 3 bloklu betonarme yapı yapılacaktır.

Yapılması planlanan yapıya ait (TBDY-2018) Bina kullanım sınıfı (BKS), Bina önem katsayısı (I) ve Bina yükseklik sınıfı (BYS) belirlenmiştir. Tablo 3.1.'den BKS değeri 3, I değeri 1 olarak alınmıştır. Tablo 3.2'den BYS ise 6 olarak belirlenmiştir. Yapılara ait vaziyet planı Şekil 3.1'de verilmiştir.`,
    existingResearch: `İnşaat yapılacak alanda, ABM MÜHENDİSLİK tarafından 1 adet 24,50 metre ve 3 adet 20 metre derinliğinde sondaj yapılmıştır. Ayrıca arazide 4 adet temel sondaj kuyusu açılmış ve 17 adet örselenmiş (SPT), 2 adet örselenmemiş (UD) numune alınmıştır. Alınan numuneler üzerinde PUSULA LAB. HİZ. LTD. ŞTİ. laboratuvarlarında zeminlerin fiziksel ve mekanik özelliklerinin belirlenmesi amacıyla örselenmiş ve örselenmemiş numuneler üzerinde laboratuvar deneyleri yapılmıştır.`,
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
  const coverDate = dateObj.toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase() + ", " + dateObj.getFullYear();

  const projectName = (sections && sections.projectName) || (project && project.name) || 'Zemin İyileştirme Projesi';
  const parcelName = (sections && sections.parcelName) || (sections && sections.location) || (project && project.description) || '[Parsel adı]';
  const parcelOwner = (sections && sections.parcelOwner) || (sections && sections.employer) || '[Parsel sahibi]';
  const projectLocation = parcelName;
  const reportNumber = (sections && sections.docNumber) || '';
  const preparedBy = (sections && sections.preparedBy) || 'Bursa Teknik Üniversitesi';
  const engineer = (sections && sections.engineer) || 'Prof. Dr. Eyübhan AVCI';
  const employer = (sections && sections.employer) || parcelOwner;
  const reportDefaults = buildReportSectionDefaults({ parcelName, parcelOwner, dateStr });

  const tableRows = [
    { label: 'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları (TBDY-2018 Tablo 3.1)', page: '8' },
    { label: 'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıflarına göre tanımlanan bina yükseklik aralıkları (TBDY-2018 Tablo 3.3)', page: '8' },
    { label: 'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve Düzeltilmiş SPT Değerleri', page: '10' },
    { label: 'Tablo 4.2. Laboratuvar toplu deney sonuçları', page: '11' },
    { label: 'Tablo 7.1. Geoteknik Hesaplarında Kullanılması Önerilen Geoteknik Parametreler', page: '13' },
    { label: 'Tablo 8.1. Yerel Zemin Sınıfı (TBDY-2018 Tablo 16.1)', page: '19' },
    { label: 'Tablo 8.2. İnceleme Alanı Deprem Parametreleri', page: '20' },
    { label: 'Tablo 8.3. Yerel Zemin Katsayıları', page: '20' },
    { label: 'Tablo 8.4. Kısa periyot bölgesi için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.1)', page: '20' },
    { label: 'Tablo 8.5. 1.0 saniye periyot için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.2)', page: '20' },
    { label: 'Tablo 8.6. Elde Edilen Yatay ve Düşey Elastik Tasarım Spektrumu', page: '21' },
    { label: 'Tablo 8.7. Deprem Tasarım Sınıfları', page: '21' }
  ];

  const figureRows = [
    { label: 'Şekil 2.1. İnceleme alanına ait genel uydu haritası', page: '6' },
    { label: 'Şekil 3.1. Vaziyet Planı', page: '7' },
    { label: 'Şekil 6.1. İdealize zemin profilinde alınan kesitler', page: '12' },
    { label: 'Şekil 6.2. İdealize Zemin profilinin çıkarılması A-A Kesiti', page: '12' },
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
        document: { run: { font: "Times New Roman", size: 24 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          run: { font: "Arial", size: 28, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          run: { font: "Arial", size: 24, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
          run: { font: "Arial", size: 24 },
          paragraph: { spacing: { before: 120, after: 120 } }
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
          new Paragraph({ text: (projectLocation + " " + projectName).toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { before: 1000, after: 1000 } }),
          ...(employer ? [new Paragraph({ text: employer.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 1000 } })] : []),
          new Paragraph({ text: "ZEMİN İYİLEŞTİRME PROJESİ HESAP RAPORU", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 32, bold: true }, spacing: { after: 1500 } }),
          
          new Paragraph({ text: "HAZIRLAYAN", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true, underline: { type: "single" } }, spacing: { after: 300 } }),
          new Paragraph({ text: engineer, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 28, bold: true }, spacing: { after: 100 } }),
          new Paragraph({ text: preparedBy, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Mühendislik ve Doğa Bilimleri Fakültesi", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "İnşaat Mühendisliği Bölümü", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 100 } }),
          new Paragraph({ text: "Geoteknik Anabilim Dalı Başkanı", alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, italics: true }, spacing: { after: 1000 } }),
          
          new Paragraph({ text: coverDate, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, bold: true }, spacing: { before: 1000 } }),
          new Paragraph({ text: reportNumber ? "Rapor No: " + reportNumber : "Rapor No: " + project.id, alignment: AlignmentType.CENTER, run: { font: "Times New Roman", size: 24, bold: true }, spacing: { before: 500 } }),
        ]
      },
      // İçindekiler, Tablolar ve Şekiller Listesi
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
        },
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
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } }
        },
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
          ...createParagraphs(getSec(sections, 'intro', reportDefaults.intro)),
          
          new Paragraph({ text: "2. İNCELEME ALANI HAKKINDA BİLGİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'areaInfo', reportDefaults.areaInfo)),
          
          new Paragraph({ text: "3. YAPI HAKKINDA BİLGİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'structureInfo', reportDefaults.structureInfo)),
          
          new Paragraph({ text: "4. MEVCUT ZEMİN ARAŞTIRMALARI", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'existingResearch', reportDefaults.existingResearch)),
          
          new Paragraph({ text: "5. İLAVE ZEMİN ARAŞTIRMALARI", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'additionalResearch', reportDefaults.additionalResearch)),
          
          new Paragraph({ text: "6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'soilProfile', reportDefaults.soilProfile)),
          
          new Paragraph({ text: "7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki değerler sistem tarafından hesaplanmış ve veritabanına kilitlenmiştir. Bu değerler kullanıcı tarafından değiştirilemez.", italics: true }),
          createDataTable(pRows),
          
          new Paragraph({ text: "8. DEPREMSELLİK", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'seismicity', reportDefaults.seismicity)),
          
          new Paragraph({ text: "9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki sonuçlar ZEMSIS yazılımı tarafından hesaplanmış ve veritabanına kilitlenmiştir.", italics: true }),
          ...resCategories.map(cat => {
            return [
              new Paragraph({ text: cat.title, heading: HeadingLevel.HEADING_2 }),
              createDataTable(cat.rows)
            ];
          }).flat(),
          
          new Paragraph({ text: "10. ÖNERİLEN TEMEL SİSTEMİ", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'foundationSystem', reportDefaults.foundationSystem)),
          
          new Paragraph({ text: "11. SONUÇ VE ÖNERİLER", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'conclusions', reportDefaults.conclusions)),
          
          new Paragraph({ text: "12. YARARLANILAN KAYNAKLAR", heading: HeadingLevel.HEADING_1 }),
          ...createParagraphs(getSec(sections, 'references', reportDefaults.references)),
        ]
      }
    ]
  });

  return doc;
}

module.exports = router;
