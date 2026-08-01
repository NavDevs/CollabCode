import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import toast from 'react-hot-toast';

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const [searchParams] = useSearchParams();
  
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

  const handleGoogleLogin = () => {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
      
      {/* ─── LEFT SIDE: LOGIN FORM ─── */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 lg:p-20 relative z-10">
        
        <div className="w-full max-w-[420px] anim-fade-up flex flex-col items-center">
          {/* Logo */}
          <div className="mb-24 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 mb-10 shadow-lg">
              <BrandMark size={36} />
            </div>
            <h1 className="text-[42px] mt-6 leading-tight font-bold tracking-tight text-white mb-6">
              Welcome back
            </h1>
            <p className="text-[16px] mt-2 text-gray-400 leading-relaxed max-w-[320px]">
              Sign in to your CollabCode account to continue collaborating.
            </p>
          </div>

          {/* Login Action */}
          <div className="flex flex-col gap-10 w-full max-w-[340px]">
            <button
              onClick={handleGoogleLogin}
              className="group relative flex w-full items-center justify-center gap-4 rounded-2xl bg-white text-black font-semibold py-4 px-4 transition-all duration-300 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-xl"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" className="transition-transform group-hover:scale-110 duration-300">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[16px]">Continue with Google</span>
            </button>
            
            {/* Divider */}
            <div className="flex items-center gap-5 mt-2 mb-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Secure</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
            </div>

            <p className="text-[13px] text-gray-500 text-center px-4 leading-relaxed">
              By clicking continue, you agree to our <br/> Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer brand mark for mobile only */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center lg:hidden opacity-30">
          <BrandMark size={24} />
        </div>
      </div>

      {/* ─── RIGHT SIDE: VISUAL ─── */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-[#0A0A0E] border-l border-white/5">
        {/* The beautiful generated background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] ease-linear hover:scale-110"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        ></div>
        
        {/* Subtle overlay gradient to blend the edges perfectly */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] to-transparent opacity-80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60"></div>
        
        {/* Abstract floating glass panel for depth */}
        <div className="absolute bottom-12 right-12 max-w-[400px] p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="space-y-3">
            <div className="w-3/4 h-3 rounded bg-white/20"></div>
            <div className="w-full h-3 rounded bg-white/10"></div>
            <div className="w-5/6 h-3 rounded bg-white/10"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
