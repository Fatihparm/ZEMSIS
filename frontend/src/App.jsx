import { useState, useEffect, useRef } from 'react';
import InputField from './components/InputField';
import ResultCard from './components/ResultCard';
import SoilSectionPanel from './components/SoilSectionPanel';
import PlanView from './components/PlanView';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import ProjectsPage from './components/ProjectsPage';
import SaveProjectModal from './components/SaveProjectModal';
import { parsePdfReport } from './utils/pdfReport';
import ReportEditorPage from './components/ReportEditorPage';
import ApplicationPanel from './components/ApplicationPanel';
import OfficerPortal from './components/OfficerPortal';
import { API_URL } from './config';
import './App.css';

/* ── SVG Icon Components ──────────────────────────────────────── */
const IconHome = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconGrid = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const IconSliders = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
    <path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
  </svg>
);

const IconPencilRuler = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="m15 5 4 4" />
    <path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" />
    <path d="m8 6 2-2" />
    <path d="m2 22 5.5-1.5L21.17 6.83a2.82 2.82 0 0 0-4-4L3.5 16.5Z" />
    <path d="m18 16 2-2" />
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M12 20V10M6 20V4M18 20v-6" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconBuilding = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSave = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconLogOut = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);


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
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('jg_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('jg_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [extraParams, setExtraParams] = useState({ foundationThickness: 0.5, fillHeight: 0, waterTable: 3 });
  const drawingDataRef = useRef(null);
  const [parameters, setParameters] = useState({ ...defaultParameters });
  const [soilLayers, setSoilLayers] = useState([...defaultSoilLayers]);
  const [units, setUnits] = useState({ ...defaultUnits });
  const [results, setResults] = useState(null);
  const [layerResults, setLayerResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDxfImport, setPendingDxfImport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);

  const closeSidebar = () => setSidebarOpen(false);

  const toKPa = (value, unit) => unit === 'MPa' ? value * 1000 : value;
  const t = translations[lang];
  const tr = lang === 'tr';

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

  useEffect(() => {
    // user is already hydrated from localStorage — no network request needed.
    // Only hit /me when a token exists but user info is somehow missing.
    if (token && !user) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) handleLogout();
          else {
            setUser(data.user);
            localStorage.setItem('jg_user', JSON.stringify(data.user));
          }
        })
        .catch(() => handleLogout());
    }
  }, []);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('jg_token', newToken);
    localStorage.setItem('jg_user', JSON.stringify(newUser));
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
    setExtraParams({ foundationThickness: 0.5, fillHeight: 0, waterTable: 3 });
    setActivePage('home');
    setActiveTab('parameters');
  };

  const handleLogout = (errorMsg = '') => {
    localStorage.removeItem('jg_token');
    localStorage.removeItem('jg_user');
    setToken(null);
    setUser(null);
    setAuthError(typeof errorMsg === 'string' ? errorMsg : '');
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
      const maxMm = parseFloat(parameters.maxSettlementMm) || null;
      const convertedParams = {
        ...parameters,
        sigmaJet: toKPa(parseFloat(parameters.sigmaJet), units.sigmaJet),
        Es: toKPa(parseFloat(parameters.Es), units.Es),
        Ejg: toKPa(parseFloat(parameters.Ejg), units.Ejg),
        cu: toKPa(parseFloat(parameters.cu), units.cu),
        qtemel: toKPa(parseFloat(parameters.qtemel), units.qtemel),
        qnet: toKPa(parseFloat(parameters.qnet), units.qnet),
        // #9 — izin verilen max oturma sınırları
        maxSettlementMm: maxMm,
        maxSettlementCm: maxMm ? maxMm / 10 : null,
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
    setExtraParams(project.extraParams || { foundationThickness: 0.5, fillHeight: 0, waterTable: 3 });
    drawingDataRef.current = project.drawingData || null;
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  const handleNewProject = () => {
    drawingDataRef.current = null;
    resetWorkspace();
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  const handleImportDxf = () => {
    drawingDataRef.current = null;
    resetWorkspace();
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

  const handleNavClick = (fn) => {
    fn();
    closeSidebar();
  };

  if (!token) {
    return <AuthPage onLogin={handleLogin} lang={lang} initialError={authError} />;
  }

  // ── Officer portal — rol bazlı tam sayfa ───────────────────────────────────
  if (user?.role === 'municipal_officer') {
    return (
      <div className="dashboard-container">
        {sidebarOpen && <div className="sidebar-overlay open" onClick={closeSidebar} />}
        <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-logo" title="ZEMSIS">
            <img src="/zemsis-logo-beyaz.png" alt="ZEMSIS Logo Beyaz" className="sidebar-logo-img" style={{ width: "64px", height: "auto" }} />
            <div className="sidebar-logo-text">
              <strong>ZEMSIS</strong>
              <span>Belediye Portalı</span>
            </div>
            <button className="sidebar-close-btn" onClick={closeSidebar} title="Menüyü Kapat">✕</button>
          </div>
          <div className="user-profile-card">
            <div className="avatar-circle">
              {(user?.fullName || 'ME').split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div className="user-details">
              <h4>{user?.fullName}</h4>
              <span>Denetim Memuru</span>
            </div>
          </div>
          <div className="nav-menu">
            <button className="nav-item active" title="Başvurular">
              <span className="menu-icon"><IconBuilding /></span>
              <span className="menu-label">Başvurular</span>
            </button>
          </div>
          <div className="sidebar-bottom">
            <button className="logout-btn" onClick={handleLogout} title="Çıkış">
              <span className="menu-icon"><IconLogOut /></span>
              <span className="menu-label">Çıkış</span>
            </button>
          </div>
        </nav>
        <main className="dashboard-main">
          <div className="top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} title="Menüyü Aç">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <h2>Proje Başvuruları</h2>
                <p>Belediyenize gelen başvuruları denetleyin.</p>
              </div>
            </div>
            <div className="top-bar-actions">
              <img src="/btu-logo.png" alt="BTU Logo" style={{ height: "40px", objectFit: "contain", marginRight: "1rem" }} />
              <div className="date-tag">{todayLabel}</div>
            </div>
          </div>
          <div className="content-area">
            <div className="main-scroll-content">
              <OfficerPortal user={user} token={token} onLogout={handleLogout} />
            </div>
            <footer className="global-dashboard-footer">
              <span className="footer-brand">ZEMSIS / Belediye Portalı</span>
              <span><span className="status-dot" />Denetim Memuru Oturumu</span>
            </footer>
          </div>
        </main>
      </div>
    );
  }

  const menuItems = [
    { key: 'home',     Icon: IconHome,  label: tr ? 'Ana Sayfa' : 'Home' },
    { key: 'projects', Icon: IconGrid,  label: tr ? 'Projeler'  : 'Projects' },
  ];

  const workspaceTabs = [
    { key: 'parameters',  Icon: IconSliders,    label: tr ? 'Parametreler'    : 'Parameters' },
    { key: 'soilSection', Icon: IconLayers,     label: tr ? 'Zemin ve Kesit' : 'Soil & Section' },
    { key: 'planView',    Icon: IconPencilRuler, label: tr ? 'Cizim'           : 'Drawing' },
    { key: 'results',     Icon: IconBarChart,   label: tr ? 'Sonuclar'        : 'Results' },
    { key: 'report',      Icon: IconFileText,   label: tr ? 'Rapor'           : 'Report' },
    { key: 'application', Icon: IconBuilding,   label: tr ? 'Başvuru'         : 'Application' },
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


  const isLockedWorkspaceView =
    activePage === 'workspace' && (activeTab === 'soilSection' || activeTab === 'planView' || activeTab === 'report');

  return (
    <div className="dashboard-container">
      {sidebarOpen && <div className="sidebar-overlay open" onClick={closeSidebar} />}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo" title="ZEMSIS">
          <img src="/zemsis-logo-beyaz.png" alt="ZEMSIS Logo Beyaz" className="sidebar-logo-img" style={{ width: "64px", height: "auto" }} />
          <div className="sidebar-logo-text">
            <strong>ZEMSIS</strong>
            <span>Engineering Suite</span>
          </div>
          <button className="sidebar-close-btn" onClick={closeSidebar} title="Menüyü Kapat">✕</button>
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
              onClick={() => handleNavClick(() => setActivePage(item.key))}
              title={item.label}
            >
              <span className="menu-icon"><item.Icon /></span>
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
                  onClick={() => handleNavClick(() => setActiveTab(tab.key))}
                  title={tab.label}
                >
                  <span className="menu-icon"><tab.Icon /></span>
                  <span className="menu-label">{tab.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={handleNewProject} title={tr ? 'Yeni Proje' : 'New Project'}>
            <span className="menu-icon"><IconPlus /></span>
            <span className="menu-label">{tr ? 'Yeni' : 'New'}</span>
          </button>

          {activePage === 'workspace' && (
            <button className="nav-item" onClick={() => setShowSaveModal(true)} title={tr ? 'Kaydet' : 'Save'}>
              <span className="menu-icon"><IconSave /></span>
              <span className="menu-label">{tr ? 'Kaydet' : 'Save'}</span>
            </button>
          )}

          <button className="nav-item" onClick={toggleLanguage} title={lang === 'en' ? 'Turkce' : 'English'}>
            <span className="menu-icon"><IconGlobe /></span>
            <span className="menu-label">{lang === 'en' ? 'Turkce' : 'English'}</span>
          </button>

          <button className="logout-btn" onClick={handleLogout} title={tr ? 'Çıkış' : 'Logout'}>
            <span className="menu-icon"><IconLogOut /></span>
            <span className="menu-label">{tr ? 'Çıkış' : 'Logout'}</span>
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className={`top-bar ${isLockedWorkspaceView ? 'top-bar-compact' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} title="Menüyü Aç">
              <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h2>{currentViewTitle}</h2>
              <p>{currentViewDescription}</p>
            </div>
          </div>
          <div className="top-bar-actions">

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
                onLogout={handleLogout}
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

                      {/* ── #2 Anlık Önizleme Kartı ── */}
                      {(() => {
                        const D = parseFloat(parameters.D) || 0;
                        const s = parseFloat(parameters.s) || 1;
                        const H = parseFloat(parameters.H) || 0;
                        const Ajet = D > 0 ? (Math.PI * D * D / 4) : 0;
                        const Ar = s > 0 ? (Ajet / (s * s)) : 0;
                        const arOk = Ar >= 0.15 && Ar <= 0.50;
                        return (
                          <div className="param-preview-bar">
                            <div className="param-preview-item">
                              <span className="param-preview-label">A<sub>jet</sub></span>
                              <span className="param-preview-value">{Ajet.toFixed(4)} m²</span>
                            </div>
                            <div className="param-preview-sep" />
                            <div className="param-preview-item">
                              <span className="param-preview-label">A<sub>r</sub></span>
                              <span className={`param-preview-value${arOk ? '' : ' param-preview-warn'}`}>{(Ar * 100).toFixed(1)}%</span>
                              {!arOk && D > 0 && <span className="param-preview-hint">{tr ? '(Tip. %15–50)' : '(Typ. 15–50%)'}</span>}
                            </div>
                            <div className="param-preview-sep" />
                            <div className="param-preview-item">
                              <span className="param-preview-label">D/s</span>
                              <span className="param-preview-value">{s > 0 ? (D / s).toFixed(2) : '—'}</span>
                            </div>
                            <div className="param-preview-sep" />
                            <div className="param-preview-item">
                              <span className="param-preview-label">H</span>
                              <span className="param-preview-value">{H} m</span>
                            </div>
                          </div>
                        );
                      })()}

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
                          {/* #7 — Senkronizasyon detayı */}
                          {layerResults && (
                            <div className="sync-info sync-info--detail">
                              <span className="sync-info-icon">🔗</span>
                              <span>
                                {tr ? 'Zemin tabakalarından aktarıldı' : 'Synced from soil layers'}
                                <span className="sync-info-sub">
                                  {tr
                                    ? ` — cu = ${layerResults.summary?.cohesionAvg?.value?.toFixed(1) ?? '?'} kPa, Es = ${layerResults.summary?.elasticityAvg?.value?.toFixed(0) ?? '?'} kPa`
                                    : ` — cu = ${layerResults.summary?.cohesionAvg?.value?.toFixed(1) ?? '?'} kPa, Es = ${layerResults.summary?.elasticityAvg?.value?.toFixed(0) ?? '?'} kPa`}
                                </span>
                              </span>
                            </div>
                          )}
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
                          {/* #10 — EjgMultiplier ileri ayar */}
                          <details className="param-advanced">
                            <summary>{tr ? '⚙ İleri Ayarlar' : '⚙ Advanced Settings'}</summary>
                            <div className="param-card-form" style={{ marginTop: 8 }}>
                              <InputField
                                label={tr ? 'Ejg Çarpanı (Ejg = k × σjet,tasarım)' : 'Ejg Multiplier (Ejg = k × σjet,design)'}
                                name="EjgMultiplier"
                                value={parameters.EjgMultiplier ?? 300}
                                onChange={handleInputChange}
                                unit="-"
                                placeholder="300"
                                min={100}
                                max={1000}
                                step={50}
                                tooltip={tr ? 'Ejg = k × σjet,tasarım formülündeki katsayı (tipik 150–500). Ejg alanı dolu bırakılırsa bu değer kullanılmaz.' : 'Coefficient in Ejg = k × σjet,design (typical 150–500). Ignored if Ejg is entered directly.'}
                              />
                            </div>
                          </details>
                        </div>
                        <div className="param-card">
                          <h3>{t.loading.title}</h3>
                          <div className="param-card-form">
                            <InputField label={t.loading.pressure} name="qtemel" value={parameters.qtemel} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qtemel} onUnitChange={handleUnitChange} placeholder="150" min={50} max={1000} step={10} tooltip={t.loading.pressureTip} />
                            {/* #3 — qnet notu */}
                            <InputField label={t.loading.netPressure} name="qnet" value={parameters.qnet} onChange={handleInputChange} unitOptions={['kPa', 'MPa']} selectedUnit={units.qnet} onUnitChange={handleUnitChange} placeholder={tr ? 'Otomatik (qtemel − γ·H)' : 'Auto (qtemel − γ·H)'} min={0} max={500} step={5} tooltip={t.loading.netPressureTip} />
                            {!parameters.qnet && (
                              <div className="param-note">
                                ℹ️ {tr
                                  ? `qnet boş bırakılırsa otomatik hesaplanır: qtemel − γ·H = ${parseFloat(parameters.qtemel || 0).toFixed(0)} − 18×${parseFloat(parameters.H || 0).toFixed(0)} = ${Math.max(0, parseFloat(parameters.qtemel || 0) - 18 * parseFloat(parameters.H || 0)).toFixed(0)} kPa`
                                  : `qnet auto = qtemel − γ·H = ${parseFloat(parameters.qtemel || 0).toFixed(0)} − 18×${parseFloat(parameters.H || 0).toFixed(0)} = ${Math.max(0, parseFloat(parameters.qtemel || 0) - 18 * parseFloat(parameters.H || 0)).toFixed(0)} kPa`}
                              </div>
                            )}
                          </div>
                          {/* #9 — Max oturma sınırı */}
                          <details className="param-advanced">
                            <summary>{tr ? '📏 Oturma Sınırı' : '📏 Settlement Limit'}</summary>
                            <div className="param-card-form" style={{ marginTop: 8 }}>
                              <InputField
                                label={tr ? 'İzin Verilen Maks. Oturma' : 'Allowable Settlement'}
                                name="maxSettlementMm"
                                value={parameters.maxSettlementMm ?? ''}
                                onChange={handleInputChange}
                                unit="mm"
                                placeholder={tr ? 'örn. 25' : 'e.g. 25'}
                                min={5}
                                max={200}
                                step={5}
                                tooltip={tr ? 'Hesaplanan oturma bu değerle karşılaştırılır (TS 500: max 25–50mm)' : 'Calculated settlement is checked against this limit (TS 500: max 25–50mm)'}
                              />
                            </div>
                          </details>
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
                          {/* #5 — lang prop her ResultCard'a iletiliyor */}
                          <ResultCard title={t.results.geometry} results={results.geometry} lang={lang} />
                          <ResultCard title={t.results.material} results={results.material} lang={lang} />
                          <ResultCard title={t.results.capacity} results={results.capacity} lang={lang} />
                          <ResultCard title={t.results.improvedSoil} results={results.improvedSoil} lang={lang} />
                          <ResultCard title={t.results.settlement} results={results.settlement} lang={lang} />
                        </div>
                      ) : (
                        <div className="no-results">
                          <p>{t.results.title}</p>
                          <p>{t.results.noResults}</p>
                          <p style={{ fontSize: '0.8rem', marginTop: 6 }}>{t.results.enterParams}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'application' && (
                  <div className="page-container">
                    <div className="page-header">
                      <h2>{tr ? 'Belediye Başvurusu' : 'Municipal Application'}</h2>
                    </div>
                    <div className="page-content">
                      <ApplicationPanel
                        projectId={currentProjectId}
                        projectName={currentProjectName}
                        token={token}
                        onLogout={handleLogout}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'report' && (
                  <div className="page-container page-container-full" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <ReportEditorPage
                    projectId={currentProjectId}
                    projectName={currentProjectName}
                    parameters={parameters}
                    soilLayers={soilLayers}
                    extraParams={extraParams}
                    drawingData={drawingDataRef.current}
                    units={units}
                    results={results}
                    token={token}
                    lang={lang}
                    onLogout={handleLogout}
                    />
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
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
