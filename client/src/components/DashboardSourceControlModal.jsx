import { useEffect } from 'react';

export default function DashboardSourceControlModal({ onClose }) {
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
          maxWidth: 480,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 28, height: 28, filter: 'invert(1)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Source Control</h2>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Manage your GitHub integration.</p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>Connection Status</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,.15)', color: '#34D399', border: '1px solid rgba(52,211,153,.3)' }}>Connected</span>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5 }}>
            Your account is linked. Open any collaborative room to push workspace files directly to your repositories.
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255,255,255,.3)'
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
