/**
 * Sidebar — Uygulama yan navigasyon menüsü
 *
 * Normal kullanıcı ve belediye memuru için ortak sidebar iskelet.
 * Daha önce App.jsx içindeydi, ayrı bileşene taşındı.
 */
import {
  IconHome, IconGrid, IconPlus, IconSave, IconGlobe, IconLogOut,
  IconSliders, IconLayers, IconPencilRuler, IconBarChart, IconFileText, IconBuilding
} from '../icons/AppIcons';

/**
 * @param {{
 *   isOfficer: boolean,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   activePage: string,
 *   activeTab: string,
 *   currentProjectName: string,
 *   user: object,
 *   userInitials: string,
 *   lang: string,
 *   tr: boolean,
 *   onNavClick: (fn: () => void) => void,
 *   onSetActivePage: (page: string) => void,
 *   onSetActiveTab: (tab: string) => void,
 *   onNewProject: () => void,
 *   onSave: () => void,
 *   onToggleLanguage: () => void,
 *   onLogout: () => void,
 * }} props
 */
export default function Sidebar({
  isOfficer,
  isOpen,
  onClose,
  activePage,
  activeTab,
  currentProjectName,
  user,
  userInitials,
  tr,
  lang,
  onNavClick,
  onSetActivePage,
  onSetActiveTab,
  onNewProject,
  onSave,
  onToggleLanguage,
  onLogout,
}) {
  const menuItems = [
    { key: 'home',     Icon: IconHome,  label: tr ? 'Ana Sayfa' : 'Home' },
    { key: 'projects', Icon: IconGrid,  label: tr ? 'Projeler'  : 'Projects' },
  ];

  const workspaceTabs = [
    { key: 'parameters',  Icon: IconSliders,     label: tr ? 'Parametreler'   : 'Parameters' },
    { key: 'soilSection', Icon: IconLayers,      label: tr ? 'Zemin ve Kesit' : 'Soil & Section' },
    { key: 'planView',    Icon: IconPencilRuler, label: tr ? 'Cizim'          : 'Drawing' },
    { key: 'results',     Icon: IconBarChart,    label: tr ? 'Sonuclar'       : 'Results' },
    { key: 'report',      Icon: IconFileText,    label: tr ? 'Rapor'          : 'Report' },
    { key: 'application', Icon: IconBuilding,   label: tr ? 'Başvuru'        : 'Application' },
  ];

  const logoSubtitle = isOfficer ? 'Belediye Portalı' : 'Engineering Suite';
  const sessionLabel = isOfficer ? 'Denetim Memuru' : (tr ? 'Aktif oturum' : 'Active session');

  return (
    <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" title="ZEMSIS">
        <img
          src="/zemsis-logo-beyaz.png"
          alt="ZEMSIS Logo Beyaz"
          className="sidebar-logo-img"
          style={{ width: '64px', height: 'auto' }}
        />
        <div className="sidebar-logo-text">
          <strong>ZEMSIS</strong>
          <span>{logoSubtitle}</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} title="Menüyü Kapat">✕</button>
      </div>

      {/* Kullanıcı kartı */}
      <div className="user-profile-card">
        <div className="avatar-circle">{userInitials}</div>
        <div className="user-details">
          <h4>{user?.fullName || 'ZEMSIS User'}</h4>
          <span>{sessionLabel}</span>
        </div>
      </div>

      {/* Ana menü */}
      <div className="nav-menu">
        {isOfficer ? (
          <button className="nav-item active" title="Başvurular">
            <span className="menu-icon"><IconBuilding /></span>
            <span className="menu-label">Başvurular</span>
          </button>
        ) : (
          <>
            {menuItems.map(item => (
              <button
                key={item.key}
                className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                onClick={() => onNavClick(() => onSetActivePage(item.key))}
                title={item.label}
              >
                <span className="menu-icon"><item.Icon /></span>
                <span className="menu-label">{item.label}</span>
              </button>
            ))}

            {activePage === 'workspace' && (
              <>
                <div className="sidebar-project-divider">
                  <span title={currentProjectName || (tr ? 'Yeni Proje' : 'New Project')}>
                    {currentProjectName || (tr ? 'Yeni Proje' : 'New Project')}
                  </span>
                </div>
                {workspaceTabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`nav-item sub-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => onNavClick(() => onSetActiveTab(tab.key))}
                    title={tab.label}
                  >
                    <span className="menu-icon"><tab.Icon /></span>
                    <span className="menu-label">{tab.label}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Alt kısım */}
      <div className="sidebar-bottom">
        {!isOfficer && (
          <>
            <button className="nav-item" onClick={onNewProject} title={tr ? 'Yeni Proje' : 'New Project'}>
              <span className="menu-icon"><IconPlus /></span>
              <span className="menu-label">{tr ? 'Yeni' : 'New'}</span>
            </button>

            {activePage === 'workspace' && (
              <button className="nav-item" onClick={onSave} title={tr ? 'Kaydet' : 'Save'}>
                <span className="menu-icon"><IconSave /></span>
                <span className="menu-label">{tr ? 'Kaydet' : 'Save'}</span>
              </button>
            )}

            <button className="nav-item" onClick={onToggleLanguage} title={lang === 'en' ? 'Turkce' : 'English'}>
              <span className="menu-icon"><IconGlobe /></span>
              <span className="menu-label">{lang === 'en' ? 'Turkce' : 'English'}</span>
            </button>
          </>
        )}

        <button className="logout-btn" onClick={onLogout} title={tr ? 'Çıkış' : 'Logout'}>
          <span className="menu-icon"><IconLogOut /></span>
          <span className="menu-label">{tr ? 'Çıkış' : 'Logout'}</span>
        </button>
      </div>
    </nav>
  );
}
