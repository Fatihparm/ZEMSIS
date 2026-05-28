import { useState, useEffect } from 'react';
import './ApplicationDetailModal.css';

const API_URL = '/api';

const STATUS_CONFIG = {
  pending:  { label: 'Değerlendirme Aşamasında', icon: '🕐', cls: 'det-status--pending'  },
  approved: { label: 'Kabul Edilmiştir',          icon: '✅', cls: 'det-status--approved' },
  rejected: { label: 'Reddedildi',                icon: '❌', cls: 'det-status--rejected' },
};

const fmtNum = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return Math.abs(n) >= 1000
    ? n.toLocaleString('tr-TR', { maximumFractionDigits: 3 })
    : n.toFixed(3);
};

function ParamRow({ label, value, unit }) {
  return (
    <tr>
      <td className="det-table__label">{label}</td>
      <td className="det-table__value">{fmtNum(value)}</td>
      <td className="det-table__unit">{unit || '—'}</td>
    </tr>
  );
}

function SectionTable({ title, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="det-section">
      <h4 className="det-section__title">{title}</h4>
      <table className="det-table">
        <thead>
          <tr>
            <th>Parametre</th>
            <th>Değer</th>
            <th>Birim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <ParamRow key={i} label={r.label} value={r.value ?? r.val} unit={r.unit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApplicationDetailModal({ applicationId, token, onClose, onReviewed }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review state
  const [reviewAction, setReviewAction] = useState(null); // 'approve' | 'reject'
  const [rejectNote, setRejectNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/applications/${applicationId}`, { headers: authHeader });
        const d = await res.json();
        if (d.success) setData(d.application);
        else setError(d.error || 'Yüklenemedi');
      } catch {
        setError('Sunucuya bağlanılamadı');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [applicationId]);

  const handleReview = async () => {
    if (reviewAction === 'reject' && rejectNote.trim().length < 5) {
      setReviewError('Red gerekçesi en az 5 karakter olmalı.');
      return;
    }
    setSubmitting(true);
    setReviewError('');
    try {
      const res = await fetch(`${API_URL}/applications/${applicationId}/review`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reviewAction, note: rejectNote }),
      });
      const d = await res.json();
      if (d.success) {
        onReviewed(reviewAction);
      } else {
        setReviewError(d.error || 'İşlem başarısız');
      }
    } catch {
      setReviewError('Sunucuya bağlanılamadı');
    } finally {
      setSubmitting(false);
    }
  };

  // Build param rows from project data
  const buildParamRows = (params) => {
    if (!params) return [];
    const LABELS = {
      D: ['Kolon Çapı (D)', 'm'],
      s: ['Kolon Aralığı (s)', 'm'],
      H: ['Kolon Yüksekliği (H)', 'm'],
      cu: ['Drenajsız Kohezyon (cu)', 'kPa'],
      Es: ['Zemin Elastisite Modülü (Es)', 'kPa'],
      alpha: ['Aderans Faktörü (α)', '—'],
      Nc: ['Taşıma Kapasitesi Katsayısı (Nc)', '—'],
      sigmaJet: ['Jet Grout Dayanımı (σjet)', 'kPa'],
      Ejg: ['Jet Grout Elastisite Modülü (Ejg)', 'kPa'],
      qtemel: ['Temel Basıncı (qtemel)', 'kPa'],
      qnet: ['Net Basınç (qnet)', 'kPa'],
      Fs: ['Malzeme Güvenlik Faktörü (Fs)', '—'],
      FS: ['Taşıma Kap. Güvenlik Faktörü (FS)', '—'],
    };
    return Object.entries(params)
      .filter(([k]) => LABELS[k])
      .map(([k, v]) => ({ label: LABELS[k][0], value: v, unit: LABELS[k][1] }));
  };

  const buildResultRows = (category) => {
    if (!category || typeof category !== 'object') return [];
    return Object.entries(category).map(([, item]) => {
      if (typeof item === 'object' && item !== null) {
        return { label: item.label || '', value: item.value, unit: item.unit };
      }
      return { label: '', value: item, unit: '—' };
    });
  };

  const RESULT_LABELS = {
    geometry:     'Geometri Sonuçları',
    material:     'Malzeme Parametreleri',
    capacity:     'Taşıma Kapasitesi',
    improvedSoil: 'İyileştirilmiş Zemin',
    settlement:   'Oturma Hesapları',
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="det-overlay" onClick={onClose}>
      <div className="det-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="det-modal__header">
          <div className="det-modal__title">
            <span className="det-modal__title-icon">📋</span>
            <div>
              <h2>Başvuru Detayı</h2>
              {data && <p>{data.municipality}</p>}
            </div>
          </div>
          <button className="det-modal__close" onClick={onClose} aria-label="Kapat">✕</button>
        </div>

        {/* Body */}
        <div className="det-modal__body">
          {loading && (
            <div className="det-loading">
              <div className="det-spinner" />
              <span>Yükleniyor...</span>
            </div>
          )}
          {error && <div className="det-error">{error}</div>}

          {data && (
            <>
              {/* Meta bilgiler */}
              <div className="det-meta-grid">
                <div className="det-meta-card">
                  <div className="det-meta-label">Başvuran</div>
                  <div className="det-meta-value">{data.applicantName}</div>
                  <div className="det-meta-sub">{data.applicantEmail}</div>
                </div>
                <div className="det-meta-card">
                  <div className="det-meta-label">Proje</div>
                  <div className="det-meta-value">{data.project?.name}</div>
                </div>
                <div className="det-meta-card">
                  <div className="det-meta-label">Başvuru Tarihi</div>
                  <div className="det-meta-value">{formatDate(data.appliedAt)}</div>
                </div>
                <div className="det-meta-card">
                  <div className="det-meta-label">Durum</div>
                  <div className={`det-status ${STATUS_CONFIG[data.status]?.cls}`}>
                    {STATUS_CONFIG[data.status]?.icon} {STATUS_CONFIG[data.status]?.label}
                  </div>
                </div>
              </div>

              {/* Red notu varsa */}
              {data.status === 'rejected' && data.rejectionNote && (
                <div className="det-rejection-box">
                  <strong>❌ Red Gerekçesi</strong>
                  <p>{data.rejectionNote}</p>
                </div>
              )}

              {/* Zemin Katmanları */}
              {data.project?.soilLayers?.length > 0 && (
                <div className="det-section">
                  <h4 className="det-section__title">🏔️ Zemin Katmanları</h4>
                  <table className="det-table det-table--layers">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Zemin Tipi</th>
                        <th>Kalınlık (m)</th>
                        <th>γ (kN/m³)</th>
                        <th>φ (°)</th>
                        <th>c (kPa)</th>
                        <th>Es (kPa)</th>
                        <th>ν</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.project.soilLayers.map((layer, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{layer.soilType || '—'}</td>
                          <td>{fmtNum(layer.thickness)}</td>
                          <td>{fmtNum(layer.gamma)}</td>
                          <td>{fmtNum(layer.phi)}</td>
                          <td>{fmtNum(layer.cohesion)}</td>
                          <td>{fmtNum(layer.elasticity)}</td>
                          <td>{fmtNum(layer.poisson)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Parametreler */}
              <SectionTable
                title="⚙️ Hesap Parametreleri"
                rows={buildParamRows(data.project?.parameters)}
              />

              {/* Sonuçlar */}
              {data.project?.results && Object.entries(data.project.results).map(([cat, items]) => (
                <SectionTable
                  key={cat}
                  title={`📊 ${RESULT_LABELS[cat] || cat}`}
                  rows={buildResultRows(items)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer — doğrula / reddet (sadece pending başvurularda) */}
        {data && data.status === 'pending' && (
          <div className="det-modal__footer">
            {reviewAction === null && (
              <div className="det-review-actions">
                <button
                  id="reject-btn"
                  className="det-btn det-btn--reject"
                  onClick={() => setReviewAction('reject')}
                >
                  ❌ Reddet
                </button>
                <button
                  id="approve-btn"
                  className="det-btn det-btn--approve"
                  onClick={() => setReviewAction('approve')}
                >
                  ✅ Doğrula
                </button>
              </div>
            )}

            {reviewAction === 'approve' && (
              <div className="det-review-confirm">
                <p className="det-review-confirm__text">
                  Bu başvuruyu <strong>onaylamak</strong> istediğinizden emin misiniz?
                </p>
                {reviewError && <div className="det-review-error">{reviewError}</div>}
                <div className="det-review-confirm__actions">
                  <button className="det-btn det-btn--ghost" onClick={() => setReviewAction(null)} disabled={submitting}>
                    Geri
                  </button>
                  <button className="det-btn det-btn--approve" onClick={handleReview} disabled={submitting}>
                    {submitting ? 'Kaydediliyor...' : '✅ Evet, Onayla'}
                  </button>
                </div>
              </div>
            )}

            {reviewAction === 'reject' && (
              <div className="det-review-confirm">
                <label className="det-review-confirm__label" htmlFor="reject-note">
                  Red Gerekçesi <span>(zorunlu, en az 5 karakter)</span>
                </label>
                <textarea
                  id="reject-note"
                  className="det-review-confirm__textarea"
                  rows={3}
                  placeholder="Red gerekçesini açıklayın..."
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                />
                {reviewError && <div className="det-review-error">{reviewError}</div>}
                <div className="det-review-confirm__actions">
                  <button className="det-btn det-btn--ghost" onClick={() => { setReviewAction(null); setRejectNote(''); }} disabled={submitting}>
                    Geri
                  </button>
                  <button className="det-btn det-btn--reject" onClick={handleReview} disabled={submitting}>
                    {submitting ? 'Kaydediliyor...' : '❌ Evet, Reddet'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
