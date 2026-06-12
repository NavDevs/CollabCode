import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const EXTENSIONS = [
  { id: 'ext-prettier', name: 'Prettier Formatter', author: 'CollabCode', desc: 'Auto-format code on save for JavaScript, TypeScript, and CSS.', icon: 'format_paint', color: '#F59E0B' },
  { id: 'ext-eslint', name: 'ESLint Linter', author: 'CollabCode', desc: 'Real-time linting and error checking in the editor.', icon: 'fact_check', color: '#D1D5DB' },
  { id: 'ext-python', name: 'Python IntelliSense', author: 'Community', desc: 'Rich autocomplete, linting, and hover definitions for Python.', icon: 'terminal', color: '#3B82F6' },
  { id: 'ext-gitlens', name: 'GitLens', author: 'GitKraken', desc: 'Supercharge Git capabilities with inline blame annotations.', icon: 'account_tree', color: '#F43F5E' },
  { id: 'ext-dracula', name: 'Dracula Theme', author: 'Zeno Rocha', desc: 'A dark theme for CollabCode Editor.', icon: 'palette', color: '#EC4899' },
  { id: 'ext-copilot', name: 'Collab Copilot', author: 'CollabCode', desc: 'AI pair programmer to help you write code faster.', icon: 'smart_toy', color: '#10B981' }
];

export default function ExtensionsModal({ onClose }) {
  const [installed, setInstalled] = useState(() => {
    try {
      const saved = localStorage.getItem('collab_extensions');
      return saved ? JSON.parse(saved) : ['ext-prettier'];
    } catch { return ['ext-prettier']; }
  });

  useEffect(() => {
    localStorage.setItem('collab_extensions', JSON.stringify(installed));
  }, [installed]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const toggleInstall = (id) => {
    setInstalled(prev => {
      if (prev.includes(id)) {
        toast('Extension uninstalled', { icon: '🗑️' });
        return prev.filter(e => e !== id);
      } else {
        toast.success('Extension installed!');
        return [...prev, id];
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,.75)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          borderRadius: 20,
          padding: 0,
          background: '#0A0A0A',
          border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.1)',
          animation: 'fade-up .22s ease',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Extensions Marketplace</h2>
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>Supercharge your workspace with powerful plugins.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.05)', border: 'none',
              cursor: 'pointer', color: '#9CA3AF',
              transition: 'background .15s, color .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: 'rgba(0,0,0,.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {EXTENSIONS.map(ext => {
              const isInst = installed.includes(ext.id);
              return (
                <div key={ext.id} style={{ display: 'flex', gap: 16, padding: 16, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `rgba(255,255,255,.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: ext.color }}>{ext.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', marginBottom: 2 }}>{ext.name}</h3>
                    <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>by {ext.author}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5, marginBottom: 16 }}>{ext.desc}</p>
                    <button
                      onClick={() => toggleInstall(ext.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 6,
                        background: isInst ? 'rgba(255,255,255,.05)' : 'linear-gradient(135deg,#D1D5DB,#6B7280)',
                        color: isInst ? '#9CA3AF' : '#fff',
                        fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s'
                      }}
                    >
                      {isInst ? 'Uninstall' : 'Install'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
