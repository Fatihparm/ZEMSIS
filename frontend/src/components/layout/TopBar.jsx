/**
 * TopBar — Üst başlık çubuğu
 *
 * Sayfa başlığını, açıklamasını, logo ve tarihi gösterir.
 * methodBadge prop'u verildiğinde aktif iyileştirme yöntemini badge olarak gösterir.
 */

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   todayLabel: string,
 *   isCompact: boolean,
 *   onMenuOpen: () => void,
 *   methodBadge?: { label: string, icon: string, color: string, bgColor: string, borderColor: string } | null,
 * }} props
 */
export default function TopBar({ title, description, todayLabel, isCompact, onMenuOpen, methodBadge }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {methodBadge && (
              <span
                className="topbar-method-badge"
                style={{
                  color:        methodBadge.color,
                  background:   methodBadge.bgColor,
                  borderColor:  methodBadge.borderColor,
                }}
              >
                <span className="topbar-method-badge__icon">{methodBadge.icon}</span>
                {methodBadge.label}
              </span>
            )}
          </div>
          <p style={{ margin: 0 }}>{description}</p>
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
