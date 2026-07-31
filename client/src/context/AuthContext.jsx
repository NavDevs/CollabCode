import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [dbUser, setDbUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cc_auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync user with backend whenever token changes
  useEffect(() => {
    let isMounted = true;
    
    async function syncUser() {
      if (!token) {
        if (isMounted) {
          setDbUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          setDbUser(data.user);
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to sync DB user', e);
        if (isMounted) {
          // If token is invalid/expired, clear it
          if (e.response && e.response.status === 401) {
            localStorage.removeItem('cc_auth_token');
            setToken(null);
          }
          setDbUser(null);
          setLoading(false);
        }
      }
    }
    
    syncUser();
    
    return () => { isMounted = false; };
  }, [token]);

  const loginWithToken = useCallback((newToken) => {
    localStorage.setItem('cc_auth_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cc_auth_token');
    setToken(null);
    setDbUser(null);
    // Force a reload to clear any residual state
    window.location.href = '/login';
  }, []);

  // Provide a getToken function that mimics Clerk for existing code compatibility
  const getToken = useCallback(async () => token, [token]);

  return (
    <AuthContext.Provider
      value={{ 
        user: dbUser, 
        setUser: setDbUser, 
        token, 
        loading, 
        logout, 
        loginWithToken,
        isAuthenticated: !!dbUser,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
