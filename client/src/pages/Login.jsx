import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import toast from 'react-hot-toast';

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const [searchParams] = useSearchParams();
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    const error = searchParams.get('error');
    const details = searchParams.get('details');
    
    if (error) {
      let errorMsg = 'Authentication failed. Please try again.';
      if (details) {
        errorMsg += ` (${details})`;
      }
      toast.error(errorMsg, { duration: 5000 });
      // Remove query params to clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] text-white">
      {/* ─── Animated Background Effects ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Deep background mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#13111C] via-[#050505] to-[#050505]"></div>
        
        {/* Floating Orbs */}
        <div
          className="absolute rounded-full mix-blend-screen filter blur-[100px]"
          style={{ width: 600, height: 600, top: -200, left: -150, background: 'rgba(99,102,241,0.15)', animation: 'orb-drift 20s ease-in-out infinite' }}
        />
        <div
          className="absolute rounded-full mix-blend-screen filter blur-[120px]"
          style={{ width: 500, height: 500, bottom: -100, right: -100, background: 'rgba(236,72,153,0.12)', animation: 'orb-drift 25s ease-in-out infinite reverse' }}
        />
        <div
          className="absolute rounded-full mix-blend-screen filter blur-[90px]"
          style={{ width: 400, height: 400, top: '40%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(56,189,248,0.1)', animation: 'pulse 10s ease-in-out infinite' }}
        />
      </div>
      
      {/* Subtle Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* ─── Main Content Card ─── */}
      <div className="relative z-10 w-full max-w-[440px] px-6 anim-fade-up">
        {/* Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0A0A0A]/40 p-10 shadow-[0_0_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all duration-500">
          
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Header */}
          <div className="mb-10 flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 shadow-lg shadow-indigo-500/10">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl"></div>
              <BrandMark size={32} />
            </div>
            
            <div>
              <h1 className="gtext text-[34px] font-extrabold tracking-tight mb-2">CollabCode</h1>
              <p className="text-[#9CA3AF] text-[15px] leading-relaxed max-w-[280px] mx-auto">
                Sign in to continue your collaborative coding session.
              </p>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleGoogleLogin}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white text-gray-900 font-semibold py-4 px-4 transition-all duration-300 hover:bg-[#F8FAFC] active:scale-[0.98]"
            >
              {/* Button Hover Glow */}
              <div 
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${isHovering ? 'opacity-100' : ''}`}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.03), transparent)' }}
              ></div>

              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="relative z-10 text-[15px]">Continue with Google</span>
            </button>
            
            <div className="mt-4 text-center">
              <p className="text-[13px] text-[#6B7280]">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
