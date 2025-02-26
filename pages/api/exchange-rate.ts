import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(
  process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), 
  'data', 
  'exchange-rate.json'
);

// Ensure data directory exists
const ensureDirectoryExists = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Get the current exchange rate with fallback to free API
async function get30DayAverageRate() {
  try {
    console.log('Fetching exchange rate...');
    
    // First try using your API key
    const API_KEY = "e8287e34bce27377331a738e";
    
    // Try a simpler endpoint that just returns the current rate
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API response received:', JSON.stringify(data).substring(0, 200) + '...');
    
    if (data.result === 'success' && data.conversion_rates && data.conversion_rates.EGP) {
      const rate = parseFloat(data.conversion_rates.EGP.toFixed(2));
      console.log('Successfully fetched rate:', rate);
      return rate;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error details:', error);
    
    // Fallback to free API if primary fails
    try {
      console.log('Trying fallback API...');
      const fallbackResponse = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.rates && fallbackData.rates.EGP) {
          const fallbackRate = parseFloat(fallbackData.rates.EGP.toFixed(2));
          console.log('Successfully fetched fallback rate:', fallbackRate);
          return fallbackRate;
        }
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    
    return null;
  }
}

// Save the rate to a JSON file
function saveExchangeRate(rate: number) {
  ensureDirectoryExists();
  
  const data = {
    rate,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
}

// Load the rate from the JSON file
function loadExchangeRate() {
  ensureDirectoryExists();
  
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return { rate: 31.50, lastUpdated: new Date().toISOString() };
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return the stored rate
    const storedData = loadExchangeRate();
    return res.status(200).json(storedData);
  } else if (req.method === 'POST' && req.headers['x-api-key'] === process.env.UPDATE_API_KEY) {
    // Update the rate (secured with an API key)
    const newRate = await get30DayAverageRate();
    
    if (newRate) {
      saveExchangeRate(newRate);
      return res.status(200).json({ success: true, rate: newRate });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to fetch new rate' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 