import React from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with properly formatted extra data
    const extraData: Record<string, string> = {
      componentStack: errorInfo.componentStack || 'No stack trace available',
    };
    Sentry.captureException(error, { extra: extraData });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-lg w-full space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-apple-blue hover:bg-apple-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-apple-blue"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-left">
                <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
