import { useState, useEffect, useCallback } from 'react';
import './ApplicationPanel.css';

const API_URL = '/api';

const MUNICIPALITIES = [
  'Bursa Büyükşehir Belediyesi',
  'Osmangazi Belediyesi',
  'Nilüfer Belediyesi',
  'Kestel Belediyesi',
];

const STATUS_CONFIG = {
  pending: {
    label: 'Değerlendirme Aşamasında',
    className: 'status-pending',
  },
  approved: {
    label: 'Kabul Edilmiştir',
    className: 'status-approved',
  },
  rejected: {
    label: 'Reddedildi',
    className: 'status-rejected',
  },
};

/* ── SVG icon components ─────────────────────────────────────── */
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" />
  </svg>
);

const IconClipboard = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

const IconXCircle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
);

const IconMapPin = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function ApplicationPanel({ projectId, projectName, token, onLogout }) {
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchMyApplications = useCallback(async () => {
    if (!projectId) { setFetching(false); return; }
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/applications/my`, { headers: authHeader });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      if (data.success) {
        const found = data.applications.find(a => a.projectId === projectId);
        setApplication(found || null);
      }
    } catch {
      // sessiz hata
    } finally {
      setFetching(false);
    }
  }, [projectId, token]);

  useEffect(() => { fetchMyApplications(); }, [fetchMyApplications]);

  const handleApply = async () => {
    if (!selectedMunicipality) { setError('Lütfen bir belediye seçin.'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, municipality: selectedMunicipality }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Başvurunuz başarıyla gönderildi!');
        setShowConfirm(false);
        fetchMyApplications();
      } else {
        setError(data.error || 'Başvuru gönderilemedi.');
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = application ? STATUS_CONFIG[application.status] : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const StatusIcon = () => {
    if (!application) return null;
    if (application.status === 'pending')  return <IconClock />;
    if (application.status === 'approved') return <IconCheckCircle />;
    return <IconXCircle />;
  };

  if (!projectId) {
    return (
      <div className="app-panel">
        <div className="app-panel__empty">
          <div className="app-panel__empty-icon"><IconClipboard /></div>
          <h3>Belediye Başvurusu</h3>
          <p>Başvuru yapabilmek için önce projeyi kaydedin.</p>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="app-panel">
        <div className="app-panel__loading">
          <div className="app-panel__spinner" />
          <span>Başvuru durumu kontrol ediliyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel">
      <div className="app-panel__header">
        <div className="app-panel__header-icon">
          <IconBuilding />
        </div>
        <div>
          <h3>Belediye Başvurusu</h3>
          <p>Projenizi denetim için belediyeye gönderin</p>
        </div>
      </div>

      {/* Mevcut başvuru varsa durumu göster */}
      {application ? (
        <div className={`app-panel__status-card ${statusConfig.className}`}>
          <div className="app-panel__status-icon">
            <StatusIcon />
          </div>
          <div className="app-panel__status-content">
            <div className="app-panel__status-label">{statusConfig.label}</div>
            <div className="app-panel__status-meta">
              <span className="app-panel__status-meta-item">
                <IconMapPin /> {application.municipality}
              </span>
              <span className="app-panel__status-meta-item">
                <IconCalendar /> {formatDate(application.appliedAt)}
              </span>
            </div>
            {application.status === 'rejected' && application.rejectionNote && (
              <div className="app-panel__rejection-note">
                <strong>Red Gerekçesi:</strong>
                <p>{application.rejectionNote}</p>
              </div>
            )}
            {application.status === 'approved' && application.reviewedAt && (
              <div className="app-panel__approved-info">
                <IconCalendar /> Onay Tarihi: {formatDate(application.reviewedAt)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Başvuru yok — form göster */
        <div className="app-panel__form">
          <div className="app-panel__form-group">
            <label htmlFor="municipality-select">Belediye Seçin</label>
            <div className="app-panel__select-wrapper">
              <select
                id="municipality-select"
                value={selectedMunicipality}
                onChange={e => { setSelectedMunicipality(e.target.value); setError(''); }}
              >
                <option value="">— Belediye seçin —</option>
                {MUNICIPALITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="app-panel__select-arrow"><IconChevronDown /></span>
            </div>
          </div>

          {error && <div className="app-panel__error">{error}</div>}
          {success && <div className="app-panel__success">{success}</div>}

          <button
            id="apply-btn"
            className="app-panel__apply-btn"
            onClick={() => {
              if (!selectedMunicipality) { setError('Lütfen bir belediye seçin.'); return; }
              setShowConfirm(true);
            }}
            disabled={loading}
          >
            <IconSend />
            Başvur
          </button>

          <p className="app-panel__info">
            Başvuru yaptıktan sonra durum değiştirilemez. Seçiminizi dikkatli yapın.
          </p>
        </div>
      )}

      {/* Onay modalı */}
      {showConfirm && (
        <div className="app-panel__overlay" onClick={() => setShowConfirm(false)}>
          <div className="app-panel__confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="app-panel__confirm-icon">
              <IconBuilding />
            </div>
            <h3>Başvuruyu Onayla</h3>
            <p>
              <strong>{projectName || 'Bu proje'}</strong> için{' '}
              <strong>{selectedMunicipality}</strong> belediyesine başvuru yapılacak.
            </p>
            <p className="app-panel__confirm-warn">
              Bu işlem geri alınamaz. Başvuruyu göndermek istiyor musunuz?
            </p>
            <div className="app-panel__confirm-actions">
              <button
                className="app-panel__confirm-cancel"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                İptal
              </button>
              <button
                className="app-panel__confirm-ok"
                onClick={handleApply}
                disabled={loading}
              >
                {loading ? 'Gönderiliyor...' : (
                  <><IconSend /> Evet, Gönder</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
