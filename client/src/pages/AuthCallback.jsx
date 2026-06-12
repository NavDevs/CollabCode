import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * /auth/callback
 * Google redirects here after OAuth with ?token=<jwt>
 * We store the token and redirect to dashboard.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=google_failed');
      return;
    }

    // Store token and redirect
    loginWithToken(token);
    navigate('/dashboard');
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#050508', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, border: '3px solid rgba(255,255,255,.1)',
        borderTop: '3px solid #10B981', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#9CA3AF', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
        Signing you in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
