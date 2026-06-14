import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMobile } from '../hooks/useMobile';
import GlobalSearchModal from './GlobalSearchModal';
import ExtensionsModal from './ExtensionsModal';
import DashboardSourceControlModal from './DashboardSourceControlModal';

const S = {
  rail: (isMobile) => ({
    width: isMobile ? '100%' : 48,
    height: isMobile ? 56 : '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    alignItems: 'center',
    padding: isMobile ? '0 8px' : '8px 0',
    background: 'var(--cc-sidenav, rgba(5,5,12,.98))',
    borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,.05)',
    borderTop: isMobile ? '1px solid rgba(255,255,255,.05)' : 'none',
    zIndex: 40,
    position: isMobile ? 'fixed' : 'relative',
    bottom: isMobile ? 0 : 'auto',
    left: 0,
    right: 0,
  }),
  btn: (active, isMobile) => ({
    width: isMobile ? 44 : 36,
    height: isMobile ? 44 : 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: active ? 'rgba(255,255,255,.15)' : 'transparent',
    color: active ? '#F3F4F6' : '#4B5563',
    cursor: 'pointer',
    transition: 'all .15s ease',
    position: 'relative',
  }),
};

function Btn({ icon, label, active, onClick, isMobile }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={S.btn(active, isMobile)}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,.06)';
          e.currentTarget.style.color = '#9CA3AF';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#4B5563';
        }
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute', 
            ...(isMobile 
                ? { top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 2, borderRadius: '0 0 2px 2px' } 
                : { left: 0, top: '50%', transform: 'translateY(-50%)', width: 2, height: 22, borderRadius: '0 2px 2px 0' }),
            background: '#D1D5DB',
          }}
        />
      )}
      <span className="material-symbols-outlined" style={{ fontSize: isMobile ? 24 : 20 }}>{icon}</span>
    </button>
  );
}

export default function SideNav({ activeTab, setActiveTab, showChat, setShowChat }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const isEditor = activeTab !== undefined;

  const [showSearch, setShowSearch] = useState(false);
  const [showExt, setShowExt] = useState(false);
  const [showSource, setShowSource] = useState(false);

  // In the editor workspace, we show:
  // - Dashboard (nav link)
  // - Explorer (tab selector)
  // - Source Control (tab selector)
  const items = isEditor
    ? [
        { type: 'link', icon: 'grid_view', label: 'Dashboard', to: '/dashboard' },
        { type: 'tab', icon: 'folder', label: 'Explorer', tabId: 'explorer' },
        { type: 'tab', icon: 'account_tree', label: 'Source Control', tabId: 'github' },
        { type: 'modal', icon: 'extension', label: 'Extensions', action: () => setShowExt(true) },
      ]
    : [
        { type: 'link', icon: 'grid_view', label: 'Dashboard', to: '/dashboard' },
        { type: 'modal', icon: 'search', label: 'Search', action: () => setShowSearch(true) },
        { type: 'modal', icon: 'account_tree', label: 'Source Control', action: () => setShowSource(true) },
        { type: 'modal', icon: 'extension', label: 'Extensions', action: () => setShowExt(true) },
      ];

  const botItems = [
    ...(setShowChat ? [{ type: 'action', icon: 'chat', label: 'Toggle Chat', action: () => setShowChat(v => !v), isActive: showChat }] : []),
    { type: 'link', icon: 'account_circle', label: 'Account', to: '/profile' },
    { type: 'link', icon: 'settings', label: 'Settings', to: '/settings' },
  ];

  return (
    <>
      {showSearch && <GlobalSearchModal onClose={() => setShowSearch(false)} />}
      {showExt && <ExtensionsModal onClose={() => setShowExt(false)} />}
      {showSource && <DashboardSourceControlModal onClose={() => setShowSource(false)} />}
      {/* If mobile and on the editor, we might need a spacer at the bottom so content isn't hidden by fixed nav */}
      <nav style={S.rail(isMobile)}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4, width: isMobile ? 'auto' : '100%', padding: isMobile ? '0' : '0 6px', flex: 1, justifyContent: isMobile ? 'flex-start' : 'flex-start' }}>
          {items.map((item, idx) => {
            if (item.type === 'link') {
              return (
                <NavLink key={idx} to={item.to} style={{ display: 'flex', justifyContent: 'center' }}>
                  {({ isActive }) => <Btn icon={item.icon} label={item.label} active={isActive} isMobile={isMobile} />}
                </NavLink>
              );
            } else if (item.type === 'tab') {
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Btn
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.tabId}
                    onClick={() => setActiveTab(item.tabId)}
                    isMobile={isMobile}
                  />
                </div>
              );
            } else if (item.type === 'modal') {
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Btn icon={item.icon} label={item.label} active={false} onClick={item.action} isMobile={isMobile} />
                </div>
              );
            }
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 4, width: isMobile ? 'auto' : '100%', padding: isMobile ? '0' : '0 6px', marginTop: isMobile ? 0 : 'auto', marginLeft: isMobile ? 'auto' : 0 }}>
          {botItems.map((item, idx) => {
            if (item.type === 'action') {
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Btn icon={item.icon} label={item.label} active={item.isActive} onClick={item.action} isMobile={isMobile} />
                </div>
              );
            }
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'center' }}>
                <NavLink to={item.to} style={{ display: 'flex', justifyContent: 'center' }}>
                  {({ isActive }) => <Btn icon={item.icon} label={item.label} active={isActive} isMobile={isMobile} />}
                </NavLink>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
