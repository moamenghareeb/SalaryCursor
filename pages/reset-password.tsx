import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have the access token from the reset password email
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (!hashParams.get('access_token')) {
      setError('Invalid or expired reset link');
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage('Password has been reset successfully');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'An error occurred while resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - SalaryCursor</title>
        <meta name="description" content="Reset your SalaryCursor account password" />
      </Head>
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-apple-gray-light">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-apple-gray-dark mb-2">SalaryCursor</h1>
            <p className="text-apple-gray text-sm">Reset your password</p>
          </div>
          
          <div className="bg-white rounded-apple shadow-apple-card p-8 mb-6">
            <h2 className="text-2xl font-medium text-apple-gray-dark mb-6">Create New Password</h2>
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                {message}
              </div>
            )}
            
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  placeholder="Enter your new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  placeholder="Confirm your new password"
                />
              </div>
              
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
                    Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </div>
          
          <div className="text-center text-apple-gray text-sm">
            <p>
              Remember your password?{' '}
              <Link href="/login" className="text-apple-blue hover:text-apple-blue-hover font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 