import { useRouter } from 'next/router';
import { useAuth } from '../lib/authContext';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Skip check if still loading
    if (loading) return;

    // If we have both user and session, mark as authorized
    if (user && session) {
      setIsAuthorized(true);
      return;
    }

    // If auth check is complete and we don't have user/session, redirect to login
    const redirectToLogin = () => {
      const currentPath = router.pathname;
      router.push({
        pathname: '/login',
        query: { returnUrl: currentPath }
      });
    };

    // Use a small delay to prevent immediate redirect during initial load
    const redirectTimer = setTimeout(redirectToLogin, 100);
    return () => clearTimeout(redirectTimer);
  }, [user, session, loading, router]);

  // Show loading state while checking auth or while auth context is loading
  if (loading || !isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If authorized, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute; 