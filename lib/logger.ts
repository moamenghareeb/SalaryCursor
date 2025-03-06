type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private logStore: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  private persistLog(logEntry: LogEntry) {
    // Store in memory for development
    this.logStore.push(logEntry);

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      const color = {
        info: '\x1b[36m', // cyan
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m' // red
      }[logEntry.level];

      console.log(
        `${color}[${logEntry.level.toUpperCase()}]\x1b[0m`,
        `[${logEntry.timestamp}]`,
        logEntry.message,
        logEntry.metadata || ''
      );
    }

    // In production, you could:
    // 1. Send to a logging service
    // 2. Write to a file
    // 3. Store in database
  }

  info(message: string, metadata?: Record<string, any>) {
    const logEntry = this.formatLog('info', message, metadata);
    this.persistLog(logEntry);
  }

  warn(message: string, metadata?: Record<string, any>) {
    const logEntry = this.formatLog('warn', message, metadata);
    this.persistLog(logEntry);
  }

  error(message: string, metadata?: Record<string, any>) {
    const logEntry = this.formatLog('error', message, metadata);
    this.persistLog(logEntry);
  }

  // For development/debugging
  getLogs(): LogEntry[] {
    return this.logStore;
  }

  // Clear logs (useful for testing/development)
  clearLogs() {
    this.logStore = [];
  }
}

const logger = Logger.getInstance();
export default logger; 