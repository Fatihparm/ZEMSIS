import { useState, useEffect, useCallback } from 'react';
import ApplicationDetailModal from './ApplicationDetailModal';
import OfficerWorkspaceView from './OfficerWorkspaceView';
import './OfficerPortal.css';

const API_URL = '/api';

const STATUS_CONFIG = {
  pending:  { label: 'Bekliyor',           icon: '🕐', cls: 'op-badge--pending'  },
  approved: { label: 'Kabul Edildi',        icon: '✅', cls: 'op-badge--approved' },
  rejected: { label: 'Reddedildi',          icon: '❌', cls: 'op-badge--rejected' },
};

const FILTER_OPTIONS = [
  { value: 'all',      label: 'Tümü' },
  { value: 'pending',  label: '🕐 Bekleyenler' },
  { value: 'approved', label: '✅ Kabul Edilenler' },
  { value: 'rejected', label: '❌ Reddedilenler' },
];

export default function OfficerPortal({ user, token, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [municipality, setMunicipality] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal: başvuru detay (onay/red)
  const [selectedAppId, setSelectedAppId] = useState(null);

  // Workspace: proje inceleme görünümü
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

  // ── Eğer proje inceleme modundaysa OfficerWorkspaceView göster ──────────────
  if (workspaceAppId) {
    return (
      <OfficerWorkspaceView
        applicationId={workspaceAppId}
        token={token}
        onBack={() => setWorkspaceAppId(null)}
      />
    );
  }

  // ── Normal liste görünümü ────────────────────────────────────────────────────
  return (
    <div className="op-root">
      {/* Page header */}
      <div className="op-header">
        <div className="op-header__left">
          <div className="op-header__icon">🏛️</div>
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
          <span className="op-toolbar__search-icon">🔍</span>
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
              className={`op-filter-btn ${filter === f.value ? 'op-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
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
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="op-empty">
            <div className="op-empty__icon">📭</div>
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
                        {STATUS_CONFIG[app.status]?.icon} {STATUS_CONFIG[app.status]?.label}
                      </span>
                    </td>
                    <td>
                      {/* İki buton: Detay (onay/red) + Projeyi İncele (workspace) */}
                      <div className="op-action-btns">
                        <button
                          className="op-inspect-btn"
                          id={`inspect-btn-${app.id}`}
                          onClick={() => setWorkspaceAppId(app.id)}
                          title="Projeyi Parametreler / Zemin / Sonuçlar ile İncele"
                        >
                          🔬 İncele
                        </button>
                        <button
                          className="op-detail-btn"
                          id={`detail-btn-${app.id}`}
                          onClick={() => setSelectedAppId(app.id)}
                          title="Başvuru Detayı & Onay/Red"
                        >
                          Detay →
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
