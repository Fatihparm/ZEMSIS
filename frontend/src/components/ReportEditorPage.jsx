import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_URL } from '../config';
import LockedDataTable from './LockedDataTable';
import './ReportEditorPage.css';

// ── Rapor bölümleri tanımı ────────────────────────────────────
// type: 'cover'   → basit form alanları (kapak sayfası)
// type: 'wysiwyg' → CKEditor (sarı, düzenlenebilir)
// type: 'locked'  → read-only hesaplama verileri
const SECTIONS = [
  {
    key: 'cover',
    icon: 'cover',
    label: 'Kapak Bilgileri',
    type: 'cover',
    allowImages: false,
    description: 'Proje adı, işveren, yer ve belge bilgileri',
  },
  {
    key: 'intro',
    icon: '1',
    number: '1',
    label: '1. Giriş',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Projenin amacı, kapsamı ve genel bilgiler...',
    description: 'Projenin genel tanımı ve çalışmanın kapsamı',
  },
  {
    key: 'areaInfo',
    icon: '2',
    number: '2',
    label: '2. İnceleme Alanı Hakkında Bilgiler',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'İnceleme alanının konumu vb...',
    description: 'İnceleme alanı bilgileri',
  },
  {
    key: 'structureInfo',
    icon: '3',
    number: '3',
    label: '3. Yapı Hakkında Bilgiler',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Yapının kullanım sınıfı vb...',
    description: 'BKS, BYS ve I katsayıları vb.',
  },
  {
    key: 'existingResearch',
    icon: '4',
    number: '4',
    label: '4. Mevcut Zemin Araştırmaları',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Arazi ve Laboratuvar çalışmaları...',
    description: 'Sondaj ve lab sonuçları',
  },
  {
    key: 'additionalResearch',
    icon: '5',
    number: '5',
    label: '5. İlave Zemin Araştırmaları',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'İlave bir zemin araştırması yapılmamıştır...',
    description: 'Varsa ilave araştırmalar',
  },
  {
    key: 'soilProfile',
    icon: '6',
    number: '6',
    label: '6. İdealize Zemin Profili',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Zemin tabakaları, YASS...',
    description: 'İdealize Zemin Profili ve Yer Altı Suyu Durumu',
  },
  {
    key: '_params',
    icon: '7',
    number: '7',
    label: '7. Geoteknik Tasarım Parametreleri',
    type: 'locked',
    allowImages: false,
    description: 'Sistem tarafından hesaplanan tasarım parametreleri (Öncesine ve sonrasına ek notlar eklenebilir)',
  },
  {
    key: 'seismicity',
    icon: '8',
    number: '8',
    label: '8. Depremsellik',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Deprem tehlike haritası bilgileri...',
    description: 'Yerel zemin sınıfları ve depremsellik',
  },
  {
    key: '_results',
    icon: '9',
    number: '9',
    label: '9. Zemin İyileştirme Alternatifleri',
    type: 'locked',
    allowImages: true,
    description: 'Sistem tarafından hesaplanan iyileştirme analiz sonuçları',
  },
  {
    key: 'foundationSystem',
    icon: '10',
    number: '10',
    label: '10. Önerilen Temel Sistemi',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Radye temel vs...',
    description: 'Önerilen temel',
  },
  {
    key: 'conclusions',
    icon: '11',
    number: '11',
    label: '11. Sonuç ve Öneriler',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Hesaplama sonuçlarının değerlendirilmesi...',
    description: 'Sonuçların yorumu ve öneriler',
  },
  {
    key: 'references',
    icon: '12',
    number: '12',
    label: '12. Yararlanılan Kaynaklar',
    type: 'wysiwyg',
    allowImages: true,
    placeholder: 'Kaynaklar...',
    description: 'Referanslar',
  },
];

const COVER_FIELDS = [
  { key: 'projectName', label: 'Proje Adı', placeholder: 'Proje adını girin' },
  { key: 'parcelName', label: 'Parsel Adı', placeholder: 'Parsel / taşınmaz adı' },
  { key: 'parcelOwner', label: 'Parsel Sahibi', placeholder: 'Parselin ait olduğu kişi' },
  { key: 'employer', label: 'İşveren / İdare', placeholder: 'İşveren kurum/kuruluş adı' },
  { key: 'location', label: 'Proje Yeri / İl', placeholder: 'Şehir, ilçe' },
  { key: 'preparedBy', label: 'Hazırlayan Kuruluş', placeholder: 'Firma / kuruluş adı' },
  { key: 'engineer', label: 'Sorumlu Mühendis', placeholder: 'Ad soyad, unvan' },
  { key: 'docNumber', label: 'Belge Numarası', placeholder: 'ÖRN: 2026-001' },
  { key: 'revision', label: 'Revizyon No', placeholder: '0' },
];

function buildReportFieldDefaults(sections = {}, projectName = '', soilLayers = [], extraParams = {}) {
  const parcelName = sections.parcelName?.trim()
    || sections.location?.trim()
    || '[Parsel adı]';
  const parcelOwner = sections.parcelOwner?.trim()
    || sections.employer?.trim()
    || '[Parsel sahibi]';
  const preparedBy = sections.preparedBy?.trim() || 'Bursa Teknik Üniversitesi';
  const engineer = sections.engineer?.trim() || 'Prof. Dr. Eyübhan AVCI';
  const soilProfile = buildAutoSoilProfileText(soilLayers, extraParams);
  const dateStr = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    projectName: sections.projectName?.trim() || projectName || 'Zemin İyileştirme Projesi',
    parcelName: sections.parcelName?.trim() || '',
    parcelOwner: sections.parcelOwner?.trim() || '',
    employer: sections.employer?.trim() || '',
    location: sections.location?.trim() || '',
    preparedBy,
    engineer,
    docNumber: sections.docNumber?.trim() || '',
    revision: sections.revision?.trim() || '',
    intro: `Söz konusu rapor, ${parcelName} parselde, inşası düşünülen, ${parcelOwner} ait taşınmazın Zemin İyileştirme Projesi Hesap Raporunu içermektedir.\n\nYukarıda bilgileri verilen yapının Zemin İyileştirme Projesinin tarafımdan hazırlanması talebinde bulunulmuştur. İlgili yapının Zemin İyileştirme Projesi ve Hesap Raporu ${dateStr} tarihinde tarafımdan hazırlanmıştır.\n\nZemin İyileştirme Projesi ve Hesap Raporu hazırlanırken 1 Ocak 2019’da yürürlüğe giren Türkiye Bina Deprem Yönetmeliği (TBDY-2018), 9 Mart 2019’da yürürlüğe giren Çevre ve Şehircilik Bakanlığı Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı ve 2018’de yürürlüğe giren Çevre ve Şehircilik Bakanlığı Kazı Çukurlarının Desteklenmesi ile İlgili Uyulacak Esaslar Genelgesine (2018) uyulmuştur.`,
    areaInfo: `İnceleme alanı ${parcelName} parsel üzerinde yer almaktadır. İnceleme alanı koordinatları: E= 40.4285°, B= 29.1767°'dir (Şekil 2.1).`,
    structureInfo: `${parcelName} parselde, ${parcelOwner} ait parselde 3 bloklu konut amaçlı betonarme yapı yapılması planlanmaktadır. Parsel toplam alanı 562,32 m² alana sahip arsa içerisinde; bodrum, zemin ve iki normal kattan oluşan 3 bloklu betonarme yapı yapılacaktır.\n\nYapılması planlanan yapıya ait (TBDY-2018) Bina kullanım sınıfı (BKS), Bina önem katsayısı (I) ve Bina yükseklik sınıfı (BYS) belirlenmiştir. Tablo 3.1.'den BKS değeri 3, I değeri 1 olarak alınmıştır. Tablo 3.2'den BYS ise 6 olarak belirlenmiştir. Yapılara ait vaziyet planı Şekil 3.1'de verilmiştir.`,
    existingResearch: `İnşaat yapılacak alanda, ABM MÜHENDİSLİK tarafından 1 adet 24,50 metre ve 3 adet 20 metre derinliğinde sondaj yapılmıştır. Ayrıca arazide 4 adet temel sondaj kuyusu açılmış ve 17 adet örselenmiş (SPT), 2 adet örselenmemiş (UD) numune alınmıştır. Alınan numuneler üzerinde PUSULA LAB. HİZ. LTD. ŞTİ. laboratuvarlarında zeminlerin fiziksel ve mekanik özelliklerinin belirlenmesi amacıyla örselenmiş ve örselenmemiş numuneler üzerinde laboratuvar deneyleri yapılmıştır.`,
    additionalResearch: 'İlave bir zemin araştırması yapılmamıştır.',
    soilProfile,
    seismicity: `Geoteknik analizler kapsamında kullanılacak olan zemin parametreleri belirlenirken, zemin etüt raporu, güncel literatür bilgileri ve TBDY-2018 esas alınmıştır.\n\nİnceleme alanı için deprem parametreleri olarak DD-2 deprem yer hareketi düzeyi, ZE yerel zemin sınıfı ve koordinatlar E=40.4285°, B=29.1767° dikkate alınmıştır.\n\nElde edilen spektral ivme katsayıları ışığında kısa periyot ve 1.0 saniye periyot için Yerel Zemin Etki Katsayıları TBDY-2018 Tablo 2.1 ve Tablo 2.2'den seçilmiş; tasarım spektrumları buna göre değerlendirilmiştir.`,
    foundationSystem: 'Yapılan değerlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun olduğu görülmüştür.',
    conclusions: 'İnceleme alanı kapsamında yapılan analiz ve değerlendirmeler sonucunda, zemin iyileştirme ihtiyacı ve uygulanacak yöntem belirlenmiştir.',
    references: `TBDY-2018, Türkiye Bina Deprem Yönetmeliği, 2018.\nÇevre ve Şehircilik Bakanlığı, Zemin ve Temel Etüdü Uygulama Esasları ve Rapor Formatı, Mart 2019.`,
  };
}

