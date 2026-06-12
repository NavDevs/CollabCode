import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import HelpModal from './HelpModal';
import BrandMark from './BrandMark';

function IconBtn({ icon, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none',
        color: '#4B5563', cursor: 'pointer',
        transition: 'background .15s, color .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.07)'; e.currentTarget.style.color='#9CA3AF'; }}
      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#4B5563'; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{icon}</span>
    </button>
  );
}

export default function TopNav({ subtitle, rightContent, showNav = true }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <header
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 16px',
          background: 'rgba(5,5,12,.98)',
          borderBottom: '1px solid rgba(255,255,255,.05)',
          flexShrink: 0,
          zIndex: 50,
          backdropFilter: 'blur(10px)',
          gap: 8,
        }}
      >
        {/* ── Left ── */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 6 }}>
          <BrandMark size={24} />
          {/* Wordmark */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 12px 0 0',
              fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg,#F3F4F6 0%,#818CF8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
          >
            CollabCode
          </button>

          {subtitle && (
            <>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,.1)', margin: '0 12px' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF' }}>{subtitle}</span>
            </>
          )}

          {/* Nav tabs */}
          {showNav && ['Dashboard', 'Rooms', 'History'].map(tab => {
            const path = tab === 'Dashboard' ? '/dashboard' : `/${tab.toLowerCase()}`;
            const isActive = location.pathname === path;

            return (
              <button
                key={tab}
                onClick={() => navigate(path)}
                style={{
                  height: '100%', padding: '0 14px',
                  fontSize: 13, fontWeight: 500, color: isActive ? '#F1F5F9' : '#4B5563',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #D1D5DB' : '2px solid transparent',
                  transition: 'color .15s, border-color .15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#9CA3AF'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#4B5563'; }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── Right ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {rightContent}
          <NotificationDropdown />
          <IconBtn icon="help_outline" title="Help" onClick={() => setShowHelp(true)} />

        <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,.08)', margin: '0 6px' }} />

        {/* Avatar → Profile */}
        <button
          title={`${user?.username} — Profile & Settings`}
          onClick={() => navigate('/profile')}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            background: user?.avatarColor || '#D1D5DB',
            border: 'none', cursor: 'pointer',
            outline: `2px solid ${user?.avatarColor || '#D1D5DB'}60`,
            outlineOffset: 2,
            transition: 'transform .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        >
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </button>
      </div>
    </header>
    </>
  );
}
