import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user already logged in on app start
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const currentSession = await authService.getSession();
      if (currentSession) {
        setSession(currentSession);
      }
    } catch (error) {
      console.error('Check session error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username, password) => {
    try {
      const sessionData = await authService.login(username, password);
      setSession(sessionData);
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error.message || 'Username atau password salah' 
      };
    }
  };

  const signOut = async () => {
    try {
      await authService.logout();
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within AuthProvider');
  }
  return context;
};