const PREVIEW_TABLE_ITEMS = [
  { section: 'structureInfo', label: 'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları (TBDY-2018 Tablo 3.1)' },
  { section: 'structureInfo', label: 'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıflarına göre tanımlanan bina yükseklik aralıkları (TBDY-2018 Tablo 3.3)' },
  { section: 'existingResearch', label: 'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve Düzeltilmiş SPT Değerleri' },
  { section: 'existingResearch', label: 'Tablo 4.2. Laboratuvar toplu deney sonuçları' },
  { section: '_params', label: 'Tablo 7.1. Geoteknik Hesaplarında Kullanılması Önerilen Geoteknik Parametreler' },
  { section: 'seismicity', label: 'Tablo 8.1. Yerel Zemin Sınıfı (TBDY-2018 Tablo 16.1)' },
  { section: 'seismicity', label: 'Tablo 8.2. İnceleme Alanı Deprem Parametreleri' },
  { section: 'seismicity', label: 'Tablo 8.3. Yerel Zemin Katsayıları' },
  { section: 'seismicity', label: 'Tablo 8.4. Kısa periyot bölgesi için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.1)' },
  { section: 'seismicity', label: 'Tablo 8.5. 1.0 saniye periyot için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.2)' },
  { section: 'seismicity', label: 'Tablo 8.6. Elde Edilen Yatay ve Düşey Elastik Tasarım Spektrumu' },
  { section: 'seismicity', label: 'Tablo 8.7. Deprem Tasarım Sınıfları' },
];

const PREVIEW_FIGURE_ITEMS = [
  { section: 'areaInfo', label: 'Şekil 2.1. İnceleme alanına ait genel uydu haritası' },
  { section: 'structureInfo', label: 'Şekil 3.1. Vaziyet Planı' },
  { section: 'soilProfile', label: 'Şekil 6.1. İdealize zemin profilinde alınan kesitler' },
  { section: 'soilProfile', label: 'Şekil 6.2. İdealize Zemin profilinin çıkarılması A-A Kesiti' },
  { section: 'seismicity', label: 'Şekil 8.1. Türkiye ve çevresinin başlıca neotektonik yapıları' },
  { section: 'seismicity', label: 'Şekil 8.2. Türkiye Deprem Tehlike Haritası' },
  { section: 'seismicity', label: 'Şekil 8.3. İnceleme Alanı Deprem Tehlike Haritası (AFAD,2018)' },
  { section: 'seismicity', label: 'Şekil 8.4. İnceleme alanının Deprem Tehlike Haritası' },
  { section: 'seismicity', label: 'Şekil 8.5. Ss (Kısa Periyot Harita Spektral İvme Katsayısı)' },
  { section: 'seismicity', label: 'Şekil 8.6. S1 (1.0 Saniye Periyot Harita Spektral İvme Katsayısı)' },
  { section: 'seismicity', label: 'Şekil 8.7. PGA (En büyük yer ivmesi)' },
  { section: 'seismicity', label: 'Şekil 8.8. PGV (En büyük yer hızı)' },
  { section: 'seismicity', label: 'Şekil 8.9. Yatay Elastik Tasarım Spektrumu' },
  { section: 'seismicity', label: 'Şekil 8.10. Düşey Elastik Tasarım Spektrumu' },
];

function splitPreviewParagraphs(text) {
  if (!text) return [];
  return String(text)
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean);
}

function getPreviewImages(sections, sectionKey) {
  const value = sections?.[getSectionImageKey(sectionKey)];
  // Yeni format: UUID string array → previewUrl içeren objeler sections'ta saklı
  // Eski format: dataUrl içeren objeler (geriye dönük uyumluluk)
  return Array.isArray(value)
    ? value.filter(img => img?.previewUrl || img?.dataUrl)
    : [];
}

function getPreviewLogoSrc(sections) {
  if (sections?.coverLogoPreviewUrl) return sections.coverLogoPreviewUrl;
  return sections?.coverLogo?.dataUrl || '/zemsis-logo.png';
}

function buildPreviewTableRows({ sections, sectionDefaults, parameters, results }) {
  const rows = [];
  if (sectionDefaultsHasContent(sections, sectionDefaults, 'structureInfo')) {
    rows.push(
      { section: 'structureInfo', label: 'Tablo 3.1. Bina Kullanım Sınıfları ve Bina Önem Katsayıları (TBDY-2018 Tablo 3.1)' },
      { section: 'structureInfo', label: 'Tablo 3.2. Bina yükseklik sınıfları ve deprem tasarım sınıflarına göre tanımlanan bina yükseklik aralıkları (TBDY-2018 Tablo 3.3)' }
    );
  }

  if (sectionDefaultsHasContent(sections, sectionDefaults, 'existingResearch')) {
    rows.push(
      { section: 'existingResearch', label: 'Tablo 4.1. İnceleme alanında yapılan sondajlara ait SPT ve Düzeltilmiş SPT Değerleri' },
      { section: 'existingResearch', label: 'Tablo 4.2. Laboratuvar toplu deney sonuçları' }
    );
  }

  if (parameters && Object.keys(parameters).length > 0) {
    rows.push({ section: '_params', label: 'Tablo 7.1. Geoteknik Hesaplarında Kullanılması Önerilen Geoteknik Parametreler' });
  }

  if (sectionDefaultsHasContent(sections, sectionDefaults, 'seismicity')) {
    rows.push(
      { section: 'seismicity', label: 'Tablo 8.1. Yerel Zemin Sınıfı (TBDY-2018 Tablo 16.1)' },
      { section: 'seismicity', label: 'Tablo 8.2. İnceleme Alanı Deprem Parametreleri' },
      { section: 'seismicity', label: 'Tablo 8.3. Yerel Zemin Katsayıları' },
      { section: 'seismicity', label: 'Tablo 8.4. Kısa periyot bölgesi için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.1)' },
      { section: 'seismicity', label: 'Tablo 8.5. 1.0 saniye periyot için Yerel Zemin Etki Katsayıları (TBDY-2018 Tablo 2.2)' },
      { section: 'seismicity', label: 'Tablo 8.6. Elde Edilen Yatay ve Düşey Elastik Tasarım Spektrumu' },
      { section: 'seismicity', label: 'Tablo 8.7. Deprem Tasarım Sınıfları' }
    );
  }

  const categoryLabels = {
    geometry: 'Geometri Sonuçları',
    material: 'Malzeme Parametreleri',
    capacity: 'Taşıma Kapasitesi',
    improvedSoil: 'İyileştirilmiş Zemin Özellikleri',
    settlement: 'Oturma Hesapları',
  };

  if (results && typeof results === 'object') {
    let categoryIndex = 1;
    for (const key of ['geometry', 'material', 'capacity', 'improvedSoil', 'settlement']) {
      if (!results[key] || typeof results[key] !== 'object') continue;
      rows.push({
        section: '_results',
        label: `Tablo 9.${categoryIndex}. ${categoryLabels[key] || key}`,
      });
      categoryIndex += 1;
    }
  }

  return rows;
}

function sectionDefaultsHasContent(sections, sectionDefaults, key) {
  const blocks = sections?.[getSectionBlocksKey(key)];
  if (Array.isArray(blocks)) return blocks.some(b => b?.text?.trim());
  // sectionDefaults string fallback (varsayılan metin her zaman mevcutsa true döner)
  return Boolean((sectionDefaults?.[key] ?? '').toString().trim());
}

function buildPreviewFigureRows({ sections, sectionDefaults }) {
  const rows = [];
  const sectionFigures = {
    areaInfo: [{ section: 'areaInfo', label: 'Şekil 2.1. İnceleme alanına ait genel uydu haritası' }],
    structureInfo: [{ section: 'structureInfo', label: 'Şekil 3.1. Vaziyet Planı' }],
    soilProfile: [
      { section: 'soilProfile', label: 'Şekil 6.1. İdealize zemin profilinde alınan kesitler' },
      { section: 'soilProfile', label: 'Şekil 6.2. İdealize Zemin profilinin çıkarılması A-A Kesiti' },
    ],
    seismicity: [
      { section: 'seismicity', label: 'Şekil 8.1. Türkiye ve çevresinin başlıca neotektonik yapıları' },
      { section: 'seismicity', label: 'Şekil 8.2. Türkiye Deprem Tehlike Haritası' },
      { section: 'seismicity', label: 'Şekil 8.3. İnceleme Alanı Deprem Tehlike Haritası (AFAD,2018)' },
      { section: 'seismicity', label: 'Şekil 8.4. İnceleme alanının Deprem Tehlike Haritası' },
      { section: 'seismicity', label: 'Şekil 8.5. Ss (Kısa Periyot Harita Spektral İvme Katsayısı)' },
      { section: 'seismicity', label: 'Şekil 8.6. S1 (1.0 Saniye Periyot Harita Spektral İvme Katsayısı)' },
      { section: 'seismicity', label: 'Şekil 8.7. PGA (En büyük yer ivmesi)' },
      { section: 'seismicity', label: 'Şekil 8.8. PGV (En büyük yer hızı)' },
      { section: 'seismicity', label: 'Şekil 8.9. Yatay Elastik Tasarım Spektrumu' },
      { section: 'seismicity', label: 'Şekil 8.10. Düşey Elastik Tasarım Spektrumu' },
    ],
  };

  Object.entries(sectionFigures).forEach(([sectionKey, items]) => {
    if (!sectionDefaultsHasContent(sections, sectionDefaults, sectionKey)) return;
    rows.push(...items);
  });

  const sectionOrder = ['intro', 'areaInfo', 'structureInfo', 'existingResearch', 'additionalResearch', 'soilProfile', 'seismicity', 'foundationSystem', 'conclusions'];
  for (const sectionKey of sectionOrder) {
    const images = getPreviewImages(sections, sectionKey);
    if (!images.length) continue;
    images.forEach((img, index) => {
      const sectionNumber = getSectionNumber(sectionKey);
      const figureNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
      rows.push({
        section: sectionKey,
        label: `Şekil ${figureNumber}. ${img.caption?.trim() || 'Ek görsel'}`,
      });
    });
  }

  return rows;
}

function formatDepthTR(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2).replace('.', ',');
}

function prettifySoilType(soilType) {
  const raw = String(soilType || '').trim();
  if (!raw) return 'Zemin';

  const map = {
    kum: 'Kum',
    kil: 'Kil',
    silt: 'Silt',
    kaya: 'Kaya',
    cakil: 'Çakıl',
    dolgu: 'Dolgu',
  };

  const mapped = map[raw.toLowerCase()];
  if (mapped) return mapped;

  return raw
    .split(/\s+/)
    .map(part => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part)
    .join(' ');
}

