import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Head from 'next/head';

export default function SignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('Junior DCS Engineer');
  const [error, setError] = useState<string | null>(null);

  // Define available positions
  const positionOptions = [
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (parseInt(employeeId) < 1 || parseInt(employeeId) > 700) {
      setError('Employee ID must be between 1 and 700');
      setLoading(false);
      return;
    }

    try {
      // Check if employee ID already exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('employee_id', parseInt(employeeId))
        .single();

      if (existingEmployee) {
        setError('Employee ID already exists');
        setLoading(false);
        return;
      }

      // Generate email from employee ID for auth
      const email = `employee${employeeId}@salarycursor.com`;

      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        // Add user to employees table
        const { error: insertError } = await supabase.from('employees').insert({
          id: data.user.id,
          employee_id: parseInt(employeeId),
          name,
          email,
          position,
          years_of_service: 0, // Default to 0
        });

        if (insertError) throw insertError;

        alert('Sign up successful! Check your email for verification link.');
        router.push('/auth/login');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account - SalaryCursor</title>
        <meta name="description" content="Create your SalaryCursor account" />
      </Head>
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-apple-gray-light">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-apple-gray-dark mb-2">SalaryCursor</h1>
            <p className="text-apple-gray text-sm">Create your account</p>
          </div>
          
          <div className="bg-white rounded-apple shadow-apple-card p-8 mb-6">
            <h2 className="text-2xl font-medium text-apple-gray-dark mb-6">Sign Up</h2>
            
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Employee ID
                </label>
                <input
                  type="number"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  min="1"
                  max="700"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  placeholder="Enter your employee ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                >
                  {positionOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-apple-gray-dark mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none transition-colors duration-200"
                  placeholder="Create a secure password"
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
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>
          
          <div className="text-center text-apple-gray text-sm">
            <p>
              Already have an account?{' '}
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