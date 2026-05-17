import { useState, useEffect, useCallback, useRef } from 'react';
import LockedDataTable from './LockedDataTable';
import './ReportEditorPage.css';

const API_URL = '/api';

// ── Rapor bölümleri tanımı ────────────────────────────────────
// type: 'cover'   → basit form alanları (kapak sayfası)
// type: 'wysiwyg' → CKEditor (sarı, düzenlenebilir)
// type: 'locked'  → read-only hesaplama verileri
const SECTIONS = [
  {
    key: 'cover',
    icon: '📋',
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
  return Array.isArray(value) ? value.filter(img => img?.dataUrl) : [];
}

function getPreviewLogoSrc(sections) {
  return sections?.coverLogo?.dataUrl || '/zemsis-logo.png';
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

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
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
        if (!ctx) {
          reject(new Error('Görsel işlenemedi.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputMime === 'image/jpeg' ? 0.9 : undefined;
        const dataUrl = canvas.toDataURL(outputMime, quality);
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          name: file.name,
          caption: '',
          dataUrl,
          width,
          height,
          mimeType: outputMime,
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const sectionDefaults = buildReportFieldDefaults(sections, projectName, soilLayers, extraParams);
  const previewDateStr = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const previewLogoSrc = getPreviewLogoSrc(sections);

  useEffect(() => {
    if (!previewOpen) return undefined;

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setPreviewOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewOpen]);

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

  const handleImageFiles = async (sectionKey, files) => {
    if (!files?.length) return;
    const section = SECTIONS.find(s => s.key === sectionKey);
    if (!section?.allowImages) return;

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
      const images = await Promise.all(selectedFiles.map(loadImageFromFile));
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

  const handleRemoveImage = (sectionKey, imageId) => {
    updateSectionImages(sectionKey, prev => prev.filter(img => img.id !== imageId));
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
          setSections(data.sections);
        }
      })
      .catch(() => {});
  }, [projectId, token]);

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
      const res = await fetch(`${API_URL}/reports/draft/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections: data }),
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
  const previewSectionEntries = SECTIONS.filter(sec => sec.type !== 'cover').map(sec => ({
    ...sec,
    text: (sections[sec.key] ?? sectionDefaults[sec.key] ?? '').toString(),
    images: getPreviewImages(sections, sec.key),
  }));

  const previewTableRows = PREVIEW_TABLE_ITEMS.filter(item => {
    if (item.section === '_params') return Boolean(parameters);
    if (item.section === '_results') return Boolean(results);
    return Boolean((sections[item.section] ?? sectionDefaults[item.section] ?? '').toString().trim());
  });

  const previewFigureRows = PREVIEW_FIGURE_ITEMS.filter(item => {
    if (item.section === '_params' || item.section === '_results') return false;
    return Boolean(
      (sections[item.section] ?? sectionDefaults[item.section] ?? '').toString().trim() ||
      getPreviewImages(sections, item.section).length > 0
    );
  });

  const renderPreviewSectionBody = (sec, text, images) => {
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
          {images.length > 0 && (
            <div className="preview-image-grid">
              {images.map((img, idx) => (
                <figure className="preview-image-card" key={img.id}>
                  <div className="preview-image-card__frame">
                    <img src={img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
                  </div>
                  <figcaption>
                    <strong>Şekil {getImageCaptionNumber(sec.key, idx)}</strong>
                    <span>{img.caption || img.name || 'Açıklama girilmedi'}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      );
    }

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
        {sec.allowImages && images.length > 0 && (
          <div className="preview-image-grid">
            {images.map((img, idx) => (
              <figure className="preview-image-card" key={img.id}>
                <div className="preview-image-card__frame">
                  <img src={img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
                </div>
                <figcaption>
                  <strong>Şekil {getImageCaptionNumber(sec.key, idx)}</strong>
                  <span>{img.caption || img.name || 'Açıklama girilmedi'}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderSectionContent = () => {
    const sec = SECTIONS.find(s => s.key === activeSection);
    if (!sec) return null;

    if (sec.type === 'cover') {
      const coverLogo = sections.coverLogo || null;
      return (
        <div className="cover-form">
          <p className="section-desc">
            📄 Bu bilgiler raporun kapak sayfasında görünecektir.
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
              {coverLogo?.dataUrl ? (
                <div className="cover-logo-preview">
                  <img src={coverLogo.dataUrl} alt={coverLogo.name || 'Logo'} />
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
                      try {
                        const image = await loadImageFromFile(file);
                        updateSection('coverLogo', image);
                      } catch (err) {
                        alert(err.message || 'Logo yüklenemedi.');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {coverLogo?.dataUrl && (
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={() => updateSection('coverLogo', null)}
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
      return (
        <div className="wysiwyg-section">
          <p className="section-desc">{sec.description}</p>
          <textarea
            key={sec.key}
            className="plain-text-editor"
            value={sections[sec.key] ?? sectionDefaults[sec.key] ?? ''}
            onChange={e => updateSection(sec.key, e.target.value)}
            placeholder={sec.placeholder}
          />
          {sec.allowImages && (
            <div className="section-image-tools">
              <div className="section-image-tools__header">
                <div>
                  <p className="section-image-tools__title">Görseller</p>
                  <p className="section-image-tools__note">
                    Maksimum {MAX_IMAGE_DIMENSION}px kenar uzunluğu. Görseller raporda ortalanır ve
                    Şekil {getSectionNumber(sec.key)}.1 formatında numaralanır.
                  </p>
                </div>
                <label className="image-upload-button">
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
              </div>
              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img, idx) => (
                    <div className="image-card" key={img.id}>
                      <div className="image-card__preview">
                        <img src={img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
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
                  <p className="section-image-tools__title">Görseller</p>
                  <p className="section-image-tools__note">
                    Bu bölümdeki görseller Şekil {getSectionNumber(sec.key)}.1, {getSectionNumber(sec.key)}.2 ...
                    şeklinde numaralanır.
                  </p>
                </div>
                <label className="image-upload-button">
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
              </div>
              {images.length > 0 && (
                <div className="image-list">
                  {images.map((img, idx) => (
                    <div className="image-card" key={img.id}>
                      <div className="image-card__preview">
                        <img src={img.dataUrl} alt={img.caption || img.name || `Görsel ${idx + 1}`} />
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
    saving: '💾 Kaydediliyor...',
    saved: '✅ Taslak kaydedildi',
    error: '❌ Kayıt hatası',
  }[saveStatus];

  return (
    <div className="report-editor-root">
      {/* ── Top Bar ── */}
      <div className="report-top-bar">
        <div className="report-title-group">
          <h2>📄 Rapor Editörü</h2>
          {projectName && <span className="report-project-tag">{projectName}</span>}
        </div>

        <div className="report-actions">
          {saveStatus !== 'idle' && (
            <span className={`save-status save-status--${saveStatus}`}>
              {saveStatusLabel}
            </span>
          )}
          <button
            className="btn-save-draft"
            onClick={handleManualSave}
            disabled={!projectId || saveStatus === 'saving'}
          >
            💾 Taslak Kaydet
          </button>
          <button
            className="btn-preview"
            type="button"
            onClick={() => setPreviewOpen(true)}
          >
            👁️ Önizleme
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
              '⬇️ Word Raporu İndir'
            )}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="preview-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-modal__toolbar">
              <div>
                <p className="preview-modal__eyebrow">HTML tabanlı rapor önizlemesi</p>
                <h3>Word dosyası oluşturmadan raporu görüntüle</h3>
              </div>
              <button
                type="button"
                className="preview-modal__close"
                onClick={() => setPreviewOpen(false)}
              >
                Kapat
              </button>
            </div>

            <div className="preview-modal__content">
              <PreviewPage
                className="preview-page--cover"
                title="Kapak Önizleme"
                subtitle="Rapor başlangıç sayfası"
                logoSrc={previewLogoSrc}
                dateStr={previewDateStr}
              >
                <div className="preview-cover">
                  <div className="preview-cover__logo">
                    <img src={previewLogoSrc} alt="Logo" />
                  </div>
                  <div className="preview-cover__content">
                    <p className="preview-cover__eyebrow">PROJE RAPORU</p>
                    <h2>{sectionDefaults.projectName}</h2>
                    <dl className="preview-cover__grid">
                      {COVER_FIELDS.filter(field => field.key !== 'projectName').map(field => (
                        <div key={field.key}>
                          <dt>{field.label}</dt>
                          <dd>{String(sections[field.key] ?? sectionDefaults[field.key] ?? '—').trim() || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </PreviewPage>

              <PreviewPage
                title="İçindekiler"
                subtitle="Rapor bölüm sıralaması"
                logoSrc={previewLogoSrc}
                dateStr={previewDateStr}
              >
                <ul className="preview-list">
                  {SECTIONS.filter(sec => sec.key !== 'cover').map(sec => (
                    <li key={sec.key}>
                      <span>{sec.label}</span>
                      <span>{sec.type === 'locked' ? 'Sistem verisi' : 'Düzenlenebilir metin'}</span>
                    </li>
                  ))}
                </ul>
              </PreviewPage>

              <PreviewPage
                title="Tablolar Listesi"
                subtitle="Oluşturulan tablo başlıkları"
                logoSrc={previewLogoSrc}
                dateStr={previewDateStr}
              >
                <div className="preview-catalog">
                  {previewTableRows.length > 0 ? previewTableRows.map(item => (
                    <div className="preview-catalog__item" key={`${item.section}-${item.label}`}>
                      <span>{item.label}</span>
                      <small>{SECTIONS.find(sec => sec.key === item.section)?.label || item.section}</small>
                    </div>
                  )) : (
                    <p className="preview-paragraph preview-paragraph--empty">Bu önizlemede tablo yok.</p>
                  )}
                </div>
              </PreviewPage>

              <PreviewPage
                title="Şekiller Listesi"
                subtitle="Görsel ve çizim başlıkları"
                logoSrc={previewLogoSrc}
                dateStr={previewDateStr}
              >
                <div className="preview-catalog">
                  {previewFigureRows.length > 0 ? previewFigureRows.map(item => (
                    <div className="preview-catalog__item" key={`${item.section}-${item.label}`}>
                      <span>{item.label}</span>
                      <small>{SECTIONS.find(sec => sec.key === item.section)?.label || item.section}</small>
                    </div>
                  )) : (
                    <p className="preview-paragraph preview-paragraph--empty">Bu önizlemede şekil yok.</p>
                  )}
                </div>
              </PreviewPage>

              {previewSectionEntries.map(sec => (
                <PreviewPage
                  key={sec.key}
                  title={sec.label}
                  subtitle={`Bölüm ${sec.number || ''}`.trim()}
                  logoSrc={previewLogoSrc}
                  dateStr={previewDateStr}
                >
                  {renderPreviewSectionBody(sec, sec.text, sec.images)}
                </PreviewPage>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Uyarılar ── */}
      {noProject && (
        <div className="report-alert report-alert--warn">
          ⚠️ Projeyi kaydetmeden taslak kaydedilemez ve rapor oluşturulamaz.
          Lütfen önce projeyi kaydedin.
        </div>
      )}
      {noResults && (
        <div className="report-alert report-alert--warn">
          ⚠️ Hesaplama sonuçları bulunamadı. Kilitli veriler raporda boş görünecek.
          Lütfen "Parametreler" sekmesinde hesaplama yapın.
        </div>
      )}

      {/* ── Ana İçerik ── */}
      <div className="report-layout">
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
              <span className="nav-num">{sec.icon}</span>
              <div className="nav-text">
                <span className="nav-label">{sec.label}</span>
                {sec.type === 'locked' && <span className="nav-badge locked">🔒 Kilitli</span>}
                {sec.type === 'wysiwyg' && <span className="nav-badge editable">✏️ Düzenle</span>}
                {sec.type === 'cover' && <span className="nav-badge cover">📋 Form</span>}
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
              return sec ? (
                <>
                  <h3>{sec.label}</h3>
                  {sec.type === 'wysiwyg' && (
                    <div className="section-type-badge editable">✏️ Kullanıcı Girişi</div>
                  )}
                  {sec.type === 'locked' && (
                    <div className="section-type-badge locked">🔒 Sistem Verisi — Salt Okunur</div>
                  )}
                  {sec.type === 'cover' && (
                    <div className="section-type-badge cover">📋 Kapak Formu</div>
                  )}
                </>
              ) : null;
            })()}
          </div>

          <div className="section-body">
            {renderSectionContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReportEditorPage;
