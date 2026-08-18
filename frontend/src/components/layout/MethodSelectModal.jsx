import { useState } from 'react';
import { IMPROVEMENT_METHODS } from '../../constants/improvementMethods';
import './MethodSelectModal.css';

/**
 * MethodSelectModal — Yeni proje açılırken iyileştirme yöntemi seçim ekranı.
 *
 * @param {{ lang: string, onSelect: (method: string) => void, onClose: () => void }} props
 */
export default function MethodSelectModal({ lang, onSelect, onClose }) {
  const tr = lang === 'tr';
  const [selected, setSelected] = useState('jet_grout');

  const handleConfirm = () => {
    onSelect(selected);
  };

  return (
    <div className="msm-overlay" onClick={onClose}>
      <div className="msm-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="msm-header">
          <div className="msm-header-text">
            <h2>{tr ? 'Yeni Proje' : 'New Project'}</h2>
            <p>{tr ? 'İyileştirme yöntemini seçin' : 'Select an improvement method'}</p>
          </div>
          <button className="msm-close-btn" onClick={onClose} title={tr ? 'Kapat' : 'Close'}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Method Cards */}
        <div className="msm-grid">
          {IMPROVEMENT_METHODS.map((method) => {
            const isActive = selected === method.key;
            return (
              <button
                key={method.key}
                className={`msm-method-card ${isActive ? 'msm-method-card--active' : ''}`}
                style={isActive ? {
                  '--card-color': method.color,
                  '--card-bg': method.bgColor,
                  '--card-border': method.borderColor,
                } : {}}
                onClick={() => setSelected(method.key)}
              >
                <span className="msm-method-icon">{method.icon}</span>
                <span className="msm-method-name">
                  {tr ? method.labelTR : method.labelEN}
                </span>
                {isActive && (
                  <span className="msm-checkmark">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="msm-footer">
          <button className="msm-btn-cancel" onClick={onClose}>
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button className="msm-btn-confirm" onClick={handleConfirm}>
            {tr ? 'Devam Et' : 'Continue'}
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
