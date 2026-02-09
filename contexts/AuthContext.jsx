import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const signIn = (username, password) => {
    if (username === 'admin' && password === 'admin') {
      // Dummy user data - will be replaced with Supabase data
      const userData = {
        id: '1',
        username: 'admin',
        role: 'admin',
        full_name: 'Administrator', // TODO: From Supabase users table
        last_login: new Date().toISOString(), // TODO: Update in Supabase on login
        created_at: '2025-01-15T08:30:00Z', // TODO: From Supabase
      };
      
      setSession(userData);
      
      // TODO: Supabase Implementation
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email: username,
      //   password: password,
      // });
      // if (!error) {
      //   const { data: userData } = await supabase
      //     .from('users')
      //     .select('*')
      //     .eq('id', data.user.id)
      //     .single();
      //   
      //   // Update last_login
      //   await supabase
      //     .from('users')
      //     .update({ last_login: new Date().toISOString() })
      //     .eq('id', data.user.id);
      //   
      //   setSession(userData);
      // }
      
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  const signOut = () => {
    setSession(null);
    
    // TODO: Supabase sign out
    // await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
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