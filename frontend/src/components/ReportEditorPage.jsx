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

function buildReportFieldDefaults(sections = {}, projectName = '') {
  const parcelName = sections.parcelName?.trim()
    || sections.location?.trim()
    || '[Parsel adı]';
  const parcelOwner = sections.parcelOwner?.trim()
    || sections.employer?.trim()
    || '[Parsel sahibi]';
  const preparedBy = sections.preparedBy?.trim() || 'Bursa Teknik \u00dcniversitesi';
  const engineer = sections.engineer?.trim() || 'Prof. Dr. Ey\u00fcbhan AVCI';
  const dateStr = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    projectName: sections.projectName?.trim() || projectName || 'Zemin \u0130yile\u015ftirme Projesi',
    parcelName: sections.parcelName?.trim() || '',
    parcelOwner: sections.parcelOwner?.trim() || '',
    employer: sections.employer?.trim() || '',
    location: sections.location?.trim() || '',
    preparedBy,
    engineer,
    docNumber: sections.docNumber?.trim() || '',
    revision: sections.revision?.trim() || '',
    intro: `S\u00f6z konusu rapor, ${parcelName} parselde, in\u015fas\u0131 d\u00fc\u015f\u00fcn\u00fclen, ${parcelOwner} ait ta\u015f\u0131nmaz\u0131n Zemin \u0130yile\u015ftirme Projesi Hesap Raporunu i\u00e7ermektedir.\n\nYukar\u0131da bilgileri verilen yap\u0131n\u0131n Zemin \u0130yile\u015ftirme Projesinin taraf\u0131mdan haz\u0131rlanmas\u0131 talebinde bulunulmu\u015ftur. \u0130lgili yap\u0131n\u0131n Zemin \u0130yile\u015ftirme Projesi ve Hesap Raporu ${dateStr} tarihinde taraf\u0131mdan haz\u0131rlanm\u0131\u015ft\u0131r.\n\nZemin \u0130yile\u015ftirme Projesi ve Hesap Raporu haz\u0131rlan\u0131rken 1 Ocak 2019\u2019da y\u00fcr\u00fcrl\u00fc\u011fe giren T\u00fcrkiye Bina Deprem Y\u00f6netmeli\u011fi (TBDY-2018), 9 Mart 2019\u2019da y\u00fcr\u00fcrl\u00fc\u011fe giren \u00c7evre ve \u015eehircilik Bakanl\u0131\u011f\u0131 Zemin ve Temel Et\u00fcd\u00fc Uygulama Esaslar\u0131 ve Rapor Format\u0131 ve 2018\u2019de y\u00fcr\u00fcrl\u00fc\u011fe giren \u00c7evre ve \u015eehircilik Bakanl\u0131\u011f\u0131 Kaz\u0131 \u00c7ukurlar\u0131n\u0131n Desteklenmesi ile \u0130lgili Uyulacak Esaslar Genelgesine (2018) uyulmu\u015ftur.`,
    areaInfo: `\u0130nceleme alan\u0131 ${parcelName} parsel \u00fczerinde yer almaktad\u0131r. \u0130nceleme alan\u0131 koordinatlar\u0131: E= 40.4285\u00b0, B= 29.1767\u00b0'dir (\u015eekil 2.1).`,
    structureInfo: `${parcelName} parselde, ${parcelOwner} ait parselde 3 bloklu konut ama\u00e7l\u0131 betonarme yap\u0131 yap\u0131lmas\u0131 planlanmaktad\u0131r. Parsel toplam alan\u0131 562,32 m\u00b2 alana sahip arsa i\u00e7erisinde; bodrum, zemin ve iki normal kattan olu\u015fan 3 bloklu betonarme yap\u0131 yap\u0131lacakt\u0131r.\n\nYap\u0131lmas\u0131 planlanan yap\u0131ya ait (TBDY-2018) Bina kullan\u0131m s\u0131n\u0131f\u0131 (BKS), Bina \u00f6nem katsay\u0131s\u0131 (I) ve Bina y\u00fckseklik s\u0131n\u0131f\u0131 (BYS) belirlenmi\u015ftir. Tablo 3.1.'den BKS de\u011feri 3, I de\u011feri 1 olarak al\u0131nm\u0131\u015ft\u0131r. Tablo 3.2'den BYS ise 6 olarak belirlenmi\u015ftir. Yap\u0131lara ait vaziyet plan\u0131 \u015eekil 3.1'de verilmi\u015ftir.`,
    existingResearch: `\u0130n\u015faat yap\u0131lacak alanda, ABM M\u00dcHEND\u0130SL\u0130K taraf\u0131ndan 1 adet 24,50 metre ve 3 adet 20 metre derinli\u011finde sondaj yap\u0131lm\u0131\u015ft\u0131r. Ayr\u0131ca arazide 4 adet temel sondaj kuyusu a\u00e7\u0131lm\u0131\u015f ve 17 adet \u00f6rselenmi\u015f (SPT), 2 adet \u00f6rselenmemi\u015f (UD) numune al\u0131nm\u0131\u015ft\u0131r. Al\u0131nan numuneler \u00fczerinde PUSULA LAB. H\u0130Z. LTD. \u015eT\u0130. laboratuvarlar\u0131nda zeminlerin fiziksel ve mekanik \u00f6zelliklerinin belirlenmesi amac\u0131yla \u00f6rselenmi\u015f ve \u00f6rselenmemi\u015f numuneler \u00fczerinde laboratuvar deneyleri yap\u0131lm\u0131\u015ft\u0131r.`,
    additionalResearch: '\u0130lave bir zemin ara\u015ft\u0131rmas\u0131 yap\u0131lmam\u0131\u015ft\u0131r.',
    soilProfile: `Yap\u0131n\u0131n yap\u0131laca\u011f\u0131 temel alt\u0131 zemini i\u00e7in sondaj verileri ve sismik veriler kullan\u0131larak idealize zemin profilleri (A-A Kesiti) \u00e7\u0131kart\u0131lm\u0131\u015ft\u0131r (\u015eekil 6.1. ve \u015eekil 6.2). Zemin profili incelendi\u011finde 0,00-0,50 metre aras\u0131nda Dolgu tabaka, 0,50-7,50 metre aras\u0131nda Siltli Kil tabaka, 7,50-12,00 metre aras\u0131nda Siltli Kum tabaka ve 12,00-20,00 metre aras\u0131nda Siltli Kil tabaka yer almaktad\u0131r. \u0130nceleme alan\u0131nda 3.50 m'de yeralt\u0131 suyuna rastlanm\u0131\u015ft\u0131r.`,
    seismicity: `Geoteknik analizler kapsam\u0131nda kullan\u0131lacak olan zemin parametreleri belirlenirken, zemin et\u00fct raporu, g\u00fcncel literat\u00fcr bilgileri ve TBDY-2018 esas al\u0131nm\u0131\u015ft\u0131r.\n\n\u0130nceleme alan\u0131 i\u00e7in deprem parametreleri olarak DD-2 deprem yer hareketi d\u00fczeyi, ZE yerel zemin s\u0131n\u0131f\u0131 ve koordinatlar E=40.4285\u00b0, B=29.1767\u00b0 dikkate al\u0131nm\u0131\u015ft\u0131r.\n\nElde edilen spektral ivme katsay\u0131lar\u0131 \u0131\u015f\u0131\u011f\u0131nda k\u0131sa periyot ve 1.0 saniye periyot i\u00e7in Yerel Zemin Etki Katsay\u0131lar\u0131 TBDY-2018 Tablo 2.1 ve Tablo 2.2'den se\u00e7ilmi\u015f; tasar\u0131m spektrumlar\u0131 buna g\u00f6re de\u011ferlendirilmi\u015ftir.`,
    foundationSystem: 'Yap\u0131lan de\u011ferlendirmeler sonucunda temel sistemi olarak radye temel sisteminin uygun oldu\u011fu g\u00f6r\u00fclm\u00fc\u015ft\u00fcr.',
    conclusions: '\u0130nceleme alan\u0131 kapsam\u0131nda yap\u0131lan analiz ve de\u011ferlendirmeler sonucunda, zemin iyile\u015ftirme ihtiyac\u0131 ve uygulanacak y\u00f6ntem belirlenmi\u015ftir.',
    references: `TBDY-2018, T\u00fcrkiye Bina Deprem Y\u00f6netmeli\u011fi, 2018.\n\u00c7evre ve \u015eehircilik Bakanl\u0131\u011f\u0131, Zemin ve Temel Et\u00fcd\u00fc Uygulama Esaslar\u0131 ve Rapor Format\u0131, Mart 2019.`,
  };
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

function ReportEditorPage({ projectId, projectName, parameters, results, token, lang }) {
  const tr = lang === 'tr';
  const [activeSection, setActiveSection] = useState('cover');
  const [sections, setSections] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [generating, setGenerating] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const sectionDefaults = buildReportFieldDefaults(sections, projectName);

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
  const renderSectionContent = () => {
    const sec = SECTIONS.find(s => s.key === activeSection);
    if (!sec) return null;

    if (sec.type === 'cover') {
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
