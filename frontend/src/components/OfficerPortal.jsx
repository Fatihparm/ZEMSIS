import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import ApplicationDetailModal from './ApplicationDetailModal';
import OfficerWorkspaceView from './OfficerWorkspaceView';
import './OfficerPortal.css';

const STATUS_CONFIG = {
  pending:  { label: 'Bekliyor',      cls: 'op-badge--pending'  },
  approved: { label: 'Kabul Edildi',  cls: 'op-badge--approved' },
  rejected: { label: 'Reddedildi',   cls: 'op-badge--rejected' },
};

const FILTER_OPTIONS = [
  { value: 'all',      label: 'Tümü',           status: null },
  { value: 'pending',  label: 'Bekleyenler',     status: 'pending' },
  { value: 'approved', label: 'Kabul Edilenler', status: 'approved' },
  { value: 'rejected', label: 'Reddedilenler',   status: 'rejected' },
];

/* ── SVG icon components ─────────────────────────────────────── */
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const IconMicroscope = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14h-1" />
    <path d="M9 14V4l5 2v3l-2 1" />
    <path d="M9 6.1 5 8" />
  </svg>
);

const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const IconInbox = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3H10l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.76 4H6.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export default function OfficerPortal({ user, token, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [municipality, setMunicipality] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [selectedAppId, setSelectedAppId] = useState(null);
  const [workspaceAppId, setWorkspaceAppId] = useState(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/applications/municipality`, { headers: authHeader });
      if (res.status === 401) { onLogout(); return; }
      if (res.status === 403) {
        setError('Bu sayfaya erişim yetkiniz yok.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications);
        setMunicipality(data.municipality);
      } else {
        setError(data.error || 'Başvurular yüklenemedi.');
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleReviewed = () => {
    setSelectedAppId(null);
    fetchApplications();
  };

  const filtered = applications.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      a.projectName?.toLowerCase().includes(q) ||
      a.applicantName?.toLowerCase().includes(q) ||
      a.applicantEmail?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const counts = {
    all:      applications.length,
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  /* ── Proje inceleme modundaysa OfficerWorkspaceView göster ── */
  if (workspaceAppId) {
    return (
      <OfficerWorkspaceView
        applicationId={workspaceAppId}
        token={token}
        onBack={() => setWorkspaceAppId(null)}
      />
    );
  }

  /* ── Normal liste görünümü ───────────────────────────────── */
  return (
    <div className="op-root">

      {/* Page header */}
      <div className="op-header">
        <div className="op-header__left">
          <div className="op-header__icon">
            <IconBuilding />
          </div>
          <div>
            <h1>Proje Başvuruları</h1>
            <p>{municipality || 'Belediye Portalı'}</p>
          </div>
        </div>
        <div className="op-header__right">
          <div className="op-user-card">
            <div className="op-user-card__avatar">
              {(user?.fullName || 'ME').split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div>
              <div className="op-user-card__name">{user?.fullName || 'Personel'}</div>
              <div className="op-user-card__role">Denetim Memuru</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="op-stats">
        {[
          { label: 'Toplam Başvuru', value: counts.all,      cls: '' },
          { label: 'Bekliyor',       value: counts.pending,  cls: 'op-stat--pending'  },
          { label: 'Kabul',          value: counts.approved, cls: 'op-stat--approved' },
          { label: 'Red',            value: counts.rejected, cls: 'op-stat--rejected' },
        ].map(s => (
          <div key={s.label} className={`op-stat ${s.cls}`}>
            <div className="op-stat__value">{s.value}</div>
            <div className="op-stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="op-toolbar">
        <div className="op-toolbar__search">
          <span className="op-toolbar__search-icon"><IconSearch /></span>
          <input
            id="officer-search"
            type="text"
            placeholder="Proje adı veya başvuran ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="op-toolbar__filters">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              data-status={f.status || undefined}
              className={`op-filter-btn ${filter === f.value ? 'op-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.status && <span className="op-filter-btn__dot" />}
              {f.label}
              {f.value !== 'all' && counts[f.value] > 0 && (
                <span className="op-filter-btn__count">{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="op-content">
        {loading && (
          <div className="op-loading">
            <div className="op-spinner" />
            <span>Başvurular yükleniyor...</span>
          </div>
        )}

        {error && !loading && (
          <div className="op-error">
            <IconAlertTriangle />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="op-empty">
            <div className="op-empty__icon"><IconInbox /></div>
            <h3>Başvuru bulunamadı</h3>
            <p>{search || filter !== 'all' ? 'Arama kriterlerinizle eşleşen başvuru yok.' : 'Belediyenize henüz başvuru yapılmamış.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="op-table-wrapper">
            <table className="op-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Proje Adı</th>
                  <th>Başvuran</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id} className={app.status === 'pending' ? 'op-row--pending' : ''}>
                    <td className="op-table__date">{formatDate(app.appliedAt)}</td>
                    <td className="op-table__project">
                      <span className="op-table__project-name">{app.projectName}</span>
                    </td>
                    <td className="op-table__applicant">
                      <div className="op-table__applicant-name">{app.applicantName}</div>
                      <div className="op-table__applicant-email">{app.applicantEmail}</div>
                    </td>
                    <td>
                      <span className={`op-badge ${STATUS_CONFIG[app.status]?.cls}`}>
                        <span className="op-badge__dot" />
                        {STATUS_CONFIG[app.status]?.label}
                      </span>
                    </td>
                    <td>
                      <div className="op-action-btns">
                        <button
                          className="op-inspect-btn"
                          id={`inspect-btn-${app.id}`}
                          onClick={() => setWorkspaceAppId(app.id)}
                          title="Projeyi Parametreler / Zemin / Sonuçlar ile İncele"
                        >
                          <IconMicroscope />
                          İncele
                        </button>
                        <button
                          className="op-detail-btn"
                          id={`detail-btn-${app.id}`}
                          onClick={() => setSelectedAppId(app.id)}
                          title="Başvuru Detayı & Onay/Red"
                        >
                          Detay
                          <IconArrowRight />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          token={token}
          onClose={() => setSelectedAppId(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
}
