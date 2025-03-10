/**
 * Application logger
 * Provides consistent logging throughout the application
 * In production, this would send logs to a proper logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
  userId?: string;
  path?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 100;
  private isProduction = process.env.NODE_ENV === 'production';

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, details?: any, userId?: string, path?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      userId,
      path: path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    };

    // Add to in-memory logs (limited size)
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    // Format for console
    const formattedMessage = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Output to console based on level
    switch (level) {
      case 'debug':
        !this.isProduction && console.debug(formattedMessage, details || '');
        break;
      case 'info':
        console.info(formattedMessage, details || '');
        break;
      case 'warn':
        console.warn(formattedMessage, details || '');
        break;
      case 'error':
        console.error(formattedMessage, details || '');
        break;
    }

    // In production, would send to a proper logging service
    if (this.isProduction && level === 'error') {
      // TODO: Send to error reporting service
      // sendToErrorReporting(entry);
    }
  }

  public debug(message: string, details?: any, userId?: string, path?: string) {
    this.log('debug', message, details, userId, path);
  }

  public info(message: string, details?: any, userId?: string, path?: string) {
    this.log('info', message, details, userId, path);
  }

  public warn(message: string, details?: any, userId?: string, path?: string) {
    this.log('warn', message, details, userId, path);
  }

  public error(message: string, details?: any, userId?: string, path?: string) {
    this.log('error', message, details, userId, path);
  }

  public getRecentLogs(count: number = 10, level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level).slice(0, count);
    }
    return this.logs.slice(0, count);
  }
}

// Export a singleton instance
export const logger = Logger.getInstance(); 