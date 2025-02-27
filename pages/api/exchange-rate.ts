import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentExchangeRate } from '../../lib/exchange-rate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Return the current rate (will auto-update if cache expired)
      const rateData = await getCurrentExchangeRate();
      return res.status(200).json(rateData);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return res.status(500).json({ error: 'Failed to fetch exchange rate' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 