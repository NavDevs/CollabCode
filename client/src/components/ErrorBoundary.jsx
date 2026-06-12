import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', height: '100vh',
          alignItems: 'center', justifyContent: 'center',
          background: '#050505', color: '#F1F5F9', padding: 20
        }}>
          <div style={{
            maxWidth: 500, width: '100%', padding: 32,
            background: 'rgba(255,255,255,.03)', borderRadius: 20,
            border: '1px solid rgba(239,68,68,.25)',
            boxShadow: '0 40px 100px rgba(0,0,0,.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>error</span>
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong.</h1>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0 0' }}>The application encountered an unexpected error.</p>
              </div>
            </div>
            
            <div style={{
              padding: 16, background: 'rgba(0,0,0,.4)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.05)', marginBottom: 24,
              overflowX: 'auto'
            }}>
              <code style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'JetBrains Mono, monospace' }}>
                {this.state.error?.toString()}
              </code>
            </div>

            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,.3)'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
