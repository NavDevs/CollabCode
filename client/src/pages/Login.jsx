import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import toast from 'react-hot-toast';

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const [searchParams] = useSearchParams();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  useEffect(() => {
    const error = searchParams.get('error');
    const details = searchParams.get('details');
    
    if (error) {
      let errorMsg = 'Authentication failed. Please try again.';
      if (details) errorMsg += ` (${details})`;
      toast.error(errorMsg, { duration: 5000 });
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  // Track mouse for subtle parallax effect
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  const handleGoogleLogin = () => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030305] text-white font-sans selection:bg-indigo-500/30"
    >
      {/* ─── ULTRA PREMIUM BACKGROUND ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Core dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#030305] via-[#080812] to-[#050308]"></div>
        
        {/* Animated Aurora / Nebula Effects */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen opacity-40 filter blur-[120px] animate-[spin_30s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 90deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3), rgba(236,72,153,0.3), rgba(99,102,241,0.3))',
            transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`
          }}
        />
        <div 
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-30 filter blur-[100px] animate-[spin_40s_linear_infinite_reverse]"
          style={{
            background: 'conic-gradient(from 180deg, rgba(56,189,248,0.3), rgba(99,102,241,0.3), rgba(45,212,191,0.3), rgba(56,189,248,0.3))',
            transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)`
          }}
        />

        {/* Ambient Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(1000px) rotateX(60deg) scale(2.5) translateY(-20%)',
            transformOrigin: 'top center'
          }}
        />
      </div>

      {/* Floating UI Elements for "Collaboration" context */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block overflow-hidden" style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)` }}>
        <div className="absolute top-[20%] left-[15%] w-48 h-32 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md shadow-2xl flex flex-col p-4 gap-2 opacity-60 transform -rotate-6">
          <div className="w-8 h-2 rounded-full bg-indigo-500/50"></div>
          <div className="w-24 h-2 rounded-full bg-white/10"></div>
          <div className="w-16 h-2 rounded-full bg-white/10"></div>
        </div>
        <div className="absolute bottom-[25%] right-[12%] w-64 h-40 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md shadow-2xl flex flex-col p-4 gap-3 opacity-50 transform rotate-3">
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-pink-500/40"></div>
            <div className="w-20 h-2 rounded-full bg-white/20"></div>
          </div>
          <div className="w-full h-20 rounded-lg bg-white/[0.03] border border-white/[0.02]"></div>
        </div>
      </div>

      {/* ─── MAIN LOGIN CARD ─── */}
      <div 
        className="relative z-10 w-full max-w-[420px] px-6 anim-fade-up"
        style={{ transform: `perspective(1000px) rotateX(${mousePos.y * 5}deg) rotateY(${mousePos.x * -5}deg)` }}
      >
        <div className="relative group">
          {/* Glowing border effect behind the card */}
          <div className="absolute -inset-0.5 rounded-[32px] bg-gradient-to-b from-indigo-500/40 to-purple-500/10 opacity-50 blur-lg group-hover:opacity-75 transition duration-1000"></div>
          
          {/* The Card */}
          <div className="relative rounded-[30px] bg-[#0A0A0E]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.8)] p-10 flex flex-col">
            
            {/* Top edge highlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-[30px]"></div>

            {/* Header / Logo */}
            <div className="mb-12 flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse"></div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-md">
                  <BrandMark size={42} />
                </div>
              </div>
              
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 mb-3">
                CollabCode
              </h1>
              <p className="text-sm text-gray-400 text-center max-w-[260px] leading-relaxed">
                Enter a new era of seamless collaborative coding.
              </p>
            </div>

            {/* Auth Button */}
            <button
              onClick={handleGoogleLogin}
              className="relative flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-white text-gray-900 font-semibold text-[15px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] active:scale-[0.98] overflow-hidden"
            >
              {/* Button shimmer effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-100/50 to-transparent hover:animate-[shimmer_1.5s_infinite]"></div>
              
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="relative z-10 tracking-wide">Continue with Google</span>
            </button>
            
            {/* Footer Text */}
            <p className="mt-6 text-center text-[13px] text-gray-500 font-medium tracking-wide">
              Secure, fast, and frictionless.
            </p>
          </div>
        </div>
      </div>
      
      {/* Global CSS for custom animations used in this page */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
