import { useEffect } from 'react';

export default function HelpModal({ onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
          maxWidth: 600,
          borderRadius: 20,
          padding: 32,
          background: '#0A0A0A',
          border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.1)',
          animation: 'fade-up .22s ease',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 24, right: 24,
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

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Help & Shortcuts</h2>
        <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32 }}>Everything you need to navigate CollabCode effectively.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Editor Shortcuts */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#F3F4F6', marginBottom: 16 }}>Editor Shortcuts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Shortcut label="Run Code" keys={['Ctrl', 'Enter']} />
              <Shortcut label="Save File" keys={['Ctrl', 'S']} />
              <Shortcut label="Command Palette" keys={['Ctrl', 'Shift', 'P']} />
              <Shortcut label="Toggle Terminal" keys={['Ctrl', '`']} />
            </div>
          </div>

          {/* Quick Tips */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#F3F4F6', marginBottom: 16 }}>Quick Tips</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#F3F4F6' }}>group_add</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', marginBottom: 2 }}>Invite Team</h4>
                  <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>Click the "Share" icon in the top right of the editor to copy the invite link.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#34D399' }}>account_tree</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', marginBottom: 2 }}>Sync to GitHub</h4>
                  <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>Connect your GitHub account in the Source Control panel to push directly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: '#4B5563' }}>CollabCode v1.0.4</p>
          <a href="#" style={{ fontSize: 13, color: '#D1D5DB', textDecoration: 'none', fontWeight: 500 }}>View full documentation</a>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ label, keys }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: '#D1D5DB' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {keys.map((k, i) => (
          <kbd key={i} style={{ 
            padding: '2px 8px', borderRadius: 6, 
            background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', 
            borderBottomWidth: 2,
            fontSize: 11, fontFamily: 'inherit', fontWeight: 600, color: '#9CA3AF'
          }}>
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
