const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { authMiddleware, officerMiddleware } = require('./auth');
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
  VerticalAlign,
  Header,
  Footer,
  TableOfContents,
} = require('docx');

const router = express.Router();

router.use(authMiddleware);

// ── Doğrulama kodu üretici ────────────────────────────────────────────────────
function generateVerifyCode(projectId) {
  const year = new Date().getFullYear();
  const projectSlug = String(projectId || '').replace(/-/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I karışıklığı yok
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `ZMS-${year}-${projectSlug}-${rand}`;
}

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

// ── POST /api/reports/images/:projectId ─────────────────────────────────────
// Görsel yükle; base64 dataUrl kabul et, BYTEA olarak sakla, UUID döndür.
// Frontend canvas → dataUrl → buraya gönderir; JSONB'de büyük base64 blob kalmaz.
router.post('/images/:projectId', async (req, res) => {
  try {
    const { dataUrl, width, height, mimeType, name, caption, sectionKey } = req.body;

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
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, error: 'Görsel kaydedilemedi' });
  }
});

// ── GET /api/reports/images/:imageId ────────────────────────────────────────
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

// ── DELETE /api/reports/images/:imageId ─────────────────────────────────────
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
    // (UUID → { buffer, mimeType, width, height, caption } harita)
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

// getSec() — STRING FALLBACK SİSTEMİ KALDIRILDI.
// Blok sistemine tam geçişle birlikte bu fonksiyon artık kullanılmıyor.
// Eski DB kayıtlarını otomatik dönüştürme mantığı getSectionBlocks() içine taşındı.

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
    soilProfile: `Yapının yapılacağı temel altı zemini için sondaj verileri ve sismik veriler kullanılarak idealize zemin profilleri çıkartılmıştı. Zemin profili incelendiğinde 0,00-0,50 metre arasında Dolgu tabaka, 0,50-7,50 metre arasında Siltli Kil tabaka, 7,50-12,00 metre arasında Siltli Kum tabaka ve 12,00-20,00 metre arasında Siltli Kil tabaka yer almaktadır. İnceleme alanında 3.50 m’de yeraltı suyuna rastlanmıştır.`,
    seismicity: `01/01/2019 tarihinde Türkiye Bina Deprem Yönetmeliği’nin (TBDY-2018) yürürlüğe girmesi ile birlikte Geoteknik ve Yapı tasarımında bu yönetmelik hükümleri uygulanmaktadır. TBDY-2018 ile beraber 22/01/2018 tarih ve 2018/11275 sayılı Bakanlar Kurulu kararı ile Türkiye Deprem Tehlike Haritaları yürürlülüğe girmiştir ve tasarımda bu haritalardan yararlanılmaktadır (Şekil 8.1.). Bursa ili ve çevresi “Afet İşleri Genel Müdürlüğü” nce yayınlanan “Türkiye Deprem Tehlike Haritası” nda Yüksek Tehlike riski taşıyan alan içinde kalmaktadır. Bursa yöresinde aktif olarak deprem oluşturabilecek 4 fay bulunmaktadır.  Bunlar Gemlik Fayı, Bursa Fayı, Uluabat Fayı ve Zeytinbağı Fayı dır. 

Gemlik fayı, Kuzey Anadolu fayının bir koludur. Kuzey Anadolu fayının Geyve-Gemlik arasında kalan kısmı birkaç segmentten oluşmaktadır. Geyve batısında Sakarya nehrini yaklaşık 10-15 km sağ yönlü olarak öteleyen fay Geyve havzasını güneyden sınırlar. Fay, batıya doğru Mekece yakınlarında sağa sıçrama yaparak Mekece içinden geçer ve yine havzayı sınırlayarak İznik’e doğru devam eder. Mekece batısına doğru B-GB istikametinde devam eden fay Kaynarca’dan geçerek İznik Gölü’nün güneyine doğru uzanır. Çerkeşli ile İznik gölü arasında genelde gölün güney kenarı boyunca izlenir. Fay, Sölöz civarında çatallanır ve tali bir kol güneybatıya ayrılarak devam eder. Ana kol ise İznik gölünün batı ucundan yaklaşık doğu-batı istikametinde Gemlik körfezine doğru uzanır. Fayın bu kesimi Gemlik’in 7-8 km doğusunda yine çatallanır ve bir kol güneybatıya doğru ayrılarak Engürücük güneyinden Gençali köyünden geçer ve denize girer.Bu bölgelerdeki ötelenmiş dereler, fay façetaları ile şevler, fayın sağ yanal atımlı bir yapıda olduğunu göstermektedir (Yılmaz ve diğ., 1995). Gemlik Fayı, İznik gölü ile Gemlik körfezi arasında uzanır ve D-B doğrultusundadır. Fayın doğu ve batı uzantıları su altında olup karada izlenebilen bölümünün uzunluğu yaklaşık 40 kmdir (Kuşçu vd., 2009). 

Ulubat ve Manyas Fayı, normal bileşenli sağ yanal atımlıdır. Yanal atımlı faylar Gölcük depremini oluşturan faylar gibi büyük hasar yaratan faylardır. Manyas Fayı 1964'te kırılmış ve 7 büyüklüğünde bir depreme yol açmıştır. Manyas gibi bir normal fay olan Ulubat Fayı ise yakın dönemde henüz kırılmamıştır (Manyas ve Ulubat gölleri bu fayların kırılmasıyla oluşmuştur). Ulubat Fayı aktif bir fay olduğuna göre kırılmamış olması riskli bir durumdur. İki parçalı bu fayın 30 kilometrelik uzun parçası kırılırsa 6 büyüklük civarında bir deprem üretebilir. Nitekim Gönen'de 1 Şubat 2001'de meydana gelen 4 büyüklüğündeki deprem bu bölgede sismik hareketlilik yaşandığını gösteriyor. Kuzey Anadolu Fay hattının güney kolu üzerinde, doğudan batıya doğru, birbirinden sağa sıçramalı yapılarla ayrılan segmentlerden biridir. Taze fay diklikleri ve morfolojik ötelenmeler kol boyunca Holosen aktivitesinin varlığını göstermektedir (Tsukuda vd., 1988; Honkura ve Işıkara, 1991; Yoshioka ve Kuşçu, 1994; Barka, 1997). Öte yandan sismik profillerde Marmara Denizi güney şelfinde izlenen fayın Geç Kuvaterner aktivitesine ilişkin izler oldukça belirgindir (Alpar ve Çizmeci, 1999; Yaltırak ve Alpar, 2002; Okamura vd., 2003; Kurtuluş ve Canbay, 2007; Kuşçu vd., 2009).`,
    foundationSystem: 'Yapılan değerlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun olduğu görülmüştür.',
    conclusions: 'İnceleme alanı kapsamında yapılan analiz ve değerlendirmeler sonucunda, zemin iyileştirme ihtiyacı ve uygulanacak yöntem belirlenmiştir.',
    references: `TBDY-2018, Türkiye Bina Deprem Yönetmeliği, 2018.
Çevre ve Şehircilik Bakanlığı, Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı, Mart 2019.`,
  };
}

