import { useState, useRef } from 'react';

// ── Hooks ──────────────────────────────────────────────────────────────────
import { useAuth }        from './hooks/useAuth';
import { useWorkspace }   from './hooks/useWorkspace';
import { useCalculation } from './hooks/useCalculation';
import { useAutoSave }    from './hooks/useAutoSave';

// ── Constants ──────────────────────────────────────────────────────────────
import translations from './constants/translations';

// ── Layout bileşenleri ────────────────────────────────────────────────────
import Sidebar from './components/layout/Sidebar';
import TopBar  from './components/layout/TopBar';

// ── Sayfa / Alan bileşenleri ──────────────────────────────────────────────
import InputField        from './components/InputField';
import ResultCard        from './components/ResultCard';
import SoilSectionPanel  from './components/SoilSectionPanel';
import PlanView          from './components/PlanView';
import Dashboard         from './components/Dashboard';
import AuthPage          from './components/AuthPage';
import ProjectsPage      from './components/ProjectsPage';
import SaveProjectModal  from './components/SaveProjectModal';
import ReportEditorPage  from './components/ReportEditorPage';
import ApplicationPanel  from './components/ApplicationPanel';
import OfficerPortal     from './components/OfficerPortal';

import { parsePdfReport } from './utils/pdfReport';
import './App.css';

// ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]           = useState('tr');
  const [activePage, setActivePage] = useState('home');
  const [activeTab,  setActiveTab]  = useState('parameters');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const t  = translations[lang];
  const tr = lang === 'tr';

  // ── Auth ─────────────────────────────────────────────────────────────────
  const auth = useAuth();

  // ── Çalışma alanı ────────────────────────────────────────────────────────
  const ws = useWorkspace();

  // ── Auto-save ────────────────────────────────────────────────────────────
  useAutoSave({
    parameters:  ws.parameters,
    soilLayers:  ws.soilLayers,
    units:       ws.units,
    extraParams: ws.extraParams,
  });

  // ── Hesaplama ────────────────────────────────────────────────────────────
  const calc = useCalculation(
    {
      parameters:      ws.parameters,
      soilLayers:      ws.soilLayers,
      units:           ws.units,
      setResults:      ws.setResults,
      setLayerResults: ws.setLayerResults,
      setActiveTab,
    },
    { tr, t }
  );

  // ── Yardımcı değerler ─────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString(tr ? 'tr-TR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const isLockedWorkspaceView =
    activePage === 'workspace' &&
    (activeTab === 'soilSection' || activeTab === 'planView' || activeTab === 'report');

  const currentViewTitle = (() => {
    const workspaceTabs = [
      { key: 'parameters',  label: tr ? 'Parametreler'   : 'Parameters' },
      { key: 'soilSection', label: tr ? 'Zemin ve Kesit' : 'Soil & Section' },
      { key: 'planView',    label: tr ? 'Cizim'          : 'Drawing' },
      { key: 'results',     label: tr ? 'Sonuclar'       : 'Results' },
      { key: 'report',      label: tr ? 'Rapor'          : 'Report' },
      { key: 'application', label: tr ? 'Başvuru'        : 'Application' },
    ];
    if (activePage === 'home')      return tr ? 'Ana Sayfa' : 'Home';
    if (activePage === 'projects')  return tr ? 'Projelerim' : 'My Projects';
    if (activePage === 'workspace') return workspaceTabs.find(tb => tb.key === activeTab)?.label || 'Workspace';
    return tr ? 'Jet Grout Paneli' : 'Jet Grout Dashboard';
  })();

  const currentViewDescription = (() => {
    if (activePage === 'home')      return tr ? 'Proje akisina buradan baslayin.' : 'Start your project workflow from here.';
    if (activePage === 'projects')  return tr ? 'Kayitli projelerinizi yonetin.' : 'Manage your saved projects.';
    if (activePage === 'workspace') return tr ? 'Hesap, cizim ve kesit calisma alani.' : 'Calculation, drawing, and section workspace.';
    return tr ? 'Jet grout tasarim paneli.' : 'Jet grout design dashboard.';
  })();

  // ── Sidebar & nav yardımcıları ────────────────────────────────────────────
  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (fn) => { fn(); closeSidebar(); };

  // ── Proje akış handler'ları ───────────────────────────────────────────────
  const handleNewProject = () => {
    ws.resetWorkspace();
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  const handleLoadProject = (project) => {
    ws.handleLoadProject(project);
    setActivePage('workspace');
    setActiveTab('parameters');
  };

  // ── PDF import ────────────────────────────────────────────────────────────
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const projectData = await parsePdfReport(file);
      projectData.id = projectData.id || `imported-${Date.now()}`;
      handleLoadProject(projectData);
    } catch {
      alert(tr ? 'Gecersiz PDF. JGC Proje verisi bulunamadi.' : 'Invalid PDF. No JGC Project data found.');
    } finally {
      e.target.value = '';
    }
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!auth.token) {
    return (
      <AuthPage
        onLogin={auth.handleLogin}
        lang={lang}
        initialError={auth.authError}
      />
    );
  }

  // ── Ortak sidebar prop'ları ───────────────────────────────────────────────
  const sidebarProps = {
    isOfficer:          auth.isOfficer,
    isOpen:             sidebarOpen,
    onClose:            closeSidebar,
    activePage,
    activeTab,
    currentProjectName: ws.currentProjectName,
    user:               auth.user,
    userInitials:       auth.userInitials,
    tr,
    lang,
    onNavClick:         handleNavClick,
    onSetActivePage:    setActivePage,
    onSetActiveTab:     setActiveTab,
    onNewProject:       handleNewProject,
    onSave:             () => ws.setShowSaveModal(true),
    onToggleLanguage:   () => setLang(prev => prev === 'en' ? 'tr' : 'en'),
    onLogout:           auth.handleLogout,
  };

  // ── Belediye memuru — ayrı layout ─────────────────────────────────────────
  if (auth.isOfficer) {
    return (
      <div className="dashboard-container">
        {sidebarOpen && <div className="sidebar-overlay open" onClick={closeSidebar} />}
        <Sidebar {...sidebarProps} />
        <main className="dashboard-main">
          <TopBar
            title={tr ? 'Projer Başvuruları' : 'Project Applications'}
            description={tr ? 'Belediyenize gelen başvuruları denetleyin.' : 'Review incoming project applications.'}
            todayLabel={todayLabel}
            isCompact={false}
            onMenuOpen={() => setSidebarOpen(true)}
          />
          <div className="content-area">
            <div className="main-scroll-content">
              <OfficerPortal user={auth.user} token={auth.token} onLogout={auth.handleLogout} />
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

  // ── Normal kullanıcı layout ───────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      {sidebarOpen && <div className="sidebar-overlay open" onClick={closeSidebar} />}
      <Sidebar {...sidebarProps} />

      <main className="dashboard-main">
        <TopBar
          title={currentViewTitle}
          description={currentViewDescription}
          todayLabel={todayLabel}
          isCompact={isLockedWorkspaceView}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        {/* Gizli PDF import input */}
        <input
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className="content-area">
          <div className={`main-scroll-content ${isLockedWorkspaceView ? 'locked-view' : ''}`}>

            {/* ── Ana Sayfa ── */}
            {activePage === 'home' && (
              <Dashboard
                lang={lang}
                user={auth.user}
                token={auth.token}
                onNewProject={handleNewProject}
                onGoProjects={() => setActivePage('projects')}
                onLoadProject={handleLoadProject}
              />
            )}

            {/* ── Projeler ── */}
            {activePage === 'projects' && (
              <ProjectsPage
                lang={lang}
                token={auth.token}
                onLoadProject={handleLoadProject}
                onNewProject={handleNewProject}
                onDeleteProject={(id) => { if (ws.currentProjectId === id) ws.resetWorkspace(); }}
                onLogout={auth.handleLogout}
              />
            )}

            {/* ── Çalışma Alanı ── */}
            {activePage === 'workspace' && (
              <>
                {/* Parametreler */}
                {activeTab === 'parameters' && (
                  <ParametersTab
                    t={t}
                    tr={tr}
                    parameters={ws.parameters}
                    units={ws.units}
                    layerResults={ws.layerResults}
                    onInputChange={ws.handleInputChange}
                    onUnitChange={ws.handleUnitChange}
                  />
                )}

                {/* Zemin & Kesit */}
                {activeTab === 'soilSection' && (
                  <div className="page-container page-container-full">
                    <SoilSectionPanel
                      layers={ws.soilLayers}
                      onChange={ws.setSoilLayers}
                      parameters={ws.parameters}
                      lang={lang}
                      onParameterChange={ws.handleInputChange}
                      extraParams={ws.extraParams}
                      onExtraParamsChange={ws.setExtraParams}
                      translations={t.soilLayers}
                    />
                  </div>
                )}

                {/* Plan / Çizim */}
                {activeTab === 'planView' && (
                  <PlanView
                    parameters={ws.parameters}
                    lang={lang}
                    onParameterChange={ws.handleInputChange}
                    soilLayers={ws.soilLayers}
                    initialDrawingData={ws.drawingDataRef.current}
                    onDrawingDataChange={ws.handleDrawingDataChange}
                    extraParams={ws.extraParams}
                  />
                )}

                {/* Sonuçlar — Analiz Merkezi */}
                {activeTab === 'results' && (
                  <ResultsTab
                    t={t}
                    tr={tr}
                    lang={lang}
                    results={ws.results}
                    layerResults={ws.layerResults}
                    soilLayers={ws.soilLayers}
                    parameters={ws.parameters}
                    units={ws.units}
                    loading={calc.loading}
                    error={calc.error}
                    onAnalyze={calc.handleCalculate}
                  />
                )}

                {/* Başvuru */}
                {activeTab === 'application' && (
                  <div className="page-container">
                    <div className="page-header">
                      <h2>{tr ? 'Belediye Başvurusu' : 'Municipal Application'}</h2>
                    </div>
                    <div className="page-content">
                      <ApplicationPanel
                        projectId={ws.currentProjectId}
                        projectName={ws.currentProjectName}
                        token={auth.token}
                        onLogout={auth.handleLogout}
                      />
                    </div>
                  </div>
                )}

                {/* Rapor */}
                {activeTab === 'report' && (
                  <div className="page-container page-container-full" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <ReportEditorPage
                      projectId={ws.currentProjectId}
                      projectName={ws.currentProjectName}
                      parameters={ws.parameters}
                      soilLayers={ws.soilLayers}
                      extraParams={ws.extraParams}
                      drawingData={ws.drawingDataRef.current}
                      units={ws.units}
                      results={ws.results}
                      token={auth.token}
                      lang={lang}
                      onLogout={auth.handleLogout}
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

      {ws.showSaveModal && (
        <SaveProjectModal
          lang={lang}
          token={auth.token}
          currentProjectId={ws.currentProjectId}
          onSave={ws.handleSaveComplete}
          onClose={() => ws.setShowSaveModal(false)}
          projectData={ws.getProjectData()}
          onLogout={auth.handleLogout}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ParametersTab — Parametre giriş ekranı (yalnızca App içinde kullanılır)
// ─────────────────────────────────────────────────────────────────────────
function ParametersTab({
  t, tr, parameters, units, layerResults,
  onInputChange, onUnitChange,
}) {
  const D    = parseFloat(parameters.D) || 0;
  const s    = parseFloat(parameters.s) || 1;
  const H    = parseFloat(parameters.H) || 0;
  const Ajet = D > 0 ? (Math.PI * D * D / 4) : 0;
  const Ar   = s > 0 ? (Ajet / (s * s)) : 0;
  const arOk = Ar >= 0.15 && Ar <= 0.50;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{tr ? 'Parametreler' : 'Parameters'}</h2>
      </div>
      <div className="page-content">

        {/* Anlık önizleme */}
        <div className="param-preview-bar">
          <div className="param-preview-item">
            <span className="param-preview-label">A<sub>jet</sub></span>
            <span className="param-preview-value">{Ajet.toFixed(4)} m²</span>
          </div>
          <div className="param-preview-sep" />
          <div className="param-preview-item">
            <span className="param-preview-label">A<sub>r</sub></span>
            <span className={`param-preview-value${arOk ? '' : ' param-preview-warn'}`}>
              {(Ar * 100).toFixed(1)}%
            </span>
            {!arOk && D > 0 && (
              <span className="param-preview-hint">{tr ? '(Tip. %15–50)' : '(Typ. 15–50%)'}</span>
            )}
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

        <div className="params-grid">
          {/* Geometri */}
          <div className="param-card">
            <h3>{t.geometry.title}</h3>
            <div className="param-card-form">
              <InputField label={t.geometry.diameter} name="D"  value={parameters.D} onChange={onInputChange} unit="m" placeholder="0.6" min={0.3} max={3.0} step={0.1} tooltip={t.geometry.diameterTip} />
              <InputField label={t.geometry.spacing}  name="s"  value={parameters.s} onChange={onInputChange} unit="m" placeholder="1.6" min={0.5} max={10}  step={0.1} tooltip={t.geometry.spacingTip} />
              <InputField label={t.geometry.height}   name="H"  value={parameters.H} onChange={onInputChange} unit="m" placeholder="12"  min={1}   max={50}         tooltip={t.geometry.heightTip} />
            </div>
          </div>

          {/* Zemin */}
          <div className="param-card">
            <h3>{t.soil.title}</h3>
            {layerResults && (
              <div className="sync-info sync-info--detail">
                <span className="sync-info-icon">🔗</span>
                <span>
                  {tr ? 'Zemin tabakalarından aktarıldı' : 'Synced from soil layers'}
                  <span className="sync-info-sub">
                    {` — cu = ${layerResults.summary?.cohesionAvg?.value?.toFixed(1) ?? '?'} kPa, Es = ${layerResults.summary?.elasticityAvg?.value?.toFixed(0) ?? '?'} kPa`}
                  </span>
                </span>
              </div>
            )}
            <div className="param-card-form">
              <InputField label={t.soil.cu}    name="cu"    value={parameters.cu}    onChange={onInputChange} unitOptions={['kPa','MPa']} selectedUnit={units.cu}    onUnitChange={onUnitChange} placeholder="25"  min={5}   max={200}  tooltip={t.soil.cuTip} />
              <InputField label={t.soil.Es}    name="Es"    value={parameters.Es}    onChange={onInputChange} unitOptions={['kPa','MPa']} selectedUnit={units.Es}    onUnitChange={onUnitChange} placeholder="10"  min={1}   max={1000} step={1} tooltip={t.soil.EsTip} />
              <InputField label={t.soil.alpha} name="alpha" value={parameters.alpha} onChange={onInputChange} unit="-" placeholder="0.5" min={0.3} max={1.0} step={0.05} tooltip={t.soil.alphaTip} />
              <InputField label={t.soil.Nc}    name="Nc"    value={parameters.Nc}    onChange={onInputChange} unit="-" placeholder="9"   min={5.14} max={9} step={0.1} tooltip={t.soil.NcTip} />
            </div>
          </div>

          {/* Jet Grout */}
          <div className="param-card">
            <h3>{t.jetgrout.title}</h3>
            <div className="param-card-form">
              <InputField label={t.jetgrout.strength}   name="sigmaJet" value={parameters.sigmaJet} onChange={onInputChange} unitOptions={['kPa','MPa']} selectedUnit={units.sigmaJet} onUnitChange={onUnitChange} placeholder="3.0" min={0.5} max={20}   step={0.1}  tooltip={t.jetgrout.strengthTip} />
              <InputField label={t.jetgrout.modulus}    name="Ejg"      value={parameters.Ejg}      onChange={onInputChange} unitOptions={['kPa','MPa']} selectedUnit={units.Ejg}      onUnitChange={onUnitChange} placeholder="450" min={50}  max={2000} step={10}   tooltip={t.jetgrout.modulusTip} />
              <InputField label={t.jetgrout.materialFs} name="Fs"       value={parameters.Fs}       onChange={onInputChange} unit="-" placeholder="2.0" min={1.5} max={4.0} step={0.1} tooltip={t.jetgrout.materialFsTip} />
              <InputField label={t.jetgrout.bearingFS}  name="FS"       value={parameters.FS}       onChange={onInputChange} unit="-" placeholder="1.5" min={1.0} max={3.0} step={0.1} tooltip={t.jetgrout.bearingFSTip} />
            </div>
            <details className="param-advanced">
              <summary>{tr ? '⚙ İleri Ayarlar' : '⚙ Advanced Settings'}</summary>
              <div className="param-card-form" style={{ marginTop: 8 }}>
                <InputField
                  label={tr ? 'Ejg Çarpanı (Ejg = k × σjet,tasarım)' : 'Ejg Multiplier (Ejg = k × σjet,design)'}
                  name="EjgMultiplier"
                  value={parameters.EjgMultiplier ?? 300}
                  onChange={onInputChange}
                  unit="-"
                  placeholder="300"
                  min={100} max={1000} step={50}
                  tooltip={tr
                    ? 'Ejg = k × σjet,tasarım formülündeki katsayı (tipik 150–500). Ejg alanı dolu bırakılırsa bu değer kullanılmaz.'
                    : 'Coefficient in Ejg = k × σjet,design (typical 150–500). Ignored if Ejg is entered directly.'}
                />
              </div>
            </details>
          </div>

          {/* Yükleme */}
          <div className="param-card">
            <h3>{t.loading.title}</h3>
            <div className="param-card-form">
              <InputField label={t.loading.pressure}    name="qtemel" value={parameters.qtemel} onChange={onInputChange} unitOptions={['kPa','MPa']} selectedUnit={units.qtemel} onUnitChange={onUnitChange} placeholder="150" min={50} max={1000} step={10} tooltip={t.loading.pressureTip} />
              <InputField
                label={t.loading.netPressure}
                name="qnet"
                value={parameters.qnet}
                onChange={onInputChange}
                unitOptions={['kPa','MPa']}
                selectedUnit={units.qnet}
                onUnitChange={onUnitChange}
                placeholder={tr ? 'Otomatik (qtemel − γ·H)' : 'Auto (qtemel − γ·H)'}
                min={0} max={500} step={5}
                tooltip={t.loading.netPressureTip}
              />
              {!parameters.qnet && (
                <div className="param-note">
                  ℹ️ {tr
                    ? `qnet boş bırakılırsa otomatik hesaplanır: qtemel − γ·H = ${parseFloat(parameters.qtemel || 0).toFixed(0)} − 18×${parseFloat(parameters.H || 0).toFixed(0)} = ${Math.max(0, parseFloat(parameters.qtemel || 0) - 18 * parseFloat(parameters.H || 0)).toFixed(0)} kPa`
                    : `qnet auto = qtemel − γ·H = ${parseFloat(parameters.qtemel || 0).toFixed(0)} − 18×${parseFloat(parameters.H || 0).toFixed(0)} = ${Math.max(0, parseFloat(parameters.qtemel || 0) - 18 * parseFloat(parameters.H || 0)).toFixed(0)} kPa`}
                </div>
              )}
            </div>
            <div className="param-card-form">
              <InputField
                label={tr ? 'Oturma Sınırı' : 'Settlement Limit'}
                name="maxSettlementMm"
                value={parameters.maxSettlementMm ?? 25}
                onChange={onInputChange}
                unit="mm"
                placeholder={tr ? 'örn. 25' : 'e.g. 25'}
                min={5} max={200} step={5}
                tooltip={tr
                  ? 'Hesaplanan oturma bu değerle karşılaştırılır (TS 500: max 25–50mm)'
                  : 'Calculated settlement is checked against this limit (TS 500: max 25–50mm)'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ResultsTab — Analiz Merkezi (buton + tüm sonuçlar)
// ─────────────────────────────────────────────────────────────────────────
function ResultsTab({
  t, tr, lang, results, layerResults, soilLayers, parameters, units,
  loading, error, onAnalyze,
}) {
  const hasLayers = soilLayers && soilLayers.some(l => parseFloat(l.thickness) > 0);

  // Analizde kullanılan parametreler özeti
  const usedCu    = layerResults?.summary?.cohesionAvg?.value    ?? parseFloat(parameters.cu);
  const usedEs    = layerResults?.summary?.elasticityAvg?.value  ?? parseFloat(parameters.Es);
  const usedGamma = layerResults?.summary?.gammaAvg?.value       ?? parseFloat(parameters.gamma || 18);

  return (
    <div className="page-container">
      {/* ── Başlık + Analiz Butonu ── */}
      <div className="page-header results-header">
        <h2>{t.results.title}</h2>
        <button
          id="btn-analyze"
          className="results-analyze-btn"
          onClick={onAnalyze}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="results-analyze-spinner" />
              {t.analyzing}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {t.analyze}
            </>
          )}
        </button>
      </div>

      <div className="page-content">
        {/* ── Hata mesajı ── */}
        {error && <div className="page-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        {results ? (
          <>
            {/* ── Zemin profili badge'i ── */}
            {hasLayers && layerResults && (
              <div className="results-soil-badge">
                <span className="results-soil-badge-icon">🌍</span>
                <span>{t.results.soilProfileUsed}</span>
              </div>
            )}

            {/* ── Kullanılan parametreler özeti ── */}
            <div className="results-params-summary">
              <span className="results-params-label">{t.results.paramsSummary}:</span>
              <span className="results-params-chip">D = {parseFloat(parameters.D).toFixed(2)} m</span>
              <span className="results-params-chip">s = {parseFloat(parameters.s).toFixed(2)} m</span>
              <span className="results-params-chip">H = {parseFloat(parameters.H).toFixed(1)} m</span>
              <span className="results-params-chip">cu = {usedCu?.toFixed ? usedCu.toFixed(1) : usedCu} kPa</span>
              <span className="results-params-chip">Es = {usedEs?.toFixed ? usedEs.toFixed(0) : usedEs} kPa</span>
              <span className="results-params-chip">γ = {usedGamma?.toFixed ? usedGamma.toFixed(1) : usedGamma} kN/m³</span>
              <span className="results-params-chip">σjet = {parseFloat(parameters.sigmaJet).toFixed(0)} {units.sigmaJet || 'kPa'}</span>
              <span className="results-params-chip">qtemel = {parseFloat(parameters.qtemel).toFixed(0)} {units.qtemel || 'kPa'}</span>
            </div>

            {/* ── Jet Grout Sonuç Kartları ── */}
            <div className="results-grid" style={{ marginTop: 16 }}>
              <ResultCard title={t.results.geometry}     results={results.geometry}     lang={lang} />
              <ResultCard title={t.results.material}     results={results.material}     lang={lang} />
              <ResultCard title={t.results.capacity}     results={results.capacity}     lang={lang} />
              <ResultCard title={t.results.improvedSoil} results={results.improvedSoil} lang={lang} />
              <ResultCard title={t.results.settlement}   results={results.settlement}   lang={lang} />
            </div>

            {/* ── Zemin Profili Analiz Sonuçları ── */}
            {layerResults && (
              <div className="results-soil-section">
                <h3 className="results-soil-section-title">{t.results.soilProfileSection}</h3>
                <ResultCard
                  title={tr ? 'Katman Özeti' : 'Layer Summary'}
                  results={layerResults.summary}
                  lang={lang}
                />
              </div>
            )}
          </>
        ) : (
          /* ── Boş durum ── */
          <div className="results-empty">
            <div className="results-empty-icon">📊</div>
            <h3 className="results-empty-title">{t.results.noResults}</h3>
            <p className="results-empty-desc">{t.results.enterParams}</p>
            <button
              id="btn-analyze-empty"
              className="results-analyze-btn results-analyze-btn--centered"
              onClick={onAnalyze}
              disabled={loading}
            >
              {loading ? (
                <><span className="results-analyze-spinner" />{t.analyzing}</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  {t.analyze}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
