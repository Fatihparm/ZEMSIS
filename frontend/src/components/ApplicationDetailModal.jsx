import { useState, useEffect } from 'react';
import './ApplicationDetailModal.css';

const API_URL = '/api';

const STATUS_CONFIG = {
  pending:  { label: 'Değerlendirme Aşamasında', cls: 'det-status--pending'  },
  approved: { label: 'Kabul Edilmiştir',          cls: 'det-status--approved' },
  rejected: { label: 'Reddedildi',                cls: 'det-status--rejected' },
};

/* ── SVG icon components ─────────────────────────────────────── */
const IconClipboard = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
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

const IconSettings = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
    <path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M6 20V4M18 20v-6" />
  </svg>
);

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

function SectionTable({ title, icon: Icon, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="det-section">
      <h4 className="det-section__title">
        {Icon && <Icon />}
        {title}
      </h4>
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

  const statusCfg = data ? STATUS_CONFIG[data.status] : null;

  return (
    <div className="det-overlay" onClick={onClose}>
      <div className="det-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="det-modal__header">
          <div className="det-modal__title">
            <div className="det-modal__title-icon">
              <IconClipboard />
            </div>
            <div>
              <h2>Başvuru Detayı</h2>
              {data && <p>{data.municipality}</p>}
            </div>
          </div>
          <button className="det-modal__close" onClick={onClose} aria-label="Kapat">
            <IconX />
          </button>
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
                  {statusCfg && (
                    <div className={`det-status ${statusCfg.cls}`}>
                      <span className="det-status__dot" />
                      {statusCfg.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Red notu varsa */}
              {data.status === 'rejected' && data.rejectionNote && (
                <div className="det-rejection-box">
                  <strong>
                    <IconXCircle /> Red Gerekçesi
                  </strong>
                  <p>{data.rejectionNote}</p>
                </div>
              )}

              {/* Zemin Katmanları */}
              {data.project?.soilLayers?.length > 0 && (
                <div className="det-section">
                  <h4 className="det-section__title">
                    <IconLayers /> Zemin Katmanları
                  </h4>
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
                title="Hesap Parametreleri"
                icon={IconSettings}
                rows={buildParamRows(data.project?.parameters)}
              />

              {/* Sonuçlar */}
              {data.project?.results && Object.entries(data.project.results).map(([cat, items]) => (
                <SectionTable
                  key={cat}
                  title={RESULT_LABELS[cat] || cat}
                  icon={IconBarChart}
                  rows={buildResultRows(items)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer — onay / reddet (sadece pending başvurularda) */}
        {data && data.status === 'pending' && (
          <div className="det-modal__footer">
            {reviewAction === null && (
              <div className="det-review-actions">
                <button
                  id="reject-btn"
                  className="det-btn det-btn--reject"
                  onClick={() => setReviewAction('reject')}
                >
                  <IconXCircle /> Reddet
                </button>
                <button
                  id="approve-btn"
                  className="det-btn det-btn--approve"
                  onClick={() => setReviewAction('approve')}
                >
                  <IconCheckCircle /> Onayla
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
                    {submitting ? 'Kaydediliyor...' : <><IconCheckCircle /> Evet, Onayla</>}
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
                    {submitting ? 'Kaydediliyor...' : <><IconXCircle /> Evet, Reddet</>}
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
