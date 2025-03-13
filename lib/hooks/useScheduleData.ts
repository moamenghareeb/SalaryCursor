import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { queryLogger } from './queryLogger';
import { getHolidaysForRange, Holiday as HolidayData } from '../holidaysStore';
import toast from 'react-hot-toast';

export interface ScheduleDay {
  date: string;
  shiftType: string;
  isWeekend: boolean;
  isHoliday: boolean;
  notes?: string;
  isOfficial?: boolean;
  diagnosticInfo?: any;
}

export interface ScheduleMonthData {
  days: ScheduleDay[];
  month: Date;
  loading: boolean;
  error: any;
  diagnosticLogs: string[];
}

// Define the holiday interface to fix type issues
interface Holiday {
  id: string;
  date: string;
  name: string;
}

// Enhanced diagnostic logging function
function createShiftCalculationLogger() {
  const logs: string[] = [];
  
  return {
    log: (message: string) => {
      const timestamp = new Date().toISOString();
      logs.push(`[${timestamp}] ${message}`);
      console.log(`Shift Calc Log: ${message}`);
    },
    getLogs: () => logs,
    clear: () => logs.length = 0,
    exportLogs: () => {
      const logContent = logs.join('\n');
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shift_calculation_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
}

// Enhanced shift calculation with detailed tracing
function calculateShiftWithDiagnostics(
  date: Date, 
  group: string, 
  isWeekendDay: boolean,
  logger: ReturnType<typeof createShiftCalculationLogger>
): { shiftType: string, diagnosticInfo: any } {
  logger.log(`Calculating shift for date: ${date.toISOString()}, group: ${group}`);
  
  if (isWeekendDay) {
    logger.log('Weekend day detected. Shift type: Off');
    return { 
      shiftType: 'Off', 
      diagnosticInfo: { reason: 'Weekend day' } 
    };
  }

  // Anchor dates for each group in 2025 with more detailed logging
  const anchors: Record<string, {date: Date, cycle: number, description: string}> = {
    'A': { date: new Date(2025, 0, 4), cycle: 1, description: 'First day shift on Jan 4' },
    'B': { date: new Date(2025, 0, 2), cycle: 1, description: 'First day shift on Jan 2' },
    'C': { date: new Date(2025, 0, 1), cycle: 4, description: 'Second night shift on Jan 1' },
    'D': { date: new Date(2025, 0, 1), cycle: 2, description: 'Second day shift on Jan 1' },
  };

  // Default to group A if not specified
  const anchor = anchors[group] || anchors['A'];
  
  logger.log(`Using anchor: ${JSON.stringify(anchor)}`);
  
  // Calculate days since anchor date with more precise calculation
  const daysSinceAnchor = Math.floor(
    (date.getTime() - anchor.date.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  logger.log(`Days since anchor: ${daysSinceAnchor}`);
  
  // Adjust by the initial cycle position and get the cycle day (1-8)
  const cycleDay = ((anchor.cycle - 1 + daysSinceAnchor) % 8) + 1;
  
  logger.log(`Calculated cycle day: ${cycleDay}`);
  
  // Detailed mapping of cycle day to shift type
  let shiftType = 'Off';
  let shiftDescription = 'Off day';
  
  if (cycleDay === 1 || cycleDay === 2) {
    shiftType = 'Day';
    shiftDescription = `Day shift (cycle day ${cycleDay})`;
  } else if (cycleDay === 3 || cycleDay === 4) {
    shiftType = 'Night';
    shiftDescription = `Night shift (cycle day ${cycleDay})`;
  }
  
  logger.log(`Final shift type: ${shiftType} - ${shiftDescription}`);
  
  return { 
    shiftType, 
    diagnosticInfo: {
      group,
      anchorDate: anchor.date,
      anchorCycle: anchor.cycle,
      daysSinceAnchor,
      cycleDay,
      shiftDescription
    }
  };
}

export function useScheduleData(
  userId?: string, 
  month: Date = new Date(),
  employeeGroup: string = 'A'
) {
  // Create a logger for this specific query
  const diagnosticLogger = createShiftCalculationLogger();
  
  // Define the query options type
  const queryOptions: UseQueryOptions<
    { 
      days: ScheduleDay[]; 
      month: Date; 
      diagnosticLogs: string[] 
    }, 
    Error, 
    { 
      days: ScheduleDay[]; 
      month: Date; 
      diagnosticLogs: string[] 
    }
  > = {
    queryKey: ['schedule', userId, format(month, 'yyyy-MM'), employeeGroup],
    queryFn: async () => {
      // Start comprehensive logging
      diagnosticLogger.log(`Fetching schedule for user ${userId}, month ${format(month, 'yyyy-MM')}, group ${employeeGroup}`);
      
      try {
        if (!userId) {
          throw new Error('User ID is required');
        }
        
        // 1. Get all days in the month
        const startDate = startOfMonth(month);
        const endDate = endOfMonth(month);
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        diagnosticLogger.log(`Generating schedule for date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        
        // 2. Fetch shift overrides with enhanced error handling
        const { data: shiftOverrides, error: shiftError } = await supabase
          .from('shift_overrides')
          .select('*')
          .eq('employee_id', userId)
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));
        
        if (shiftError) {
          diagnosticLogger.log(`Shift override fetch error: ${shiftError.message}`);
          throw shiftError;
        }
        
        // 3. Fetch holidays
        let holidays: HolidayData[] = [];
        try {
          holidays = await getHolidaysForRange(startDate, endDate, userId);
          diagnosticLogger.log(`Fetched ${holidays.length} holidays`);
        } catch (error) {
          diagnosticLogger.log(`Holiday fetch error: ${error}`);
        }
        
        // 4. Fetch leave records
        const { data: leaveRecords, error: leaveError } = await supabase
          .from('leaves')
          .select('*')
          .eq('employee_id', userId)
          .or(`start_date.lte.${format(endDate, 'yyyy-MM-dd')},end_date.gte.${format(startDate, 'yyyy-MM-dd')}`);
        
        if (leaveError) {
          diagnosticLogger.log(`Leave records fetch error: ${leaveError.message}`);
        }
        
        // 5. Assemble the schedule data with comprehensive logging
        const scheduleData = allDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isWeekendDay = isWeekend(day);
          
          // Calculate base shift with diagnostic tracing
          const { shiftType: baseShiftType, diagnosticInfo } = calculateShiftWithDiagnostics(
            day, 
            employeeGroup, 
            isWeekendDay,
            diagnosticLogger
          );
          
          let shiftType = baseShiftType;
          let notes = '';
          let isHoliday = false;
          let isOfficial = false;
          
          // Check for leave
          const onLeave = leaveRecords?.some(leave => {
            const startDate = parseISO(leave.start_date);
            const endDate = parseISO(leave.end_date);
            return day >= startDate && day <= endDate;
          });
          
          if (onLeave) {
            shiftType = 'Leave';
            const leaveRecord = leaveRecords?.find(leave => {
              const startDate = parseISO(leave.start_date);
              const endDate = parseISO(leave.end_date);
              return day >= startDate && day <= endDate;
            });
            notes = leaveRecord?.reason || 'Leave';
            diagnosticLogger.log(`Leave detected for ${dateStr}: ${notes}`);
          }
          
          // Check for holiday
          const holiday = holidays.find(h => h.date === dateStr);
          if (holiday) {
            shiftType = 'Public';
            notes = holiday.name;
            isHoliday = true;
            isOfficial = holiday.isOfficial;
            diagnosticLogger.log(`Holiday detected for ${dateStr}: ${notes}`);
          }
          
          // Check for manual override
          const override = shiftOverrides?.find(s => s.date === dateStr);
          if (override) {
            shiftType = override.shift_type;
            if (override.notes) notes = override.notes;
            diagnosticLogger.log(`Override detected for ${dateStr}: ${shiftType}, notes: ${notes}`);
          }
          
          return {
            date: dateStr,
            shiftType,
            isWeekend: isWeekendDay,
            isHoliday,
            notes,
            isOfficial,
            diagnosticInfo
          };
        });
        
        // Export logs for further investigation
        diagnosticLogger.exportLogs();
        
        return {
          days: scheduleData,
          month,
          diagnosticLogs: diagnosticLogger.getLogs()
        };
      } catch (error) {
        // Global error handling with toast notification
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Schedule Fetch Error: ${errorMessage}`);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes
    retry: 2,  // Retry failed queries twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),  // Exponential backoff
  };

  // Add error handling separately
  const handleError = (error: Error) => {
    console.error('Schedule Data Fetch Error:', error);
    toast.error(`Failed to load schedule: ${error.message}`);
  };

  // Use the query with options
  const query = useQuery(queryOptions);

  // Manually attach error handler
  if (query.isError) {
    handleError(query.error);
  }

  return query;
} 