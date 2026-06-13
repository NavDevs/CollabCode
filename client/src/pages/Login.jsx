import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { Navigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

export default function Login() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  
  // If already signed in, redirect to dashboard
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

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
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrandMark size={32} />
            <h1 className="gtext text-[26px] font-bold tracking-tight">CollabCode</h1>
          </div>
        </div>

        <div className="flex justify-center">
          <SignIn 
            appearance={{ baseTheme: dark }} 
            routing="path" 
            path="/login" 
            signUpUrl="/register" 
            fallbackRedirectUrl="/dashboard"
            transferable={true}
          />
        </div>
      </div>
    </div>
  );
}
