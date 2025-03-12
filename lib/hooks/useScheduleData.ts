import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { queryLogger } from './queryLogger';
import { getHolidaysForRange, Holiday as HolidayData } from '../holidaysStore';

export interface ScheduleDay {
  date: string;
  shiftType: string;
  isWeekend: boolean;
  isHoliday: boolean;
  notes?: string;
  isOfficial?: boolean;
}

export interface ScheduleMonthData {
  days: ScheduleDay[];
  month: Date;
  loading: boolean;
  error: any;
}

// Define the holiday interface to fix type issues
interface Holiday {
  id: string;
  date: string;
  name: string;
}

// Helper to determine shift type based on employee group and date
function calculateShift(
  date: Date, 
  group: string, 
  isWeekendDay: boolean
): string {
  if (isWeekendDay) return 'Off';

  // Anchor dates for each group in 2025
  const anchors: Record<string, {date: Date, cycle: number}> = {
    'A': { date: new Date(2025, 0, 4), cycle: 1 }, // Jan 4, 2025
    'B': { date: new Date(2025, 0, 2), cycle: 1 }, // Jan 2, 2025
    'C': { date: new Date(2025, 0, 1), cycle: 4 }, // Jan 1, 2025
    'D': { date: new Date(2025, 0, 1), cycle: 2 }, // Jan 1, 2025
  };

  // Default to group A if not specified
  const anchor = anchors[group] || anchors['A'];
  
  // Calculate days since anchor date
  const daysSinceAnchor = Math.floor(
    (date.getTime() - anchor.date.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Adjust by the initial cycle position and get the cycle day (1-8)
  const cycleDay = ((anchor.cycle - 1 + daysSinceAnchor) % 8) + 1;
  
  // Map cycle day to shift type
  if (cycleDay === 1 || cycleDay === 2) return 'Day';   // First two days are day shifts
  if (cycleDay === 3 || cycleDay === 4) return 'Night'; // Next two days are night shifts
  return 'Off'; // The remaining 4 days are off days
}

export function useScheduleData(
  userId?: string, 
  month: Date = new Date(),
  employeeGroup: string = 'A'
) {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const monthKey = format(month, 'yyyy-MM');
  
  return useQuery({
    queryKey: ['schedule', userId, monthKey, employeeGroup],
    queryFn: async () => {
      queryLogger.log(['schedule', userId], `Fetching schedule for ${monthKey}`);
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // 1. Get all days in the month
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      // 2. Fetch shift overrides
      const { data: shiftOverrides, error: shiftError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', userId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));
        
      if (shiftError) {
        queryLogger.error(['schedule', userId], `Error fetching shift overrides: ${shiftError.message}`, shiftError);
        throw shiftError;
      }
      
      // 3. Fetch holidays using the holiday store
      let holidays: HolidayData[] = [];
      try {
        holidays = await getHolidaysForRange(startDate, endDate, userId);
      } catch (error) {
        queryLogger.error(['schedule', userId], `Error fetching holidays: ${error}`, error);
        // Continue without holidays rather than failing completely
      }
      
      // 4. Fetch leave records for this month
      const { data: leaveRecords, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', userId)
        .or(`start_date.lte.${format(endDate, 'yyyy-MM-dd')},end_date.gte.${format(startDate, 'yyyy-MM-dd')}`);
        
      if (leaveError) {
        queryLogger.error(['schedule', userId], `Error fetching leave records: ${leaveError.message}`, leaveError);
        // Continue without leave records rather than failing
      }
      
      // 5. Assemble the schedule data with proper precedence rules
      const scheduleData: ScheduleDay[] = allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWeekendDay = isWeekend(day);
        
        // Base shift from the rotation pattern
        let shiftType = calculateShift(day, employeeGroup, isWeekendDay);
        let notes = '';
        let isHoliday = false;
        let isOfficial = false;
        
        // Check for leave (priority #3)
        const onLeave = leaveRecords?.some(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          return day >= startDate && day <= endDate;
        });
        
        if (onLeave) {
          shiftType = 'Leave';
          const leaveRecord = leaveRecords?.find(leave => {
            const startDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            return day >= startDate && day <= endDate;
          });
          notes = leaveRecord?.reason || 'Leave';
        }
        
        // Check for holiday (priority #2)
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
          shiftType = 'Public';
          notes = holiday.name;
          isHoliday = true;
          isOfficial = holiday.isOfficial;
        }
        
        // Check for manual override (highest priority)
        const override = shiftOverrides?.find(s => s.date === dateStr);
        if (override) {
          shiftType = override.shift_type;
          if (override.notes) notes = override.notes;
        }
        
        return {
          date: dateStr,
          shiftType,
          isWeekend: isWeekendDay,
          isHoliday,
          notes,
          isOfficial
        };
      });
      
      return {
        days: scheduleData,
        month
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  });
} 