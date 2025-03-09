import * as Sentry from "@sentry/nextjs"

export function initErrorTracking() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV !== 'production',
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production'
  })
}

export function captureException(error: Error) {
  console.error('Error captured:', error);
  Sentry.captureException(error)
}

export function captureMessage(message: string) {
  console.log('Message captured:', message);
  Sentry.captureMessage(message)
}

export function captureAuthError(error: Error, context?: Record<string, any>) {
  console.error('Auth error:', error, context);
  Sentry.captureException(error, {
    tags: { type: 'auth_error' },
    extra: context
  });
} 