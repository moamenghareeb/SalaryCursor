import React from 'react';
import { supabase } from '../../lib/supabase';

interface AuthHelpProps {
  onDismiss: () => void;
}

const AuthHelp: React.FC<AuthHelpProps> = ({ onDismiss }) => {
  // Function to handle sign-in with test user
  const handleTestSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (error) {
        console.error('Test login error:', error);
        alert(`Test login failed: ${error.message}`);
      } else {
        alert('Test login successful! Please refresh the page.');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error during test login:', err);
      alert(`Error: ${err.message}`);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Fix Authentication Issues
        </h2>
        
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            The authentication system seems to be having issues. Here are some ways to fix it:
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Method 1: Refresh the token</h3>
            <p className="text-sm">
              Use the &quot;Refresh Auth&quot; button in the debugger to attempt to get a new authentication token.
            </p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Method 2: Sign in again</h3>
            <p className="text-sm">
              Sign out and sign back in to get a fresh authentication token.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Method 3: Clear browser storage</h3>
            <p className="text-sm">
              Try clearing your browser&apos;s local storage and cookies, then refresh the page.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => {
                  localStorage.clear();
                  alert('Local storage cleared. Please refresh the page.');
                }}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Clear Storage
              </button>
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Method 4: Test login (Development only)</h3>
            <p className="text-sm">
              In development mode only, you can use a test login to quickly authenticate.
            </p>
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleTestSignIn}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                Test Login
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthHelp; 