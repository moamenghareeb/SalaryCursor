import { NextApiRequest, NextApiResponse } from 'next'

export function errorHandler(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error('API Error:', error)
      
      if (error instanceof Error) {
        // Categorize and handle different types of errors
        if (error.name === 'ValidationError') {
          return res.status(400).json({ 
            error: 'Validation Failed', 
            details: error.message 
          })
        }

        if (error.name === 'UnauthorizedError') {
          return res.status(401).json({ 
            error: 'Unauthorized', 
            message: error.message 
          })
        }

        // Generic server error
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: error.message 
        })
      }

      // Fallback for unexpected errors
      res.status(500).json({ 
        error: 'Unexpected Error', 
        message: 'An unknown error occurred' 
      })
    }
  }
} 