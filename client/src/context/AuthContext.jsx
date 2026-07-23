import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();
  const [dbUser, setDbUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncAttempted, setSyncAttempted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function syncUser() {
      if (isAuthLoaded && isUserLoaded) {
        if (isSignedIn && clerkUser) {
          if (isMounted) setLoading(true);
          try {
            const t = await getToken();
            if (isMounted) setToken(t);
            const { data } = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${t}` }
            });
            if (isMounted) setDbUser(data.user);
          } catch (e) {
            console.error('Failed to sync DB user', e);
            // Still allow the app to load even if sync fails
            if (isMounted && clerkUser) {
              setDbUser({
                _id: clerkUser.id,
                clerkId: clerkUser.id,
                username: clerkUser.username || clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
                email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                avatarColor: '#6366F1',
              });
            }
          } finally {
            if (isMounted) {
              setLoading(false);
              setSyncAttempted(true);
            }
          }
        } else if (!isSignedIn) {
          if (isMounted) {
            setDbUser(null);
            setToken(null);
            setLoading(false);
            setSyncAttempted(true);
          }
        }
      }
    }
    syncUser();
    return () => { isMounted = false; };
  }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser?.id, getToken]);

  const logout = useCallback(async () => {
    await signOut();
    setDbUser(null);
    setToken(null);
  }, [signOut]);

  const login = () => {};
  const register = () => {};

  return (
    <AuthContext.Provider
      value={{ 
        user: dbUser, 
        setUser: setDbUser, 
        token, 
        loading, 
        login, 
        register, 
        logout, 
        isAuthenticated: !!dbUser,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
