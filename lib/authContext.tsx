import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
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
  const refreshInProgress = useRef(false);

  // Function to refresh the session state
  const refreshSession = async () => {
    try {
      // Prevent concurrent refreshes
      if (refreshInProgress.current) {
        console.log('Session refresh already in progress, skipping');
        return;
      }

      refreshInProgress.current = true;
      setLoading(true);
      
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      console.log('Auth context refreshSession:', {
        hasSession: !!data.session,
        userId: data.session?.user?.id
      });
      
      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (error) {
      console.error('Error refreshing session:', error);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
      refreshInProgress.current = false;
    }
  };

  useEffect(() => {
    // Initial session check
    refreshSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', {
          event,
          userId: currentSession?.user?.id
        });

        // Only update state if the event is not INITIAL_SESSION to prevent loops
        if (event !== 'INITIAL_SESSION') {
          setSession(currentSession);
          setUser(currentSession?.user || null);

          // Special handling for sign in events
          if (event === 'SIGNED_IN' && currentSession) {
            // Force a small delay to ensure cookies are set
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshSession();
          }

          // Handle sign out
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            router.push('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: async () => {
      try {
        setLoading(true);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        router.push('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      } finally {
        setLoading(false);
      }
    }, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}; 