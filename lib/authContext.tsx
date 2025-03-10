import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/router';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: any;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  // Simple session refresh function - no state tracking needed
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setSession(null);
        setUser(null);
        return;
      }
      
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (error) {
      console.error('Exception during session refresh:', error);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial session check and auth state change listener
  useEffect(() => {
    // Skip if already initialized to prevent multiple initializations
    if (initialized) return;
    
    const setupAuth = async () => {
      // Initial session check
      await refreshSession();
      
      // Auth state change listener - but completely ignore INITIAL_SESSION events
      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('Auth event:', event);
        
        if (event === 'INITIAL_SESSION') {
          // Do nothing for initial session to prevent loops
          return;
        }
        
        if (event === 'SIGNED_IN') {
          setSession(newSession);
          setUser(newSession?.user || null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          router.push('/login');
        }
      });
      
      setInitialized(true);
      return () => {
        data.subscription.unsubscribe();
      };
    };
    
    setupAuth();
  }, [router, initialized]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signOut, 
      refreshSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 