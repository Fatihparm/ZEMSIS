import { useState, useEffect } from 'react';
import { API_URL } from '../config';
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

const IconClock = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconArrow = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const IconPen = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────────── */
function timeAgo(dateStr, tr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return tr ? 'Az önce' : 'Just now';
  if (diff < 3600) return tr ? `${Math.floor(diff/60)} dk önce` : `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return tr ? `${Math.floor(diff/3600)} sa önce` : `${Math.floor(diff/3600)}h ago`;
  return tr ? `${Math.floor(diff/86400)} gün önce` : `${Math.floor(diff/86400)}d ago`;
}

/* ── Component ───────────────────────────────────────────────── */
function Dashboard({ lang, user, token, onNewProject, onGoProjects, onLoadProject }) {
  const tr = lang === 'tr';
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectCount, setProjectCount] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.projects)) {
          const sorted = [...data.projects].sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          );
          setRecentProjects(sorted.slice(0, 4));
          setProjectCount(data.projects.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [token]);

  const steps = [
    {
      num: '01',
      icon: <IconLayers />,
      title: tr ? 'Zemin Profili' : 'Soil Profile',
      desc: tr ? 'Zemin tabakalarını ve SPT değerlerini girin.' : 'Enter soil layers and SPT values.',
    },
    {
      num: '02',
      icon: <IconPen />,
      title: tr ? 'Parametreler' : 'Parameters',
      desc: tr ? 'Jet grout sistem parametrelerini tanımlayın.' : 'Define jet grout system parameters.',
    },
    {
      num: '03',
      icon: <IconChart />,
      title: tr ? 'Analiz' : 'Analysis',
      desc: tr ? 'Otomatik hesaplamayı çalıştırın ve sonuçları inceleyin.' : 'Run auto-calculation and review results.',
    },
    {
      num: '04',
      icon: <IconFileText />,
      title: tr ? 'Rapor' : 'Report',
      desc: tr ? 'PDF raporu oluşturun ve dışa aktarın.' : 'Generate and export the PDF report.',
    },
  ];

  return (
    <div className="dashboard-home">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="dashboard-hero">
        <div className="hero-glow" />
        <div className="hero-left">
          <div className="hero-icon">
            <img src="/zemsis-logo.png" alt="ZEMSIS Logo" style={{ width: '56px', height: 'auto' }} />
          </div>
          <h1>ZEMSIS</h1>
          <p className="hero-subtitle">
            {tr ? 'Zemin Sistemleri Tasarım ve Analiz Aracı' : 'Ground Systems Design & Analysis Tool'}
          </p>
          {user && (
            <div className="hero-welcome">
              {tr ? `Hoş geldin, ${user.fullName}` : `Welcome, ${user.fullName}`}
            </div>
          )}
        </div>

        <div className="hero-quick-actions">
          <button id="dash-btn-new-project" className="quick-action-card primary-action" onClick={onNewProject}>
            <span><IconPlus /></span>
            <div>
              <p>{tr ? 'Yeni Proje' : 'New Project'}</p>
              <small>{tr ? 'Sıfırdan başla' : 'Start from scratch'}</small>
            </div>
          </button>
          <button id="dash-btn-projects" className="quick-action-card" onClick={onGoProjects}>
            <span><IconFolder /></span>
            <div>
              <p>{tr ? 'Projelerim' : 'My Projects'}</p>
              <small>
                {projectCount !== null
                  ? (tr ? `${projectCount} kayıtlı proje` : `${projectCount} saved projects`)
                  : (tr ? 'Tüm projeler' : 'All projects')}
              </small>
            </div>
          </button>
        </div>
      </div>

      {/* ── Recent Projects ──────────────────────────────────── */}
      <section className="dashboard-section">
        <div className="section-header">
          <div className="section-title-row">
            <IconClock />
            <h2>{tr ? 'Son Projeler' : 'Recent Projects'}</h2>
          </div>
          <button className="section-link" onClick={onGoProjects}>
            {tr ? 'Tümünü gör' : 'View all'} <IconArrow />
          </button>
        </div>

        {loadingProjects ? (
          <div className="recent-loading">
            {[1,2,3,4].map(i => <div key={i} className="recent-skeleton" />)}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="recent-empty">
            <IconFolder />
            <p>{tr ? 'Henüz kayıtlı proje yok.' : 'No saved projects yet.'}</p>
            <button onClick={onNewProject}>{tr ? 'İlk projeyi oluştur' : 'Create first project'}</button>
          </div>
        ) : (
          <div className="recent-grid">
            {recentProjects.map(p => (
              <button
                key={p.id}
                className="recent-card"
                onClick={() => onLoadProject && onLoadProject(p)}
              >
                <div className="recent-card-icon"><IconFileText /></div>
                <div className="recent-card-info">
                  <span className="recent-card-name">{p.name || (tr ? 'İsimsiz Proje' : 'Unnamed Project')}</span>
                  <span className="recent-card-time">
                    <IconClock />
                    {timeAgo(p.updatedAt || p.createdAt, tr)}
                  </span>
                </div>
                <div className="recent-card-arrow"><IconArrow /></div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── How to start ─────────────────────────────────────── */}
      <section className="dashboard-section">
        <div className="section-header">
          <div className="section-title-row">
            <span style={{ fontSize: '1.1rem' }}>🚀</span>
            <h2>{tr ? 'Nasıl Başlarım?' : 'Getting Started'}</h2>
          </div>
        </div>
        <div className="steps-grid">
          {steps.map((s) => (
            <div key={s.num} className="step-card">
              <div className="step-number">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-version">
        <span>v1.0</span>
        <span>© 2026 ZEMSIS</span>
      </div>
    </div>
  );
}

export default Dashboard;
