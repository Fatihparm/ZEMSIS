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
      geometry: 'Geometry',
      soilLayers: 'Soil Layers',
      soil: 'Soil Properties',
      jetgrout: 'Jet Grout',
      loading: 'Loading'
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
      enterParams: 'Enter parameters on the left and click "Calculate".'
    },
    calculate: '🔬 Calculate',
    calculating: 'Calculating...',
    apiError: 'Cannot connect to API. Is the backend running?',
    calcFailed: 'Calculation failed',
    footer: 'Jet-Grout-Calc v1.0 © 2026 | Based on Geotechnical Engineering Formulas'
  },
  tr: {
    title: '🏗️ Jet-Grout-Calc',
    subtitle: 'Jet Grout Tasarım ve Analiz Aracı',
    tabs: {
      geometry: 'Geometri',
      soilLayers: 'Zemin Tabakaları',
      soil: 'Zemin Özellikleri',
      jetgrout: 'Jet Grout',
      loading: 'Yükleme'
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
      bearingFS: 'Taşıma Kapasitesi Güvenlik Faktörü (FS)',
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
      enterParams: 'Soldaki parametreleri girin ve "Hesapla" butonuna tıklayın.'
    },
    calculate: '🔬 Hesapla',
    calculating: 'Hesaplanıyor...',
    apiError: 'API\'ye bağlanılamıyor. Backend çalışıyor mu?',
    calcFailed: 'Hesaplama başarısız',
    footer: 'Jet-Grout-Calc v1.0 © 2026 | Geoteknik Mühendisliği Formüllerine Dayalı'
  }
};

