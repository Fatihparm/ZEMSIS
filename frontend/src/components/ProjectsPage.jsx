import { useState, useEffect } from 'react';
import './ProjectsPage.css';

function ProjectsPage({ lang, token, onLoadProject, onNewProject, onDeleteProject }) {
  const tr = lang === 'tr';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const API = '/api/projects';

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
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
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
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
              ➕ {tr ? 'Yeni Proje' : 'New Project'}
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {error && <div className="page-error">⚠️ {error}</div>}

        {loading ? (
          <div className="projects-loading">
            <div className="loading-spinner" />
            <p>{tr ? 'Yükleniyor...' : 'Loading...'}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <span className="empty-icon">📁</span>
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
                  <h3>{project.name}</h3>
                  <span className="project-date">{formatDate(project.updatedAt)}</span>
                </div>

                {project.description && (
                  <p className="project-desc">{project.description}</p>
                )}

                <div className="project-card-actions">
                  <button className="project-btn load" onClick={() => handleLoad(project.id)}>
                    {tr ? '📂 Yükle' : '📂 Load'}
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
                      🗑️
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
