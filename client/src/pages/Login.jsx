import BrandMark from '../components/BrandMark';

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  
  const handleGoogleLogin = () => {
    // Strip trailing slash if any and append auth route
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{ width: 500, height: 500, top: -150, left: -150, background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 65%)', animation: 'orb-drift 14s ease-in-out infinite' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 420, height: 420, bottom: -120, right: -120, background: 'radial-gradient(circle, rgba(6,182,212,.12) 0%, transparent 65%)', animation: 'orb-drift 11s ease-in-out infinite reverse' }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative z-10 w-full max-w-[400px] anim-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrandMark size={40} />
            <h1 className="gtext text-[32px] font-bold tracking-tight">CollabCode</h1>
          </div>
          <p className="text-[#9CA3AF] text-center text-[15px]">
            Welcome back! Sign in to continue your collaborative coding session.
          </p>
        </div>

        <div className="bg-[#12121A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-white/5"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
