import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading, refreshSession } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If we're still loading the auth state, wait
        if (loading) return;

        console.log('ProtectedRoute: Checking auth state', {
          hasUser: !!user,
          hasSession: !!session,
          loading
        });

        // If no user or session, try to refresh
        if (!user || !session) {
          await refreshSession();
          
          // Get the latest session state
          const { data } = await supabase.auth.getSession();
          
          if (!data.session) {
            console.log('ProtectedRoute: No session found after refresh, redirecting to login');
            router.push('/login');
            return;
          }
        }
      } catch (error) {
        console.error('ProtectedRoute: Auth check error:', error);
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [user, session, loading, router, refreshSession]);

  // Show loading state while checking
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If we have a user and session, render the protected content
  return user && session ? <>{children}</> : null;
};

export default ProtectedRoute; 