import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
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
              <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                {message}
              </div>
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
    </>
  );
} 