function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('geometry');
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
  // Zemin tabakaları state
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
  // Unit selections: 'kPa' or 'MPa'
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

  // Convert value to kPa based on selected unit
  const toKPa = (value, unit) => {
    return unit === 'MPa' ? value * 1000 : value;
  };

  const t = translations[lang];

  // Load defaults on mount
  useEffect(() => {
    fetch(`${API_URL}/defaults`)
      .then(res => res.json())
      .then(data => setParameters(prev => ({ ...prev, ...data })))
      .catch(err => console.log('Using local defaults'));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUnitChange = (fieldName, newUnit) => {
    setUnits(prev => ({
      ...prev,
      [fieldName]: newUnit
    }));
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

        // Auto-sync: zemin tabakaları ortalamasını parametrelere aktar
        const summary = data.results.summary;
        if (summary) {
          setParameters(prev => ({
            ...prev,
            cu: summary.cohesionAvg?.value || prev.cu,
            Es: summary.elasticityAvg?.value ? summary.elasticityAvg.value / 1000 : prev.Es, // kN/m² → MPa
            H: summary.totalDepth?.value || prev.H
          }));
          // Es birimini MPa olarak ayarla
          setUnits(prev => ({
            ...prev,
            Es: 'MPa',
            cu: 'kPa'
          }));
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
      // Convert parameters to kPa before sending
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

  // Tüm sekmeler aktif
  const tabs = [
    { id: 'geometry', label: t.tabs.geometry },
    { id: 'soilLayers', label: t.tabs.soilLayers },
    { id: 'soil', label: t.tabs.soil },
    { id: 'jetgrout', label: t.tabs.jetgrout },
    { id: 'loading', label: t.tabs.loading }
  ];

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-top">
          <button className="lang-btn" onClick={toggleLanguage}>
            {lang === 'en' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
          </button>
        </div>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="main-layout full-width-mode">
        <div className="full-panel">
          <nav className="tab-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="main-content">
            {/* Geometry Tab */}
            {activeTab === 'geometry' && (
              <section className="tab-panel">
                <h2>{t.geometry.title}</h2>
                <div className="form-grid">
                  <InputField label={t.geometry.diameter} name="D" value={parameters.D} onChange={handleInputChange} unit="m" placeholder="0.8" min={0.3} max={3.0} step={0.1} tooltip={t.geometry.diameterTip} />
                  <InputField label={t.geometry.spacing} name="s" value={parameters.s} onChange={handleInputChange} unit="m" placeholder="1.5" min={0.5} max={5.0} step={0.1} tooltip={t.geometry.spacingTip} />
                  <InputField label={t.geometry.height} name="H" value={parameters.H} onChange={handleInputChange} unit="m" placeholder="10" min={1} max={50} step={0.5} tooltip={t.geometry.heightTip} />
                </div>
              </section>
            )}

            {/* Soil Layers Tab */}
            {activeTab === 'soilLayers' && (
              <section className="tab-panel">
                <h2>{t.soilLayers.title}</h2>
                <SoilLayerEditor
                  layers={soilLayers}
                  onChange={setSoilLayers}
                  translations={t.soilLayers}
                  lang={lang}
                />
                <div className="action-bar" style={{ marginTop: '16px' }}>
                  <button className="calculate-btn sync-btn" onClick={handleCalculateLayers} disabled={loading}>
                    {loading ? t.calculating : (lang === 'tr' ? '🔄 Analiz Et ve Parametrelere Aktar' : '🔄 Analyze & Sync to Parameters')}
                  </button>
                </div>
                {layerResults && (
                  <LayerResultsPanel
                    results={layerResults}
                    translations={t.soilLayers}
                    lang={lang}
                  />
                )}
              </section>
            )}

            {/* Soil Properties Tab */}
            {activeTab === 'soil' && (
              <section className="tab-panel">
                <h2>{t.soil.title}</h2>
                {layerResults && (
                  <div className="sync-info">
                    ✅ {lang === 'tr' ? 'Zemin tabakaları ortalaması aktarıldı' : 'Synced from soil layers'}
                  </div>
                )}
                <div className="form-grid">
                  <InputField label={t.soil.cu} name="cu" value={parameters.cu} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.cu} onUnitChange={handleUnitChange} placeholder="25" min={5} max={200} tooltip={t.soil.cuTip} />
                  <InputField label={t.soil.Es} name="Es" value={parameters.Es} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Es} onUnitChange={handleUnitChange} placeholder="10" min={1} max={1000} step={1} tooltip={t.soil.EsTip} />
                  <InputField label={t.soil.alpha} name="alpha" value={parameters.alpha} onChange={handleInputChange} unit="-" placeholder="0.5" min={0.3} max={1.0} step={0.05} tooltip={t.soil.alphaTip} />
                  <InputField label={t.soil.Nc} name="Nc" value={parameters.Nc} onChange={handleInputChange} unit="-" placeholder="9" min={5.14} max={9} step={0.1} tooltip={t.soil.NcTip} />
                </div>
              </section>
            )}

            {/* Jet Grout Tab */}
            {activeTab === 'jetgrout' && (
              <section className="tab-panel">
                <h2>{t.jetgrout.title}</h2>
                <div className="form-grid">
                  <InputField label={t.jetgrout.strength} name="sigmaJet" value={parameters.sigmaJet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.sigmaJet} onUnitChange={handleUnitChange} placeholder="3.0" min={0.5} max={20} step={0.1} tooltip={t.jetgrout.strengthTip} />
                  <InputField label={t.jetgrout.modulus} name="Ejg" value={parameters.Ejg} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Ejg} onUnitChange={handleUnitChange} placeholder="450" min={50} max={2000} step={10} tooltip={t.jetgrout.modulusTip} />
                  <InputField label={t.jetgrout.materialFs} name="Fs" value={parameters.Fs} onChange={handleInputChange} unit="-" placeholder="2.0" min={1.5} max={4.0} step={0.1} tooltip={t.jetgrout.materialFsTip} />
                  <InputField label={t.jetgrout.bearingFS} name="FS" value={parameters.FS} onChange={handleInputChange} unit="-" placeholder="1.5" min={1.0} max={3.0} step={0.1} tooltip={t.jetgrout.bearingFSTip} />
                </div>
              </section>
            )}

            {/* Loading Tab */}
            {activeTab === 'loading' && (
              <section className="tab-panel">
                <h2>{t.loading.title}</h2>
                <div className="form-grid">
                  <InputField label={t.loading.pressure} name="qtemel" value={parameters.qtemel} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qtemel} onUnitChange={handleUnitChange} placeholder="150" min={50} max={1000} step={10} tooltip={t.loading.pressureTip} />
                  <InputField label={t.loading.netPressure} name="qnet" value={parameters.qnet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qnet} onUnitChange={handleUnitChange} placeholder="" min={0} max={500} step={5} tooltip={t.loading.netPressureTip} />
                </div>
              </section>
            )}
          </main>

          {/* Ana Hesapla Butonu */}
          <div className="action-bar">
            <button className="calculate-btn" onClick={handleCalculate} disabled={loading}>
              {loading ? t.calculating : t.calculate}
            </button>
          </div>

          {/* Sonuçlar - Aşağıda */}
          {results && (
            <section className="tab-panel results-panel" style={{ marginTop: '20px' }}>
              <h2>{t.results.title}</h2>
              <div className="results-grid">
                <ResultCard title={t.results.geometry} results={results.geometry} />
                <ResultCard title={t.results.material} results={results.material} />
                <ResultCard title={t.results.capacity} results={results.capacity} />
                <ResultCard title={t.results.improvedSoil} results={results.improvedSoil} />
                <ResultCard title={t.results.settlement} results={results.settlement} />
              </div>
            </section>
          )}

          {/* Kesit Görünümü - Hesaplama sonrası */}
          {results && (
            <CrossSectionView
              parameters={parameters}
              soilLayers={soilLayers}
              lang={lang}
            />
          )}

          {/* Yerleşim Planı (Kuş Bakışı) - Hesaplama sonrası */}
          {results && (
            <PlanView
              parameters={parameters}
              lang={lang}
              onParameterChange={handleInputChange}
            />
          )}
        </div>
      </div>

      <footer className="footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}

export default App;
