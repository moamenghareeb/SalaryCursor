import { cache } from './cache';
import { supabase } from './supabase';

const EXCHANGE_RATE_CACHE_KEY = 'current_exchange_rate';
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

// Get the current exchange rate with auto-update
export async function getCurrentExchangeRate(): Promise<{ rate: number; lastUpdated: string }> {
  try {
    // Try to get from cache first
    const cachedRate = cache.get<{ rate: number; lastUpdated: string }>(EXCHANGE_RATE_CACHE_KEY);
    if (cachedRate) {
      return cachedRate;
    }

    // If not in cache, fetch new rate
    const newRate = await get30DayAverageRate();
    
    if (newRate) {
      const data = {
        rate: newRate,
        lastUpdated: new Date().toISOString()
      };
      // Cache the rate
      cache.set(EXCHANGE_RATE_CACHE_KEY, data, CACHE_TTL);
      return data;
    }

    // If API fails, return default rate
    return { rate: 31.50, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('Error in getCurrentExchangeRate:', error);
    return { rate: 31.50, lastUpdated: new Date().toISOString() };
  }
}

// Get the current exchange rate from API
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

// Save the rate to database and cache
export async function saveExchangeRate(rate: number): Promise<boolean> {
  try {
    // Save to database
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert([
        {
          rate: rate,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error saving rate to database:', error);
      return false;
    }

    // Update cache
    const rateData = {
      rate: rate,
      lastUpdated: new Date().toISOString()
    };
    
    cache.set(EXCHANGE_RATE_CACHE_KEY, rateData, CACHE_TTL);
    return true;
  } catch (error) {
    console.error('Error in saveExchangeRate:', error);
    return false;
  }
} 