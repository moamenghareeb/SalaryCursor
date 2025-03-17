import { cache } from './cache';
import { supabase } from './supabase';

const EXCHANGE_RATE_CACHE_KEY = 'current_exchange_rate';
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
const DEFAULT_EXCHANGE_RATE = 50.60; // Latest default fallback rate

// Get the current exchange rate with auto-update
export async function getCurrentExchangeRate(): Promise<{ rate: number; lastUpdated: string }> {
  try {
    // Try to get from cache first
    const cachedRate = cache.get<{ rate: number; lastUpdated: string }>(EXCHANGE_RATE_CACHE_KEY);
    if (cachedRate) {
      return cachedRate;
    }

    // Try to get the most recent rate from the database
    try {
      const { data: dbRate, error } = await supabase
        .from('exchange_rates')
        .select('rate, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && dbRate && dbRate.rate) {
        const data = {
          rate: dbRate.rate,
          lastUpdated: dbRate.created_at
        };
        // Cache the rate from database
        cache.set(EXCHANGE_RATE_CACHE_KEY, data, CACHE_TTL);
        return data;
      }
    } catch (dbError) {
      console.warn('Could not retrieve exchange rate from database:', dbError);
    }

    // If not in cache or database, fetch new rate
    const newRate = await get30DayAverageRate();
    
    if (newRate) {
      const data = {
        rate: newRate,
        lastUpdated: new Date().toISOString()
      };
      // Cache the rate
      cache.set(EXCHANGE_RATE_CACHE_KEY, data, CACHE_TTL);
      
      // Save to database in background
      saveExchangeRate(newRate).catch(err => {
        console.warn('Failed to save new exchange rate to database:', err);
      });
      
      return data;
    }

    // If all API calls fail, return default rate
    console.warn('All exchange rate APIs failed, using default rate:', DEFAULT_EXCHANGE_RATE);
    return { rate: DEFAULT_EXCHANGE_RATE, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('Error in getCurrentExchangeRate:', error);
    return { rate: DEFAULT_EXCHANGE_RATE, lastUpdated: new Date().toISOString() };
  }
}

// Get the current exchange rate from API
export async function get30DayAverageRate() {
  try {
    console.log('Fetching exchange rate...');
    
    // First try using your API key
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || "e8287e34bce27377331a738e";
    
    // Try with a timeout to prevent long-running requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      // Try a simpler endpoint that just returns the current rate
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
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
      clearTimeout(timeoutId);
    }
    
    // Fallback to free API if primary fails
    try {
      console.log('Trying fallback API...');
      
      // Try with a timeout to prevent long-running requests
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 5000); // 5 second timeout
      
      const fallbackResponse = await fetch(
        'https://open.er-api.com/v6/latest/USD',
        { signal: fallbackController.signal }
      );
      
      clearTimeout(fallbackTimeoutId);
      
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
    
    // Second fallback - try another free API
    try {
      console.log('Trying second fallback API...');
      
      // Try with a timeout to prevent long-running requests
      const secondFallbackController = new AbortController();
      const secondFallbackTimeoutId = setTimeout(() => secondFallbackController.abort(), 5000); // 5 second timeout
      
      const secondFallbackResponse = await fetch(
        'https://api.exchangerate.host/latest?base=USD',
        { signal: secondFallbackController.signal }
      );
      
      clearTimeout(secondFallbackTimeoutId);
      
      if (secondFallbackResponse.ok) {
        const secondFallbackData = await secondFallbackResponse.json();
        if (secondFallbackData.rates && secondFallbackData.rates.EGP) {
          const secondFallbackRate = parseFloat(secondFallbackData.rates.EGP.toFixed(2));
          console.log('Successfully fetched second fallback rate:', secondFallbackRate);
          return secondFallbackRate;
        }
      }
    } catch (secondFallbackError) {
      console.error('Second fallback API also failed:', secondFallbackError);
    }
    
    // All APIs failed, return default value
    return DEFAULT_EXCHANGE_RATE;
  } catch (error) {
    console.error('Error in get30DayAverageRate:', error);
    return DEFAULT_EXCHANGE_RATE;
  }
}

// Save the rate to database and cache
export async function saveExchangeRate(rate: number): Promise<boolean> {
  try {
    // Get the current session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('Authentication error:', authError);
      return false;
    }

    // Use the admin API endpoint to save the rate
    const response = await fetch('/api/admin/update-exchange-rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ rate })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error saving rate:', errorData);
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