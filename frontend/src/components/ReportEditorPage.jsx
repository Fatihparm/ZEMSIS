import { useState, useEffect, useCallback, useRef } from 'react';
import RichTextEditor from './RichTextEditor';
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
    description: 'Proje adı, işveren, yer ve belge bilgileri',
  },
  {
    key: 'intro',
    icon: '1',
    label: '1. Giriş',
    type: 'wysiwyg',
    placeholder: 'Projenin amacı, kapsamı ve genel bilgiler...',
    description: 'Projenin genel tanımı ve çalışmanın kapsamı',
  },
  {
    key: 'areaInfo',
    icon: '2',
    label: '2. İnceleme Alanı Hakkında Bilgiler',
    type: 'wysiwyg',
    placeholder: 'İnceleme alanının konumu vb...',
    description: 'İnceleme alanı bilgileri',
  },
  {
    key: 'structureInfo',
    icon: '3',
    label: '3. Yapı Hakkında Bilgiler',
    type: 'wysiwyg',
    placeholder: 'Yapının kullanım sınıfı vb...',
    description: 'BKS, BYS ve I katsayıları vb.',
  },
  {
    key: 'existingResearch',
    icon: '4',
    label: '4. Mevcut Zemin Araştırmaları',
    type: 'wysiwyg',
    placeholder: 'Arazi ve Laboratuvar çalışmaları...',
    description: 'Sondaj ve lab sonuçları',
  },
  {
    key: 'additionalResearch',
    icon: '5',
    label: '5. İlave Zemin Araştırmaları',
    type: 'wysiwyg',
    placeholder: 'İlave bir zemin araştırması yapılmamıştır...',
    description: 'Varsa ilave araştırmalar',
  },
  {
    key: 'soilProfile',
    icon: '6',
    label: '6. İdealize Zemin Profili',
    type: 'wysiwyg',
    placeholder: 'Zemin tabakaları, YASS...',
    description: 'İdealize Zemin Profili ve Yer Altı Suyu Durumu',
  },
  {
    key: '_params',
    icon: '7',
    label: '7. Geoteknik Tasarım Parametreleri',
    type: 'locked',
    description: 'Sistem tarafından hesaplanan tasarım parametreleri (Öncesine ve sonrasına ek notlar eklenebilir)',
  },
  {
    key: 'seismicity',
    icon: '8',
    label: '8. Depremsellik',
    type: 'wysiwyg',
    placeholder: 'Deprem tehlike haritası bilgileri...',
    description: 'Yerel zemin sınıfları ve depremsellik',
  },
  {
    key: '_results',
    icon: '9',
    label: '9. Zemin İyileştirme Alternatifleri',
    type: 'locked',
    description: 'Sistem tarafından hesaplanan iyileştirme analiz sonuçları',
  },
  {
    key: 'foundationSystem',
    icon: '10',
    label: '10. Önerilen Temel Sistemi',
    type: 'wysiwyg',
    placeholder: 'Radye temel vs...',
    description: 'Önerilen temel',
  },
  {
    key: 'conclusions',
    icon: '11',
    label: '11. Sonuç ve Öneriler',
    type: 'wysiwyg',
    placeholder: 'Hesaplama sonuçlarının değerlendirilmesi...',
    description: 'Sonuçların yorumu ve öneriler',
  },
  {
    key: 'references',
    icon: '12',
    label: '12. Yararlanılan Kaynaklar',
    type: 'wysiwyg',
    placeholder: 'Kaynaklar...',
    description: 'Referanslar',
  },
];

const COVER_FIELDS = [
  { key: 'projectName', label: 'Proje Adı', placeholder: 'Proje adını girin' },
  { key: 'employer', label: 'İşveren / İdare', placeholder: 'İşveren kurum/kuruluş adı' },
  { key: 'location', label: 'Proje Yeri / İl', placeholder: 'Şehir, ilçe' },
  { key: 'preparedBy', label: 'Hazırlayan Kuruluş', placeholder: 'Firma / kuruluş adı' },
  { key: 'engineer', label: 'Sorumlu Mühendis', placeholder: 'Ad soyad, unvan' },
  { key: 'docNumber', label: 'Belge Numarası', placeholder: 'ÖRN: 2026-001' },
  { key: 'revision', label: 'Revizyon No', placeholder: '0' },
];

function ReportEditorPage({ projectId, projectName, parameters, results, token, lang }) {
  const tr = lang === 'tr';
  const [activeSection, setActiveSection] = useState('cover');
  const [sections, setSections] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [generating, setGenerating] = useState(false);
  const autoSaveTimerRef = useRef(null);

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
                  value={sections[f.key] || ''}
                  onChange={e => updateSection(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (sec.type === 'wysiwyg') {
      return (
        <div className="wysiwyg-section">
          <p className="section-desc">{sec.description}</p>
          <RichTextEditor
            key={sec.key}
            value={sections[sec.key] || ''}
            onChange={val => updateSection(sec.key, val)}
            placeholder={sec.placeholder}
          />
        </div>
      );
    }

    if (sec.type === 'locked') {
      return (
        <div className="locked-section-wrap">
          <p className="section-desc">{sec.description}</p>
          <LockedDataTable
            parameters={sec.key === '_params' ? parameters : undefined}
            results={sec.key === '_results' ? results : undefined}
          />
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
                        if (s.type === 'cover') return COVER_FIELDS.some(f => sections[f.key]);
                        return sections[s.key] && sections[s.key].length > 10;
                      }).length /
                    SECTIONS.filter(s => s.type !== 'locked').length) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="completion-pct">
              {SECTIONS.filter(s => s.type === 'wysiwyg' || s.type === 'cover').filter(s => {
                if (s.type === 'cover') return COVER_FIELDS.some(f => sections[f.key]);
                return sections[s.key] && sections[s.key].length > 10;
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
