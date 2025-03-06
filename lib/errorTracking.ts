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
  Sentry.captureException(error)
}

export function captureMessage(message: string) {
  Sentry.captureMessage(message)
} 