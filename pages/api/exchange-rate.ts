import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  exchangeRate?: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const apiKey = process.env.EXCHANGE_API_KEY;
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    
    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(data.error || 'Failed to get exchange rate');
    }
    
    const exchangeRate = data.conversion_rates.EGP;
    
    res.status(200).json({ exchangeRate });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 