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
  const [authState, setAuthState] = useState<{
    user: any;
    session: Session | null;
    loading: boolean;
  }>({
    user: null,
    session: null,
    loading: true,
  });
  const router = useRouter();

  // Simplified refresh function that just gets the current session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      
      setAuthState(prev => ({
        ...prev,
        session: data.session,
        user: data.session?.user || null,
        loading: false,
      }));
    } catch (error) {
      console.error('Exception refreshing session:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        session: null,
        loading: false,
      });
      
      // Always redirect to login after sign out
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setAuthState({
            user: session?.user || null,
            session,
            loading: false,
          });
          
          // If we have a session and we're on the login page, redirect to schedule
          if (session && router.pathname === '/login') {
            router.push('/schedule');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    initializeAuth();
    
    // Set up Supabase auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth event:', event);
        
        if (!mounted) return;

        if (event === 'SIGNED_IN') {
          setAuthState({
            user: currentSession?.user || null,
            session: currentSession,
            loading: false,
          });
          
          // Always navigate to schedule page on sign in
          router.push('/schedule');
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
          
          // Navigate to login on sign out
          router.push('/login');
        } else if (event === 'TOKEN_REFRESHED') {
          setAuthState(prev => ({
            ...prev,
            session: currentSession,
            user: currentSession?.user || prev.user,
          }));
        }
      }
    );
    
    // Clean up
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ 
      user: authState.user, 
      session: authState.session, 
      loading: authState.loading, 
      signOut, 
      refreshSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 