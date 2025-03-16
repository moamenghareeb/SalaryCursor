// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN || 'https://your-sentry-dsn-placeholder.ingest.sentry.io/12345',
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      // Additional replay configuration can go here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  environment: process.env.NODE_ENV,
  // Enable this to capture client-side errors and send them to Sentry
  enabled: process.env.NODE_ENV === 'production',
});
