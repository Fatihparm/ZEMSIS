import { useState, useEffect } from 'react';
import SoilSectionPanel from './SoilSectionPanel';
import ResultCard from './ResultCard';
import './OfficerWorkspaceView.css';

const API_URL = '/api';

// ── Translations (tr sabit kullanıyoruz belediye portalı için) ────────────────
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
  {
    title: 'Kolon Geometrisi',
    keys: ['D', 's', 'H'],
  },
  {
    title: 'Zemin Özellikleri',
    keys: ['cu', 'Es', 'alpha', 'Nc'],
  },
  {
    title: 'Jet Grout Özellikleri',
    keys: ['sigmaJet', 'Ejg', 'Fs', 'FS'],
  },
  {
    title: 'Yükleme Koşulları',
    keys: ['qtemel', 'qnet'],
  },
];

const RESULT_LABELS = {
  geometry:     'Geometri Sonuçları',
  material:     'Malzeme Parametreleri',
  capacity:     'Taşıma Kapasitesi',
  improvedSoil: 'İyileştirilmiş Zemin',
  settlement:   'Oturma Hesapları',
};

const STATUS_CONFIG = {
  pending:  { label: 'Değerlendirme Bekliyor', icon: '🕐', cls: 'owv-status--pending'  },
  approved: { label: 'Kabul Edilmiştir',        icon: '✅', cls: 'owv-status--approved' },
  rejected: { label: 'Reddedildi',              icon: '❌', cls: 'owv-status--rejected' },
};

const TABS = [
  { key: 'parameters', icon: '⚙️', label: 'Parametreler' },
  { key: 'soilSection', icon: '🏔️', label: 'Zemin & Kesit' },
  { key: 'results',     icon: '📊', label: 'Hesap Sonuçları' },
];

const fmtNum = (v, decimals = 3) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return Math.abs(n) >= 1000
    ? n.toLocaleString('tr-TR', { maximumFractionDigits: decimals })
    : n.toFixed(decimals);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  OfficerWorkspaceView — Read-Only Project Inspector for Municipal Officers
// ═══════════════════════════════════════════════════════════════════════════════
export default function OfficerWorkspaceView({ applicationId, token, onBack }) {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');

  // Proje state'leri (read-only — sadece gösterim için)
  const [parameters, setParameters] = useState({});
  const [soilLayers, setSoilLayers] = useState([]);
  const [extraParams, setExtraParams] = useState({ foundationThickness: 0.5, fillHeight: 0, waterTable: 3 });
  const [results, setResults] = useState(null);

  // Uygulama verisini çek
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

        // Proje verilerini state'e aktar
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
        <div className="owv-error">⚠️ {error}</div>
        <button className="owv-banner__back" onClick={onBack} style={{ marginTop: '1rem', alignSelf: 'flex-start' }}>
          ← Listeye Dön
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
            ← Başvuru Listesi
          </button>
          <div className="owv-banner__info">
            <div className="owv-banner__project">
              🏗️ {appData?.project?.name || 'Proje'}
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
          <div className="owv-readonly-badge">Salt Okunur</div>
          <div className={`owv-status ${status.cls}`}>
            {status.icon} {status.label}
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
            <span className="owv-tab-icon">{tab.icon}</span>
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
                onChange={() => {}}            /* read-only: değişiklikleri yoksay */
                parameters={parameters}
                lang="tr"
                onParameterChange={() => {}}   /* read-only */
                extraParams={extraParams}
                onExtraParamsChange={() => {}}  /* read-only */
                translations={soilTranslations}
                readOnly={true}
              />
            ) : (
              <div className="owv-error">Bu proje için zemin profili verisi bulunamadı.</div>
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
              ⚠️ Bu proje için hesap sonucu bulunmuyor. Başvuru sahibi henüz hesaplama yapmamış olabilir.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
