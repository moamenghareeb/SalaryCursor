import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentExchangeRate, saveExchangeRate, get30DayAverageRate } from '../../lib/exchange-rate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Return the cached/stored rate
      const rateData = await getCurrentExchangeRate();
      return res.status(200).json(rateData);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return res.status(500).json({ error: 'Failed to fetch exchange rate' });
    }
  } else if (req.method === 'POST') {
    // Log keys for debugging
    console.log('Received key:', req.headers['x-api-key']);
    console.log('Expected key:', process.env.UPDATE_API_KEY);
    console.log('Keys match:', req.headers['x-api-key'] === process.env.UPDATE_API_KEY);
    
    if (req.headers['x-api-key'] === process.env.UPDATE_API_KEY) {
      // Update the rate (secured with an API key)
      const newRate = await get30DayAverageRate();
      
      if (newRate) {
        saveExchangeRate(newRate);
        return res.status(200).json({ success: true, rate: newRate });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to fetch new rate' });
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 