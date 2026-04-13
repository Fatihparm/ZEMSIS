import './Dashboard.css';

function Dashboard({ lang, user, onNewProject, onGoProjects, onImportDxf }) {
    const tr = lang === 'tr';

    return (
        <div className="dashboard-home">
            <div className="dashboard-hero">
                <div className="hero-icon">🏗️</div>
                <h1>Jet-Grout-Calc</h1>
                <p className="hero-subtitle">
                    {tr
                        ? 'Jet Grouting Tasarım ve Analiz Aracı'
                        : 'Jet Grouting Design & Analysis Tool'}
                </p>

                {user && (
                    <div className="hero-welcome">
                        {tr ? `Hoş geldin, ${user.fullName}` : `Welcome, ${user.fullName}`} 👋
                    </div>
                )}

                <p className="hero-description">
                    {tr
                        ? 'Sol menüden bir proje açın veya yeni proje oluşturarak başlayın.'
                        : 'Open a project from the menu or create a new one to get started.'}
                </p>

                <div className="hero-quick-actions">
                    <button className="quick-action-card" onClick={onNewProject}>
                        <span>➕</span>
                        <p>{tr ? 'Yeni Proje' : 'New Project'}</p>
                    </button>
                    <button className="quick-action-card" onClick={onGoProjects}>
                        <span>📁</span>
                        <p>{tr ? 'Projelerim' : 'My Projects'}</p>
                    </button>
                    <button className="quick-action-card dxf-action" onClick={onImportDxf}>
                        <span>📐</span>
                        <p>{tr ? 'DXF İçe Aktar' : 'Import DXF'}</p>
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
