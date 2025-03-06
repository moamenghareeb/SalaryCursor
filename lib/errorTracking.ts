type ErrorLevel = 'info' | 'warn' | 'error';

interface ErrorLog {
  message: string;
  timestamp: string;
  level: ErrorLevel;
  metadata?: any;
}

export function initErrorTracking() {
  // Initialize any required error tracking setup
  console.log('Error tracking initialized');
}

export function captureException(error: Error) {
  const errorLog: ErrorLog = {
    message: error.message,
    timestamp: new Date().toISOString(),
    level: 'error',
    metadata: {
      stack: error.stack,
      name: error.name
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error captured:', errorLog);
  }

  // In production, you could send this to your logging service
  // or store in database
}

export function captureMessage(message: string, level: ErrorLevel = 'info') {
  const log: ErrorLog = {
    message,
    timestamp: new Date().toISOString(),
    level
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Message captured:', log);
  }

  // In production, you could send this to your logging service
  // or store in database
} 