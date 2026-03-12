import { useState, useEffect } from 'react';
import InputField from './components/InputField';
import ResultCard from './components/ResultCard';
import SoilLayerEditor from './components/SoilLayerEditor';
import LayerResultsPanel from './components/LayerResultsPanel';
import CrossSectionView from './components/CrossSectionView';
import PlanView from './components/PlanView';
import './App.css';

const API_URL = 'http://localhost:3001/api';

// Translations
const translations = {
  en: {
    title: '🏗️ Jet-Grout-Calc',
    subtitle: 'Jet Grouting Design & Analysis Tool',
    tabs: {
      parameters: 'Parameters',
      soilLayers: 'Soil Layers'
    },
    geometry: {
      title: 'Column Geometry',
      diameter: 'Column Diameter',
      spacing: 'Column Spacing',
      height: 'Column Height',
      diameterTip: 'Jet grout column diameter',
      spacingTip: 'Grid spacing between columns',
      heightTip: 'Treatment depth / column length'
    },
    soil: {
      title: 'Soil Properties',
      cu: 'Undrained Cohesion (cu)',
      cuTip: 'Soil undrained shear strength',
      Es: 'Soil Elastic Modulus (Es)',
      EsTip: 'Soil elastic modulus',
      alpha: 'Adhesion Factor (α)',
      alphaTip: 'Shaft adhesion factor',
      Nc: 'Bearing Capacity Coefficient (Nc)',
      NcTip: 'Nc coefficient (typically 9 for clay)'
    },
    soilLayers: {
      title: 'Soil Layers',
      layer: 'Layer',
      thickness: 'Thickness',
      soilType: 'Soil Type',
      gamma: 'Unit Weight',
      phi: 'Friction Angle',
      cohesion: 'Cohesion',
      elasticity: 'Elastic Modulus',
      poisson: 'Poisson Ratio',
      addLayer: 'Add Layer',
      removeLayer: 'Remove Layer',
      totalDepth: 'Total Depth',
      depthWarning: 'Total depth exceeds 30m limit!',
      layerTable: 'Layer Analysis',
      depthRange: 'Depth Range',
      summary: 'Weighted Averages'
    },
    jetgrout: {
      title: 'Jet Grout Properties',
      strength: 'Jet Grout Strength (σjet)',
      strengthTip: 'Unconfined compressive strength of jet grout',
      modulus: 'Elastic Modulus (Ejg)',
      modulusTip: 'Jet grout elastic modulus (typically 150-500 MPa)',
      materialFs: 'Material Safety Factor (Fs)',
      materialFsTip: 'Safety factor for material design strength (typically 2.0)',
      bearingFS: 'Bearing Capacity Safety Factor (FS)',
      bearingFSTip: 'Safety factor for bearing capacity (typically 1.5)'
    },
    loading: {
      title: 'Loading Conditions',
      pressure: 'Foundation Pressure (qtemel)',
      pressureTip: 'Applied foundation pressure',
      netPressure: 'Net Pressure (qnet)',
      netPressureTip: 'Net pressure for settlement (leave empty to auto-calculate)'
    },
    results: {
      title: '📊 Calculation Results',
      geometry: '📐 Geometry',
      material: '🧱 Material Parameters',
      capacity: '💪 Bearing Capacity',
      improvedSoil: '🌍 Improved Soil',
      settlement: '📉 Settlement',
      noResults: 'No results yet.',
      enterParams: 'Enter parameters and click "Calculate".'
    },
    calculate: '🔬 Calculate',
    calculating: 'Calculating...',
    apiError: 'Cannot connect to API. Is the backend running?',
    calcFailed: 'Calculation failed',
    footer: 'Jet-Grout-Calc v1.0 © 2026'
  },
  tr: {
    title: '🏗️ Jet-Grout-Calc',
    subtitle: 'Jet Grout Tasarım ve Analiz Aracı',
    tabs: {
      parameters: 'Parametreler',
      soilLayers: 'Zemin Tabakaları'
    },
    geometry: {
      title: 'Kolon Geometrisi',
      diameter: 'Kolon Çapı',
      spacing: 'Kolon Aralığı',
      height: 'Kolon Yüksekliği',
      diameterTip: 'Jet grout kolon çapı',
      spacingTip: 'Kolonlar arası mesafe',
      heightTip: 'İyileştirme derinliği / kolon boyu'
    },
    soil: {
      title: 'Zemin Özellikleri',
      cu: 'Drenajsız Kohezyon (cu)',
      cuTip: 'Zeminin drenajsız kayma dayanımı',
      Es: 'Zemin Elastisite Modülü (Es)',
      EsTip: 'Zemin elastisite modülü',
      alpha: 'Aderans Faktörü (α)',
      alphaTip: 'Çevre sürtünme faktörü',
      Nc: 'Taşıma Kapasitesi Katsayısı (Nc)',
      NcTip: 'Nc katsayısı (kil için genellikle 9)'
    },
    soilLayers: {
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
      summary: 'Ağırlıklı Ortalama Değerler'
    },
    jetgrout: {
      title: 'Jet Grout Özellikleri',
      strength: 'Jet Grout Dayanımı (σjet)',
      strengthTip: 'Jet grout tek eksenli basınç dayanımı',
      modulus: 'Elastisite Modülü (Ejg)',
      modulusTip: 'Jet grout elastisite modülü (tipik 150-500 MPa)',
      materialFs: 'Malzeme Güvenlik Faktörü (Fs)',
      materialFsTip: 'Malzeme tasarım dayanımı için güvenlik faktörü (genellikle 2.0)',
      bearingFS: 'Taşıma Kapasitesi Güv. Fak. (FS)',
      bearingFSTip: 'Taşıma kapasitesi için güvenlik faktörü (genellikle 1.5)'
    },
    loading: {
      title: 'Yükleme Koşulları',
      pressure: 'Temel Basıncı (qtemel)',
      pressureTip: 'Uygulanan temel basıncı',
      netPressure: 'Net Basınç (qnet)',
      netPressureTip: 'Oturma hesabı için net basınç (boş bırakılırsa otomatik hesaplanır)'
    },
    results: {
      title: '📊 Hesap Sonuçları',
      geometry: '📐 Geometri',
      material: '🧱 Malzeme Parametreleri',
      capacity: '💪 Taşıma Kapasitesi',
      improvedSoil: '🌍 İyileştirilmiş Zemin',
      settlement: '📉 Oturma',
      noResults: 'Henüz sonuç yok.',
      enterParams: 'Parametreleri girin ve "Hesapla" butonuna tıklayın.'
    },
    calculate: '🔬 Hesapla',
    calculating: 'Hesaplanıyor...',
    apiError: 'API\'ye bağlanılamıyor. Backend çalışıyor mu?',
    calcFailed: 'Hesaplama başarısız',
    footer: 'Jet-Grout-Calc v1.0 © 2026'
  }
};

