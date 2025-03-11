import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';
import { captureAuthError } from '../lib/errorTracking';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const { user, session, loading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();

  // Handle authentication state changes
  useEffect(() => {
    if (authLoading) return;

    if (user && session) {
      console.log('User authenticated, redirecting to dashboard');
      // Use a slight delay to avoid race conditions
      const timer = setTimeout(() => {
        const returnUrl = router.query.returnUrl as string;
        window.location.href = returnUrl || '/salary';
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, session, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        setMessage('Login successful! Redirecting...');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      captureAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setMessage('Check your email for the password reset link');
    } catch (error: any) {
      setError(error.message);
      captureAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{isResetMode ? 'Reset Password' : 'Login'} | SalaryCursor</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {isResetMode ? 'Reset your password' : 'Sign in to your account'}
            </h2>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">{message}</h3>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={isResetMode ? handlePasswordReset : handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {!isResetMode && (
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-dark-bg ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </span>
                ) : null}
                {isResetMode ? 'Send reset instructions' : 'Sign in'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsResetMode(!isResetMode)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                {isResetMode ? 'Back to login' : 'Forgot your password?'}
              </button>
              
              {!isResetMode && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Don't have an account? </span>
                  <Link href="/signup" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 