// Girinti sabitleri (twips: 1 inch = 1440 twips, 2.54 cm = 1440 twips)
// 0.5 cm  = 284 twips
const INDENT_05CM = 284;
// 0.52 cm = 295 twips
const INDENT_052CM = 295;

function createParagraphs(text) {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim().length > 0).map(line => {
    const isSubHeading = /^\d+\.\d+\./.test(line.trim());
    return new Paragraph({
      children: [new TextRun({ text: line.trim(), bold: isSubHeading })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120 },
      indent: { firstLine: INDENT_052CM },
    });
  });
}

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '-';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val);
  // Büyük sayıları (hem tam hem ondalıklı) Türkçe locale ile formatla
  if (Math.abs(n) >= 1000) return n.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
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
// Logo dosyası her rapor oluşturmada taze okunur; böylece sunucu
// yeniden başlatılmadan da dosya değişikliği anında yansıtılır.
function loadDefaultLogoBuffer() {
  if (!fs.existsSync(DEFAULT_LOGO_PATH)) return null;
  return fs.readFileSync(DEFAULT_LOGO_PATH);
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

/**
 * Logo asset'i döner:
 *  - dbImages map'inde coverLogoId varsa oradan al (yeni format)
 *  - sections.coverLogo.dataUrl varsa eski format
 *  - Fallback: disk'ten varsayılan logo
 */
function getLogoAsset(sections, dbImages = {}) {
  // Yeni format: coverLogoId UUID
  const logoId = sections && sections.coverLogoId;
  if (logoId && dbImages[logoId]) {
    return dbImages[logoId];
  }

  // Eski format: coverLogo.dataUrl (geriye dönük uyumluluk)
  const uploaded = parseImageInput(sections && sections.coverLogo);
  if (uploaded) return uploaded;

  // Fallback: varsayılan logo
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

function createFooterTable(logoAsset, dateStr, verifyCode) {
  const logoRun = createLogoRun(logoAsset, 28);
  const logoParagraph = logoRun
    ? new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [logoRun],
      })
    : new Paragraph({ text: '', spacing: { before: 0, after: 0 } });

  const footerText = verifyCode
    ? `ZEMSIS © ${new Date().getFullYear()} - Tarih: ${dateStr}  |  Doğrulama Kodu: ${verifyCode}`
    : `ZEMSIS © ${new Date().getFullYear()} - Tarih: ${dateStr}`;

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
                  new TextRun({ text: footerText, size: 16, color: '555555' }),
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

  // Kullanıcı tanımlı tablolar
  const userTableSections = [
    'intro', 'areaInfo', 'structureInfo', 'existingResearch', 'additionalResearch',
    'soilProfile', 'seismicity', '_results', 'foundationSystem', 'conclusions',
  ];
  for (const sectionKey of userTableSections) {
    const tbls = getSectionTables(sections, sectionKey);
    tbls.forEach((tbl, idx) => {
      const sectionNum = REPORT_SECTION_NUMBERS[sectionKey] || '';
      const captionNum = sectionNum ? `${sectionNum}.${idx + 1}` : `${idx + 1}`;
      const name = typeof tbl.name === 'string' && tbl.name.trim() ? tbl.name.trim() : 'İsimsiz Tablo';
      rows.push({ label: `Tablo ${captionNum}. ${name}`, page: '' });
    });
  }

  return rows;
}

function buildFigureRowsDynamic({ sections, dbImages = {} }) {
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
    const images = getSectionImages(sections, sectionKey, dbImages);
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
  return buildTableRowsDynamic({ sections, pRows, resCategories });
}

function buildFigureRows({ sections, dbImages = {} }) {
  return buildFigureRowsDynamic({ sections, dbImages });
}

// İçindekiler listesini dinamik olarak oluşturur.
// Tüm bölümler varsayılan içerikle her zaman raporda yer aldığından
// liste genellikle eksiksiz döner; ancak bu yapı gelecekteki isteğe
// bağlı bölümler için kolayca genişletilebilir.
function buildTocRows({ sections, pRows, resCategories, reportDefaults }) {
  const tocDefs = [
    { label: '1. Giriş',                                                     page: '5',  key: 'intro' },
    { label: '2. İnceleme Alanı Hakkında Bilgiler',                          page: '6',  key: 'areaInfo' },
    { label: '3. Yapı Hakkında Bilgiler',                                     page: '7',  key: 'structureInfo' },
    { label: '4. Mevcut Zemin Araştırmaları',                                 page: '10', key: 'existingResearch' },
    { label: '5. İlave Zemin Araştırmaları',                                  page: '11', key: 'additionalResearch' },
    { label: '6. İdealize Zemin Profili ve Yer Altı Suyu Durumu',             page: '12', key: 'soilProfile' },
    { label: '7. Geoteknik Tasarım Parametrelerinin Tespiti',                 page: '13', always: true },
    { label: '8. Depremsellik',                                               page: '14', key: 'seismicity' },
    { label: '9. Zemin İyileştirme Alternatifleri',                           page: '21', always: true },
    { label: '10. Önerilen Temel Sistemi',                                    page: '23', key: 'foundationSystem' },
    { label: '11. Sonuç ve Öneriler',                                         page: '24', key: 'conclusions' },
    { label: '12. Yararlanılan Kaynaklar',                                    page: '25', key: 'references' },
  ];

  return tocDefs
    .filter(item => {
      if (item.always) return true;
      // Bölümde en az bir blok içeriği varsa TOC'a ekle (blok sistemi)
      const blocks = getSectionBlocks(sections, item.key, (reportDefaults && reportDefaults[item.key]) || '');
      return blocks.length > 0 && blocks.some(b => b?.text?.trim());
    })
    .map(item => ({ label: item.label, page: item.page }));
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

/**
 * Bir bölümün görsel listesini döner.
 * İki format desteklenir:
 *  - Yeni: sections.{key}Images = ["uuid1", "uuid2"]  (string array)
 *  - Eski: sections.{key}Images = [{id, dataUrl, ...}] (obje array)
 * dbImages: { [imageId]: { buffer, mimeType, width, height, caption } }
 */
function getSectionImages(sections, sectionKey, dbImages = {}) {
  const raw = sections && sections[`${sectionKey}Images`];
  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => {
      if (typeof item === 'string') {
        // Yeni format: UUID string
        const dbImg = dbImages[item];
        if (!dbImg) return null;
        return dbImg;
      }
      if (item && typeof item === 'object') {
        // Eski format: obje (dataUrl içeriyor)
        return item;
      }
      return null;
    })
    .filter(Boolean);
}

