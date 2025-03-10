import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider } from '../lib/themeContext';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../lib/themeContext';
import { useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

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
              console.log('Added auth token to request:', config.url);
            } else {
              console.warn('No auth token available for request:', config.url);
            }
          } catch (error) {
            console.error('Error setting auth header:', error);
          }
        }
        return config;
      },
      (error) => {
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
            console.log('401 error, refreshing session...');
            const { data } = await supabase.auth.refreshSession();
            if (data.session) {
              console.log('Session refreshed, retrying request');
              // Retry the original request with new token
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
          }
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
  
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastWrapper />
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default MyApp; 