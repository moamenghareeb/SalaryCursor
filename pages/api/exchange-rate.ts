import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentExchangeRate } from '../../lib/exchange-rate';

// Default fallback rate in case of complete failure
const DEFAULT_EXCHANGE_RATE = 50.60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Set a timeout for the overall request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Exchange rate fetch timed out')), 10000)
      );
      
      // Return the current rate (will auto-update if cache expired)
      const ratePromise = getCurrentExchangeRate();
      
      // Race the promises - either we get the rate or we timeout
      const rateData = await Promise.race([
        ratePromise, 
        timeoutPromise.then(() => ({ 
          rate: DEFAULT_EXCHANGE_RATE, 
          lastUpdated: new Date().toISOString() 
        }))
      ]) as { rate: number; lastUpdated: string };
      
      return res.status(200).json(rateData);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      
      // In case of any error, return a default rate instead of failing
      return res.status(200).json({ 
        rate: DEFAULT_EXCHANGE_RATE, 
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch exchange rate, using default rate'
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 