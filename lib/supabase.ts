import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Verify environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  const errorMessage = `Missing Supabase environment variables: ${missingVars.join(', ')}`;
  logger.error(errorMessage);
  
  if (typeof window !== 'undefined') {
    console.error(errorMessage);
  } else {
    throw new Error(errorMessage);
  }
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth-token',
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          try {
            const storedValue = window.localStorage.getItem(key);
            logger.debug(`Storage: retrieving key ${key} - ${storedValue ? 'found' : 'not found'}`);
            return storedValue;
          } catch (error) {
            logger.error(`Error retrieving key ${key} from localStorage:`, error);
            return null;
          }
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          try {
            logger.debug(`Storage: setting key ${key}`);
            window.localStorage.setItem(key, value);
            
            // Set both token formats for compatibility
            if (key === 'supabase-auth-token') {
              try {
                const parsed = JSON.parse(value);
                const token = parsed?.access_token || parsed[0]?.access_token || parsed[0];
                if (token) {
                  window.localStorage.setItem('sb-access-token', token);
                  // Also set as a cookie for API routes
                  document.cookie = `sb-access-token=${token}; path=/; max-age=3600; SameSite=Strict`;
                }
              } catch (e) {
                logger.error('Failed to parse auth token for compatibility storage:', e);
              }
            }
          } catch (error) {
            logger.error(`Error setting key ${key} in localStorage:`, error);
          }
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          try {
            logger.debug(`Storage: removing key ${key}`);
            window.localStorage.removeItem(key);
            if (key === 'supabase-auth-token') {
              window.localStorage.removeItem('sb-access-token');
              // Remove the cookie as well
              document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            }
          } catch (error) {
            logger.error(`Error removing key ${key} from localStorage:`, error);
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

// Add event listeners for auth state changes
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    logger.info(`Auth event: ${event}`, { userId: session?.user?.id });
    
    // Update the auth token cookie on session changes
    if (session?.access_token) {
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Strict`;
    } else if (event === 'SIGNED_OUT') {
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  });
}

// Helper function to get current auth token for API requests with fallbacks
export const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }
  
  try {
    // First try to get token from Supabase session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.warn('Error getting session from Supabase:', error);
    }
    
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
    
    // If that fails, try localStorage directly (fallback)
    const localToken = window.localStorage.getItem('sb-access-token');
    if (localToken) {
      logger.info('Using fallback token from localStorage');
      return localToken;
    }
    
    // Try the full token storage
    const fullTokenStorage = window.localStorage.getItem('supabase-auth-token');
    if (fullTokenStorage) {
      try {
        const parsed = JSON.parse(fullTokenStorage);
        const token = parsed?.access_token || parsed[0]?.access_token || parsed[0];
        if (token) {
          logger.info('Using token from parsed full localStorage');
          return token;
        }
      } catch (e) {
        logger.error('Failed to parse full token storage:', e);
      }
    }
    
    logger.warn('No auth token found');
    return null;
  } catch (error) {
    logger.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) return false;
    
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      logger.warn('Error verifying authentication:', error);
      return false;
    }
    
    return !!data?.user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}; 