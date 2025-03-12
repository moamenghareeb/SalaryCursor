import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { queryLogger } from './queryLogger';

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

export function useScheduleData(userId?: string, month: Date = new Date()) {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const monthKey = format(month, 'yyyy-MM');
  
  return useQuery({
    queryKey: ['schedule', userId, monthKey],
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
      
      // 3. Fetch holidays
      const { data: holidays, error: holidayError } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));
        
      if (holidayError) {
        queryLogger.error(['schedule', userId], `Error fetching holidays: ${holidayError.message}`, holidayError);
        throw holidayError;
      }
      
      // 4. Assemble the schedule data
      const scheduleData: ScheduleDay[] = allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Check if there's a shift override
        const override = shiftOverrides?.find(s => s.date === dateStr);
        
        // Check if it's a holiday
        const holiday = holidays?.find(h => h.date === dateStr);
        
        return {
          date: dateStr,
          shiftType: override?.shift_type || (isWeekend ? 'Off' : 'Day'),
          isWeekend,
          isHoliday: !!holiday,
          notes: override?.notes || holiday?.name,
          isOfficial: !!holiday
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