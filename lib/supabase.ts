import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth-token',
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          const storedValue = window.localStorage.getItem(key);
          console.log(`Storage: retrieving key ${key}`, storedValue ? 'found' : 'not found');
          return storedValue;
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          console.log(`Storage: setting key ${key}`);
          window.localStorage.setItem(key, value);
          // Also set the shorter version for compatibility
          if (key === 'supabase-auth-token') {
            try {
              const parsed = JSON.parse(value);
              const token = parsed[0]?.token || parsed[0];
              if (token) {
                window.localStorage.setItem('sb-access-token', token);
              }
            } catch (e) {
              console.error('Failed to parse auth token for compatibility storage', e);
            }
          }
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          console.log(`Storage: removing key ${key}`);
          window.localStorage.removeItem(key);
          // Also remove the shorter version for compatibility
          if (key === 'supabase-auth-token') {
            window.localStorage.removeItem('sb-access-token');
          }
        }
      },
    },
  },
  global: {
    headers: {
      'x-client-info': 'salarycursor',
    },
  },
});

// Helper function to get current auth token for API requests
export const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }
  
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}; 