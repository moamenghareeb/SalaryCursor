import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'exchange-rate.json');

// Ensure data directory exists
const ensureDirectoryExists = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Get the 30-day average exchange rate
async function get30DayAverageRate() {
  try {
    // You'll need to use an API key for most exchange rate APIs that offer historical data
    // This example uses exchangerate-api.com (you'll need to sign up for an API key)
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    const today = new Date();
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Format dates for API
    const endDate = today.toISOString().split('T')[0];
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    // For this example, I'm using exchangerate-api.com's time series endpoint
    // You may need to adjust based on your chosen API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/time-series/${API_KEY}/USD/EGP/${startDate}/${endDate}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate data');
    }
    
    const data = await response.json();
    
    // Calculate average from the returned rates
    // The structure will depend on your chosen API
    let sum = 0;
    let count = 0;
    
    // This structure is based on exchangerate-api.com's response format
    // Adjust as needed for your chosen API
    for (const date in data.rates) {
      sum += data.rates[date].EGP;
      count++;
    }
    
    const averageRate = sum / count;
    
    // Return the average rate with 2 decimal places
    return parseFloat(averageRate.toFixed(2));
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
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