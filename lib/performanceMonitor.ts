import { NextApiRequest, NextApiResponse } from 'next'
import logger from './logger'

export function performanceMonitor(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now()
    
    await handler(req, res)
    
    const duration = Date.now() - start
    
    logger.info('API Performance', {
      method: req.method,
      path: req.url,
      duration,
      timestamp: new Date().toISOString()
    })

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow API Request', {
        method: req.method,
        path: req.url,
        duration
      })
    }
  }
} 