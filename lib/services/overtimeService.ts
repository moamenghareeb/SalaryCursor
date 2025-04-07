/**
 * Service for handling overtime related operations
 */
import { supabase } from '../supabaseClient';

export enum OvertimeType {
  DAY = 'day',
  NIGHT = 'night',
  HOLIDAY = 'holiday'
}

export interface OvertimeSummary {
  totalHours: number;
  dayHours: number;
  nightHours: number;
  holidayHours: number;
  effectiveHours: number;
}

interface OvertimeRecord {
  hours: number;
  type: OvertimeType;
}

/**
 * Get overtime summary for an employee in a specific month
 * @param employeeId Employee ID to get overtime for
 * @param year Year to get overtime for
 * @param month Month to get overtime for (1-12)
 * @returns Overtime summary including hours by type
 */
export async function getOvertimeSummary(
  employeeId: string, 
  year: number, 
  month: number
): Promise<OvertimeSummary> {
  try {
    // Format date range for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    let endDate: string;
    
    // Calculate the last day of the month
    if (month === 12) {
      endDate = `${year + 1}-01-01`;
    } else {
      endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    }
    
    // Query the database for overtime records
    const { data, error } = await supabase
      .from('overtime')
      .select('hours, type')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lt('date', endDate);
    
    if (error) {
      console.error('Error fetching overtime data:', error);
      throw new Error(`Failed to fetch overtime: ${error.message}`);
    }
    
    // Calculate total hours by type
    let dayHours = 0;
    let nightHours = 0;
    let holidayHours = 0;
    
    data?.forEach((record: OvertimeRecord) => {
      switch(record.type) {
        case OvertimeType.DAY:
          dayHours += record.hours;
          break;
        case OvertimeType.NIGHT:
          nightHours += record.hours;
          break;
        case OvertimeType.HOLIDAY:
          holidayHours += record.hours;
          break;
      }
    });
    
    // Calculate total and effective hours
    // Night hours are weighted 1.5x and holiday hours are weighted 2x
    const totalHours = dayHours + nightHours + holidayHours;
    const effectiveHours = dayHours + (nightHours * 1.5) + (holidayHours * 2);
    
    return {
      totalHours,
      dayHours,
      nightHours,
      holidayHours,
      effectiveHours
    };
  } catch (error) {
    console.error('Error in getOvertimeSummary:', error);
    // Return empty data in case of error
    return {
      totalHours: 0,
      dayHours: 0,
      nightHours: 0,
      holidayHours: 0,
      effectiveHours: 0
    };
  }
} 