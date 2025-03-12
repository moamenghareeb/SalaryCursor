import { supabase } from './supabase';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isOfficial: boolean;
}

// Static holiday data for 2025 (fallback if database is not available)
export const STATIC_HOLIDAYS_2025: Holiday[] = [
  { id: '1', date: '2025-01-07', name: 'Coptic Christmas', isOfficial: true },
  { id: '2', date: '2025-01-25', name: 'Revolution Day', isOfficial: true },
  { id: '3', date: '2025-03-31', name: 'Eid el-Fitr (Day 1)', isOfficial: true },
  { id: '4', date: '2025-04-01', name: 'Eid el-Fitr (Day 2)', isOfficial: true },
  { id: '5', date: '2025-04-02', name: 'Eid el-Fitr (Day 3)', isOfficial: true },
  { id: '6', date: '2025-04-19', name: 'Coptic Easter', isOfficial: true },
  { id: '7', date: '2025-04-20', name: 'Sham El-Nessim', isOfficial: true },
  { id: '8', date: '2025-04-25', name: 'Sinai Liberation Day', isOfficial: true },
  { id: '9', date: '2025-05-01', name: 'Labor Day', isOfficial: true },
  { id: '10', date: '2025-06-30', name: 'June 30 Revolution', isOfficial: true },
  { id: '11', date: '2025-07-07', name: 'Eid al-Adha (Day 1)', isOfficial: true },
  { id: '12', date: '2025-07-08', name: 'Eid al-Adha (Day 2)', isOfficial: true },
  { id: '13', date: '2025-07-09', name: 'Eid al-Adha (Day 3)', isOfficial: true },
  { id: '14', date: '2025-07-23', name: 'Revolution Day', isOfficial: true },
  { id: '15', date: '2025-08-06', name: 'Islamic New Year', isOfficial: true },
  { id: '16', date: '2025-10-06', name: 'Armed Forces Day', isOfficial: true },
  { id: '17', date: '2025-10-15', name: 'Prophet\'s Birthday', isOfficial: true },
  { id: '18', date: '2025-12-25', name: 'Christmas Day', isOfficial: true },
];

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
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  // If crossing a year boundary, fetch both years
  const yearsToFetch: number[] = [startYear];
  if (startYear !== endYear) {
    yearsToFetch.push(endYear);
  }
  
  // Fetch holidays for all required years
  let allHolidays: Holiday[] = [];
  for (const year of yearsToFetch) {
    const yearHolidays = await getHolidays(year, userId);
    allHolidays = [...allHolidays, ...yearHolidays];
  }
  
  // Filter to the specified date range
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return allHolidays.filter(holiday => {
    return holiday.date >= startStr && holiday.date <= endStr;
  });
} 