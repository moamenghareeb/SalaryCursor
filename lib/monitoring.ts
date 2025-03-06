import logger from './logger';

class MonitoringService {
  static initialize() {
    // Initialize monitoring service
    logger.info('Monitoring service initialized');
  }

  static logEvent(event: string, metadata?: any) {
    logger.info(event, metadata);
  }

  static captureException(error: Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name
    });
  }

  static trackPerformance(operation: string, duration: number) {
    if (duration > 1000) {
      logger.warn('SLOW_OPERATION', {
        operation,
        duration
      });
    }
  }
}

export default MonitoringService; 