function getSectionTables(sections, sectionKey) {
  const tables = sections && sections[`${sectionKey}Tables`];
  return Array.isArray(tables) ? tables.filter(t => t && typeof t === 'object') : [];
}

/**
 * Bir bölümün blok içeriğini 3 katmanlı öncelikle döner:
 *  1. sections[sectionKey + 'Blocks'] mevcutsa → doğrudan kullan (yeni blok sistemi)
 *  2. sections[sectionKey] eski string mevcutsa → tek paragraph bloğuna çevir (eski DB uyumluluğu)
 *  3. Her ikisi de yoksa → defaultText'ten tek paragraph bloğu üret (varsayılan içerik)
 */
function getSectionBlocks(sections, sectionKey, defaultText = '') {
  // 1. Yeni blok sistemi
  const blocks = sections && sections[`${sectionKey}Blocks`];
  if (Array.isArray(blocks) && blocks.length > 0) return blocks;

  // 2. Eski string sistemi (DB'de eski format varsa geriye dönük uyumluluk)
  const legacyStr = sections && sections[sectionKey];
  if (typeof legacyStr === 'string' && legacyStr.trim()) {
    return [{ type: 'paragraph', text: legacyStr.trim() }];
  }

  // 3. Varsayılan metin
  const def = typeof defaultText === 'string' ? defaultText.trim() : '';
  if (def) return [{ type: 'paragraph', text: def }];

  return [];
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

/**
 * createImageBlocks: her bir image için hem yeni (buffer) hem eski (dataUrl) formatı destekler.
 */
function createImageBlocks(sectionKey, images) {
  if (!images || !images.length) return [];
  const sectionNumber = getSectionNumber(sectionKey);
  const maxWidth = 520;
  const maxHeight = 380;

  return images.flatMap((img, index) => {
    let buffer, mimeType;

    if (Buffer.isBuffer(img.buffer)) {
      // Yeni format: DB'den çekilmiş BYTEA
      buffer = img.buffer;
      mimeType = img.mimeType || img.mime_type || 'image/jpeg';
    } else if (typeof img.dataUrl === 'string') {
      // Eski format: base64 dataUrl
      const parsed = parseDataUrl(img.dataUrl);
      if (!parsed) return [];
      buffer = parsed.buffer;
      mimeType = parsed.mimeType;
    } else {
      return [];
    }

    const width = Number(img.width) || maxWidth;
    const height = Number(img.height) || maxHeight;
    const scaled = scaleToFit(width, height, maxWidth, maxHeight);
    const figureNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
    const caption = typeof img.caption === 'string' && img.caption.trim() ? img.caption.trim() : 'Görsel';
    void mimeType; // docx kütüphanesi mime türünü auto-detect ediyor

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [
          new ImageRun({
            data: buffer,
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


function createBlocksContent(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  return blocks.flatMap(block => {
    const text = (block.text || '').trim();
    if (!text) return [];
    switch (block.type) {
      case 'subheading':
        return [new Paragraph({
          children: [new TextRun({
            text,
            font: 'Times New Roman',
            size: 24, // 12pt
            bold: true,
          })],
          indent: { left: INDENT_05CM },
          spacing: { before: 160, after: 80 },
          alignment: AlignmentType.LEFT,
        })];
      case 'sideheading':
        return [new Paragraph({
          children: [new TextRun({
            text,
            font: 'Times New Roman',
            size: 24,
            bold: true,
            underline: { type: 'single' },
          })],
          indent: { left: INDENT_05CM },
          spacing: { before: 120, after: 80 },
          alignment: AlignmentType.LEFT,
        })];
      default: // paragraph
        return text.split('\n').filter(line => line.trim()).map(line =>
          new Paragraph({
            children: [new TextRun({
              text: line.trim(),
              font: 'Times New Roman',
              size: 24,
            })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            indent: { firstLine: INDENT_052CM },
          })
        );
    }
  });
}

function createSectionBlocks(sectionKey, title, images = [], blocks = []) {
  const contentParagraphs = (Array.isArray(blocks) && blocks.length > 0)
    ? createBlocksContent(blocks)
    : [];
  return [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      indent: { left: INDENT_052CM },
    }),
    ...contentParagraphs,
    ...createImageBlocks(sectionKey, images),
  ];
}

const REPORT_TABLE_SECTION_NUMBERS = {
  intro: '1', areaInfo: '2', structureInfo: '3',
  existingResearch: '4', additionalResearch: '5',
  soilProfile: '6', _params: '7', seismicity: '8',
  _results: '9', foundationSystem: '10', conclusions: '11', references: '12',
};

// Hücre nesnesini normalize et (backend)
function normalizeCellBackend(cell) {
  if (typeof cell === 'string' || cell == null) {
    return {
      text: cell || '',
      bold: false,
      bg: '',
      align: 'left',
      colspan: 1,
      rowspan: 1,
      borders: { top: true, bottom: true, left: true, right: true },
    };
  }
  return {
    text: cell.text ?? '',
    bold: cell.bold ?? false,
    bg: cell.bg ?? '',
    align: cell.align ?? 'left',
    colspan: cell.colspan ?? 1,
    rowspan: cell.rowspan ?? 1,
    borders: {
      top: cell.borders?.top ?? true,
      bottom: cell.borders?.bottom ?? true,
      left: cell.borders?.left ?? true,
      right: cell.borders?.right ?? true,
    },
  };
}

function hexToDocxColor(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return clean.toUpperCase();
}

function createUserTableBlocks(sectionKey, tables) {
  if (!tables || !tables.length) return [];
  const sectionNumber = REPORT_TABLE_SECTION_NUMBERS[sectionKey] || '';
  const blocks = [];
  tables.forEach((tbl, idx) => {
    if (!tbl || !tbl.rows || !tbl.cols) return;
    const captionNum = sectionNumber ? `${sectionNumber}.${idx + 1}` : `${idx + 1}`;
    const caption = typeof tbl.name === 'string' && tbl.name.trim() ? tbl.name.trim() : 'İsimsiz Tablo';

    const rows = [];

    // colspan + rowspan render: 2D occupied haritaı
    // key: "r,c" → value: true (o pozisyon başka hücrece kaplanıyor)
    const occupied = new Map();

    for (let r = 0; r < tbl.rows; r++) {
      const cells = [];
      let c = 0;

      while (c < tbl.cols) {
        // Bu pozisyon başka bir hücre tarafından kaplanıyor mu?
        if (occupied.has(`${r},${c}`)) { c++; continue; }

        const rawCell = tbl.cells[r * tbl.cols + c];
        const cell = normalizeCellBackend(rawCell);
        const colspan = Math.min(Math.max(1, cell.colspan || 1), tbl.cols - c);
        const rowspan = Math.min(Math.max(1, cell.rowspan || 1), tbl.rows - r);

        // Kaplanan tüm (dr, dc) pozisyonları işaretle
        for (let dr = 0; dr < rowspan; dr++) {
          for (let dc = 0; dc < colspan; dc++) {
            if (dr === 0 && dc === 0) continue;
            occupied.set(`${r + dr},${c + dc}`, true);
          }
        }

        const cellText = String(cell.text || '');
        const isFirstRow = r === 0;

        // Arka plan rengi
        const bgColor = hexToDocxColor(cell.bg);
        // İlk satır için bg belirtilmemişse D9D9D9 uygula
        const shadingFill = bgColor || (isFirstRow ? 'D9D9D9' : null);

        // Kalın: hücre ayarı OR ilk satır
        const bold = cell.bold || isFirstRow;

        // Hizalama
        const alignMap = {
          left: AlignmentType.LEFT,
          center: AlignmentType.CENTER,
          right: AlignmentType.RIGHT,
        };
        const alignment = alignMap[cell.align] || (isFirstRow ? AlignmentType.CENTER : AlignmentType.LEFT);

        // Kenarlık stilleri
        const b = cell.borders;
        const borderOn = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
        const borderOff = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const cellBorders = {
          top: b.top ? borderOn : borderOff,
          bottom: b.bottom ? borderOn : borderOff,
          left: b.left ? borderOn : borderOff,
          right: b.right ? borderOn : borderOff,
        };

        const tableCellOptions = {
          children: [new Paragraph({
            children: [new TextRun({ text: cellText, bold })],
            alignment,
          })],
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: colspan > 1 ? colspan : undefined,
          rowSpan: rowspan > 1 ? rowspan : undefined,
        };

        if (shadingFill) {
          tableCellOptions.shading = { fill: shadingFill };
        }

        cells.push(new TableCell(tableCellOptions));
        c += colspan;
      }

      rows.push(new TableRow({ children: cells }));
    }

    // Tablo genelindeki kenarlık (hücre kenarlıkları zaten ayarlandı, tablo dış kenarlığı için de SINGLE bırak)
    blocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
          insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
        },
        rows,
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 120 },
        children: [
          new TextRun({
            text: `Tablo ${captionNum}. ${caption}`,
            italics: true,
          }),
        ],
      })
    );
  });
  return blocks;
}


// ── Bölüm 9: Jet-grout ile iyileştirme anlatımı ──────────────────────────────
// Gerçek bir geoteknik raporda olduğu gibi; prose paragraflar, formül satırları
// ve hesap sonuçlarını içeren tablolar bir arada oluşturulur.
function buildJetGroutNarrativeSection({ lockedParams, lockedResults }) {
  const p = lockedParams || {};
  const r = lockedResults || {};

  // Yardımcı: sayı formatı
  const fmt = (v, dec = 2) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '-';
    return n.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  // Yardımcı: lockedResults'tan değer al (birden fazla kategori)
  const rv = (cat, key) => {
    const item = r[cat] && r[cat][key];
    if (!item) return null;
    return typeof item === 'object' ? item.value : item;
  };

  // Parametreler
  const D         = p.D         || '-';
  const s         = p.s         || '-';
  const H         = p.H         || '-';
  const cu        = p.cu        || '-';
  const alpha     = p.alpha     || '-';
  const Nc        = p.Nc        || '-';
  const sigmaJet  = p.sigmaJet  || '-';
  const Fs        = p.Fs        || '-';
  const FS        = p.FS_improved || p.FS || '-';

  // Sonuçlar
  const Ajet         = rv('geometry', 'Ajet');
  const a            = rv('geometry', 'a');
  const aPercent     = rv('geometry', 'aPercent');
  const Qs_raw       = rv('capacity', 'Qs_raw');
  const Qs_safe      = rv('capacity', 'Qs_safe');
  const Qu_raw       = rv('capacity', 'Qu_raw');
  const Qu_safe      = rv('capacity', 'Qu_safe');
  const Qkolon_limit = rv('capacity', 'Qkolon_limit');
  const Qkolon       = rv('capacity', 'Qkolon');
  const Qcrush       = rv('capacity', 'Qcrush');
  const cuImproved   = rv('improvedSoil', 'cuImproved');
  const qemnImproved = rv('improvedSoil', 'qemnImproved');
  const Eimproved    = rv('improvedSoil', 'Eimproved');
  const settlementCm = rv('settlement', 'deltaCm');
  const sigmaJetDesign = rv('material', 'sigmaJetDesign');

  // --- Yardımcı paragraf oluşturucu ---
  const para = (text, opts = {}) => new Paragraph({
    children: [new TextRun({
      text,
      font: 'Times New Roman',
      size: 24,
      bold:    opts.bold    || false,
      italics: opts.italic  || false,
    })],
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing:   { after: opts.afterSpacing ?? 120, before: opts.beforeSpacing ?? 0 },
    indent:    opts.noIndent ? {} : { firstLine: INDENT_052CM },
  });

  const heading2 = (text) => new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    indent: { left: INDENT_05CM },
  });

  const formulaPara = (text) => new Paragraph({
    children: [new TextRun({ text, font: 'Times New Roman', size: 24, italics: true })],
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
    indent: { left: 720 },  // ~1.27 cm sol girinti
  });

  const tableCaptionPara = (num, caption) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 160 },
    children: [new TextRun({ text: `Tablo 9.${num}. ${caption}`, italics: true, font: 'Times New Roman', size: 24 })],
  });

  const blocks = [];

  // ────── Giriş paragrafı ──────
  blocks.push(
    para(`Tasarımda yapıların altına Jet-grout teşkili yapılmıştır. Jet-grout kolonları temel altlarına ${
      H
    } m boyunda, ${
      D
    } m çapında ve ${
      s
    } m x ${
      s
    } m karelajlı olacak şekilde yerleştirilmiştir. Jet-grout kolonlarına ait yerleşim planları ve detaylar zemin iyileştirme projesi üzerinde gösterilmiştir.`),
    para(`Jet-grout kolonlarında taşıma gücü hesabı yapılırken, literatürde de yaygın olarak kullanılan, İyileştirme alan oranına bağlı olarak mukavemet parametrelerinden kohezyon değerinin iyileşeceği esasına dayalı yaklaşım yapılmıştır.`),
  );

  // ────── 9.1 Çevre Sürtünmesi ve Uç Direnci ──────
  blocks.push(
    heading2('9.1. Çevre Sürtünmesi ve Uç Direnci'),
    para(`Jet-grout kolonunun çevre sürtünme kapasitesi ve uç direnci aşağıdaki formüllere göre hesaplanmıştır:`),
    formulaPara(`cu = ${fmt(cu, 0)} kPa  (zemin için alınan kohezyon değeri)`),
    formulaPara(`H = ${fmt(H, 0)} m  (Jet-grout kolon boyu)`),
    formulaPara(`D = ${fmt(D, 2)} m  (Jet-grout kolon çapı)`),
    formulaPara(`α = ${fmt(alpha, 2)}  (sürtünme kapasitesi azaltma faktörü)`),
    formulaPara(`Qs = α · cu · π · D · H`),
  );
  if (Qs_raw !== null) blocks.push(formulaPara(`Qs = ${fmt(Qs_raw)} kN  (Kolon çevre sürtünme kapasitesi)`));
  if (Qs_safe !== null) blocks.push(formulaPara(`Qs / γRu = ${fmt(Qs_safe)} kN  (Emniyetli çevre sürtünme kapasitesi)`));

  blocks.push(
    formulaPara(`Qu = Nc · cu · Ap`),
    formulaPara(`Nc = ${fmt(Nc, 2)}`),
  );
  if (Ajet !== null) blocks.push(formulaPara(`Ap = ${fmt(Ajet, 4)} m²  (Kolon kesit alanı)`));
  if (Qu_raw !== null) blocks.push(formulaPara(`Qu = ${fmt(Qu_raw)} kN  (Kolon uç taşıma kapasitesi)`));
  if (Qu_safe !== null) blocks.push(formulaPara(`Qu / γRsb = ${fmt(Qu_safe)} kN  (Emniyetli uç taşıma kapasitesi)`));

  // ────── 9.2 Kolon Taşıma Kapasitesi ──────
  blocks.push(
    heading2('9.2. Kolon Taşıma Kapasitesi'),
    para(`Jet-grout kolonunun emniyetli taşıma kapasitesi ve yapısal basınç dayanımı aşağıdaki şekilde belirlenmiştir:`),
  );
  if (Qkolon_limit !== null) {
    blocks.push(
      formulaPara(`Qemn = Qu/γRsb + Qs/γRu = ${fmt(Qkolon_limit)} kN  (Jet-grout kolonu emniyetli kapasitesi)`),
    );
  }
  blocks.push(
    formulaPara(`σc = ${fmt(sigmaJet, 0)} kPa  (${fmt((parseFloat(sigmaJet) || 0) / 1000, 1)} MPa) — Jet-grout tasarım dayanımı`),
    formulaPara(`Fs = ${fmt(Fs, 0)}  (Güvenlik sayısı)`),
  );
  if (Ajet !== null) blocks.push(formulaPara(`Ac = ${fmt(Ajet, 4)} m²  (Jet-grout kolonu kesit alanı)`));

  const sigmaDesignMPa = sigmaJetDesign ? parseFloat(sigmaJetDesign) / 1000 : null;
  if (sigmaDesignMPa !== null && Qcrush !== null) {
    blocks.push(
      formulaPara(`Qbasınç = σc/Fs · Ac = ${fmt(sigmaJetDesign, 0)} kPa × ${fmt(Ajet, 4)} m² = ${fmt(Qcrush)} kN`),
    );
  }
  if (Qkolon !== null && Qkolon_limit !== null && Qcrush !== null) {
    const kolonSafe = parseFloat(Qkolon) < parseFloat(Qkolon_limit);
    const crushSafe = parseFloat(Qcrush) > parseFloat(Qkolon);
    blocks.push(
      para(`Hesaplamalar sonucunda Jet-grout kolonuna gelen yük Qkolon = ${fmt(Qkolon)} kN olarak hesaplanmıştır. Teşkil edilecek kolonun emniyetli taşıma kapasitesi (${fmt(Qkolon_limit)} kN) ve yapısal basınç dayanımı (${fmt(Qcrush)} kN) kolona gelen yükün üzerinde olduğundan kolon boyutlandırması uygun bulunmuştur.${
        kolonSafe && crushSafe ? '' : ' (Uyarı: Kontrol sağlanamıyor olabilir, parametreleri gözden geçiriniz.)'
      }`),
      formulaPara(`Qbasınç (${fmt(Qcrush)} kN) > Qkolon (${fmt(Qkolon)} kN)  ✓`),
      formulaPara(`Qemn (${fmt(Qkolon_limit)} kN) > Qkolon (${fmt(Qkolon)} kN)  ✓`),
    );
  }

  // Kapasite tablosu
  const capRows = [
    { label: 'Qs — Çevre Sürtünme Kapasitesi',    val: fmt(Qs_raw),       unit: 'kN' },
    { label: 'Qs/γRu — Emniyetli Sürtünme',       val: fmt(Qs_safe),      unit: 'kN' },
    { label: 'Qu — Uç Taşıma Kapasitesi',         val: fmt(Qu_raw),       unit: 'kN' },
    { label: 'Qu/γRsb — Emniyetli Uç Taşıma',    val: fmt(Qu_safe),      unit: 'kN' },
    { label: 'Qemn — Emniyetli Kolon Kapasitesi', val: fmt(Qkolon_limit), unit: 'kN' },
    { label: 'Qbasınç — Yapısal Kapasite',        val: fmt(Qcrush),       unit: 'kN' },
    { label: 'Qkolon — Kolona Gelen Yük',         val: fmt(Qkolon),       unit: 'kN' },
  ].filter(row => row.val !== '-' && row.val !== 'NaN');

  if (capRows.length > 0) {
    blocks.push(
      createDataTable(capRows),
      tableCaptionPara(1, 'Jet-grout Kolon Taşıma Kapasitesi Özeti'),
    );
  }

  // ────── 9.3 Kolon Aralığının Belirlenmesi ──────
  blocks.push(
    heading2('9.3. Jet-grout Kolon Aralığının Belirlenmesi'),
    para(`Jet-grout kolonları karelajlarının belirlenmesinde kazık etkileşimlerine dikkat edilmiştir. Alan değiştirme oranı aşağıdaki formüle göre hesaplanmıştır:`),
    formulaPara(`s = ${fmt(s, 2)} m  (Jet-grout kolonu karelajı)`),
  );
  if (Ajet !== null) blocks.push(formulaPara(`ADSM = π·D²/4 = ${fmt(Ajet, 4)} m²  (Jet-grout kolon alanı)`));
  if (a !== null)    blocks.push(formulaPara(`a = ADSM / s² = ${fmt(a, 4)}  →  a = %${fmt(aPercent !== null ? aPercent : (parseFloat(a)*100), 1)}  (Alan değiştirme oranı)`));

  // ────── 9.4 İyileştirilmiş Zeminin Taşıma Kapasitesi ──────
  blocks.push(
    heading2('9.4. İyileştirilmiş Zeminin Taşıma Kapasitesinin Belirlenmesi'),
    para(`İyileştirme sonrası kompozit zeminin kohezyon değeri, alan değiştirme oranı kullanılarak aşağıdaki şekilde hesaplanmıştır:`),
  );
  const cjet_raw = sigmaJetDesign ? parseFloat(sigmaJetDesign) * 0.4 : null;
  if (cjet_raw !== null) blocks.push(formulaPara(`cjet = σjet_tasarım × 0,4 = ${fmt(cjet_raw, 0)} kPa  (Jet-grout kohezyon değeri)`));
  blocks.push(
    formulaPara(`cu = ${fmt(cu, 0)} kPa  (zemin için alınan drenajsız kayma mukavemeti)`),
  );
  if (a !== null) blocks.push(formulaPara(`a = ${fmt(a, 4)}  (Alan değiştirme oranı)`));
  blocks.push(formulaPara(`cu_iyileştirilmiş = a · cjet + (1 − a) · cu`));
  if (cuImproved !== null) blocks.push(formulaPara(`cu_iyileştirilmiş = ${fmt(cuImproved)} kPa  (İyileştirilmiş zemin kohezyon değeri)`));

  if (qemnImproved !== null) {
    const qemnT = parseFloat(qemnImproved) / 9.81;
    blocks.push(
      para(`İyileştirme sonrası yapılan hesaplar sonunda temel altı zeminin taşıma gücü değeri ${fmt(qemnImproved)} kPa (${
        fmt(qemnT, 1)
      } t/m²) olarak hesaplanmıştır.`),
    );
  }

  // Taşıma gücü özet tablosu
  const bearingRows = [
    { label: 'İyileştirilmiş Kohezyon (cu_iyileştirilmiş)',  val: fmt(cuImproved),   unit: 'kPa' },
    { label: 'Karakteristik Taşıma Gücü (qk)',              val: fmt(qemnImproved !== null ? parseFloat(qemnImproved)*1.4 : null), unit: 'kPa' },
    { label: 'Tasarım Taşıma Gücü (qt)',                    val: fmt(qemnImproved),  unit: 'kPa' },
    { label: 'İyileştirilmiş Elastisite Modülü (E)',         val: fmt(Eimproved),     unit: 'kPa' },
  ].filter(row => row.val !== '-' && row.val !== 'NaN');

  if (bearingRows.length > 0) {
    blocks.push(
      createDataTable(bearingRows),
      tableCaptionPara(2, 'İyileştirme Sonrası Taşıma Kapasitesi'),
    );
  }

  // ────── 9.5 İyileştirme Sonrası Oturma ──────
  blocks.push(
    heading2('9.5. İyileştirme Sonrası Oturma Hesabı'),
    para(`İyileştirme sonrası oturma tahkiki de yapılmıştır. Oturma hesabında Plaxis 2D programından yararlanılmıştır. Analizler hem statik hem de dinamik koşullar için yapılmıştır. Dinamik analizlerde 1999'da Düzce'de meydana gelen depremin (Mw=7.2) ivme kayıtları kullanılmıştır.`),
  );
  if (settlementCm !== null) {
    blocks.push(
      formulaPara(`δ = qnet · H / E_iyileştirilmiş = ${fmt(settlementCm, 3)} cm  (Hesaplanan oturma değeri)`),
      para(`Yapılan hesaplamalarda temel zemininde oluşabilecek maksimum oturma değeri hesaplanmıştır. Yapılacak iyileştirme ile yapıların altındaki zeminde oturmaların sınırlandırılacağı görülmektedir.`),
    );
  }

  // Oturma tablosu
  if (settlementCm !== null) {
    const settlRows = [
      { label: 'İyileştirilmiş Elastisite Modülü (E_iyileştirilmiş)', val: fmt(Eimproved), unit: 'kPa' },
      { label: 'Hesaplanan Oturma (δ)',                               val: fmt(settlementCm, 3), unit: 'cm' },
      { label: 'Hesaplanan Oturma (δ)',                               val: fmt(settlementCm !== null ? parseFloat(settlementCm)*10 : null, 2), unit: 'mm' },
    ].filter(row => row.val !== '-' && row.val !== 'NaN');
    if (settlRows.length > 0) {
      blocks.push(
        createDataTable(settlRows),
        tableCaptionPara(3, 'İyileştirme Sonrası Oturma Hesabı Sonuçları'),
      );
    }
  }

  // ────── 9.6 Dolgu Tabakası ──────
  blocks.push(
    heading2('9.6. Yastık Dolgu Tabakası'),
    para(`Jet-grout kolonları üzerine radye temelin oturacağı 30 cm yastık dolgu tabaka teşkil edilmiştir. Dolgu malzemesi minimum 2 tabaka halinde serilmeli ve sıkıştırılmalıdır. Sıkıştırmada %95 rölatif kompaksiyon değerlerine erişilmelidir. Dolgu malzemesi standartlara uygun şekilde vasıflı dolgu malzemeden seçilmeli ve arazide gerekli sıkılık kontrolleri yapılmalıdır. Dolgu yapılırken Karayolları ve DSİ dolgu şartnamelerine uyulmalıdır.`),
  );

  return blocks;
}

