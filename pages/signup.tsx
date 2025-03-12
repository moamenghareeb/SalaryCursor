import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';
import Link from 'next/link';
import { captureAuthError } from '../lib/errorTracking';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import toast from 'react-hot-toast';

// Define positions as a constant array
const POSITIONS = [
  'Junior DCS Engineer', 
  'DCS Engineer', 
  'Senior DCS Engineer', 
  'Shift Engineer', 
  'Shift Superintendent', 
  'Operator', 
  'Operator I', 
  'Senior Operator', 
  'Field Supervisor'
];

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const { isDarkMode } = useTheme();

  // Redirect if already logged in
  useEffect(() => {
    if (user && session) {
      router.push('/dashboard');
    }
  }, [user, session, router]);

  const validateInputs = () => {
    // Validate name
    if (!name || name.trim().length < 2) {
      setError('Please enter a valid full name');
      return false;
    }

    // Validate employee ID (assuming it should be alphanumeric and at least 4 characters)
    const employeeIdRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!employeeIdRegex.test(employeeId)) {
      setError('Employee ID must be 4-20 alphanumeric characters');
      return false;
    }

    // Validate position
    if (!POSITIONS.includes(position)) {
      setError('Please select a valid position');
      return false;
    }

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate inputs
    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      // Create user with a company-specific email format
      const email = `${employeeId}@company.local`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            employee_id: employeeId,
            position
          }
        }
      });

      if (error) throw error;
      
      // If signup is successful
      if (data.user) {
        // Store additional employee information
        const { error: profileError } = await supabase
          .from('employees')
          .insert({
            name,
            employee_id: employeeId,
            position,
            email: email,
            created_at: new Date()
          });

        if (profileError) {
          console.error('Error creating employee profile:', profileError);
          toast.error('Failed to create employee profile');
        } else {
          toast.success('Account created successfully');
          // Redirect to login
          router.push('/login');
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Signup failed. Please try again.');
      captureAuthError(error);
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | SalaryCursor</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your account
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

          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm -space-y-px">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Employee ID Input */}
              <div>
                <label htmlFor="employee-id" className="sr-only">
                  Employee ID
                </label>
                <input
                  id="employee-id"
                  name="employeeId"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>

              {/* Position Dropdown */}
              <div>
                <label htmlFor="position" className="sr-only">
                  Position
                </label>
                <select
                  id="position"
                  name="position"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="">Select Position</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-dark-border placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-dark-text-primary dark:bg-dark-surface rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
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
                Sign Up
              </button>
            </div>

            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">
                  Log in
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 