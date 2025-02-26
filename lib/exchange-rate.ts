import fs from 'fs';
import path from 'path';
import { cache } from './cache';

const DATA_FILE_PATH = path.join(
  process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), 
  'data', 
  'exchange-rate.json'
);

const EXCHANGE_RATE_CACHE_KEY = 'current_exchange_rate';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Ensure data directory exists
export const ensureDirectoryExists = () => {
  const dataDir = path.join(
    process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(),
    'data'
  );
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Get the current exchange rate with cache and fallback
export async function getCurrentExchangeRate(): Promise<{ rate: number; lastUpdated: string }> {
  // Try to get from cache first
  const cachedRate = cache.get<{ rate: number; lastUpdated: string }>(EXCHANGE_RATE_CACHE_KEY);
  if (cachedRate) {
    return cachedRate;
  }

  // If not in cache, load from file
  const storedRate = loadExchangeRate();
  
  // Cache the rate
  cache.set(EXCHANGE_RATE_CACHE_KEY, storedRate, CACHE_TTL);
  
  return storedRate;
}

// Get the current exchange rate with fallback to free API
export async function get30DayAverageRate() {
  try {
    console.log('Fetching exchange rate...');
    
    // First try using your API key
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || "e8287e34bce27377331a738e";
    
    // Try a simpler endpoint that just returns the current rate
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
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

// Save the rate to cache and file
export function saveExchangeRate(rate: number) {
  ensureDirectoryExists();
  
  const data = {
    rate,
    lastUpdated: new Date().toISOString()
  };
  
  // Save to file
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
  
  // Update cache
  cache.set(EXCHANGE_RATE_CACHE_KEY, data, CACHE_TTL);
}

// Load the rate from the JSON file
export function loadExchangeRate() {
  ensureDirectoryExists();
  
  if (!fs.existsSync(DATA_FILE_PATH)) {
    const defaultData = { rate: 31.50, lastUpdated: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));
  return data;
} 