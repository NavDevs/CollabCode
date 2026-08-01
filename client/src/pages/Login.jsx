import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ModernLoginSignup from '../components/ui/ModernLoginSignup';

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

  return <ModernLoginSignup onGoogleLogin={handleGoogleLogin} />;
}
