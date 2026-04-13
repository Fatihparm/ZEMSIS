import { useState, useEffect, useRef } from 'react';
import InputField from './components/InputField';
import ResultCard from './components/ResultCard';
import SoilLayerEditor from './components/SoilLayerEditor';
import LayerResultsPanel from './components/LayerResultsPanel';
import SoilSectionPanel from './components/SoilSectionPanel';
import PlanView from './components/PlanView';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import ProjectsPage from './components/ProjectsPage';
import SaveProjectModal from './components/SaveProjectModal';
import './App.css';

const API_URL = 'http://localhost:3001/api';

// Translations
const translations = {
  en: {
    title: '🏗️ Jet-Grout-Calc',
    subtitle: 'Jet Grouting Design & Analysis Tool',
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

const defaultParameters = {
  D: 0.6, s: 1.6, cu: 45, sigmaJet: 3.0, Es: 10, Ejg: 450,
  H: 12, qtemel: 120, qnet: 60, Fs: 2.0, FS: 1.5, alpha: 0.5, Nc: 5.14
};

const defaultUnits = {
  sigmaJet: 'MPa', Es: 'MPa', Ejg: 'MPa', cu: 'kPa', qtemel: 'kPa', qnet: 'kPa'
};

const defaultSoilLayers = [
  { id: 'layer-1', thickness: 5, soilType: 'kil', gamma: 18, phi: 15, cohesion: 80, elasticity: 25000, poisson: 0.3 }
];

function App() {
  const [lang, setLang] = useState('en');

  // ── Navigation: 'home' | 'projects' | 'workspace' ──
  const [activePage, setActivePage] = useState('home');
  // Active tab within workspace
  const [activeTab, setActiveTab] = useState('parameters');

  // ── Auth state ──
  const [token, setToken] = useState(() => localStorage.getItem('jg_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('jg_user');
    return stored ? JSON.parse(stored) : null;
  });

  // ── Project state ──
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ── Extra visual params (foundation, fill) ──
  const [extraParams, setExtraParams] = useState({ foundationThickness: 0.5, fillHeight: 0 });

  // Drawing data stored in ref (updated by PlanView callback)
  const drawingDataRef = useRef(null);

  // ── App data state ──
  const [parameters, setParameters] = useState({ ...defaultParameters });
  const [soilLayers, setSoilLayers] = useState([...defaultSoilLayers]);
  const [units, setUnits] = useState({ ...defaultUnits });
  const [results, setResults] = useState(null);
  const [layerResults, setLayerResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toKPa = (value, unit) => unit === 'MPa' ? value * 1000 : value;

  const t = translations[lang];
  const tr = lang === 'tr';

  // ── Verify token on mount ──
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) handleLogout();
          else setUser(data.user);
        })
        .catch(() => handleLogout());
    }
  }, []);

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setActivePage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('jg_token');
    localStorage.removeItem('jg_user');
    setToken(null);
    setUser(null);
    resetWorkspace();
  };

  const resetWorkspace = () => {
    setCurrentProjectId(null);
    setCurrentProjectName('');
    setParameters({ ...defaultParameters });
    setSoilLayers([...defaultSoilLayers]);
    setUnits({ ...defaultUnits });
    setResults(null);
    setLayerResults(null);
    setExtraParams({ foundationThickness: 0.5, fillHeight: 0 });
    setActivePage('home');
    setActiveTab('parameters');
  };

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
    } catch {
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
        setActiveTab('results');
      } else {
        setError(data.error || t.calcFailed);
      }
    } catch {
      setError(t.apiError);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => setLang(prev => prev === 'en' ? 'tr' : 'en');

  // ── Project load ──
  const handleLoadProject = (project) => {
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    if (project.parameters) setParameters(project.parameters);
    if (project.soilLayers && project.soilLayers.length > 0) setSoilLayers(project.soilLayers);
    if (project.units) setUnits(project.units);
    if (project.results) setResults(project.results);
    if (project.extraParams) setExtraParams(project.extraParams);
    drawingDataRef.current = project.drawingData || null;
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  // ── New project ──
  const handleNewProject = () => {
    setCurrentProjectId(null);
    setCurrentProjectName('');
    setParameters({ ...defaultParameters });
    setSoilLayers([...defaultSoilLayers]);
    setUnits({ ...defaultUnits });
    setResults(null);
    setLayerResults(null);
    setExtraParams({ foundationThickness: 0.5, fillHeight: 0 });
    drawingDataRef.current = null;
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  // ── Import DXF from home page ──
  const [pendingDxfImport, setPendingDxfImport] = useState(false);
  const handleImportDxf = () => {
    // Create a fresh workspace and go to Drawing tab with DXF modal open
    setCurrentProjectId(null);
    setCurrentProjectName('');
    setParameters({ ...defaultParameters });
    setSoilLayers([...defaultSoilLayers]);
    setUnits({ ...defaultUnits });
    setResults(null);
    setLayerResults(null);
    setExtraParams({ foundationThickness: 0.5, fillHeight: 0 });
    drawingDataRef.current = null;
    setPendingDxfImport(true);
    setActivePage('workspace');
    setActiveTab('planView');
  };

  // ── Save complete ──
  const handleSaveComplete = (savedProject) => {
    setCurrentProjectId(savedProject.id);
    setCurrentProjectName(savedProject.name);
    setShowSaveModal(false);
  };

  const getProjectData = () => ({
    name: currentProjectName,
    description: '',
    parameters,
    soilLayers,
    results,
    drawingData: drawingDataRef.current,
    units,
    extraParams,
  });

  const handleDrawingDataChange = (data) => {
    drawingDataRef.current = data;
  };

  // ── Not logged in → Auth ──
  if (!token) {
    return <AuthPage onLogin={handleLogin} lang={lang} />;
  }

  // Sidebar menu — top-level only
  const menuItems = [
    { key: 'home', icon: '🏠', label: tr ? 'Ana Sayfa' : 'Home' },
    { key: 'projects', icon: '📁', label: tr ? 'Projeler' : 'Projects' },
  ];

  // Workspace tabs — shown only when activePage === 'workspace'
  const workspaceTabs = [
    { key: 'parameters', icon: '⚙️', label: tr ? 'Parametreler' : 'Parameters' },
    { key: 'soilSection', icon: '🌍', label: tr ? 'Zemin & Kesit' : 'Soil & Section' },
    { key: 'planView', icon: '✏️', label: tr ? 'Çizim' : 'Drawing' },
    { key: 'results', icon: '📊', label: tr ? 'Sonuçlar' : 'Results' },
  ];

  return (
    <div className="dashboard">
      {/* ── Left Sidebar ── */}
      <nav className="dash-sidebar">
        <div className="dash-logo" title="Jet-Grout-Calc">🏗️</div>

        <div className="dash-menu">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={`dash-menu-btn ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          {/* Workspace sub-tabs in sidebar */}
          {activePage === 'workspace' && (
            <>
              <div className="sidebar-project-divider">
                <span title={currentProjectName || (tr ? 'Yeni Proje' : 'New Project')}>
                  {currentProjectName || (tr ? 'Yeni Proje' : 'New Project')}
                </span>
              </div>
              {workspaceTabs.map(tab => (
                <button
                  key={tab.key}
                  className={`dash-menu-btn sub-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                >
                  <span className="menu-icon">{tab.icon}</span>
                  <span className="menu-label">{tab.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="dash-sidebar-bottom">
          {/* New Project */}
          <button
            className="dash-menu-btn"
            onClick={handleNewProject}
            title={tr ? 'Yeni Proje' : 'New Project'}
          >
            <span className="menu-icon">➕</span>
            <span className="menu-label">{tr ? 'Yeni' : 'New'}</span>
          </button>

          {/* Save — only when in workspace */}
          {activePage === 'workspace' && (
            <button
              className="dash-menu-btn"
              onClick={() => setShowSaveModal(true)}
              title={tr ? 'Kaydet' : 'Save'}
            >
              <span className="menu-icon">💾</span>
              <span className="menu-label">{tr ? 'Kaydet' : 'Save'}</span>
            </button>
          )}

          {/* Language */}
          <button className="dash-menu-btn" onClick={toggleLanguage} title={lang === 'en' ? 'Türkçe' : 'English'}>
            <span className="menu-icon">{lang === 'en' ? '🇹🇷' : '🇬🇧'}</span>
            <span className="menu-label">{lang === 'en' ? 'TR' : 'EN'}</span>
          </button>

          {/* Logout */}
          <button className="dash-menu-btn logout-btn" onClick={handleLogout} title={tr ? 'Çıkış' : 'Logout'}>
            <span className="menu-icon">🚪</span>
            <span className="menu-label">{tr ? 'Çıkış' : 'Logout'}</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="dash-main">

        {/* ── Home ── */}
        {activePage === 'home' && (
          <Dashboard lang={lang} user={user} onNewProject={handleNewProject} onGoProjects={() => setActivePage('projects')} onImportDxf={handleImportDxf} />
        )}

        {/* ── Projects ── */}
        {activePage === 'projects' && (
          <ProjectsPage
            lang={lang}
            token={token}
            onLoadProject={handleLoadProject}
            onNewProject={handleNewProject}
            onDeleteProject={(id) => {
              if (currentProjectId === id) resetWorkspace();
            }}
          />
        )}

        {/* ── Workspace ── */}
        {activePage === 'workspace' && (
          <>
            {/* Parameters */}
            {activeTab === 'parameters' && (
              <div className="page-container">
                <div className="page-header">
                  <h2>{tr ? 'Parametreler' : 'Parameters'}</h2>
                </div>
                <div className="page-content">
                  {error && <div className="page-error">⚠️ {error}</div>}
                  <div className="params-grid">
                    <div className="param-card">
                      <h3>{t.geometry.title}</h3>
                      <div className="param-card-form">
                        <InputField label={t.geometry.diameter} name="D" value={parameters.D} onChange={handleInputChange} unit="m" placeholder="0.6" min={0.3} max={3.0} step={0.1} tooltip={t.geometry.diameterTip} />
                        <InputField label={t.geometry.spacing} name="s" value={parameters.s} onChange={handleInputChange} unit="m" placeholder="1.6" min={0.5} max={10} step={0.1} tooltip={t.geometry.spacingTip} />
                        <InputField label={t.geometry.height} name="H" value={parameters.H} onChange={handleInputChange} unit="m" placeholder="12" min={1} max={50} tooltip={t.geometry.heightTip} />
                      </div>
                    </div>
                    <div className="param-card">
                      <h3>{t.soil.title}</h3>
                      {layerResults && <div className="sync-info">✅ {tr ? 'Zemin tabakalarından aktarıldı' : 'Synced from soil layers'}</div>}
                      <div className="param-card-form">
                        <InputField label={t.soil.cu} name="cu" value={parameters.cu} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.cu} onUnitChange={handleUnitChange} placeholder="25" min={5} max={200} tooltip={t.soil.cuTip} />
                        <InputField label={t.soil.Es} name="Es" value={parameters.Es} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Es} onUnitChange={handleUnitChange} placeholder="10" min={1} max={1000} step={1} tooltip={t.soil.EsTip} />
                        <InputField label={t.soil.alpha} name="alpha" value={parameters.alpha} onChange={handleInputChange} unit="-" placeholder="0.5" min={0.3} max={1.0} step={0.05} tooltip={t.soil.alphaTip} />
                        <InputField label={t.soil.Nc} name="Nc" value={parameters.Nc} onChange={handleInputChange} unit="-" placeholder="9" min={5.14} max={9} step={0.1} tooltip={t.soil.NcTip} />
                      </div>
                    </div>
                    <div className="param-card">
                      <h3>{t.jetgrout.title}</h3>
                      <div className="param-card-form">
                        <InputField label={t.jetgrout.strength} name="sigmaJet" value={parameters.sigmaJet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.sigmaJet} onUnitChange={handleUnitChange} placeholder="3.0" min={0.5} max={20} step={0.1} tooltip={t.jetgrout.strengthTip} />
                        <InputField label={t.jetgrout.modulus} name="Ejg" value={parameters.Ejg} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.Ejg} onUnitChange={handleUnitChange} placeholder="450" min={50} max={2000} step={10} tooltip={t.jetgrout.modulusTip} />
                        <InputField label={t.jetgrout.materialFs} name="Fs" value={parameters.Fs} onChange={handleInputChange} unit="-" placeholder="2.0" min={1.5} max={4.0} step={0.1} tooltip={t.jetgrout.materialFsTip} />
                        <InputField label={t.jetgrout.bearingFS} name="FS" value={parameters.FS} onChange={handleInputChange} unit="-" placeholder="1.5" min={1.0} max={3.0} step={0.1} tooltip={t.jetgrout.bearingFSTip} />
                      </div>
                    </div>
                    <div className="param-card">
                      <h3>{t.loading.title}</h3>
                      <div className="param-card-form">
                        <InputField label={t.loading.pressure} name="qtemel" value={parameters.qtemel} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qtemel} onUnitChange={handleUnitChange} placeholder="150" min={50} max={1000} step={10} tooltip={t.loading.pressureTip} />
                        <InputField label={t.loading.netPressure} name="qnet" value={parameters.qnet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qnet} onUnitChange={handleUnitChange} placeholder="" min={0} max={500} step={5} tooltip={t.loading.netPressureTip} />
                      </div>
                    </div>
                  </div>
                  <button className="page-calculate-btn" onClick={handleCalculate} disabled={loading}>
                    {loading ? t.calculating : t.calculate}
                  </button>
                </div>
              </div>
            )}

            {/* Soil & Section — unified panel */}
            {activeTab === 'soilSection' && (
              <div className="page-container page-container-full">
                <SoilSectionPanel
                  layers={soilLayers}
                  onChange={setSoilLayers}
                  parameters={parameters}
                  lang={lang}
                  onParameterChange={handleInputChange}
                  extraParams={extraParams}
                  onExtraParamsChange={setExtraParams}
                  translations={t.soilLayers}
                />
              </div>
            )}

            {/* Plan View */}
            {activeTab === 'planView' && (
              <PlanView
                parameters={parameters}
                lang={lang}
                onParameterChange={handleInputChange}
                soilLayers={soilLayers}
                initialDrawingData={drawingDataRef.current}
                onDrawingDataChange={handleDrawingDataChange}
                extraParams={extraParams}
                openDxfModal={pendingDxfImport}
                onDxfModalOpened={() => setPendingDxfImport(false)}
              />
            )}

            {/* Results */}
            {activeTab === 'results' && (
              <div className="page-container">
                <div className="page-header">
                  <h2>{tr ? 'Hesap Sonuçları' : 'Calculation Results'}</h2>
                </div>
                <div className="page-content">
                  {results ? (
                    <div className="results-grid">
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
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Save Modal ── */}
      {showSaveModal && (
        <SaveProjectModal
          lang={lang}
          token={token}
          currentProjectId={currentProjectId}
          onSave={handleSaveComplete}
          onClose={() => setShowSaveModal(false)}
          projectData={getProjectData()}
        />
      )}
    </div>
  );
}

export default App;
