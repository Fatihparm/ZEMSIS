/**
 * TopBar — Üst başlık çubuğu
 *
 * Sayfa başlığını, açıklamasını, logo ve tarihi gösterir.
 * Daha önce App.jsx içindeydi, ayrı bileşene taşındı.
 */

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   todayLabel: string,
 *   isCompact: boolean,
 *   onMenuOpen: () => void,
 * }} props
 */
export default function TopBar({ title, description, todayLabel, isCompact, onMenuOpen }) {
  return (
    <div className={`top-bar ${isCompact ? 'top-bar-compact' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mobile-menu-btn" onClick={onMenuOpen} title="Menüyü Aç">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="top-bar-actions">
        <img
          src="/btu-logo.png"
          alt="BTU Logo"
          style={{ height: '40px', objectFit: 'contain', marginRight: '1rem' }}
        />
        <div className="date-tag">{todayLabel}</div>
      </div>
    </div>
  );
}
