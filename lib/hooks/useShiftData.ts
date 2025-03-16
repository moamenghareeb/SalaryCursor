import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { format, addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { queryLogger } from './queryLogger';

export interface ShiftOverride {
  id: string;
  created_at: string;
  employee_id: string;
  date: string;
  shift_type: string;
  notes?: string;
  is_manual?: boolean;
}

export interface ShiftStats {
  totalShifts: number;
  overtimeHours: number;
  monthlyEarnings?: number;
}

export interface ShiftData {
  shifts: ShiftOverride[];
  stats: ShiftStats;
}

export function useShiftData(userId?: string, month?: Date) {
  const date = month || new Date();
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);
  
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');
  
  return useQuery<ShiftData>({
    queryKey: ['shiftData', userId, formattedStartDate],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      queryLogger.log(
        ['shiftData', userId], 
        `Fetching shift data for user ${userId} from ${formattedStartDate} to ${formattedEndDate}`
      );
      
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', userId)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate);
        
      if (shiftsError) {
        queryLogger.error(
          ['shiftData', userId], 
          `Error fetching shift data: ${shiftsError.message}`, 
          shiftsError
        );
        throw shiftsError;
      }
      
      // Calculate stats
      const totalShifts = shiftsData?.length || 0;
      let overtimeHours = 0;
      
      shiftsData?.forEach(shift => {
        if (shift.shift_type === 'Overtime') {
          overtimeHours += 24; // Each overtime shift counts as 24 hours
        }
      });
      
      return {
        shifts: shiftsData || [],
        stats: {
          totalShifts,
          overtimeHours
        }
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 