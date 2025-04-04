import '../styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import { AuthProvider } from '../lib/authContext';
import { ThemeProvider, useTheme } from '../lib/themeContext';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getUserFriendlyErrorMessage } from '../lib/errorHandler';
// React Query imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getPersistedOptions } from '../lib/queryPersistence';
// PWA support
import Head from 'next/head';
import { registerServiceWorker } from '../public/serviceWorkerRegistration';
import { loadPwaInstallScript } from '../lib/pwaUtils';

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
  const [queryClient] = useState(() => new QueryClient());
  const [isOnline, setIsOnline] = useState(true);
  const [persistOptions, setPersistOptions] = useState<any>(null);

  useEffect(() => {
    // Get persisted options after component mounts (client-side only)
    const options = getPersistedOptions();
    setPersistOptions(options);
    
    // Register service worker for PWA functionality
    registerServiceWorker();
    // Load PWA install prompt script
    loadPwaInstallScript();
  }, []);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOnline = () => {
    setIsOnline(true);
  };

  const handleOffline = () => {
    setIsOnline(false);
  };

  // Show loading state until we have persisted options
  if (!persistOptions) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        {/* PWA head metadata */}
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="theme-color" content="#0066cc" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="SalaryCursor" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        </Head>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              {!isOnline && (
                <div className="bg-yellow-500 text-white px-4 py-2 text-center">
                  You are currently offline. Some features may be limited.
                </div>
              )}
              <Component {...pageProps} />
              <ToastWrapper />
              {/* PWA install prompt - will show if app can be installed */}
              <div id="pwa-install-prompt" className="hidden fixed bottom-4 left-0 right-0 mx-auto w-5/6 max-w-sm bg-white dark:bg-dark-surface p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Install App</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Install SalaryCursor for offline use</p>
                  </div>
                  <button id="pwa-install-button" className="px-3 py-1 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-full text-sm font-medium">
                    Install
                  </button>
                </div>
              </div>
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools />
      </PersistQueryClientProvider>
    </QueryClientProvider>
  );
}

export default MyApp; 