import { useState } from 'react';
import './SaveProjectModal.css';

function SaveProjectModal({ lang, token, currentProjectId, onSave, onClose, projectData }) {
  const tr = lang === 'tr';
  const [name, setName] = useState(projectData?.name || '');
  const [description, setDescription] = useState(projectData?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMode, setSaveMode] = useState(currentProjectId ? 'update' : 'new');

  const API = '/api/projects';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(tr ? 'Proje adı gerekli' : 'Project name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        parameters: projectData.parameters,
        soilLayers: projectData.soilLayers,
        results: projectData.results,
        drawingData: projectData.drawingData,
        extraParams: projectData.extraParams,
        units: projectData.units,
      };

      let url = API;
      let method = 'POST';

      if (saveMode === 'update' && currentProjectId) {
        url = `${API}/${currentProjectId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        onSave(data.project, saveMode);
      } else {
        setError(data.error || (tr ? 'Kaydedilemedi' : 'Save failed'));
      }
    } catch {
      setError(tr ? 'Sunucuya bağlanılamıyor' : 'Cannot connect to server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💾 {tr ? 'Projeyi Kaydet' : 'Save Project'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSave}>
          {currentProjectId && (
            <div className="save-mode-tabs">
              <button
                type="button"
                className={`save-mode-tab ${saveMode === 'update' ? 'active' : ''}`}
                onClick={() => setSaveMode('update')}
              >
                {tr ? 'Güncelle' : 'Update'}
              </button>
              <button
                type="button"
                className={`save-mode-tab ${saveMode === 'new' ? 'active' : ''}`}
                onClick={() => setSaveMode('new')}
              >
                {tr ? 'Yeni Kaydet' : 'Save as New'}
              </button>
            </div>
          )}

          <div className="modal-field">
            <label>{tr ? 'Proje Adı' : 'Project Name'}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder={tr ? 'Örn: Zemin İyileştirme A' : 'e.g. Ground Improvement A'}
              required
              autoFocus
              maxLength={50}
            />
            <span className="modal-char-count" style={{
              fontSize: '0.72rem',
              color: name.length >= 45 ? '#ef9a9a' : '#607d8b',
              textAlign: 'right',
              display: 'block',
              marginTop: '4px'
            }}>
              {name.length}/50
            </span>
          </div>

          <div className="modal-field">
            <label>{tr ? 'Açıklama (opsiyonel)' : 'Description (optional)'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr ? 'Proje hakkında kısa bir not...' : 'Short note about the project...'}
              rows={3}
            />
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              {tr ? 'İptal' : 'Cancel'}
            </button>
            <button type="submit" className="modal-btn-save" disabled={saving}>
              {saving
                ? (tr ? 'Kaydediliyor...' : 'Saving...')
                : saveMode === 'update'
                  ? (tr ? 'Güncelle' : 'Update')
                  : (tr ? 'Kaydet' : 'Save')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaveProjectModal;
