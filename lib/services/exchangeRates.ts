/**
 * Service for handling exchange rate operations
 */
import { supabase } from '../supabaseClient';

export interface ExchangeRateData {
  rate: number;
  month: string;
  year: number;
  day?: number;
}

interface DailyRate {
  rate: number;
}

/**
 * Get the exchange rate for a specific month
 * @param year Year to get exchange rate for
 * @param month Month to get exchange rate for (1-12)
 * @returns The exchange rate for the month or a default value of 31.50
 */
export async function getMonthlyExchangeRate(year: number, month: number): Promise<number> {
  try {
    // Format month string (e.g., "2023-04" for April 2023)
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    
    // Check monthly exchange rates table first
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('monthly_exchange_rates')
      .select('rate')
      .eq('month', monthStr)
      .limit(1)
      .single();
    
    if (monthlyData) {
      return monthlyData.rate;
    }
    
    if (monthlyError && monthlyError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching monthly exchange rate:', monthlyError);
    }
    
    // If no monthly rate found, try daily rates and compute average
    const { data: dailyData, error: dailyError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .gte('date', `${monthStr}-01`)
      .lt('date', month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, '0')}-01`);
    
    if (dailyError) {
      console.error('Error fetching daily exchange rates:', dailyError);
      // Return default rate if errors occur
      return 31.50;
    }
    
    if (dailyData && dailyData.length > 0) {
      // Calculate average of daily rates
      const sum = dailyData.reduce((acc: number, curr: DailyRate) => acc + curr.rate, 0);
      return sum / dailyData.length;
    }
    
    // If no data found at all, return default rate
    return 31.50;
  } catch (error) {
    console.error('Error in getMonthlyExchangeRate:', error);
    return 31.50;
  }
}

/**
 * Get the exchange rate for the current month
 * @returns The current month's exchange rate or a default value of 31.50
 */
export async function getCurrentMonthExchangeRate(): Promise<number> {
  const now = new Date();
  return getMonthlyExchangeRate(now.getFullYear(), now.getMonth() + 1);
} 