function buildAutoSoilProfileText(soilLayers = [], extraParams = {}) {
  const layers = Array.isArray(soilLayers) ? soilLayers.filter(layer => layer && Number(layer.thickness) > 0) : [];
  const fillHeight = Number(extraParams?.fillHeight) || 0;
  const waterTable = Number(extraParams?.waterTable);

  let cursor = 0;
  const ranges = [];

  if (fillHeight > 0) {
    ranges.push(`0,00-${formatDepthTR(fillHeight)} metre arasında Dolgu tabaka`);
    cursor = fillHeight;
  }

  layers.forEach(layer => {
    const thickness = Number(layer.thickness) || 0;
    if (thickness <= 0) return;
    const start = formatDepthTR(cursor);
    const end = formatDepthTR(cursor + thickness);
    ranges.push(`${start}-${end} metre arasında ${prettifySoilType(layer.soilType)} tabaka`);
    cursor += thickness;
  });

  const layerSentence = ranges.length > 0
    ? `Zemin profili incelendiğinde ${ranges.join(', ')} yer almaktadır.`
    : 'Zemin profili bilgisi bulunmamaktadır.';

  const groundwaterSentence = Number.isFinite(waterTable) && waterTable > 0
    ? `İnceleme alanında ${formatDepthTR(waterTable)} m’de yeraltı suyuna rastlanmıştır.`
    : 'İnceleme alanında yeraltı suyuna rastlanmamıştır.';

  return `Yapının yapılacağı temel altı zemini için sondaj verileri ve sismik veriler kullanılarak idealize zemin profilleri (A-A Kesiti) çıkartılmıştır (Şekil 6.1. ve Şekil 6.2). ${layerSentence} ${groundwaterSentence}`;
}

function PreviewPage({ title, subtitle, logoSrc, dateStr, children, className = '' }) {
  return (
    <section className={`preview-page ${className}`}>
      <div className="preview-page__inner">
        {title && (
          <header className="preview-page__header">
            {subtitle ? <p className="preview-page__subtitle">{subtitle}</p> : null}
            <h4 className="preview-page__title">{title}</h4>
          </header>
        )}
        <div className="preview-page__body">{children}</div>
        <footer className="preview-page__footer">
          <img src={logoSrc} alt="Logo" className="preview-page__footer-logo" />
          <span>ZEMSIS © {new Date().getFullYear()} - Tarih: {dateStr}</span>
        </footer>
      </div>
    </section>
  );
}

const MAX_IMAGE_DIMENSION = 1600;
const MAX_IMAGE_COUNT_PER_SECTION = 12;
const MAX_TABLE_COUNT_PER_SECTION = 10;

function getSectionTableKey(sectionKey) {
  return `${sectionKey}Tables`;
}

// Hücre nesnesini normalize et: eski string hücreleri yeni formata çevir
function normalizeCell(cell) {
  if (typeof cell === 'string' || cell == null) {
    return {
      text: cell || '',
      bold: false,
      bg: '',
      align: 'left',
      colspan: 1,
      rowspan: 1,
      borders: { top: true, bottom: true, left: true, right: true },
      _hidden: false,
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
      top:    cell.borders?.top    ?? true,
      bottom: cell.borders?.bottom ?? true,
      left:   cell.borders?.left   ?? true,
      right:  cell.borders?.right  ?? true,
    },
    _hidden: cell._hidden ?? false,
  };
}

function createEmptyCell() {
  return {
    text: '',
    bold: false,
    bg: '',
    align: 'left',
    colspan: 1,
    rowspan: 1,
    borders: { top: true, bottom: true, left: true, right: true },
    _hidden: false,
  };
}

function createEmptyTable(rows = 3, cols = 3) {
  return {
    id: `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    rows,
    cols,
    // cells: flat array [row0col0, row0col1, ..., row(rows-1)col(cols-1)]
    cells: Array(rows * cols).fill(null).map(() => createEmptyCell()),
  };
}

function getTableCaptionNumber(sectionKey, index) {
  const sectionNumber = getSectionNumber(sectionKey);
  return sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
}

function getSectionImageKey(sectionKey) {
  return `${sectionKey}Images`;
}

function getSectionNumber(sectionKey) {
  const section = SECTIONS.find(s => s.key === sectionKey);
  return section?.number || '';
}

function getImageCaptionNumber(sectionKey, index) {
  const sectionNumber = getSectionNumber(sectionKey);
  return sectionNumber ? `${sectionNumber}.${index + 1}` : `${index + 1}`;
}

/**
 * Görsel dosyasını canvas üzerinde resize/compress eder,
 * ardından backend'e yükler ve { id, previewUrl, caption, name, width, height } döner.
 * dataUrl artık lokal state'te saklanmıyor — JSONB'de büyük blob kalmaz.
 */
async function uploadImageFile(file, projectId, token, sectionKey = 'unknown') {
  // 1. Canvas ile resize
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.onload = () => {
        const ratio = Math.min(
          1,
          MAX_IMAGE_DIMENSION / img.width,
          MAX_IMAGE_DIMENSION / img.height
        );
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Görsel işlenemedi.')); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputMime === 'image/jpeg' ? 0.9 : undefined;
        resolve({ dataUrl: canvas.toDataURL(outputMime, quality), width, height, mimeType: outputMime });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // 2. Backend'e yükle
  const res = await fetch(`${API_URL}/reports/images/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      dataUrl: dataUrl.dataUrl,
      width: dataUrl.width,
      height: dataUrl.height,
      mimeType: dataUrl.mimeType,
      name: file.name,
      caption: '',
      sectionKey,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Görsel yüklenemedi.');
  }

  const json = await res.json();
  if (!json.success || !json.imageId) {
    throw new Error('Görsel ID alınamadı.');
  }

  return {
    id: json.imageId,
    previewUrl: `${API_URL}/reports/images/${json.imageId}?token=${encodeURIComponent(token)}`,
    caption: '',
    name: file.name,
    width: dataUrl.width,
    height: dataUrl.height,
  };
}


// ── Blok sistemi yardımcı fonksiyonları ──────────────────────
function getSectionBlocksKey(sectionKey) {
  return `${sectionKey}Blocks`;
}

function createBlock(type = 'paragraph', text = '') {
  return {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text,
  };
}

function getBlocksForSection(sections, sectionKey) {
  const blocksKey = getSectionBlocksKey(sectionKey);
  const blocks = sections?.[blocksKey];
  return Array.isArray(blocks) ? blocks : [];
}

// ── Renk Paleti ──────────────────────────────────────────────
const CELL_BG_COLORS = [
  { label: 'Yok', value: '' },
  { label: 'Başlık Grisi', value: '#D9D9D9' },
  { label: 'Açık Mavi', value: '#DBEAFE' },
  { label: 'Açık Yeşil', value: '#D1FAE5' },
  { label: 'Açık Sarı', value: '#FEF9C3' },
  { label: 'Açık Pembe', value: '#FCE7F3' },
  { label: 'Açık Mor', value: '#EDE9FE' },
  { label: 'Koyu Gri', value: '#374151' },
  { label: 'Lacivert', value: '#1E3A5F' },
];

// ── CellToolbar bileşeni (tek & çoklu seçim) ───────────────────
function CellToolbar({ cell, selectedCount, onUpdate, onBulkUpdate, onMergeCells, onClose }) {
  const c = normalizeCell(cell);
  const isMulti = selectedCount > 1;

  const toggleBorder = (side) => {
    if (isMulti) {
      onBulkUpdate({ borders: { top: true, bottom: true, left: true, right: true, [side]: !c.borders[side] } });
    } else {
      onUpdate({ borders: { ...c.borders, [side]: !c.borders[side] } });
    }
  };

  return (
    <div className="cell-toolbar" onMouseDown={e => e.preventDefault()}>
      {/* Çoklu seçim badge */}
      {isMulti && (
        <span className="cell-tb-multi-badge">{selectedCount} hücre</span>
      )}

      {/* Kalın */}
      <button
        type="button"
        className={`cell-tb-btn${c.bold ? ' cell-tb-btn--active' : ''}`}
        title="Kalın"
        onClick={() => isMulti ? onBulkUpdate({ bold: !c.bold }) : onUpdate({ bold: !c.bold })}
      >
        <strong>B</strong>
      </button>

      <div className="cell-tb-sep" />

      {/* Hizalama */}
      {[
        { a: 'left', icon: '⬅', title: 'Sola Hizala' },
        { a: 'center', icon: '↔', title: 'Ortala' },
        { a: 'right', icon: '➡', title: 'Sağa Hizala' },
      ].map(({ a, icon, title }) => (
        <button
          key={a}
          type="button"
          className={`cell-tb-btn${c.align === a ? ' cell-tb-btn--active' : ''}`}
          title={title}
          onClick={() => isMulti ? onBulkUpdate({ align: a }) : onUpdate({ align: a })}
        >
          {icon}
        </button>
      ))}

      <div className="cell-tb-sep" />

      {/* Hücre Birleştir — sadece çoklu seçimde */}
      {isMulti && (
        <>
          <button
            type="button"
            className="cell-tb-btn cell-tb-btn--merge"
            title="Seçili hücreleri birleştir"
            onClick={onMergeCells}
          >
            ⊞ Birleştir
          </button>
          <div className="cell-tb-sep" />
        </>
      )}

      {/* Tek hücre: colspan + rowspan */}
      {!isMulti && (
        <>
          <label className="cell-tb-label" title="Sütun Birleştirme (Colspan)">
            <span>⟷</span>
            <input
              type="number"
              className="cell-tb-number"
              min={1}
              max={10}
              value={c.colspan}
              onChange={e => onUpdate({ colspan: Math.max(1, Math.min(10, Number(e.target.value))) })}
            />
          </label>
          <label className="cell-tb-label" title="Satır Birleştirme (Rowspan)">
            <span>↕</span>
            <input
              type="number"
              className="cell-tb-number"
              min={1}
              max={20}
              value={c.rowspan}
              onChange={e => onUpdate({ rowspan: Math.max(1, Math.min(20, Number(e.target.value))) })}
            />
          </label>
          <div className="cell-tb-sep" />
        </>
      )}

      {/* Kenarlar */}
      <span className="cell-tb-label-text">Kenar:</span>
      {[
        { side: 'top', icon: '↑', title: 'Üst Kenar' },
        { side: 'bottom', icon: '↓', title: 'Alt Kenar' },
        { side: 'left', icon: '←', title: 'Sol Kenar' },
        { side: 'right', icon: '→', title: 'Sağ Kenar' },
      ].map(({ side, icon, title }) => (
        <button
          key={side}
          type="button"
          className={`cell-tb-btn cell-tb-btn--border${c.borders[side] ? ' cell-tb-btn--active' : ' cell-tb-btn--border-off'}`}
          title={title}
          onClick={() => toggleBorder(side)}
        >
          {icon}
        </button>
      ))}

      <div className="cell-tb-sep" />

      {/* Arka Plan Rengi */}
      <span className="cell-tb-label-text">Dolgu:</span>
      <div className="cell-tb-colors">
        {CELL_BG_COLORS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`cell-tb-color${c.bg === value ? ' cell-tb-color--active' : ''}`}
            title={label}
            style={{ background: value || '#fff', border: value === '' ? '1px dashed #94a3b8' : undefined }}
            onClick={() => isMulti ? onBulkUpdate({ bg: value }) : onUpdate({ bg: value })}
          >
            {value === '' && <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>∅</span>}
          </button>
        ))}
      </div>

      <button type="button" className="cell-tb-close" onClick={onClose} title="Kapat">✕</button>
    </div>
  );
}

