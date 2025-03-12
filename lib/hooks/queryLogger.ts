import { logger } from '../logger';

export const queryLogger = {
  log: (queryKey: unknown[], message: string, data?: any) => {
    const queryName = Array.isArray(queryKey) && queryKey.length > 0 ? queryKey[0] : 'unknown';
    logger.debug(`[Query: ${queryName}] ${message}`, data);
  },
  
  error: (queryKey: unknown[], message: string, error: any) => {
    const queryName = Array.isArray(queryKey) && queryKey.length > 0 ? queryKey[0] : 'unknown';
    logger.error(`[Query: ${queryName}] ${message}`, error);
  }
}; 