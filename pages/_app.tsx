import '../styles/globals.css';
import '../styles/theme.css';
import '../styles/mobile.css';
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
import { PersistQueryClientProvider, PersistedClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { offlineStorage } from '../lib/offlineStorage';
// PWA support
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CustomToast, toastStyles } from '../components/CustomToast';

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
  return <CustomToast position="top-center" />;
}

// Add styles for toast animations
const ToastStyles = () => {
  return <style jsx global>{toastStyles}</style>;
};

// Configure query client with offline support
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst'
    },
    mutations: {
      networkMode: 'offlineFirst',
      onError: (error) => {
        logger.error('Mutation error:', error);
      }
    }
  }
});

// Configure offline persistence
const persister = {
  async persistClient(client: PersistedClient) {
    try {
      await offlineStorage.set('SALARYCURSOR_QUERY_CACHE', JSON.stringify(client));
    } catch (error) {
      logger.error('Error persisting query client:', error);
    }
  },
  async restoreClient(): Promise<PersistedClient | undefined> {
    try {
      const data = await offlineStorage.get('SALARYCURSOR_QUERY_CACHE');
      return data ? JSON.parse(data) : undefined;
    } catch (error) {
      logger.error('Error restoring query client:', error);
      return undefined;
    }
  },
  async removeClient() {
    try {
      await offlineStorage.set('SALARYCURSOR_QUERY_CACHE', null);
    } catch (error) {
      logger.error('Error removing query client:', error);
    }
  }
};

const persistOptions = {
  key: 'SALARYCURSOR_QUERY_CACHE',
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  buster: process.env.BUILD_ID,
  retry: {
    maxRetries: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
  }
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful');
          })
          .catch((err) => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }

    // Handle network changes
    const handleNetworkChange = () => {
      if (!navigator.onLine) {
        console.log('App is offline');
        setIsOnline(false);
      } else {
        console.log('App is back online');
        setIsOnline(true);
      }
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

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
              <ToastStyles />
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