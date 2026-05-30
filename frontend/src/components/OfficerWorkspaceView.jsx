import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import SoilSectionPanel from './SoilSectionPanel';
import ResultCard from './ResultCard';
import './OfficerWorkspaceView.css';

// ── Translations ──────────────────────────────────────────────────────────────
const soilTranslations = {
  title: 'Zemin Tabakaları',
  layer: 'Tabaka',
  thickness: 'Kalınlık',
  soilType: 'Zemin Tipi',
  gamma: 'Birim Hacim Ağırlık',
  phi: 'İçsel Sürtünme Açısı',
  cohesion: 'Kohezyon',
  elasticity: 'Elastisite Modülü',
  poisson: 'Poisson Oranı',
  addLayer: 'Tabaka Ekle',
  removeLayer: 'Tabakayı Sil',
  totalDepth: 'Toplam Derinlik',
  depthWarning: 'Toplam derinlik 30m limitini aşıyor!',
  layerTable: 'Katman Analizi',
  depthRange: 'Derinlik Aralığı',
  summary: 'Ağırlıklı Ortalama Değerler',
};

// Parametre etiketleri
const PARAM_LABELS = {
  D:        { label: 'Kolon Çapı (D)',                    unit: 'm' },
  s:        { label: 'Kolon Aralığı (s)',                  unit: 'm' },
  H:        { label: 'Kolon Yüksekliği (H)',               unit: 'm' },
  cu:       { label: 'Drenajsız Kohezyon (cu)',            unit: 'kPa' },
  Es:       { label: 'Zemin Elastisite Modülü (Es)',       unit: 'kPa' },
  alpha:    { label: 'Aderans Faktörü (α)',                unit: '—' },
  Nc:       { label: 'Taşıma Kapasitesi Katsayısı (Nc)',  unit: '—' },
  sigmaJet: { label: 'Jet Grout Dayanımı (σjet)',         unit: 'kPa' },
  Ejg:      { label: 'Jet Grout Elastisite Modülü (Ejg)', unit: 'kPa' },
  qtemel:   { label: 'Temel Basıncı (qtemel)',             unit: 'kPa' },
  qnet:     { label: 'Net Basınç (qnet)',                   unit: 'kPa' },
  Fs:       { label: 'Malzeme Güvenlik Faktörü (Fs)',      unit: '—' },
  FS:       { label: 'Taşıma Kap. Güvenlik Faktörü (FS)', unit: '—' },
};

// Parametre grupları
const PARAM_GROUPS = [
  { title: 'Kolon Geometrisi',      keys: ['D', 's', 'H'] },
  { title: 'Zemin Özellikleri',     keys: ['cu', 'Es', 'alpha', 'Nc'] },
  { title: 'Jet Grout Özellikleri', keys: ['sigmaJet', 'Ejg', 'Fs', 'FS'] },
  { title: 'Yükleme Koşulları',     keys: ['qtemel', 'qnet'] },
];

const RESULT_LABELS = {
  geometry:     'Geometri Sonuçları',
  material:     'Malzeme Parametreleri',
  capacity:     'Taşıma Kapasitesi',
  improvedSoil: 'İyileştirilmiş Zemin',
  settlement:   'Oturma Hesapları',
};

const STATUS_CONFIG = {
  pending:  { label: 'Değerlendirme Bekliyor', cls: 'owv-status--pending'  },
  approved: { label: 'Kabul Edilmiştir',        cls: 'owv-status--approved' },
  rejected: { label: 'Reddedildi',              cls: 'owv-status--rejected' },
};

/* ── SVG icon components ─────────────────────────────────────────────────── */
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const IconHardHat = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2v2Z" />
    <path d="M20 15a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2" />
    <path d="M12 3a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7Z" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
    <path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M6 20V4M18 20v-6" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const TABS = [
  { key: 'parameters', Icon: IconSettings,  label: 'Parametreler' },
  { key: 'soilSection', Icon: IconLayers,   label: 'Zemin & Kesit' },
  { key: 'results',     Icon: IconBarChart, label: 'Hesap Sonuçları' },
  { key: 'report',      Icon: IconFileText, label: 'Rapor' },
];

const fmtNum = (v, decimals = 3) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return Math.abs(n) >= 1000
    ? n.toLocaleString('tr-TR', { maximumFractionDigits: decimals })
    : n.toFixed(decimals);
};

