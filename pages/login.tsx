import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';
import { captureAuthError } from '../lib/errorTracking';
import { useAuth } from '../lib/authContext';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { refreshSession } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoginSuccess(false);

    try {
      console.log('Attempting login with:', { email }); // Don't log password
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        captureAuthError(error, { email, attemptTime: new Date().toISOString() });
        throw error;
      }
      
      if (!data.session) {
        throw new Error('No session returned after login');
      }

      console.log('Login successful, session:', {
        userId: data.session.user.id,
        expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
      });
      
      // Ensure our auth context is updated with the new session
      await refreshSession();
      
      // Show success message
      setMessage('Login successful! Redirecting to dashboard...');
      setLoginSuccess(true);
      
      // Clear any existing history
      if (window.history.length > 1) {
        window.history.pushState(null, '', '/login');
      }
      
      // Use direct browser navigation after a delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error: any) {
      console.error('Login error details:', error);
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setMessage('Password reset link has been sent to your email');
      setIsResetMode(false);
    } catch (error: any) {
      setError(error.message || 'An error occurred while sending reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in - SalaryCursor</title>
        <meta name="description" content="Sign in to your SalaryCursor account" />
      </Head>
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-apple-gray-light">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-apple-gray-dark mb-2">SalaryCursor</h1>
            <p className="text-apple-gray text-sm">Manage salary and leave in one place</p>
          </div>
          
          <div className="bg-white rounded-apple shadow-apple-card p-8 mb-6">
            <h2 className="text-2xl font-medium text-apple-gray-dark mb-6">
              {isResetMode ? 'Reset Password' : 'Sign In'}
            </h2>
            
            {message && (
              <div 
                className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm"
                dangerouslySetInnerHTML={{ __html: message }}
              />
            )}
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={isResetMode ? handleResetPassword : handleLogin}>
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                />
              </div>
              
              {!isResetMode && (
                <div className="mb-5">
                  <div className="flex justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-apple-gray-dark">
                      Password
                    </label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-apple-blue hover:bg-apple-blue-hover text-white py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-70"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isResetMode ? 'Sending Reset Link...' : 'Signing In...'}
                  </span>
                ) : (
                  isResetMode ? 'Send Reset Link' : 'Sign In'
                )}
              </button>
              
              {/* Manual dashboard link that appears after successful login */}
              {loginSuccess && (
                <div className="mt-4">
                  <a 
                    href="/dashboard" 
                    className="w-full block text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors duration-200"
                  >
                    Go to Dashboard
                  </a>
                  <p className="text-xs text-center mt-2 text-gray-500">
                    Click this button if you're not automatically redirected
                  </p>
                </div>
              )}
            </form>
            
            <div className="mt-5 text-center">
              <button
                onClick={() => {
                  setIsResetMode(!isResetMode);
                  setError(null);
                  setMessage(null);
                }}
                className="text-apple-blue hover:text-apple-blue-hover text-sm font-medium"
              >
                {isResetMode ? 'Back to Sign In' : 'Forgot Password?'}
              </button>
            </div>
          </div>
          
          <div className="text-center text-apple-gray text-sm">
            <p>
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-apple-blue hover:text-apple-blue-hover font-medium">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Connection test component - remove after debugging */}
      <div className="fixed bottom-2 right-2 bg-white p-2 rounded shadow text-xs opacity-70 hover:opacity-100">
        <button 
          onClick={async () => {
            try {
              const { data, error } = await supabase.auth.getSession();
              alert(`Supabase connection test: ${error ? 'Error: ' + error.message : 'Connected! Session: ' + (data.session ? 'Active' : 'None')}`);
              
              // Debug auth state in more detail
              if (data.session) {
                alert(`User ID: ${data.session.user.id}\nExpires: ${new Date(data.session.expires_at! * 1000).toLocaleString()}`);
                
                // Test dashboard access
                try {
                  const dashboardResponse = await fetch('/api/dashboard/summary');
                  const dashboardJson = await dashboardResponse.json();
                  alert(`Dashboard API: ${dashboardResponse.ok ? 'Success' : 'Failed'}\n${JSON.stringify(dashboardJson).slice(0, 100)}...`);
                } catch (err) {
                  alert(`Dashboard API Error: ${err}`);
                }
              }
            } catch (err) {
              alert(`Supabase connection error: ${err}`);
            }
          }}
          className="text-blue-500 hover:underline"
        >
          Test Auth State
        </button>
      </div>
    </>
  );
} 