import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

// Must match the extension list in ExtensionsModal.jsx
const EXT_META = {
  'ext-prettier': { icon: 'format_paint', label: 'Prettier', color: '#F59E0B' },
  'ext-eslint':   { icon: 'fact_check',   label: 'ESLint',   color: '#D1D5DB' },
  'ext-python':   { icon: 'terminal',     label: 'Python',   color: '#3B82F6' },
  'ext-gitlens':  { icon: 'account_tree', label: 'GitLens',  color: '#F43F5E' },
  'ext-dracula':  { icon: 'palette',      label: 'Dracula',  color: '#EC4899' },
  'ext-copilot':  { icon: 'smart_toy',    label: 'Copilot',  color: '#10B981' },
};

function Seg({ children, style }) {
  return (
    <div
      className="flex items-center gap-1"
      style={{
        height: '100%', padding: '0 10px', cursor: 'default',
        transition: 'background .12s', fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'rgba(255,255,255,.75)',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.12)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      {children}
    </div>
  );
}

function Icon({ name }) {
  return <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{name}</span>;
}

export default function Footer({ language = 'JavaScript', line, col }) {
  const { connected } = useSocket();

  // Read installed extensions from localStorage
  const [installed, setInstalled] = useState([]);

  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem('collab_extensions');
        setInstalled(saved ? JSON.parse(saved) : ['ext-prettier']);
      } catch { setInstalled(['ext-prettier']); }
    };
    read();
    // Listen for changes from ExtensionsModal (same tab)
    window.addEventListener('storage', read);
    // Custom event for same-tab updates
    window.addEventListener('extensions-changed', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('extensions-changed', read);
    };
  }, []);

  // Get metadata for installed extensions
  const activeExts = installed.map(id => EXT_META[id]).filter(Boolean);

  return (
    <footer
      style={{
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(90deg, #374151 0%, #D1D5DB 50%, #6B7280 100%)',
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Left segments */}
      <div className="flex items-center h-full">
        <Seg><Icon name="account_tree" /> main</Seg>
        <Seg><Icon name="sync" /> 0↓ 0↑</Seg>
        <Seg style={{ fontWeight: 600 }}>CollabCode</Seg>
      </div>

      {/* Right segments */}
      <div className="flex items-center h-full">
        <Seg>Ln {line || 1}, Col {col || 1}</Seg>
        <Seg>Spaces: 2</Seg>
        <Seg>UTF-8</Seg>
        <Seg style={{ fontWeight: 600 }}>{language}</Seg>
        {/* Show installed extensions */}
        {activeExts.map((ext, i) => (
          <Seg key={i}>
            <Icon name={ext.icon} />
            <span style={{ color: ext.color }}>{ext.label}</span>
          </Seg>
        ))}
        <Seg>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: connected ? '#86EFAC' : '#FCA5A5' }}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </Seg>
        <Seg><Icon name="notifications" /></Seg>
      </div>
    </footer>
  );
}
