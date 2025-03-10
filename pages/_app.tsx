import '../styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider } from '../lib/themeContext';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../lib/themeContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getUserFriendlyErrorMessage } from '../lib/errorHandler';

// Simple error boundary component since react-error-boundary might not be installed
interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error:', { error, errorInfo });
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <this.props.FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

// Fallback UI when components crash
function ErrorFallback({error, resetErrorBoundary}: {error: Error, resetErrorBoundary: () => void}) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'} my-4`}>
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="mb-4">{getUserFriendlyErrorMessage(error, error.message)}</p>
      <button
        onClick={resetErrorBoundary}
        className={`px-4 py-2 rounded ${isDarkMode ? 'bg-red-800 text-white hover:bg-red-700' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
      >
        Try again
      </button>
    </div>
  );
}

function ToastWrapper() {
  const { isDarkMode } = useTheme();
  
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isDarkMode ? '#1e1e1e' : '#fff',
          color: isDarkMode ? '#fff' : '#1d1d1f',
          border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e5e5e5'}`,
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: 'white',
          },
        },
      }}
    />
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  const [offlineMode, setOfflineMode] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Application is online');
      setOfflineMode(false);
    };
    
    const handleOffline = () => {
      logger.warn('Application is offline');
      setOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial status
    setOfflineMode(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up axios interceptors for global auth token handling
  useEffect(() => {
    // Request interceptor to add auth token to all API requests
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        // Only intercept requests to our API routes
        if (config.url?.startsWith('/api/') || config.url?.includes('vercel.app/api/')) {
          try {
            // Get current session to include token in requests
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            
            // Set auth header if token exists
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              logger.debug('Added auth token to request:', config.url);
            } else {
              // Try to get token from localStorage as fallback
              const localToken = localStorage.getItem('sb-access-token');
              if (localToken) {
                config.headers.Authorization = `Bearer ${localToken}`;
                logger.debug('Added fallback token to request:', config.url);
              } else {
                logger.warn('No auth token available for request:', config.url);
              }
            }
          } catch (error) {
            logger.error('Error setting auth header:', error);
          }
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor to handle auth errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        // If received 401, check if we can refresh token
        if (error.response?.status === 401) {
          try {
            logger.info('401 error, refreshing session...');
            const { data } = await supabase.auth.refreshSession();
            if (data.session) {
              logger.info('Session refreshed, retrying request');
              // Retry the original request with new token
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            logger.error('Error refreshing session:', refreshError);
          }
        }
        
        // Log all API errors
        if (axios.isAxiosError(error)) {
          logger.error(`API Error: ${error.response?.status || 'Network Error'}`, { 
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data
          });
        }
        
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);
  
  // Offline mode banner
  const OfflineBanner = offlineMode ? (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center z-50">
      You are currently offline. Some features may be unavailable.
    </div>
  ) : null;
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <ThemeProvider>
          {OfflineBanner}
          <ToastWrapper />
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp; 