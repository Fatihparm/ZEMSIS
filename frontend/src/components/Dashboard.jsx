import './Dashboard.css';

/* ── SVG Icon Components ─────────────────────────────────────── */
const IconPlus = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconFolder = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

const IconFileImport = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 18v-6" />
    <path d="m9 15 3 3 3-3" />
  </svg>
);

function Dashboard({ lang, user, onNewProject, onGoProjects, onImportDxf, onImportPdf }) {
    const tr = lang === 'tr';

    return (
        <div className="dashboard-home">
            <div className="dashboard-hero">
                <div className="hero-icon">
                    <img src="/zemsis-logo.png" alt="ZEMSIS Logo" style={{ width: '64px', height: 'auto' }} />
                </div>
                <h1>ZEMSIS</h1>
                <p className="hero-subtitle">
                    {tr
                        ? 'Zemin Sistemleri Tasarım ve Analiz Aracı'
                        : 'Ground Systems Design & Analysis Tool'}
                </p>

                {user && (
                    <div className="hero-welcome">
                        {tr ? `Hoş geldin, ${user.fullName}` : `Welcome, ${user.fullName}`}
                    </div>
                )}

                <p className="hero-description">
                    {tr
                        ? 'Sol menüden bir proje açın veya yeni proje oluşturarak başlayın.'
                        : 'Open a project from the menu or create a new one to get started.'}
                </p>

                <div className="hero-quick-actions">
                    <button className="quick-action-card" onClick={onNewProject}>
                        <span><IconPlus /></span>
                        <p>{tr ? 'Yeni Proje' : 'New Project'}</p>
                    </button>
                    <button className="quick-action-card" onClick={onGoProjects}>
                        <span><IconFolder /></span>
                        <p>{tr ? 'Projelerim' : 'My Projects'}</p>
                    </button>
                    <button className="quick-action-card dxf-action" onClick={onImportDxf}>
                        <span><IconPencilRuler /></span>
                        <p>{tr ? 'DXF İçe Aktar' : 'Import DXF'}</p>
                    </button>
                    <button className="quick-action-card pdf-action" onClick={onImportPdf}>
                        <span><IconFileImport /></span>
                        <p>{tr ? "PDF'ten Aktar" : 'Import PDF'}</p>
                    </button>
                </div>
            </div>

            <div className="dashboard-version">
                <span>v1.0</span>
                <span>© 2026</span>
            </div>
        </div>
    );
}

export default Dashboard;