// ── Yardımcı: seçim dikdörtgenindeki tüm {r,c} çiftlerini döndür
function getSelectionRect(anchor, drag) {
  if (!anchor || !drag) return new Set();
  const r0 = Math.min(anchor.r, drag.r);
  const r1 = Math.max(anchor.r, drag.r);
  const c0 = Math.min(anchor.c, drag.c);
  const c1 = Math.max(anchor.c, drag.c);
  const set = new Set();
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      set.add(`${r},${c}`);
  return { set, r0, r1, c0, c1 };
}

// ── TableCardEditor bileşeni ──────────────────────────────────
function TableCardEditor({ tbl, idx, sectionKey, onUpdateName, onResize, onRemove, onUpdateCell, onBulkUpdateCells, onMergeCells }) {
  const [anchorCell, setAnchorCell] = useState(null);  // drag başlangıcı {r,c}
  const [dragCell, setDragCell]     = useState(null);  // drag sonu {r,c}
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // {r,c} — çift tıkla düzenleme modu
  const textareaRefs = useRef({});  // key: "r,c" → textarea DOM node

  const cells = tbl.cells.map(normalizeCell);

  // Seçili hücre kümesi (anchor → drag dikdörtgeni)
  const selRect = getSelectionRect(anchorCell, dragCell);
  const selSet  = selRect.set || new Set();
  const isInSelection = (r, c) => selSet.has(`${r},${c}`);
  const selectedCount  = selSet.size;

  // Toolbar için anchor hücre datası
  const anchorCellData = anchorCell ? cells[anchorCell.r * tbl.cols + anchorCell.c] : null;

  const handleCellUpdate = (r, c, patch) => {
    onUpdateCell(r * tbl.cols + c, patch);
  };

  // Seçili tüm hücrelere toplu güncelleme
  const handleBulkUpdate = (patch) => {
    const indices = [];
    selSet.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      indices.push(r * tbl.cols + c);
    });
    onBulkUpdateCells(indices, patch);
  };

  // Seçili dikdörtgeni gerçekten birleştir
  const handleMerge = () => {
    if (!selRect || selRect.set.size < 2) return;
    const { r0, r1, c0, c1 } = selRect;
    const combinedText = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const t = cells[r * tbl.cols + c]?.text?.trim();
        if (t) combinedText.push(t);
      }
    const mergedText = combinedText.join(' ');
    const spanR = r1 - r0 + 1;
    const spanC = c1 - c0 + 1;
    const patchMap = {};
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const i = r * tbl.cols + c;
        if (r === r0 && c === c0) {
          patchMap[i] = { text: mergedText, colspan: spanC, rowspan: spanR, align: 'center', _hidden: false };
        } else {
          patchMap[i] = { text: '', colspan: 1, rowspan: 1, _hidden: true };
        }
      }
    onMergeCells(patchMap);
    setAnchorCell({ r: r0, c: c0 });
    setDragCell({ r: r0, c: c0 });
  };

  // Mouse drag seçim işleyicileri
  const handleMouseDown = (r, c, e) => {
    if (e.button !== 0) return;
    // Eğer bu hücre zaten düzenleme modundaysa, tıklamayı textarea'ya bırak
    if (editingCell?.r === r && editingCell?.c === c) return;
    e.preventDefault();
    setEditingCell(null);  // başka hücre düzenleme modundan çık
    setAnchorCell({ r, c });
    setDragCell({ r, c });
    setIsDragging(true);
  };

  // Çift tıkla düzenleme moduna gir
  const handleDoubleClick = (r, c) => {
    setEditingCell({ r, c });
    setAnchorCell({ r, c });
    setDragCell({ r, c });
    setIsDragging(false);
    // Bir sonraki render döngüsünde textarea'ya focus ver
    requestAnimationFrame(() => {
      const ta = textareaRefs.current[`${r},${c}`];
      if (ta) {
        ta.focus();
        // Cursor'u metnin sonuna taşı
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
    });
  };

  const handleMouseEnter = (r, c) => {
    if (isDragging) setDragCell({ r, c });
  };

  const handleMouseUp = () => setIsDragging(false);

  // colspan + rowspan render: 2D "occupied" haritası
  const occupied = new Map();
  const renderRows = Array.from({ length: tbl.rows }, (_, r) => {
    const rowCells = [];
    let c = 0;
    while (c < tbl.cols) {
      if (occupied.has(`${r},${c}`)) { c++; continue; }
      const cell = cells[r * tbl.cols + c];
      // _hidden hücreler render edilmez (birleştirme sonrası gizlenen)
      if (cell._hidden) { c++; continue; }
      const colspan = Math.min(Math.max(1, cell.colspan || 1), tbl.cols - c);
      const rowspan = Math.min(Math.max(1, cell.rowspan || 1), tbl.rows - r);
      for (let dr = 0; dr < rowspan; dr++)
        for (let dc = 0; dc < colspan; dc++)
          if (!(dr === 0 && dc === 0)) occupied.set(`${r + dr},${c + dc}`, { r, c });
      rowCells.push({ r, c, cell, colspan, rowspan });
      c += colspan;
    }
    return rowCells;
  });

  const borderStyle = (borders) => {
    const b = borders || { top: true, bottom: true, left: true, right: true };
    return {
      borderTop:    b.top    ? undefined : '1px solid transparent',
      borderBottom: b.bottom ? undefined : '1px solid transparent',
      borderLeft:   b.left   ? undefined : '1px solid transparent',
      borderRight:  b.right  ? undefined : '1px solid transparent',
    };
  };

  return (
    <div className="table-card" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="table-card__header">
        <span className="table-card__caption-num">Tablo {getTableCaptionNumber(sectionKey, idx)}</span>
        <input
          type="text"
          className="table-card__name-input"
          value={tbl.name || ''}
          onChange={e => onUpdateName(e.target.value)}
          placeholder="Tablo başlığı girin..."
        />
        <div className="table-card__resize">
          <label>Satır</label>
          <input
            type="number"
            min={1} max={20}
            value={tbl.rows}
            onChange={e => onResize(Math.max(1, Math.min(20, Number(e.target.value))), tbl.cols)}
          />
          <label>Sütun</label>
          <input
            type="number"
            min={1} max={10}
            value={tbl.cols}
            onChange={e => onResize(tbl.rows, Math.max(1, Math.min(10, Number(e.target.value))))}
          />
        </div>
        <button type="button" className="image-remove-btn" onClick={onRemove}>
          Kaldır
        </button>
      </div>

      {/* Araç Çubuğu — seçim varsa göster */}
      {anchorCell && anchorCellData && (
        <CellToolbar
          cell={anchorCellData}
          selectedCount={selectedCount}
          onUpdate={(patch) => handleCellUpdate(anchorCell.r, anchorCell.c, patch)}
          onBulkUpdate={handleBulkUpdate}
          onMergeCells={handleMerge}
          onClose={() => { setAnchorCell(null); setDragCell(null); }}
        />
      )}

      <div className="table-card__grid-wrap">
        <table className="table-card__grid" style={{ userSelect: 'none' }}>
          <tbody>
            {renderRows.map((rowCells, r) => (
              <tr key={r}>
                {rowCells.map(({ r: cr, c, cell, colspan, rowspan }) => {
                  const inSel = isInSelection(cr, c);
                  const tdStyle = {
                    background: inSel
                      ? (cell.bg ? cell.bg : (cr === 0 ? '#dde4ff' : '#eef2ff'))
                      : (cell.bg || (cr === 0 ? '#eef2ff' : '#fff')),
                    ...borderStyle(cell.borders),
                    outline:       inSel ? '2px solid #6366f1' : undefined,
                    outlineOffset: inSel ? '-2px' : undefined,
                    cursor: 'cell',
                  };
                   return (
                    <td
                      key={c}
                      colSpan={colspan > 1 ? colspan : undefined}
                      rowSpan={rowspan > 1 ? rowspan : undefined}
                      style={tdStyle}
                      onMouseDown={(e) => handleMouseDown(cr, c, e)}
                      onMouseEnter={() => handleMouseEnter(cr, c)}
                      onDoubleClick={() => handleDoubleClick(cr, c)}
                    >
                      <textarea
                        ref={el => { textareaRefs.current[`${cr},${c}`] = el; }}
                        className={`table-cell-input${cell.bold ? ' table-cell-input--bold' : ''}${cell.align !== 'left' ? ` table-cell-input--${cell.align}` : ''}`}
                        value={cell.text}
                        readOnly={!(editingCell?.r === cr && editingCell?.c === c)}
                        onChange={e => handleCellUpdate(cr, c, { text: e.target.value })}
                        onFocus={() => { setAnchorCell({ r: cr, c }); setDragCell({ r: cr, c }); }}
                        onBlur={() => setEditingCell(null)}
                        rows={1}
                        style={{
                          fontWeight: cell.bold ? '700' : undefined,
                          textAlign: cell.align || 'left',
                          background: 'transparent',
                          cursor: (editingCell?.r === cr && editingCell?.c === c) ? 'text' : 'cell',
                          pointerEvents: (editingCell?.r === cr && editingCell?.c === c) ? 'auto' : 'none',
                          userSelect: (editingCell?.r === cr && editingCell?.c === c) ? 'text' : 'none',
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anchorCell && (
        <p className="table-card__hint">
          {editingCell
            ? `✏️ Düzenleme modu — Satır ${editingCell.r + 1}, Sütun ${editingCell.c + 1} — Çıkmak için hücre dışına tıklayın`
            : selectedCount > 1
              ? `✦ ${selectedCount} hücre seçili — Toolbar'dan biçimlendirin veya ⊞ Birleştir ile tek hücre yapın`
              : `💡 Seçili: Satır ${anchorCell.r + 1}, Sütun ${anchorCell.c + 1} — Sürükle: çoklu seç • Çift tıkla: yazı yaz`
          }
        </p>
      )}
    </div>
  );
}

// ── BlockEditor bileşeni ──────────────────────────────────────
function BlockEditor({ blocks, onChange, collapsed }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [collapsedSubheadings, setCollapsedSubheadings] = useState(new Set());

  const addBlock = (type) => {
    onChange(prev => [...prev, createBlock(type)]);
  };

  const updateBlock = (id, text) => {
    onChange(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  const removeBlock = (id) => {
    onChange(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (id, direction) => {
    onChange(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const toggleSubheading = (id) => {
    setCollapsedSubheadings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Hangi blokların görünür olduğunu belirle
  const visibleSet = new Set();
  let skipMode = false;
  for (const block of blocks) {
    if (block.type === 'subheading') {
      skipMode = collapsedSubheadings.has(block.id);
      visibleSet.add(block.id);
    } else if (block.type === 'sideheading') {
      skipMode = false;
      visibleSet.add(block.id);
    } else {
      if (!skipMode) visibleSet.add(block.id);
    }
  }

  return (
    <div className="block-editor">
      <div className="block-editor__toolbar">
        <button type="button" className="block-add-btn block-add-btn--paragraph" onClick={() => addBlock('paragraph')}>
          ¶ Paragraf Ekle
        </button>
        <button type="button" className="block-add-btn block-add-btn--subheading" onClick={() => addBlock('subheading')}>
          ▸ Alt Başlık Ekle
        </button>
        <button type="button" className="block-add-btn block-add-btn--sideheading" onClick={() => addBlock('sideheading')}>
          § Yan Başlık Ekle
        </button>
      </div>

      <div className={`block-editor__list${collapsed ? ' block-editor__list--collapsed' : ''}`}>
        {blocks.length === 0 && !collapsed && (
          <p className="block-editor__empty">
            Henüz içerik eklenmedi. Yukarıdaki butonlarla paragraf veya başlık ekleyin.
          </p>
        )}
        {collapsed && (
          <p className="block-editor__empty block-editor__empty--collapsed">
            Bu bölüm daraltıldı. Başlık yanındaki ▶ butona tıklayarak genişletin.
          </p>
        )}
        {!collapsed && blocks.map((block, idx) => {
          const isVisible = visibleSet.has(block.id);
          const isSubheading = block.type === 'subheading';
          const isSubheadingCollapsed = collapsedSubheadings.has(block.id);

          let hiddenCount = 0;
          if (isSubheading && isSubheadingCollapsed) {
            for (let i = idx + 1; i < blocks.length; i++) {
              if (blocks[i].type === 'subheading' || blocks[i].type === 'sideheading') break;
              hiddenCount++;
            }
          }

          if (!isVisible) return null;

          return (
            <div
              key={block.id}
              className={`block-item block-item--${block.type}${hoveredId === block.id ? ' block-item--hovered' : ''}`}
              onMouseEnter={() => setHoveredId(block.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Sol: katlanabilirlik üçgeni (sadece alt başlık) */}
              {isSubheading ? (
                <button
                  type="button"
                  className={`block-item__collapse-btn${isSubheadingCollapsed ? ' block-item__collapse-btn--collapsed' : ''}`}
                  onClick={() => toggleSubheading(block.id)}
                  title={isSubheadingCollapsed ? 'Genişlet' : 'Daralt'}
                >
                  ▶
                </button>
              ) : (
                <span className="block-item__collapse-spacer" />
              )}

              {/* Tip rozeti */}
              <div className={`block-item__type-badge block-item__type-badge--${block.type}`}>
                {block.type === 'paragraph' ? '¶' : block.type === 'subheading' ? '#' : '§'}
              </div>

              {/* Input alanı */}
              <div className="block-item__input-wrap">
                {block.type === 'paragraph' ? (
                  <textarea
                    className="block-item__textarea"
                    value={block.text}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder="Paragraf metni girin..."
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    className={`block-item__input${block.type === 'sideheading' ? ' block-item__input--sideheading' : ''}`}
                    value={block.text}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={
                      block.type === 'subheading'
                        ? 'Alt başlık (örn: 8.1. Yerel Zemin Sınıflarının Belirlenmesi)'
                        : 'Yan başlık girin...'
                    }
                  />
                )}
                {isSubheading && isSubheadingCollapsed && hiddenCount > 0 && (
                  <span className="block-item__hidden-hint">
                    {hiddenCount} blok gizlendi — genişletmek için ▶ tıklayın
                  </span>
                )}
              </div>

              {/* Sağ: kontroller */}
              <div className="block-item__controls">
                <button
                  type="button"
                  className="block-ctrl-btn"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={idx === 0}
                  title="Yukarı taşı"
                >↑</button>
                <button
                  type="button"
                  className="block-ctrl-btn"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={idx === blocks.length - 1}
                  title="Aşağı taşı"
                >↓</button>
                <button
                  type="button"
                  className="block-ctrl-btn block-ctrl-btn--remove"
                  onClick={() => removeBlock(block.id)}
                  title="Bloğu sil"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportEditorPage({
  projectId,
  projectName,
  parameters,
  soilLayers = [],
  extraParams = {},
  drawingData = null,
  units = {},
  results,
  token,
  lang,
}) {
  const tr = lang === 'tr';
  const [activeSection, setActiveSection] = useState('cover');
  const [sections, setSections] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false); // sağ panel açık/kapalı
  // tableModalState: null | { sectionKey, tableId (null=new), rows, cols }
  const [tableModalState, setTableModalState] = useState(null);
  // Daraltılmış ana bölümler (section key'lerin Set'i)
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const autoSaveTimerRef = useRef(null);
  const sectionDefaults = buildReportFieldDefaults(sections, projectName, soilLayers, extraParams);
  const previewDateStr = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const previewLogoSrc = getPreviewLogoSrc(sections);

  // Escape ile paneli kapat
  useEffect(() => {
    if (!previewOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewOpen]);

  // Aktif bölümün önizleme verisini hesapla (panel için)
  const activeSec = useMemo(() => SECTIONS.find(s => s.key === activeSection), [activeSection]);
  const activePreviewEntry = useMemo(() => {
    if (!activeSec) return null;
    return {
      ...activeSec,
      text: (sections[activeSec.key] ?? sectionDefaults[activeSec.key] ?? '').toString(),
      blocks: Array.isArray(sections[getSectionBlocksKey(activeSec.key)])
        ? sections[getSectionBlocksKey(activeSec.key)]
        : null,
      images: getPreviewImages(sections, activeSec.key),
      tables: Array.isArray(sections[getSectionTableKey(activeSec.key)])
        ? sections[getSectionTableKey(activeSec.key)]
        : [],
    };
  }, [activeSec, sections, sectionDefaults]);

  const updateSectionImages = useCallback((sectionKey, updater) => {
    setSections(prev => {
      const current = Array.isArray(prev[getSectionImageKey(sectionKey)])
        ? prev[getSectionImageKey(sectionKey)]
        : [];
      const nextImages = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [getSectionImageKey(sectionKey)]: nextImages };
    });
    setSaveStatus('idle');
  }, []);

  const updateSectionTables = useCallback((sectionKey, updater) => {
    setSections(prev => {
      const current = Array.isArray(prev[getSectionTableKey(sectionKey)])
        ? prev[getSectionTableKey(sectionKey)]
        : [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [getSectionTableKey(sectionKey)]: next };
    });
    setSaveStatus('idle');
  }, []);

  const updateSectionBlocks = useCallback((sectionKey, updater) => {
    setSections(prev => {
      const blockKey = getSectionBlocksKey(sectionKey);
      const current = Array.isArray(prev[blockKey])
        ? prev[blockKey]
        : (String(prev[sectionKey] ?? '').trim()
          ? [createBlock('paragraph', String(prev[sectionKey]))]
          : []);
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [blockKey]: next };
    });
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setSections(current => {
        saveDraft(current);
        return current;
      });
    }, 2000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTable = (sectionKey, rows, cols) => {
    updateSectionTables(sectionKey, prev => {
      if (prev.length >= MAX_TABLE_COUNT_PER_SECTION) {
        alert(`Bu bölüm için en fazla ${MAX_TABLE_COUNT_PER_SECTION} tablo eklenebilir.`);
        return prev;
      }
      return [...prev, createEmptyTable(rows, cols)];
    });
  };

  const handleRemoveTable = (sectionKey, tableId) => {
    updateSectionTables(sectionKey, prev => prev.filter(t => t.id !== tableId));
  };

  const handleUpdateTableName = (sectionKey, tableId, name) => {
    updateSectionTables(sectionKey, prev =>
      prev.map(t => t.id === tableId ? { ...t, name } : t)
    );
  };

  const handleUpdateTableCell = (sectionKey, tableId, cellIndex, patch) => {
    updateSectionTables(sectionKey, prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        const cells = t.cells.map(normalizeCell);
        // patch: string (sadece metin) veya nesne (kısmi güncelleme)
        if (typeof patch === 'string') {
          cells[cellIndex] = { ...cells[cellIndex], text: patch };
        } else {
          cells[cellIndex] = { ...cells[cellIndex], ...patch };
        }
        return { ...t, cells };
      })
    );
  };

  const handleResizeTable = (sectionKey, tableId, newRows, newCols) => {
    updateSectionTables(sectionKey, prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        const oldCells = t.cells.map(normalizeCell);
        const newCells = Array(newRows * newCols).fill(null).map((_, i) => {
          const row = Math.floor(i / newCols);
          const col = i % newCols;
          if (row < t.rows && col < t.cols) {
            const old = oldCells[row * t.cols + col];
            // Boyut değişince colspan ve rowspan'ı 1'e sıfırla (tutarsız birleştirme önlenir)
            return { ...old, colspan: 1, rowspan: 1 };
          }
          return createEmptyCell();
        });
        return { ...t, rows: newRows, cols: newCols, cells: newCells };
      })
    );
  };

  // Birden fazla hücreyi aynı anda güncelle (toplu format)
  const handleBulkUpdateTableCells = (sectionKey, tableId, cellIndices, patch) => {
    updateSectionTables(sectionKey, prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        const cells = t.cells.map(normalizeCell);
        cellIndices.forEach(i => {
          if (i >= 0 && i < cells.length) cells[i] = { ...cells[i], ...patch };
        });
        return { ...t, cells };
      })
    );
  };

  // Seçili hücre grubunu gerçekten birleştir (patchMap: { [cellIndex]: patchObj })
  const handleMergeTableCells = (sectionKey, tableId, patchMap) => {
    updateSectionTables(sectionKey, prev =>
      prev.map(t => {
        if (t.id !== tableId) return t;
        const cells = t.cells.map(normalizeCell);
        Object.entries(patchMap).forEach(([i, patch]) => {
          const idx = Number(i);
          if (idx >= 0 && idx < cells.length) cells[idx] = { ...cells[idx], ...patch };
        });
        return { ...t, cells };
      })
    );
  };


  const handleImageFiles = async (sectionKey, files) => {
    if (!files?.length) return;
    const section = SECTIONS.find(s => s.key === sectionKey);
    if (!section?.allowImages) return;

    if (!projectId) {
      alert('Görsel eklemek için önce projeyi kaydedin.');
      return;
    }

    const existingImages = Array.isArray(sections[getSectionImageKey(sectionKey)])
      ? sections[getSectionImageKey(sectionKey)]
      : [];

    const remainingSlots = Math.max(0, MAX_IMAGE_COUNT_PER_SECTION - existingImages.length);
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (!selectedFiles.length) {
      alert(`Bu bölüm için en fazla ${MAX_IMAGE_COUNT_PER_SECTION} görsel eklenebilir.`);
      return;
    }

    try {
      const images = await Promise.all(
        selectedFiles.map(file => uploadImageFile(file, projectId, token, sectionKey))
      );
      updateSectionImages(sectionKey, prev => [...prev, ...images]);
    } catch (err) {
      alert(err.message || 'Görsel yüklenemedi.');
    }
  };

  const handleUpdateImageCaption = (sectionKey, imageId, caption) => {
    updateSectionImages(sectionKey, prev =>
      prev.map(img => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  const handleRemoveImage = async (sectionKey, imageId) => {
    // Önce UI'dan kaldır (hızlı feedback)
    updateSectionImages(sectionKey, prev => prev.filter(img => img.id !== imageId));
    // Arkaplanda DB'den sil
    try {
      await fetch(`${API_URL}/reports/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Silme hatası kritik değil; UI'dan zaten kaldırıldı
      console.warn('Image delete failed for', imageId);
    }
  };

  // ── Taslağı yükle ────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    fetch(`${API_URL}/reports/draft/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.sections) {
          const raw = data.sections;

          // sections'taki image array'lerini normalize et:
          // Eski format: [{id, dataUrl, ...}] → olduğu gibi bırak
          // Yeni format: [uuid_string, ...] → {id, previewUrl, caption} objesine çevir
          // veya [{id:uuid, previewUrl:...}] → previewUrl'i token ile yenile
          const SECTION_IMAGE_KEYS = [
            'introImages', 'areaInfoImages', 'structureInfoImages',
            'existingResearchImages', 'additionalResearchImages',
            'soilProfileImages', 'seismicityImages', '_resultsImages',
            'foundationSystemImages', 'conclusionsImages', 'referencesImages',
          ];

          const normalized = { ...raw };

          for (const key of SECTION_IMAGE_KEYS) {
            const arr = raw[key];
            if (!Array.isArray(arr)) continue;
            normalized[key] = arr.map(item => {
              if (typeof item === 'string') {
                // Yeni format: sadece UUID saklanmış
                return {
                  id: item,
                  previewUrl: `${API_URL}/reports/images/${item}?token=${encodeURIComponent(token)}`,
                  caption: '',
                  name: '',
                };
              }
              if (item && typeof item === 'object' && item.id && !item.dataUrl) {
                // {id, previewUrl, caption, name} formatı — previewUrl'i token ile yenile
                return {
                  ...item,
                  previewUrl: `${API_URL}/reports/images/${item.id}?token=${encodeURIComponent(token)}`,
                };
              }
              // Eski {id, dataUrl, ...} formatı — olduğu gibi bırak
              return item;
            });
          }

          // coverLogoId varsa previewUrl yenile
          if (normalized.coverLogoId) {
            normalized.coverLogoPreviewUrl = `${API_URL}/reports/images/${normalized.coverLogoId}?token=${encodeURIComponent(token)}`;
          }

          setSections(normalized);
        }
      })
      .catch(() => {});
  }, [projectId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bir alan güncelle ─────────────────────────────────────────
  const updateSection = useCallback((key, value) => {
    setSections(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');

    // Otomatik kayıt (2 sn sonra)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setSections(current => {
        saveDraft(current);
        return current;
      });
    }, 2000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Taslak kaydet ─────────────────────────────────────────────
  const saveDraft = async (data) => {
    if (!projectId) return;
    setSaveStatus('saving');
    try {
      // JSONB'ye göndermeden önce sections'ı temizle:
      // - image objeleri: sadece {id, caption, name} sakla (previewUrl/dataUrl gönderme)
      // - coverLogoPreviewUrl: geçici URL, saklanmamalı
      const SECTION_IMAGE_KEYS = [
        'introImages', 'areaInfoImages', 'structureInfoImages',
        'existingResearchImages', 'additionalResearchImages',
        'soilProfileImages', 'seismicityImages', '_resultsImages',
        'foundationSystemImages', 'conclusionsImages', 'referencesImages',
      ];

      const cleaned = { ...data };
      // coverLogoPreviewUrl geçici — JSONB'de saklanmaz
      delete cleaned.coverLogoPreviewUrl;

      for (const key of SECTION_IMAGE_KEYS) {
        const arr = data[key];
        if (!Array.isArray(arr)) continue;
        cleaned[key] = arr.map(img => {
          if (!img || typeof img !== 'object') return img;
          if (img.dataUrl) {
            // Eski format: dataUrl'u koru (geriye dönük uyumluluk)
            // Yeni yüklemeler artık bu yolu kullanmıyor
            return img;
          }
          // Yeni format: sadece id + caption + name sakla
          return { id: img.id, caption: img.caption || '', name: img.name || '' };
        });
      }

      const res = await fetch(`${API_URL}/reports/draft/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections: cleaned }),
      });
      const json = await res.json();
      setSaveStatus(json.success ? 'saved' : 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleManualSave = () => saveDraft(sections);

  // ── Raporu indir ─────────────────────────────────────────────
  const handleGenerateReport = async () => {
    if (!projectId) {
      alert('Rapor oluşturmak için projeyi önce kaydedin.');
      return;
    }
    if (!results) {
      alert('Hesaplama sonuçları bulunamadı. Lütfen önce hesaplama yapın.');
      return;
    }

    // Önce taslağı kaydet, sonra indir
    setGenerating(true);
    try {
      const syncRes = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName?.trim() || null,
          parameters,
          soilLayers,
          results,
          drawingData,
          extraParams,
          units,
        }),
      });
      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${syncRes.status}`);
      }

      await saveDraft(sections);

      const res = await fetch(`${API_URL}/reports/generate/${projectId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Blob olarak indir
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(sections.projectName || projectName || 'Rapor').replace(/\s+/g, '_')}_JG_Raporu.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Rapor oluşturulurken hata: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Aktif bölümü render et ────────────────────────────────────
  const renderPreviewSectionBody = (sec, text, images, tables = [], blocks = null) => {
    // Ortak tablo ve görsel render yardımcıları
    const renderTables = () => tables.length > 0 && tables.map((tbl, tblIdx) => {
      // colspan + rowspan render için 2D occupied haritası
      const previewOccupied = new Map();
      const previewRows = Array.from({ length: tbl.rows }, (_, r) => {
        const rowCells = [];
        let c = 0;
        while (c < tbl.cols) {
          if (previewOccupied.has(`${r},${c}`)) { c++; continue; }
          const raw = tbl.cells[r * tbl.cols + c];
          const cell = normalizeCell(raw);
          // _hidden hücreler önizlemede de atlanır (birleştirme sonrası)
          if (cell._hidden) { c++; continue; }
          const colspan = Math.min(Math.max(1, cell.colspan || 1), tbl.cols - c);
          const rowspan = Math.min(Math.max(1, cell.rowspan || 1), tbl.rows - r);
          // Kaplanan pozisyonları işaretle
          for (let dr = 0; dr < rowspan; dr++) {
            for (let dc = 0; dc < colspan; dc++) {
              if (dr === 0 && dc === 0) continue;
              previewOccupied.set(`${r + dr},${c + dc}`, { r, c });
            }
          }
          rowCells.push({ r, c, cell, colspan, rowspan });
          c += colspan;
        }
        return rowCells;
      });

      return (
        <div className="preview-user-table-wrap" key={tbl.id}>
          <div className="preview-user-table-scroll">
            <table className="preview-user-table">
              <tbody>
                {previewRows.map((rowCells, r) => (
                  <tr key={r}>
                    {rowCells.map(({ c, cell, colspan, rowspan }) => {
                      const borders = cell.borders || { top: true, bottom: true, left: true, right: true };
                      const tdStyle = {
                        background: cell.bg || (r === 0 ? '#d9d9d9' : undefined),
                        fontWeight: cell.bold ? '700' : (r === 0 ? '700' : undefined),
                        textAlign: cell.align || (r === 0 ? 'center' : 'left'),
                        verticalAlign: rowspan > 1 ? 'middle' : undefined,
                        borderTop: borders.top ? undefined : '1px solid transparent',
                        borderBottom: borders.bottom ? undefined : '1px solid transparent',
                        borderLeft: borders.left ? undefined : '1px solid transparent',
                        borderRight: borders.right ? undefined : '1px solid transparent',
                        color: cell.bg === '#374151' || cell.bg === '#1E3A5F' ? '#fff' : undefined,
                      };
                      return (
                        <td
                          key={c}
                          colSpan={colspan > 1 ? colspan : undefined}
                          rowSpan={rowspan > 1 ? rowspan : undefined}
                          style={tdStyle}
                        >
                          {cell.text || ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="preview-user-table-caption">
            <strong>Tablo {getTableCaptionNumber(sec.key, tblIdx)}.</strong>{' '}
            {tbl.name || 'İsimsiz Tablo'}
          </p>
        </div>
      );

    });


    const renderImages = () => images.length > 0 && (
      <div className="preview-image-grid">
        {images.map((img, idx) => (
          <figure className="preview-image-card" key={img.id}>
            <div className="preview-image-card__frame">
              <img src={img.previewUrl || img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
            </div>
            <figcaption>
              <strong>Şekil {getImageCaptionNumber(sec.key, idx)}</strong>
              <span>{img.caption || img.name || 'Açıklama girilmedi'}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    );

    if (sec.type === 'locked') {
      return (
        <>
          <p className="preview-paragraph">{sec.description}</p>
          <div className="preview-locked-wrap">
            <LockedDataTable
              parameters={sec.key === '_params' ? parameters : undefined}
              results={sec.key === '_results' ? results : undefined}
            />
          </div>
          {renderTables()}
          {renderImages()}
        </>
      );
    }

    // Blok tabanlı içerik (yeni sistem)
    if (blocks && blocks.length > 0) {
      return (
        <>
          {blocks.map((block, idx) => {
            const blockText = (block.text || '').trim();
            if (!blockText) return null;
            if (block.type === 'subheading') {
              return (
                <p key={idx} className="preview-subheading">{blockText}</p>
              );
            }
            if (block.type === 'sideheading') {
              return (
                <p key={idx} className="preview-sideheading">{blockText}</p>
              );
            }
            // paragraph — birden fazla satır varsa her satırı ayrı paragraf yap
            return blockText.split('\n').filter(l => l.trim()).map((line, lineIdx) => (
              <p key={`${idx}-${lineIdx}`} className="preview-paragraph">{line.trim()}</p>
            ));
          })}
          {renderTables()}
          {sec.allowImages && renderImages()}
        </>
      );
    }

    // Eski string tabanlı içerik (migration fallback)
    const paragraphs = splitPreviewParagraphs(text);
    return (
      <>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, idx) => (
            <p className="preview-paragraph" key={`${sec.key}-p-${idx}`}>
              {paragraph}
            </p>
          ))
        ) : (
          <p className="preview-paragraph preview-paragraph--empty">
            Bu bölüm için henüz içerik girilmedi.
          </p>
        )}
        {renderTables()}
        {sec.allowImages && renderImages()}
      </>
    );
  };

  const renderSectionContent = () => {
    const sec = SECTIONS.find(s => s.key === activeSection);
    if (!sec) return null;

    if (sec.type === 'cover') {
      const coverLogoSrc = sections.coverLogoPreviewUrl || sections.coverLogo?.dataUrl || null;
      const coverLogoId  = sections.coverLogoId || null;
      return (
        <div className="cover-form">
          <p className="section-desc">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Bu bilgiler raporun kapak sayfasında görünecektir.
          </p>
          <div className="cover-grid">
            {COVER_FIELDS.map(f => (
              <div className="cover-field" key={f.key}>
                <label htmlFor={`cover-${f.key}`}>{f.label}</label>
                <input
                  id={`cover-${f.key}`}
                  type="text"
                  className="cover-input"
                  placeholder={f.placeholder}
                  value={sections[f.key] ?? sectionDefaults[f.key] ?? ''}
                  onChange={e => updateSection(f.key, e.target.value)}
                />
              </div>
              ))}
          </div>

          <div className="cover-logo-box">
            <div>
              <p className="cover-logo-title">Logo</p>
              <p className="cover-logo-note">
                Yüklenen logo kapakta ve raporun tüm sayfalarındaki footer alanında gösterilir.
              </p>
            </div>
            <div className="cover-logo-actions">
              {coverLogoSrc ? (
                <div className="cover-logo-preview">
                  <img src={coverLogoSrc} alt="Logo" />
                </div>
              ) : (
                <div className="cover-logo-placeholder">Logo yüklenmedi</div>
              )}
              <div className="cover-logo-buttons">
                <label className="image-upload-button">
                  Logo Yükle
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!projectId) {
                        alert('Logo yüklemek için önce projeyi kaydedin.');
                        e.target.value = '';
                        return;
                      }
                      try {
                        const uploaded = await uploadImageFile(file, projectId, token, 'coverLogo');
                        // Hem ID'yi hem preview URL'yi sections'ta sakla
                        setSections(prev => ({
                          ...prev,
                          coverLogoId: uploaded.id,
                          coverLogoPreviewUrl: uploaded.previewUrl,
                          // Eski format temizle
                          coverLogo: null,
                        }));
                        setSaveStatus('idle');
                      } catch (err) {
                        alert(err.message || 'Logo yüklenemedi.');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {coverLogoSrc && (
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={async () => {
                      // Eski format veya yeni format
                      if (coverLogoId) {
                        try {
                          await fetch(`${API_URL}/reports/images/${coverLogoId}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                        } catch { /* kritik değil */ }
                      }
                      setSections(prev => ({
                        ...prev,
                        coverLogo: null,
                        coverLogoId: null,
                        coverLogoPreviewUrl: null,
                      }));
                      setSaveStatus('idle');
                    }}
                  >
                    Logoyu Kaldır
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sec.type === 'wysiwyg') {
      const images = Array.isArray(sections[getSectionImageKey(sec.key)])
        ? sections[getSectionImageKey(sec.key)]
        : [];
      const tables = Array.isArray(sections[getSectionTableKey(sec.key)])
        ? sections[getSectionTableKey(sec.key)]
        : [];
      const blocks = getBlocksForSection(sections, sec.key);
      const isSectionCollapsed = collapsedSections.has(sec.key);

      return (
        <div className="wysiwyg-section">
          <p className="section-desc">{sec.description}</p>
          <BlockEditor
            key={sec.key}
            blocks={blocks}
            onChange={(updater) => updateSectionBlocks(sec.key, updater)}
            collapsed={isSectionCollapsed}
          />
          {sec.allowImages && (
            <div className="section-image-tools">
              <div className="section-image-tools__header">
                <div>
                  <p className="section-image-tools__title">Görseller & Tablolar</p>
                  <p className="section-image-tools__note">
                    Görseller Şekil {getSectionNumber(sec.key)}.1, tablolar Tablo {getSectionNumber(sec.key)}.1 formatında numaralanır.
                  </p>
                </div>
                <div className="media-actions-group">
                  <label className="image-upload-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Görsel Ekle
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => {
                        handleImageFiles(sec.key, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="table-add-button"
                    onClick={() => setTableModalState({ sectionKey: sec.key, rows: 3, cols: 3 })}
                  >
                    ＋ Tablo Ekle
                  </button>
                </div>
              </div>
              {tables.length > 0 && (
                <div className="table-list">
                  {tables.map((tbl, idx) => (
                    <TableCardEditor
                      key={tbl.id}
                      tbl={tbl}
                      idx={idx}
                      sectionKey={sec.key}
                      onUpdateName={(name) => handleUpdateTableName(sec.key, tbl.id, name)}
                      onResize={(rows, cols) => handleResizeTable(sec.key, tbl.id, rows, cols)}
                      onRemove={() => handleRemoveTable(sec.key, tbl.id)}
                      onUpdateCell={(cellIdx, patch) => handleUpdateTableCell(sec.key, tbl.id, cellIdx, patch)}
                      onBulkUpdateCells={(indices, patch) => handleBulkUpdateTableCells(sec.key, tbl.id, indices, patch)}
                      onMergeCells={(patchMap) => handleMergeTableCells(sec.key, tbl.id, patchMap)}
                    />
                  ))}
                </div>
              )}
              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img, idx) => (
                    <div className="image-card" key={img.id}>
                      <div className="image-card__preview">
                        <img src={img.previewUrl || img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
                      </div>
                      <div className="image-card__body">
                        <div className="image-card__meta">
                          <span className="image-card__number">
                            Şekil {getImageCaptionNumber(sec.key, idx)}
                          </span>
                          <button
                            type="button"
                            className="image-remove-btn"
                            onClick={() => handleRemoveImage(sec.key, img.id)}
                          >
                            Kaldır
                          </button>
                        </div>
                        <input
                          type="text"
                          className="image-caption-input"
                          value={img.caption || ''}
                          onChange={e => handleUpdateImageCaption(sec.key, img.id, e.target.value)}
                          placeholder="Resim açıklaması"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (sec.type === 'locked') {
      const images = Array.isArray(sections[getSectionImageKey(sec.key)])
        ? sections[getSectionImageKey(sec.key)]
        : [];
      const tables = Array.isArray(sections[getSectionTableKey(sec.key)])
        ? sections[getSectionTableKey(sec.key)]
        : [];
      return (
        <div className="locked-section-wrap">
          <p className="section-desc">{sec.description}</p>
          <LockedDataTable
            parameters={sec.key === '_params' ? parameters : undefined}
            results={sec.key === '_results' ? results : undefined}
          />
          {sec.allowImages && (
            <div className="section-image-tools section-image-tools--locked">
              <div className="section-image-tools__header">
                <div>
                  <p className="section-image-tools__title">Görseller & Tablolar</p>
                  <p className="section-image-tools__note">
                    Görseller Şekil {getSectionNumber(sec.key)}.1, tablolar Tablo {getSectionNumber(sec.key)}.1 formatında numaralanır.
                  </p>
                </div>
                <div className="media-actions-group">
                  <label className="image-upload-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Görsel Ekle
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => {
                        handleImageFiles(sec.key, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="table-add-button"
                    onClick={() => setTableModalState({ sectionKey: sec.key, rows: 3, cols: 3 })}
                  >
                    ＋ Tablo Ekle
                  </button>
                </div>
              </div>
              {tables.length > 0 && (
                <div className="table-list">
                  {tables.map((tbl, idx) => (
                    <TableCardEditor
                      key={tbl.id}
                      tbl={tbl}
                      idx={idx}
                      sectionKey={sec.key}
                      onUpdateName={(name) => handleUpdateTableName(sec.key, tbl.id, name)}
                      onResize={(rows, cols) => handleResizeTable(sec.key, tbl.id, rows, cols)}
                      onRemove={() => handleRemoveTable(sec.key, tbl.id)}
                      onUpdateCell={(cellIdx, patch) => handleUpdateTableCell(sec.key, tbl.id, cellIdx, patch)}
                      onBulkUpdateCells={(indices, patch) => handleBulkUpdateTableCells(sec.key, tbl.id, indices, patch)}
                      onMergeCells={(patchMap) => handleMergeTableCells(sec.key, tbl.id, patchMap)}
                    />
                  ))}
                </div>
              )}

              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img, idx) => (
                    <div className="image-card" key={img.id}>
                      <div className="image-card__preview">
                        <img src={img.previewUrl || img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
                      </div>
                      <div className="image-card__body">
                        <div className="image-card__meta">
                          <span className="image-card__number">
                            Şekil {getImageCaptionNumber(sec.key, idx)}
                          </span>
                          <button
                            type="button"
                            className="image-remove-btn"
                            onClick={() => handleRemoveImage(sec.key, img.id)}
                          >
                            Kaldır
                          </button>
                        </div>
                        <input
                          type="text"
                          className="image-caption-input"
                          value={img.caption || ''}
                          onChange={e => handleUpdateImageCaption(sec.key, img.id, e.target.value)}
                          placeholder="Resim açıklaması"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const noProject = !projectId;
  const noResults = !results;

  const saveStatusLabel = {
    idle: '',
    saving: 'Kaydediliyor...',
    saved: 'Taslak kaydedildi',
    error: 'Kayıt hatası',
  }[saveStatus];
  const saveStatusIcon = {
    idle: null,
    saving: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
    ),
    saved: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    ),
  }[saveStatus];

  return (
    <div className="report-editor-root">
      {/* ── Top Bar ── */}
      <div className="report-top-bar">
        <div className="report-title-group">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Rapor Editörü
          </h2>
          {projectName && <span className="report-project-tag">{projectName}</span>}
        </div>

        <div className="report-actions">
          {saveStatus !== 'idle' && (
            <span className={`save-status save-status--${saveStatus}`}>
              {saveStatusIcon}
              {saveStatusLabel}
            </span>
          )}
          <button
            className="btn-save-draft"
            onClick={handleManualSave}
            disabled={!projectId || saveStatus === 'saving'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Taslak Kaydet
          </button>
          <button
            className={`btn-preview${previewOpen ? ' btn-preview--active' : ''}`}
            type="button"
            onClick={() => setPreviewOpen(v => !v)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Önizleme
          </button>
          <button
            className="btn-generate"
            onClick={handleGenerateReport}
            disabled={noProject || noResults || generating}
            title={noProject ? 'Önce projeyi kaydedin' : noResults ? 'Önce hesaplama yapın' : 'Word raporu oluştur'}
          >
            {generating ? (
              <><span className="spinner" /> Oluşturuluyor...</>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Word Raporu İndir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal önizleme kaldırıldı — yerine sağ panel kullanılıyor */}

      {/* ── Tablo Ekleme Modalı ── */}
      {tableModalState && (
        <div
          className="table-modal-backdrop"
          onClick={() => setTableModalState(null)}
        >
          <div
            className="table-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="table-modal__header">
              <h3>Yeni Tablo Ekle</h3>
              <button
                type="button"
                className="table-modal__close"
                onClick={() => setTableModalState(null)}
              >
                ✕
              </button>
            </div>
            <div className="table-modal__body">
              <div className="table-modal__dims">
                <label>
                  Satır Sayısı
                  <input
                    type="number"
                    min={1} max={20}
                    value={tableModalState.rows}
                    onChange={e => setTableModalState(prev => ({ ...prev, rows: Math.max(1, Math.min(20, Number(e.target.value))) }))}
                  />
                </label>
                <label>
                  Sütun Sayısı
                  <input
                    type="number"
                    min={1} max={10}
                    value={tableModalState.cols}
                    onChange={e => setTableModalState(prev => ({ ...prev, cols: Math.max(1, Math.min(10, Number(e.target.value))) }))}
                  />
                </label>
              </div>
              <div className="table-modal__preview-wrap">
                <p className="table-modal__preview-label">Önizleme ({tableModalState.rows} × {tableModalState.cols})</p>
                <div className="table-modal__preview-scroll">
                  <table className="table-modal__preview-table">
                    <tbody>
                      {Array.from({ length: tableModalState.rows }, (_, r) => (
                        <tr key={r}>
                          {Array.from({ length: tableModalState.cols }, (_, c) => (
                            <td key={c} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="table-modal__footer">
              <button
                type="button"
                className="table-modal__cancel"
                onClick={() => setTableModalState(null)}
              >
                İptal
              </button>
              <button
                type="button"
                className="table-modal__confirm"
                onClick={() => {
                  handleAddTable(tableModalState.sectionKey, tableModalState.rows, tableModalState.cols);
                  setTableModalState(null);
                }}
              >
                Tablo Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Uyarılar ── */}
      {noProject && (
        <div className="report-alert report-alert--warn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Projeyi kaydetmeden taslak kaydedilemez ve rapor oluşturulamaz.
          Lütfen önce projeyi kaydedin.
        </div>
      )}
      {noResults && (
        <div className="report-alert report-alert--warn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Hesaplama sonuçları bulunamadı. Kilitli veriler raporda boş görünecek.
          Lütfen "Parametreler" sekmesinde hesaplama yapın.
        </div>
      )}

      {/* ── Ana İçerik ── */}
      <div className={`report-layout${previewOpen ? ' report-layout--panel-open' : ''}`}>
        {/* Sol: Bölüm Navigasyonu */}
        <nav className="report-nav">
          <p className="report-nav-label">RAPOR BÖLÜMLERİ</p>
          {SECTIONS.map(sec => (
            <button
              key={sec.key}
              className={`report-nav-item
                ${activeSection === sec.key ? 'active' : ''}
                ${sec.type === 'locked' ? 'report-nav-item--locked' : ''}
                ${sec.type === 'wysiwyg' ? 'report-nav-item--editable' : ''}
              `}
              onClick={() => setActiveSection(sec.key)}
            >
              <span className="nav-num">
                {sec.icon === 'cover' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ) : sec.icon}
              </span>
              <div className="nav-text">
                <span className="nav-label">{sec.label}</span>
                {sec.type === 'locked' && (
                  <span className="nav-badge locked">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Kilitli
                  </span>
                )}
                {sec.type === 'wysiwyg' && (
                  <span className="nav-badge editable">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Düzenle
                  </span>
                )}
                {sec.type === 'cover' && (
                  <span className="nav-badge cover">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Form
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Rapor İçerik Özeti */}
          <div className="report-completion">
            <p className="completion-label">Doldurulmuş Alanlar</p>
            <div className="completion-bar">
              <div
                className="completion-fill"
                style={{
                  width: `${Math.round(
                      (SECTIONS.filter(s => s.type === 'wysiwyg' || s.type === 'cover')
                      .filter(s => {
                        if (s.type === 'cover') return COVER_FIELDS.some(f => (sections[f.key] ?? sectionDefaults[f.key] ?? '').toString().length > 0);
                        return (sections[s.key] ?? sectionDefaults[s.key] ?? '').length > 10;
                      }).length /
                    SECTIONS.filter(s => s.type !== 'locked').length) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="completion-pct">
              {SECTIONS.filter(s => s.type === 'wysiwyg' || s.type === 'cover').filter(s => {
                if (s.type === 'cover') return COVER_FIELDS.some(f => (sections[f.key] ?? sectionDefaults[f.key] ?? '').toString().length > 0);
                return (sections[s.key] ?? sectionDefaults[s.key] ?? '').length > 10;
              }).length}
              {' / '}
              {SECTIONS.filter(s => s.type !== 'locked').length} alan dolduruldu
            </p>
          </div>
        </nav>

        {/* Sağ: Aktif Bölüm Editörü */}
        <main className="report-content">
          <div className="section-header">
            {(() => {
              const sec = SECTIONS.find(s => s.key === activeSection);
              if (!sec) return null;
              const isSectionCollapsed = collapsedSections.has(sec.key);
              return (
                <>
                  {sec.type === 'wysiwyg' && (
                    <button
                      type="button"
                      className={`section-header__toggle${isSectionCollapsed ? ' section-header__toggle--collapsed' : ''}`}
                      onClick={() => setCollapsedSections(prev => {
                        const next = new Set(prev);
                        if (next.has(sec.key)) next.delete(sec.key); else next.add(sec.key);
                        return next;
                      })}
                      title={isSectionCollapsed ? 'Bölümü genişlet' : 'Bölümü daralt'}
                    >
                      ▶
                    </button>
                  )}
                  <h3>{sec.label}</h3>
                  {sec.type === 'wysiwyg' && (
                    <div className="section-type-badge editable">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Kullanıcı Girişi
                    </div>
                  )}
                  {sec.type === 'locked' && (
                    <div className="section-type-badge locked">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Sistem Verisi — Salt Okunur
                    </div>
                  )}
                  {sec.type === 'cover' && (
                    <div className="section-type-badge cover">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Kapak Formu
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="section-body">
            {renderSectionContent()}
          </div>
        </main>

        {/* ── Sağ: Dinamik Önizleme Paneli ── */}
        {previewOpen && (
          <aside className="report-preview-panel">
            <div className="report-preview-panel__header">
              <div className="report-preview-panel__header-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span>Aktif Bölüm Önizleme</span>
              </div>
              <button
                type="button"
                className="report-preview-panel__close"
                onClick={() => setPreviewOpen(false)}
                title="Önizlemeyi kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="report-preview-panel__scroll">
              {/* Aktif bölümün A4 mini sayfası */}
              {activePreviewEntry && (
                <div className="report-preview-panel__a4">
                  {/* A4 Üst bilgi */}
                  <div className="report-preview-panel__a4-topbar">
                    <img src={previewLogoSrc} alt="Logo" className="report-preview-panel__a4-logo" />
                    <span className="report-preview-panel__a4-title">
                      {activePreviewEntry.type === 'cover' ? sectionDefaults.projectName : activePreviewEntry.label}
                    </span>
                  </div>

                  {/* Ayırıcı çizgi */}
                  <div className="report-preview-panel__a4-divider" />

                  {/* İçerik */}
                  <div className="report-preview-panel__a4-body preview-page__body">
                    {activePreviewEntry.type === 'cover' ? (
                      // Kapak önizleme
                      <div className="panel-cover">
                        <div className="panel-cover__logo-wrap">
                          <img src={previewLogoSrc} alt="Logo" className="panel-cover__logo" />
                        </div>
                        <p className="panel-cover__eyebrow">PROJE RAPORU</p>
                        <h2 className="panel-cover__title">{sectionDefaults.projectName || '—'}</h2>
                        <dl className="panel-cover__fields">
                          {COVER_FIELDS.filter(f => f.key !== 'projectName').map(f => {
                            const val = String(sections[f.key] ?? sectionDefaults[f.key] ?? '').trim();
                            if (!val) return null;
                            return (
                              <div key={f.key} className="panel-cover__field">
                                <dt>{f.label}</dt>
                                <dd>{val}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    ) : (
                      // Normal bölüm önizleme
                      <>
                        {activePreviewEntry.type !== 'locked' && (
                          <h3 className="panel-section__heading">{activePreviewEntry.label}</h3>
                        )}
                        {renderPreviewSectionBody(
                          activePreviewEntry,
                          activePreviewEntry.text,
                          activePreviewEntry.images,
                          activePreviewEntry.tables,
                          activePreviewEntry.blocks
                        )}
                      </>
                    )}
                  </div>

                  {/* A4 Alt bilgi */}
                  <div className="report-preview-panel__a4-footer">
                    <img src={previewLogoSrc} alt="Logo" className="report-preview-panel__a4-footer-logo" />
                    <span>{previewDateStr}</span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default ReportEditorPage;
