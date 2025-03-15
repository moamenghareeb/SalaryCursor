import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

export function validateRequest<T>(schema: z.Schema<T>) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData; // Replace request body with validated data
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
