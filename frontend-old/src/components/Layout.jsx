import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

// Professional Icons
import { FiGrid, FiList, FiZap, FiSettings, FiLogOut, FiGlobe } from 'react-icons/fi';
import { GiShoppingBag } from 'react-icons/gi';
import { getTranslation } from '../services/i18n';

const NAV_ITEMS = [
  { path: '/',         icon: <FiGrid />,      labelKey: 'dashboard' },
  { path: '/tasks',    icon: <FiList />,      labelKey: 'objectives', mode: 'ultimate' },
  { path: '/simple',   icon: <FiZap />,       labelKey: 'reminders', mode: 'simple' },
  { path: '/shopping', icon: <GiShoppingBag />, labelKey: 'shopping', mode: 'simple' },
  { path: '/settings', icon: <FiSettings />,  labelKey: 'settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, switchMode, updateSettings } = useAuthStore();
  
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const handleLogout = (e) => {
    e.stopPropagation(); // Prevent navigation to profile
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const handleModeSwitch = async (mode) => {
    await switchMode(mode);
    toast.success(`${t('view_mode')} -> ${mode === 'ultimate' ? t('ultimate') : t('simple')}`);
  };

  const handleLanguageChange = (newLang) => {
    updateSettings({ language: newLang });
    toast.success(`Language: ${newLang === 'hi' ? 'Hindi' : newLang === 'te' ? 'Telugu' : 'English'}`);
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5,6,15,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">TaskTracker</div>
          <div className="sidebar-brand-sub">Productivity Suite</div>
        </div>

        {/* Mode Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <div className="label" style={{ marginBottom: '8px', opacity: 0.6 }}>{t('view_mode')}</div>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${user?.mode !== 'ultimate' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('simple')}
            >
              {t('simple')}
            </button>
            <button
              className={`mode-btn ${user?.mode === 'ultimate' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('ultimate')}
            >
              {t('ultimate')}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: '12px', opacity: 0.6, marginLeft: '14px' }}>{t('navigation')}</div>
          {NAV_ITEMS
            .filter(item => !item.mode || item.mode === (user?.mode || 'simple'))
            .map((item, i) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="nav-icon" style={{ fontSize: '18px' }}>{item.icon}</span>
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        {/* User Section (Now triggers Profile) */}
        <div 
          className="user-section hover-lift" 
          onClick={() => navigate('/profile')}
          style={{ 
            cursor: 'pointer', 
            padding: '16px', 
            borderRadius: 'var(--radius)',
            background: location.pathname === '/profile' ? 'var(--glass-active)' : 'transparent',
            transition: 'all 0.3s ease',
            border: location.pathname === '/profile' ? '1px solid var(--glass-border)' : '1px solid transparent'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
            <div className="user-avatar" style={{ border: '2px solid var(--glass-border)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent2)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                {t('level').toUpperCase()} {user?.level} · {user?.xp} {t('xp')}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
               <FiGlobe style={{ color: 'var(--text3)', fontSize: '12px' }} />
               <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>{t('language')}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['en', 'hi', 'te'].map(l => (
                <button 
                  key={l}
                  onClick={(e) => { e.stopPropagation(); handleLanguageChange(l); }}
                  style={{ 
                    flex: 1, padding: '6px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                    background: lang === l ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: lang === l ? 'white' : 'var(--text3)',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t(l)}
                </button>
              ))}
            </div>
          </div>

          {/* XP Progress */}
          <div className="xp-bar-wrap" style={{ height: '4px', marginBottom: '12px', background: 'rgba(255,255,255,0.05)' }}>
            <div className="xp-bar-fill" style={{ width: `${Math.min((user?.xp % 200) / 200 * 100, 100)}%` }} />
          </div>

          <button 
            className="btn btn-ghost btn-xs w-full" 
            onClick={handleLogout} 
            style={{ 
              justifyContent: 'center', 
              fontSize: '10px', 
              letterSpacing: '0.5px',
              color: 'var(--text3)',
              borderColor: 'transparent'
            }}
          >
            <FiLogOut style={{ marginRight: '6px' }} /> {t('logout').toUpperCase()}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div style={{ display: 'none', marginBottom: '24px', alignItems: 'center', gap: '16px' }} className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} className="btn btn-ghost btn-icon">☰</button>
          <span className="sidebar-brand-name" style={{ fontSize: '18px' }}>TaskTracker</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
