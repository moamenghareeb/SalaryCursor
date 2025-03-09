import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a session from Supabase directly
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;
        
        console.log('ProtectedRoute: Auth check -', {
          contextUser: !!user,
          supabaseSession: hasSession,
          loading
        });
        
        if (hasSession) {
          setIsAuthenticated(true);
        } else if (!loading && !user) {
          console.log('ProtectedRoute: No authenticated user, redirecting to login');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (!user) {
          router.push('/login');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Either show children if authenticated or null
  return <>{(user || isAuthenticated) ? children : null}</>;
};

export default ProtectedRoute; 