function App() {
  const [lang, setLang] = useState('en');
  const [activePanel, setActivePanel] = useState(null); // null = panel kapalı
  const [parameters, setParameters] = useState({
    D: 0.6,
    s: 1.6,
    cu: 45,
    sigmaJet: 3.0,
    Es: 10,
    Ejg: 450,
    H: 12,
    qtemel: 120,
    qnet: 60,
    Fs: 2.0,
    FS: 1.5,
    alpha: 0.5,
    Nc: 5.14
  });
  const [soilLayers, setSoilLayers] = useState([
    {
      id: 'layer-1',
      thickness: 5,
      soilType: 'kil',
      gamma: 18,
      phi: 15,
      cohesion: 80,
      elasticity: 25000,
      poisson: 0.3
    }
  ]);
  const [units, setUnits] = useState({
    sigmaJet: 'MPa',
    Es: 'MPa',
    Ejg: 'MPa',
    cu: 'kPa',
    qtemel: 'kPa',
    qnet: 'kPa'
  });
  const [results, setResults] = useState(null);
  const [layerResults, setLayerResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toKPa = (value, unit) => {
    return unit === 'MPa' ? value * 1000 : value;
  };

  const t = translations[lang];
  const tr = lang === 'tr';

  useEffect(() => {
    fetch(`${API_URL}/defaults`)
      .then(res => res.json())
      .then(data => setParameters(prev => ({ ...prev, ...data })))
      .catch(err => console.log('Using local defaults'));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (fieldName, newUnit) => {
    setUnits(prev => ({ ...prev, [fieldName]: newUnit }));
  };

  const handleCalculateLayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/calculate-layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers: soilLayers })
      });
      const data = await response.json();
      if (data.success) {
        setLayerResults(data.results);
        const summary = data.results.summary;
        if (summary) {
          setParameters(prev => ({
            ...prev,
            cu: summary.cohesionAvg?.value || prev.cu,
            Es: summary.elasticityAvg?.value ? summary.elasticityAvg.value / 1000 : prev.Es,
            H: summary.totalDepth?.value || prev.H
          }));
          setUnits(prev => ({ ...prev, Es: 'MPa', cu: 'kPa' }));
        }
      } else {
        setError(data.error || t.calcFailed);
      }
    } catch (err) {
      setError(t.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const convertedParams = {
        ...parameters,
        sigmaJet: toKPa(parseFloat(parameters.sigmaJet), units.sigmaJet),
        Es: toKPa(parseFloat(parameters.Es), units.Es),
        Ejg: toKPa(parseFloat(parameters.Ejg), units.Ejg),
        cu: toKPa(parseFloat(parameters.cu), units.cu),
        qtemel: toKPa(parseFloat(parameters.qtemel), units.qtemel),
        qnet: toKPa(parseFloat(parameters.qnet), units.qnet)
      };
      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: convertedParams, lang })
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setActivePanel('results');
      } else {
        setError(data.error || t.calcFailed);
      }
    } catch (err) {
      setError(t.apiError);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'tr' : 'en');
  };

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Menu items
  const menuItems = [
    { key: 'parameters', icon: '⚙️', label: tr ? 'Parametreler' : 'Parameters' },
    { key: 'soilLayers', icon: '🌍', label: tr ? 'Zemin' : 'Soil' },
    { key: 'crossSection', icon: '📐', label: tr ? 'Kesit' : 'Section' },
    { key: 'results', icon: '📊', label: tr ? 'Sonuçlar' : 'Results' },
  ];

  return (
    <div className="dashboard">
      {/* ── Left Icon Sidebar ── */}
      <nav className="dash-sidebar">
        <div className="dash-logo" title="Jet-Grout-Calc">
          🏗️
        </div>

        <div className="dash-menu">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={`dash-menu-btn ${activePanel === item.key ? 'active' : ''}`}
              onClick={() => togglePanel(item.key)}
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="dash-sidebar-bottom">
          <button className="dash-menu-btn" onClick={toggleLanguage} title={lang === 'en' ? 'Türkçe' : 'English'}>
            <span className="menu-icon">{lang === 'en' ? '🇹🇷' : '🇬🇧'}</span>
            <span className="menu-label">{lang === 'en' ? 'TR' : 'EN'}</span>
          </button>
        </div>
      </nav>

      {/* ── Slide-out Panel ── */}
      {activePanel && (
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h2>{menuItems.find(m => m.key === activePanel)?.label || ''}</h2>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>

          <div className="dash-panel-content">
            {error && <div className="panel-error">⚠️ {error}</div>}

            {/* ── Parameters ── */}
            {activePanel === 'parameters' && (
              <>
                <div className="panel-section">
                  <h3>{t.geometry.title}</h3>
                  <div className="panel-form">
                    <InputField label={t.geometry.diameter} name="D" value={parameters.D} onChange={handleInputChange} unit="m" placeholder="0.6" min={0.3} max={3.0} step={0.1} tooltip={t.geometry.diameterTip} />
                    <InputField label={t.geometry.spacing} name="s" value={parameters.s} onChange={handleInputChange} unit="m" placeholder="1.6" min={0.5} max={10} step={0.1} tooltip={t.geometry.spacingTip} />
                    <InputField label={t.geometry.height} name="H" value={parameters.H} onChange={handleInputChange} unit="m" placeholder="12" min={1} max={50} tooltip={t.geometry.heightTip} />
                  </div>
                </div>

                <div className="panel-section">
                  <h3>{t.soil.title}</h3>
                  {layerResults && (
                    <div className="sync-info">✅ {tr ? 'Zemin tabakalarından aktarıldı' : 'Synced from soil layers'}</div>
                  )}
                  <div className="panel-form">
                    <InputField label={t.soil.cu} name="cu" value={parameters.cu} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.cu} onUnitChange={handleUnitChange} placeholder="25" min={5} max={200} tooltip={t.soil.cuTip} />
                    <InputField label={t.soil.Es} name="Es" value={parameters.Es} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Es} onUnitChange={handleUnitChange} placeholder="10" min={1} max={1000} step={1} tooltip={t.soil.EsTip} />
                    <InputField label={t.soil.alpha} name="alpha" value={parameters.alpha} onChange={handleInputChange} unit="-" placeholder="0.5" min={0.3} max={1.0} step={0.05} tooltip={t.soil.alphaTip} />
                    <InputField label={t.soil.Nc} name="Nc" value={parameters.Nc} onChange={handleInputChange} unit="-" placeholder="9" min={5.14} max={9} step={0.1} tooltip={t.soil.NcTip} />
                  </div>
                </div>

                <div className="panel-section">
                  <h3>{t.jetgrout.title}</h3>
                  <div className="panel-form">
                    <InputField label={t.jetgrout.strength} name="sigmaJet" value={parameters.sigmaJet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.sigmaJet} onUnitChange={handleUnitChange} placeholder="3.0" min={0.5} max={20} step={0.1} tooltip={t.jetgrout.strengthTip} />
                    <InputField label={t.jetgrout.modulus} name="Ejg" value={parameters.Ejg} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Ejg} onUnitChange={handleUnitChange} placeholder="450" min={50} max={2000} step={10} tooltip={t.jetgrout.modulusTip} />
                    <InputField label={t.jetgrout.materialFs} name="Fs" value={parameters.Fs} onChange={handleInputChange} unit="-" placeholder="2.0" min={1.5} max={4.0} step={0.1} tooltip={t.jetgrout.materialFsTip} />
                    <InputField label={t.jetgrout.bearingFS} name="FS" value={parameters.FS} onChange={handleInputChange} unit="-" placeholder="1.5" min={1.0} max={3.0} step={0.1} tooltip={t.jetgrout.bearingFSTip} />
                  </div>
                </div>

                <div className="panel-section">
                  <h3>{t.loading.title}</h3>
                  <div className="panel-form">
                    <InputField label={t.loading.pressure} name="qtemel" value={parameters.qtemel} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qtemel} onUnitChange={handleUnitChange} placeholder="150" min={50} max={1000} step={10} tooltip={t.loading.pressureTip} />
                    <InputField label={t.loading.netPressure} name="qnet" value={parameters.qnet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qnet} onUnitChange={handleUnitChange} placeholder="" min={0} max={500} step={5} tooltip={t.loading.netPressureTip} />
                  </div>
                </div>

                <button className="panel-calculate-btn" onClick={handleCalculate} disabled={loading}>
                  {loading ? t.calculating : t.calculate}
                </button>
              </>
            )}

            {/* ── Soil Layers ── */}
            {activePanel === 'soilLayers' && (
              <div className="panel-soil-editor">
                <SoilLayerEditor
                  layers={soilLayers}
                  onChange={setSoilLayers}
                  translations={t.soilLayers}
                  lang={lang}
                />
                {layerResults && (
                  <LayerResultsPanel
                    results={layerResults}
                    translations={t.soilLayers}
                    lang={lang}
                  />
                )}
              </div>
            )}

            {/* ── Cross Section ── */}
            {activePanel === 'crossSection' && (
              <div className="panel-crosssection">
                <CrossSectionView
                  parameters={parameters}
                  soilLayers={soilLayers}
                  lang={lang}
                  onParameterChange={handleInputChange}
                />
              </div>
            )}

            {/* ── Results ── */}
            {activePanel === 'results' && (
              <>
                {results ? (
                  <div className="panel-results">
                    <ResultCard title={t.results.geometry} results={results.geometry} />
                    <ResultCard title={t.results.material} results={results.material} />
                    <ResultCard title={t.results.capacity} results={results.capacity} />
                    <ResultCard title={t.results.improvedSoil} results={results.improvedSoil} />
                    <ResultCard title={t.results.settlement} results={results.settlement} />
                  </div>
                ) : (
                  <div className="no-results">
                    <p>📊</p>
                    <p>{t.results.noResults}</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 6 }}>{t.results.enterParams}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main: PlanView ── */}
      <main className="dash-main">
        <PlanView
          parameters={parameters}
          lang={lang}
          onParameterChange={handleInputChange}
        />
      </main>
    </div>
  );
}

export default App;
