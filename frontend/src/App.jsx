import { useState, useEffect, useRef } from 'react';
import InputField from './components/InputField';
import ResultCard from './components/ResultCard';
import SoilSectionPanel from './components/SoilSectionPanel';
import PlanView from './components/PlanView';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import ProjectsPage from './components/ProjectsPage';
import SaveProjectModal from './components/SaveProjectModal';
import { generatePdfReport, parsePdfReport } from './utils/pdfReport';
import './App.css';

const API_URL = '/api';

const translations = {
  en: {
    title: 'ZEMSIS',
    subtitle: 'Ground Systems Design & Analysis Tool',
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
      alpha: 'Adhesion Factor (a)',
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
      strength: 'Jet Grout Strength (sjet)',
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
      title: 'Calculation Results',
      geometry: 'Geometry',
      material: 'Material Parameters',
      capacity: 'Bearing Capacity',
      improvedSoil: 'Improved Soil',
      settlement: 'Settlement',
      noResults: 'No results yet.',
      enterParams: 'Enter parameters and click "Calculate".'
    },
    calculate: 'Calculate',
    calculating: 'Calculating...',
    apiError: 'Cannot connect to API. Is the backend running?',
    calcFailed: 'Calculation failed',
    footer: 'ZEMSIS v1.0 © 2026'
  },
  tr: {
    title: 'ZEMSIS',
    subtitle: 'Zemin Sistemleri Tasarım ve Analiz Aracı',
    geometry: {
      title: 'Kolon Geometrisi',
      diameter: 'Kolon Capi',
      spacing: 'Kolon Araligi',
      height: 'Kolon Yuksekligi',
      diameterTip: 'Jet grout kolon capi',
      spacingTip: 'Kolonlar arasi mesafe',
      heightTip: 'Iyilestirme derinligi / kolon boyu'
    },
    soil: {
      title: 'Zemin Ozellikleri',
      cu: 'Drenajsiz Kohezyon (cu)',
      cuTip: 'Zeminin drenajsiz kayma dayanimi',
      Es: 'Zemin Elastisite Modulu (Es)',
      EsTip: 'Zemin elastisite modulu',
      alpha: 'Aderans Faktoru (a)',
      alphaTip: 'Cevre surtunme faktoru',
      Nc: 'Tasima Kapasitesi Katsayisi (Nc)',
      NcTip: 'Nc katsayisi (kil icin genellikle 9)'
    },
    soilLayers: {
      title: 'Zemin Tabakalari',
      layer: 'Tabaka',
      thickness: 'Kalinlik',
      soilType: 'Zemin Tipi',
      gamma: 'Birim Hacim Agirlik',
      phi: 'Icsel Surtunme Acisi',
      cohesion: 'Kohezyon',
      elasticity: 'Elastisite Modulu',
      poisson: 'Poisson Orani',
      addLayer: 'Tabaka Ekle',
      removeLayer: 'Tabakayi Sil',
      totalDepth: 'Toplam Derinlik',
      depthWarning: 'Toplam derinlik 30m limitini asiyor!',
      layerTable: 'Katman Analizi',
      depthRange: 'Derinlik Araligi',
      summary: 'Agirlikli Ortalama Degerler'
    },
    jetgrout: {
      title: 'Jet Grout Ozellikleri',
      strength: 'Jet Grout Dayanimi (sjet)',
      strengthTip: 'Jet grout tek eksenli basinc dayanimi',
      modulus: 'Elastisite Modulu (Ejg)',
      modulusTip: 'Jet grout elastisite modulu (tipik 150-500 MPa)',
      materialFs: 'Malzeme Guvenlik Faktoru (Fs)',
      materialFsTip: 'Malzeme tasarim dayanimi icin guvenlik faktoru (genellikle 2.0)',
      bearingFS: 'Tasima Kapasitesi Guv. Fak. (FS)',
      bearingFSTip: 'Tasima kapasitesi icin guvenlik faktoru (genellikle 1.5)'
    },
    loading: {
      title: 'Yukleme Kosullari',
      pressure: 'Temel Basinci (qtemel)',
      pressureTip: 'Uygulanan temel basinci',
      netPressure: 'Net Basinc (qnet)',
      netPressureTip: 'Oturma hesabi icin net basinc (bos birakilirsa otomatik hesaplanir)'
    },
    results: {
      title: 'Hesap Sonuclari',
      geometry: 'Geometri',
      material: 'Malzeme Parametreleri',
      capacity: 'Tasima Kapasitesi',
      improvedSoil: 'Iyilestirilmis Zemin',
      settlement: 'Oturma',
      noResults: 'Henuz sonuc yok.',
      enterParams: 'Parametreleri girin ve "Hesapla" butonuna tiklayin.'
    },
    calculate: 'Hesapla',
    calculating: 'Hesaplaniyor...',
    apiError: "API'ye baglanilamiyor. Backend calisiyor mu?",
    calcFailed: 'Hesaplama basarisiz',
    footer: 'ZEMSIS v1.0 © 2026'
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
  const [lang, setLang] = useState('tr');
  const [activePage, setActivePage] = useState('home');
  const [activeTab, setActiveTab] = useState('parameters');
  const [token, setToken] = useState(() => localStorage.getItem('jg_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('jg_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [extraParams, setExtraParams] = useState({ foundationThickness: 0.5, fillHeight: 0 });
  const drawingDataRef = useRef(null);
  const [parameters, setParameters] = useState({ ...defaultParameters });
  const [soilLayers, setSoilLayers] = useState([...defaultSoilLayers]);
  const [units, setUnits] = useState({ ...defaultUnits });
  const [results, setResults] = useState(null);
  const [layerResults, setLayerResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDxfImport, setPendingDxfImport] = useState(false);
  const fileInputRef = useRef(null);

  const toKPa = (value, unit) => unit === 'MPa' ? value * 1000 : value;
  const t = translations[lang];
  const tr = lang === 'tr';

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

  const handleLogout = () => {
    localStorage.removeItem('jg_token');
    localStorage.removeItem('jg_user');
    setToken(null);
    setUser(null);
    resetWorkspace();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (fieldName, newUnit) => {
    setUnits(prev => ({ ...prev, [fieldName]: newUnit }));
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

  const handleImportDxf = () => {
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

  if (!token) {
    return <AuthPage onLogin={handleLogin} lang={lang} />;
  }

  const menuItems = [
    { key: 'home', icon: '⌂', label: tr ? 'Ana Sayfa' : 'Home' },
    { key: 'projects', icon: '▣', label: tr ? 'Projeler' : 'Projects' },
  ];

  const workspaceTabs = [
    { key: 'parameters', icon: '◫', label: tr ? 'Parametreler' : 'Parameters' },
    { key: 'soilSection', icon: '▤', label: tr ? 'Zemin ve Kesit' : 'Soil & Section' },
    { key: 'planView', icon: '✎', label: tr ? 'Cizim' : 'Drawing' },
    { key: 'results', icon: '◌', label: tr ? 'Sonuclar' : 'Results' },
  ];

  const currentViewTitle = (() => {
    if (activePage === 'home') return tr ? 'Ana Sayfa' : 'Home';
    if (activePage === 'projects') return tr ? 'Projelerim' : 'My Projects';
    if (activePage === 'workspace') {
      return workspaceTabs.find((tab) => tab.key === activeTab)?.label || (tr ? 'Calisma Alani' : 'Workspace');
    }
    return tr ? 'Jet Grout Paneli' : 'Jet Grout Dashboard';
  })();

  const currentViewDescription = (() => {
    if (activePage === 'home') return tr ? 'Proje akisina buradan baslayin.' : 'Start your project workflow from here.';
    if (activePage === 'projects') return tr ? 'Kayitli projelerinizi yonetin.' : 'Manage your saved projects.';
    if (activePage === 'workspace') return tr ? 'Hesap, cizim ve kesit calisma alani.' : 'Calculation, drawing, and section workspace.';
    return tr ? 'Jet grout tasarim paneli.' : 'Jet grout design dashboard.';
  })();

  const handleExportPdf = async () => {
    try {
      const projectData = getProjectData();
      await generatePdfReport(projectData, lang);
    } catch (err) {
      alert(tr ? 'Rapor olusturulurken hata olustu: ' + err.message : 'Error generating report: ' + err.message);
    }
  };

  const handleImportPdfClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const projectData = await parsePdfReport(file);
      // Give it a transient id to force new save or re-use logic
      projectData.id = projectData.id || `imported-${Date.now()}`;
      handleLoadProject(projectData);
    } catch (err) {
      alert(tr ? 'Gecersiz PDF. JGC Proje verisi bulunamadi.' : 'Invalid PDF. No JGC Project data found.');
    } finally {
      e.target.value = ''; // reset
    }
  };

  const todayLabel = new Date().toLocaleDateString(tr ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userInitials = (user?.fullName || 'Jet Grout')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const isLockedWorkspaceView =
    activePage === 'workspace' && (activeTab === 'soilSection' || activeTab === 'planView');

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="sidebar-logo" title="ZEMSIS">
          <img src="/zemsis-logo-beyaz.png" alt="ZEMSIS Logo Beyaz" className="sidebar-logo-img" style={{ width: "64px", height: "auto" }} />
          <div className="sidebar-logo-text">
            <strong>ZEMSIS</strong>
            <span>Engineering Suite</span>
          </div>
        </div>

        <div className="user-profile-card">
          <div className="avatar-circle">{userInitials}</div>
          <div className="user-details">
            <h4>{user?.fullName || 'ZEMSIS User'}</h4>
            <span>{tr ? 'Aktif oturum' : 'Active session'}</span>
          </div>
        </div>

        <div className="nav-menu">
          {menuItems.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

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
                  className={`nav-item sub-nav-item ${activeTab === tab.key ? 'active' : ''}`}
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

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={handleNewProject} title={tr ? 'Yeni Proje' : 'New Project'}>
            <span className="menu-icon">+</span>
            <span className="menu-label">{tr ? 'Yeni' : 'New'}</span>
          </button>

          {activePage === 'workspace' && (
            <button className="nav-item" onClick={() => setShowSaveModal(true)} title={tr ? 'Kaydet' : 'Save'}>
              <span className="menu-icon">□</span>
              <span className="menu-label">{tr ? 'Kaydet' : 'Save'}</span>
            </button>
          )}

          <button className="nav-item" onClick={toggleLanguage} title={lang === 'en' ? 'Turkce' : 'English'}>
            <span className="menu-icon">{lang === 'en' ? 'TR' : 'EN'}</span>
            <span className="menu-label">{lang === 'en' ? 'Turkce' : 'English'}</span>
          </button>

          <button className="logout-btn" onClick={handleLogout} title={tr ? 'Çıkış' : 'Logout'}>
            <span className="menu-icon">×</span>
            <span className="menu-label">{tr ? 'Çıkış' : 'Logout'}</span>
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className={`top-bar ${isLockedWorkspaceView ? 'top-bar-compact' : ''}`}>
          <div>
            <h2>{currentViewTitle}</h2>
            <p>{currentViewDescription}</p>
          </div>
          <div className="top-bar-actions">
            {activePage === 'workspace' && (
              <button
                className="top-bar-btn export-pdf-btn"
                onClick={handleExportPdf}
                title={tr ? 'PDF Raporu Olarak İndir (İçeri aktarılabilir)' : 'Download PDF Report (Importable)'}
              >
                📄 {tr ? 'Rapor Al' : 'Export PDF'}
              </button>
            )}
            <img src="/btu-logo.png" alt="BTU Logo" style={{ height: "40px", objectFit: "contain", marginRight: "1rem" }} />
            <div className="date-tag">{todayLabel}</div>
          </div>
        </div>

        <input
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className="content-area">
          <div className={`main-scroll-content ${isLockedWorkspaceView ? 'locked-view' : ''}`}>
            {activePage === 'home' && (
              <Dashboard
                lang={lang}
                user={user}
                onNewProject={handleNewProject}
                onGoProjects={() => setActivePage('projects')}
                onImportDxf={handleImportDxf}
                onImportPdf={handleImportPdfClick}
              />
            )}

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

            {activePage === 'workspace' && (
              <>
                {activeTab === 'parameters' && (
                  <div className="page-container">
                    <div className="page-header">
                      <h2>{tr ? 'Parametreler' : 'Parameters'}</h2>
                    </div>
                    <div className="page-content">
                      {error && <div className="page-error">Warning: {error}</div>}
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
                          {layerResults && <div className="sync-info">{tr ? 'Zemin tabakalarindan aktarildi' : 'Synced from soil layers'}</div>}
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

                {activeTab === 'results' && (
                  <div className="page-container">
                    <div className="page-header">
                      <h2>{tr ? 'Hesap Sonuclari' : 'Calculation Results'}</h2>
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
                          <p>Results</p>
                          <p>{t.results.noResults}</p>
                          <p style={{ fontSize: '0.8rem', marginTop: 6 }}>{t.results.enterParams}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <footer className={`global-dashboard-footer ${isLockedWorkspaceView ? 'global-dashboard-footer-compact' : ''}`}>
            <span className="footer-brand">ZEMSIS / Frontend</span>
            <span><span className="status-dot" />{tr ? 'Arayuz hazir' : 'Interface ready'}</span>
          </footer>
        </div>
      </main>

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