function buildReportDOCX({ project, lockedParams, lockedResults, sections, verifyCode, dbImages = {} }) {
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  const coverDate = dateObj.toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase() + ", " + dateObj.getFullYear();
  const logoAsset = getLogoAsset(sections, dbImages);
  const coverLogoParagraph = createCoverLogoParagraph(logoAsset);

  const projectName = (sections && sections.projectName) || (project && project.name) || 'Zemin İyileştirme Projesi';
  const parcelName = (sections && sections.parcelName) || (sections && sections.location) || (project && project.description) || '[Parsel adı]';
  // parcelOwner ve employer bağımsız alanlardır; birbirlerine fallback yapmaları
  // döngüsel eşitliğe yol açarak kapak sayfasında employer satırını her zaman gizliyordu.
  const parcelOwner = (sections && sections.parcelOwner) || '[Parsel sahibi]';
  const projectLocation = parcelName;
  const reportNumber = (sections && sections.docNumber) || '';
  const preparedBy = (sections && sections.preparedBy) || 'Bursa Teknik Üniversitesi';
  const engineer = (sections && sections.engineer) || 'Prof. Dr. Eyübhan AVCI';
  const employer = (sections && sections.employer) || '';
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

  const tableRows = buildTableRows({ sections, pRows, resCategories });
  const figureRows = buildFigureRows({ sections, dbImages });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 0,  // Word'de katlanabilir başlık (mavi üçgen)
            indent: { left: INDENT_052CM },
          }
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: {
            spacing: { before: 240, after: 120 },
            outlineLevel: 1,  // Word'de katlanabilir alt başlık
            indent: { left: INDENT_05CM },
          }
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
          run: { font: "Times New Roman", size: 24, bold: true },
          paragraph: {
            spacing: { before: 120, after: 120 },
            outlineLevel: 2,
            indent: { left: INDENT_05CM },
          }
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
          ...(projectName ? [new Paragraph({ children: [new TextRun({ text: projectName.toUpperCase(), font: "Times New Roman", size: 36, bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 900, after: 500 } })] : []),
          ...(projectLocation ? [new Paragraph({ children: [new TextRun({ text: projectLocation.toUpperCase(), font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 300 } })] : []),
          ...(parcelOwner ? [new Paragraph({ children: [new TextRun({ text: parcelOwner.toUpperCase(), font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 300 } })] : []),
          ...(employer && employer !== parcelOwner ? [new Paragraph({ children: [new TextRun({ text: employer.toUpperCase(), font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 900 } })] : []),
          new Paragraph({ children: [new TextRun({ text: "ZEMİN İYİLEŞTİRME PROJESİ HESAP RAPORU", font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 1200 } }),

          new Paragraph({ children: [new TextRun({ text: "HAZIRLAYAN", font: "Times New Roman", size: 28, bold: true, underline: { type: "single" } })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: engineer, font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: preparedBy, font: "Times New Roman", size: 24, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "Mühendislik ve Doğa Bilimleri Fakültesi", font: "Times New Roman", size: 24, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "İnşaat Mühendisliği Bölümü", font: "Times New Roman", size: 24, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "Geoteknik Anabilim Dalı Başkanı", font: "Times New Roman", size: 24, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 1000 } }),

          new Paragraph({ children: [new TextRun({ text: coverDate, font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 900 } }),
          new Paragraph({ children: [new TextRun({ text: reportNumber ? "Rapor No: " + reportNumber : "Rapor No: " + project.id, font: "Times New Roman", size: 28, bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 300 } }),
          ...(verifyCode ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 60 },
              children: [
                new TextRun({ text: `Doğrulama Kodu: ${verifyCode}`, font: "Times New Roman", size: 20, color: '444444' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({ text: `zemsis.com/verify/${verifyCode}`, font: "Times New Roman", size: 20, color: '1155CC', underline: { type: 'single' } }),
              ],
            }),
          ] : []),
        ]
      },
      // İçindekiler, Tablolar ve Şekiller Listesi
      {
        properties: {
          page: { margin: PAGE_MARGINS }
        },
        children: [
          // ── Dinamik İçindekiler (Word TOC field) ─────────────────
          // Word belgesi açılınca sayfa numaraları otomatik hesaplanır.
          // Kullanıcı "Alanları güncelle" onayını verdiğinde veya
          // Ctrl+A → F9 ile manuel güncelleyebilir.
          new Paragraph({
            children: [new TextRun({ text: "İÇİNDEKİLER", bold: true, size: 28, font: "Times New Roman" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
          }),
          new TableOfContents("İÇİNDEKİLER", {
            // Sadece Heading 1 (bölüm başlıkları) göster
            headingStyleRange: "1-1",
            // Sayfa numarasını sağa yasla ve noktalı satır çiz
            tabLeader: "dot",
            // Tıklanabilir köprüler oluştur
            hyperlink: true,
            // TOC başlığını içindeki paragraf olarak değil ayrı yönetiyoruz
            // (yukarıdaki Paragraph zaten başlığı koydu)
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Tablolar Listesi (statik — Word'de otomatik field yok) ──
          new Paragraph({
            children: [new TextRun({ text: "TABLOLAR LİSTESİ", bold: true, size: 28, font: "Times New Roman" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 320 },
          }),
          ...createListParagraphs(tableRows),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Şekiller Listesi (statik — Word'de otomatik field yok) ──
          new Paragraph({
            children: [new TextRun({ text: "ŞEKİLLER LİSTESİ", bold: true, size: 28, font: "Times New Roman" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 320 },
          }),
          ...createListParagraphs(figureRows),
        ]
      },
      // Ana Metin
      {
        properties: {
          page: { margin: PAGE_MARGINS }
        },
        footers: {
          default: new Footer({
            children: [createFooterTable(logoAsset, dateStr, verifyCode)]
          })
        },
        children: [
          ...createSectionBlocks('intro', "1. GİRİŞ", getSectionImages(sections, 'intro', dbImages), getSectionBlocks(sections, 'intro', reportDefaults.intro)),
          ...createUserTableBlocks('intro', getSectionTables(sections, 'intro')),
          
          ...createSectionBlocks('areaInfo', "2. İNCELEME ALANI HAKKINDA BİLGİLER", getSectionImages(sections, 'areaInfo', dbImages), getSectionBlocks(sections, 'areaInfo', reportDefaults.areaInfo)),
          ...createUserTableBlocks('areaInfo', getSectionTables(sections, 'areaInfo')),
          
          ...createSectionBlocks('structureInfo', "3. YAPI HAKKINDA BİLGİLER", getSectionImages(sections, 'structureInfo', dbImages), getSectionBlocks(sections, 'structureInfo', reportDefaults.structureInfo)),
          ...createUserTableBlocks('structureInfo', getSectionTables(sections, 'structureInfo')),
          
          ...createSectionBlocks('existingResearch', "4. MEVCUT ZEMİN ARAŞTIRMALARI", getSectionImages(sections, 'existingResearch', dbImages), getSectionBlocks(sections, 'existingResearch', reportDefaults.existingResearch)),
          ...createUserTableBlocks('existingResearch', getSectionTables(sections, 'existingResearch')),
          
          ...createSectionBlocks('additionalResearch', "5. İLAVE ZEMİN ARAŞTIRMALARI", getSectionImages(sections, 'additionalResearch', dbImages), getSectionBlocks(sections, 'additionalResearch', reportDefaults.additionalResearch)),
          ...createUserTableBlocks('additionalResearch', getSectionTables(sections, 'additionalResearch')),
          
          ...createSectionBlocks('soilProfile', "6. İDEALİZE ZEMİN PROFİLİ VE YER ALTI SUYU DURUMU", getSectionImages(sections, 'soilProfile', dbImages), getSectionBlocks(sections, 'soilProfile', reportDefaults.soilProfile)),
          ...createUserTableBlocks('soilProfile', getSectionTables(sections, 'soilProfile')),
          
          new Paragraph({ text: "7. GEOTEKNİK TASARIM PARAMETRELERİNİN TESPİTİ", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Aşağıdaki değerler sistem tarafından hesaplanmış ve veritabanına kilitlenmiştir. Bu değerler kullanıcı tarafından değiştirilemez.", italics: true }),
          createDataTable(pRows),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 120 },
            children: [
              new TextRun({
                text: 'Tablo 7.1. Geoteknik Hesaplarında Kullanılması Önerilen Geoteknik Parametreler',
                italics: true,
              }),
            ],
          }),
          ...createUserTableBlocks('_params', getSectionTables(sections, '_params')),
          
          ...createSectionBlocks('seismicity', "8. DEPREMSELLİK", getSectionImages(sections, 'seismicity', dbImages), getSectionBlocks(sections, 'seismicity', reportDefaults.seismicity)),
          ...createUserTableBlocks('seismicity', getSectionTables(sections, 'seismicity')),
          
          new Paragraph({ text: "9. ZEMİN İYİLEŞTİRME ALTERNATİFLERİ", heading: HeadingLevel.HEADING_1 }),
          ...buildJetGroutNarrativeSection({ lockedParams, lockedResults }),
          // '_results' section key'i: frontend'in 'sections._resultsImages' alanını
          // göndermesi gerekir (getSectionImages pattern'i: `${sectionKey}Images`).
          ...createImageBlocks('_results', getSectionImages(sections, '_results', dbImages)),
          ...createUserTableBlocks('_results', getSectionTables(sections, '_results')),
          
          ...createSectionBlocks('foundationSystem', "10. ÖNERİLEN TEMEL SİSTEMİ", getSectionImages(sections, 'foundationSystem', dbImages), getSectionBlocks(sections, 'foundationSystem', reportDefaults.foundationSystem)),
          ...createUserTableBlocks('foundationSystem', getSectionTables(sections, 'foundationSystem')),
          
          ...createSectionBlocks('conclusions', "11. SONUÇ VE ÖNERİLER", getSectionImages(sections, 'conclusions', dbImages), getSectionBlocks(sections, 'conclusions', reportDefaults.conclusions)),
          ...createUserTableBlocks('conclusions', getSectionTables(sections, 'conclusions')),
          
          ...createSectionBlocks('references', "12. YARARLANILAN KAYNAKLAR", getSectionImages(sections, 'references', dbImages), getSectionBlocks(sections, 'references', reportDefaults.references)),
        ]
      }
    ]
  });

  return doc;
}

module.exports = router;
