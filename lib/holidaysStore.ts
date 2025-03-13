import { format } from 'date-fns';
import { supabase } from './supabase';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isOfficial: boolean;
  country?: string;
}

// Cache for holidays to reduce database calls
const holidayCache: Record<string, Holiday[]> = {};

// Static holiday data for 2025 (fallback)
const STATIC_HOLIDAYS_2025: Holiday[] = [
  { id: '2025-01-01', date: '2025-01-01', name: 'New Year', isOfficial: true },
  { id: '2025-04-20', date: '2025-04-20', name: 'Easter', isOfficial: true },
  { id: '2025-05-01', date: '2025-05-01', name: 'Labor Day', isOfficial: true },
  { id: '2025-07-04', date: '2025-07-04', name: 'Independence Day', isOfficial: true },
  { id: '2025-12-25', date: '2025-12-25', name: 'Christmas', isOfficial: true },
  { id: '2025-12-31', date: '2025-12-31', name: 'New Year\'s Eve', isOfficial: true },
];

/**
 * Check if a specific date is a holiday
 * @param date The date to check
 * @returns True if the date is a holiday, false otherwise
 */
export async function isHoliday(date: Date): Promise<boolean> {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check for the specific date
  const holidays = await getHolidaysForRange(date, date);
  return holidays.length > 0;
}

/**
 * Get holiday information for a specific date
 * @param date The date to check
 * @returns Holiday information or null if not a holiday
 */
export async function getHolidayInfo(date: Date): Promise<Holiday | null> {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check for the specific date
  const holidays = await getHolidaysForRange(date, date);
  return holidays.length > 0 ? holidays[0] : null;
}

/**
 * Clear the holiday cache (useful after updates)
 */
export function clearHolidayCache() {
  Object.keys(holidayCache).forEach(key => {
    delete holidayCache[key];
  });
}

/**
 * Fetch holidays from the database and merge with static data
 * @param year The year to fetch holidays for
 * @param userId Optional user ID for personalized holidays
 * @returns Promise resolving to an array of holidays
 */
export async function getHolidays(year: number = new Date().getFullYear(), userId?: string): Promise<Holiday[]> {
  // Initialize with static data for safety
  let holidays: Holiday[] = STATIC_HOLIDAYS_2025.filter(h => h.date.startsWith(`${year}`));
  
  try {
    // First try the holidays table
    const { data: holidaysData, error: holidayError } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);
    
    if (!holidayError && holidaysData && holidaysData.length > 0) {
      const dbHolidays: Holiday[] = holidaysData.map(h => ({
        id: h.id,
        date: h.date,
        name: h.name,
        isOfficial: true
      }));
      
      holidays = [...holidays, ...dbHolidays];
    }
    
    // Then try public_holidays if userId is provided
    if (userId) {
      const { data: publicHolidays, error: publicError } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('employee_id', userId)
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`);
      
      if (!publicError && publicHolidays && publicHolidays.length > 0) {
        const userHolidays: Holiday[] = publicHolidays.map(h => ({
          id: h.id,
          date: h.holiday_date,
          name: h.description,
          isOfficial: true
        }));
        
        holidays = [...holidays, ...userHolidays];
      }
    }
  } catch (error) {
    console.error('Error fetching holidays:', error);
    // Fall back to static data if there was an error
  }
  
  // Deduplicate and return
  return deduplicateHolidays(holidays);
}

/**
 * Get holidays for a specific month range
 * @param startDate The start date of the range
 * @param endDate The end date of the range
 * @param userId Optional user ID for personalized holidays
 * @returns Promise resolving to an array of holidays within the range
 */
export async function getHolidaysForRange(
  startDate: Date, 
  endDate: Date, 
  userId?: string
): Promise<Holiday[]> {
  // Format dates for cache key and queries
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  const cacheKey = `${startStr}_${endStr}_${userId || ''}`;
  
  // Check cache first
  if (holidayCache[cacheKey]) {
    return holidayCache[cacheKey];
  }
  
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  let allHolidays: Holiday[] = [];
  
  // Fetch holidays for each year in the range
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await getHolidays(year, userId);
    allHolidays = [...allHolidays, ...yearHolidays];
  }
  
  // Filter to the date range
  const holidaysInRange = allHolidays.filter(holiday => {
    return holiday.date >= startStr && holiday.date <= endStr;
  });
  
  // Cache the results
  holidayCache[cacheKey] = holidaysInRange;
  
  return holidaysInRange;
}

// Helper function to deduplicate holidays by date
function deduplicateHolidays(holidays: Holiday[]): Holiday[] {
  const holidayMap = new Map<string, Holiday>();
  
  // Process holidays in order, giving preference to official holidays
  holidays.forEach(holiday => {
    const existingHoliday = holidayMap.get(holiday.date);
    
    // If there's no holiday for this date, or the new one is official and the existing one isn't,
    // use the new one
    if (!existingHoliday || (holiday.isOfficial && !existingHoliday.isOfficial)) {
      holidayMap.set(holiday.date, holiday);
    }
  });
  
  return Array.from(holidayMap.values());
}