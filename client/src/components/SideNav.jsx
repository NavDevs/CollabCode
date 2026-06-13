import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import GlobalSearchModal from './GlobalSearchModal';
import ExtensionsModal from './ExtensionsModal';
import DashboardSourceControlModal from './DashboardSourceControlModal';

const S = {
  rail: {
    width: 48,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    background: 'var(--cc-sidenav, rgba(5,5,12,.98))',
    borderRight: '1px solid rgba(255,255,255,.05)',
    zIndex: 40,
    height: '100%',
  },
  btn: (active) => ({
    width: 36,
    height: 36,
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

function Btn({ icon, label, active, onClick }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={S.btn(active)}
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
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 2, height: 22, background: '#D1D5DB',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
    </button>
  );
}

export default function SideNav({ activeTab, setActiveTab, showChat, setShowChat }) {
  const navigate = useNavigate();
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
      <nav style={S.rail}>
        <div className="flex flex-col items-center gap-0.5 w-full px-1.5" style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
          {items.map((item, idx) => {
            if (item.type === 'link') {
              return (
                <NavLink key={idx} to={item.to} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {({ isActive }) => <Btn icon={item.icon} label={item.label} active={isActive} />}
                </NavLink>
              );
            } else if (item.type === 'tab') {
              return (
                <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Btn
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.tabId}
                    onClick={() => setActiveTab(item.tabId)}
                  />
                </div>
              );
            } else if (item.type === 'modal') {
              return (
                <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Btn icon={item.icon} label={item.label} active={false} onClick={item.action} />
                </div>
              );
            }
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-0.5 w-full px-1.5" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
          {botItems.map((item, idx) => {
            if (item.type === 'action') {
              return (
                <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Btn icon={item.icon} label={item.label} active={item.isActive} onClick={item.action} />
                </div>
              );
            }
            return (
              <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <NavLink to={item.to} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {({ isActive }) => <Btn icon={item.icon} label={item.label} active={isActive} />}
                </NavLink>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
