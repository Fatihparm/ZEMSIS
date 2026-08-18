import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { getMethodByKey } from '../constants/improvementMethods';
import './ProjectsPage.css';

/* ── SVG Icon Components ─────────────────────────────────── */
const IconPlus = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const IconFolder = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconFolderOpen = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

function ProjectsPage({ lang, token, onLoadProject, onNewProject, onDeleteProject, onLogout }) {
  const tr = lang === 'tr';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const API = `${API_URL}/projects`;

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if ((res.status === 401 || data.error === 'Invalid or expired token' || data.error === 'Token required') && onLogout) {
        onLogout(tr ? 'Oturum süresi doldu, lütfen tekrar giriş yapın.' : 'Session expired, please login again.');
        return;
      }
      
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError(data.error);
      }
    } catch {
      setError(tr ? 'Projeler yüklenemedi' : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]); // token değişince (re-login) projeleri yeniden yükle

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if ((res.status === 401 || data.error === 'Invalid or expired token' || data.error === 'Token required') && onLogout) {
        onLogout(tr ? 'Oturum süresi doldu, lütfen tekrar giriş yapın.' : 'Session expired, please login again.');
        return;
      }
      
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (onDeleteProject) onDeleteProject(id);
      }
    } catch {
      setError(tr ? 'Silme başarısız' : 'Delete failed');
    }
    setDeleteId(null);
  };

  const handleLoad = async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if ((res.status === 401 || data.error === 'Invalid or expired token' || data.error === 'Token required') && onLogout) {
        onLogout(tr ? 'Oturum süresi doldu, lütfen tekrar giriş yapın.' : 'Session expired, please login again.');
        return;
      }
      
      if (data.success) {
        onLoadProject(data.project);
      }
    } catch {
      setError(tr ? 'Proje yüklenemedi' : 'Failed to load project');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(tr ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{tr ? 'Projelerim' : 'My Projects'}</h2>
        <div className="page-header-actions">
          <span className="projects-count">
            {projects.length} {tr ? 'proje' : projects.length === 1 ? 'project' : 'projects'}
          </span>
          {onNewProject && (
            <button className="page-header-btn" onClick={onNewProject}>
              <IconPlus /> {tr ? 'Yeni Proje' : 'New Project'}
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {error && <div className="page-error"><IconAlertTriangle /> {error}</div>}

        {loading ? (
          <div className="projects-loading">
            <div className="loading-spinner" />
            <p>{tr ? 'Yükleniyor...' : 'Loading...'}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <span className="empty-icon"><IconFolder /></span>
            <p>{tr ? 'Henüz kayıtlı proje yok' : 'No saved projects yet'}</p>
            <p className="empty-hint">
              {tr
                ? 'Parametreleri girip hesaplama yaptıktan sonra projeyi kaydedebilirsiniz.'
                : 'Enter parameters and perform calculations, then save your project.'}
            </p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-card-title-group">
                    <h3>{project.name}</h3>
                    {(() => {
                      const m = getMethodByKey(project.improvementMethod || 'jet_grout');
                      return (
                        <span
                          className="project-method-badge"
                          style={{ color: m.color, background: m.bgColor, borderColor: m.borderColor }}
                        >
                          <span className="project-method-badge__icon">{m.icon}</span>
                          {tr ? m.labelTR : m.labelEN}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="project-date">{formatDate(project.updatedAt)}</span>
                </div>

                {project.description && (
                  <p className="project-desc">{project.description}</p>
                )}

                <div className="project-card-actions">
                  <button className="project-btn load" onClick={() => handleLoad(project.id)}>
                    <IconFolderOpen /> {tr ? 'Yükle' : 'Load'}
                  </button>
                  {deleteId === project.id ? (
                    <div className="delete-confirm">
                      <span>{tr ? 'Emin misiniz?' : 'Sure?'}</span>
                      <button className="project-btn danger" onClick={() => handleDelete(project.id)}>
                        {tr ? 'Evet' : 'Yes'}
                      </button>
                      <button className="project-btn cancel" onClick={() => setDeleteId(null)}>
                        {tr ? 'İptal' : 'No'}
                      </button>
                    </div>
                  ) : (
                    <button className="project-btn delete" onClick={() => setDeleteId(project.id)}>
                      <IconTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