// ═════════════════════════════════════════════════════════════════════════════
//  OfficerWorkspaceView — Read-Only Project Inspector for Municipal Officers
// ═════════════════════════════════════════════════════════════════════════════
export default function OfficerWorkspaceView({ applicationId, token, onBack }) {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');

  const [parameters, setParameters] = useState({});
  const [soilLayers, setSoilLayers] = useState([]);
  const [extraParams, setExtraParams] = useState({ foundationThickness: 0.5, fillHeight: 0, waterTable: 3 });
  const [results, setResults] = useState(null);

  // Rapor indirme durumu
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const reportSuccessTimer = useRef(null);

  // Rapor indirme fonksiyonu
  const handleDownloadReport = async () => {
    setReportLoading(true);
    setReportError('');
    setReportSuccess(false);
    try {
      const res = await fetch(`${API_URL}/reports/generate-for-application/${applicationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReportError(data.error || `Rapor oluşturulamadı (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const projectName = (appData?.project?.name || 'rapor')
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\s\-_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      a.href = url;
      a.download = `${projectName}_JG_Raporu.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setReportSuccess(true);
      clearTimeout(reportSuccessTimer.current);
      reportSuccessTimer.current = setTimeout(() => setReportSuccess(false), 4000);
    } catch {
      setReportError('Sunucuya bağlanılamadı.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (!d.success) {
          setError(d.error || 'Başvuru yüklenemedi.');
          return;
        }
        const app = d.application;
        setAppData(app);

        const proj = app.project || {};
        if (proj.parameters)  setParameters(proj.parameters);
        if (proj.soilLayers && proj.soilLayers.length > 0) setSoilLayers(proj.soilLayers);
        if (proj.extraParams)  setExtraParams(proj.extraParams);
        if (proj.results)      setResults(proj.results);
      } catch {
        setError('Sunucuya bağlanılamadı.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [applicationId, token]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="owv-root">
        <div className="owv-loading">
          <div className="owv-spinner" />
          <span>Proje yükleniyor...</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="owv-root">
        <div className="owv-error">
          <IconAlertTriangle />
          {error}
        </div>
        <button className="owv-banner__back" onClick={onBack} style={{ marginTop: '1rem', alignSelf: 'flex-start' }}>
          <IconArrowLeft /> Listeye Dön
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[appData?.status] || STATUS_CONFIG.pending;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="owv-root">

      {/* ── Banner — Proje & Başvuran bilgisi ── */}
      <div className="owv-banner">
        <div className="owv-banner__left">
          <button className="owv-banner__back" onClick={onBack} id="owv-back-btn">
            <IconArrowLeft /> Başvuru Listesi
          </button>
          <div className="owv-banner__info">
            <div className="owv-banner__project-row">
              <IconHardHat />
              <div className="owv-banner__project">
                {appData?.project?.name || 'Proje'}
              </div>
            </div>
            <div className="owv-banner__sub">
              Başvuran: <span>{appData?.applicantName}</span>
              &nbsp;·&nbsp;
              {appData?.applicantEmail}
              &nbsp;·&nbsp;
              {appData?.appliedAt
                ? new Date(appData.appliedAt).toLocaleDateString('tr-TR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                : ''}
            </div>
          </div>
        </div>
        <div className="owv-banner__right">
          <div className="owv-readonly-badge">
            <IconLock /> Salt Okunur
          </div>
          <div className={`owv-status ${status.cls}`}>
            <span className="owv-status__dot" />
            {status.label}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="owv-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`owv-tab-${tab.key}`}
            className={`owv-tab ${activeTab === tab.key ? 'owv-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.Icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}

      {/* Parametreler */}
      {activeTab === 'parameters' && (
        <div className="owv-content">
          <div className="owv-params-grid">
            {PARAM_GROUPS.map(group => (
              <div key={group.title} className="owv-param-card">
                <h3>{group.title}</h3>
                {group.keys.map(key => {
                  const meta = PARAM_LABELS[key];
                  if (!meta || parameters[key] === undefined) return null;
                  return (
                    <div key={key} className="owv-param-row">
                      <div className="owv-param-label">{meta.label}</div>
                      <div className="owv-param-value">
                        <span className="owv-param-val">
                          {fmtNum(parameters[key], key === 'D' || key === 's' || key === 'H' ? 2 : 3)}
                        </span>
                        <span className="owv-param-unit">{meta.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zemin ve Kesit */}
      {activeTab === 'soilSection' && (
        <div className="owv-content owv-content--full">
          <div className="owv-soil-wrapper">
            {soilLayers.length > 0 ? (
              <SoilSectionPanel
                layers={soilLayers}
                onChange={() => {}}
                parameters={parameters}
                lang="tr"
                onParameterChange={() => {}}
                extraParams={extraParams}
                onExtraParamsChange={() => {}}
                translations={soilTranslations}
                readOnly={true}
              />
            ) : (
              <div className="owv-error">
                <IconAlertTriangle />
                Bu proje için zemin profili verisi bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hesap Sonuçları */}
      {activeTab === 'results' && (
        <div className="owv-content">
          {results ? (
            <div className="owv-results-grid">
              {Object.entries(results).map(([cat, items]) => (
                <ResultCard
                  key={cat}
                  title={RESULT_LABELS[cat] || cat}
                  results={items}
                />
              ))}
            </div>
          ) : (
            <div className="owv-error">
              <IconAlertTriangle />
              Bu proje için hesap sonucu bulunmuyor. Başvuru sahibi henüz hesaplama yapmamış olabilir.
            </div>
          )}
        </div>
      )}

      {/* Rapor */}
      {activeTab === 'report' && (
        <div className="owv-content">
          <div className="owv-report-panel">

            {/* Bilgi kartı */}
            <div className="owv-report-info-card">
              <div className="owv-report-info-icon">
                <IconFileText />
              </div>
              <div className="owv-report-info-text">
                <h3>Jet Grout Hesap Raporu</h3>
                <p>
                  Bu rapor; proje parametrelerini, zemin profilini ve hesap sonuçlarını
                  içeren resmi DOCX formatında bir belgedir. İnceleme amacıyla
                  indirip görüntüleyebilirsiniz.
                </p>
              </div>
            </div>

            {/* Proje özeti */}
            <div className="owv-report-meta-grid">
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Proje Adı</span>
                <span className="owv-report-meta-value">{appData?.project?.name || '—'}</span>
              </div>
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Başvuran</span>
                <span className="owv-report-meta-value">{appData?.applicantName || '—'}</span>
              </div>
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Belediye</span>
                <span className="owv-report-meta-value">{appData?.municipality || '—'}</span>
              </div>
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Başvuru Tarihi</span>
                <span className="owv-report-meta-value">
                  {appData?.appliedAt
                    ? new Date(appData.appliedAt).toLocaleDateString('tr-TR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Hesap Sonuçları</span>
                <span className={`owv-report-meta-value owv-report-meta-badge ${results ? 'owv-report-meta-badge--ok' : 'owv-report-meta-badge--missing'}`}>
                  {results ? (
                    <><IconCheckCircle /> Mevcut</>
                  ) : (
                    <><IconAlertTriangle /> Yok</>
                  )}
                </span>
              </div>
              <div className="owv-report-meta-item">
                <span className="owv-report-meta-label">Rapor Formatı</span>
                <span className="owv-report-meta-value">Microsoft Word (.docx)</span>
              </div>
            </div>

            {/* Hata mesajı */}
            {reportError && (
              <div className="owv-error" style={{ marginBottom: '1rem' }}>
                <IconAlertTriangle />
                {reportError}
              </div>
            )}

            {/* Başarı mesajı */}
            {reportSuccess && (
              <div className="owv-report-success">
                <IconCheckCircle />
                Rapor başarıyla indirildi!
              </div>
            )}

            {/* İndirme butonu */}
            {results ? (
              <button
                id="owv-report-download-btn"
                className={`owv-report-download-btn ${reportLoading ? 'owv-report-download-btn--loading' : ''}`}
                onClick={handleDownloadReport}
                disabled={reportLoading}
              >
                {reportLoading ? (
                  <><span className="owv-report-btn-spinner" /> Rapor Oluşturuluyor...</>
                ) : (
                  <><IconDownload /> Raporu İndir (.docx)</>
                )}
              </button>
            ) : (
              <div className="owv-report-no-data">
                <IconAlertTriangle />
                <div>
                  <strong>Rapor oluşturulamıyor</strong>
                  <p>Bu proje için henüz hesaplama sonucu bulunmuyor. Başvuru sahibinin önce hesaplama yapması gerekiyor.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
