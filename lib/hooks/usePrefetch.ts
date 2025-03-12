import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { queryLogger } from './queryLogger';

/**
 * Hook to prefetch data for common navigation paths
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Get the current user ID
  const getCurrentUserId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  };
  
  /**
   * Prefetch dashboard data
   */
  const prefetchDashboard = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    queryLogger.log(['prefetch'], 'Prefetching dashboard data');
    
    // Prefetch employee data
    queryClient.prefetchQuery({
      queryKey: ['employee', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('id', userId)
          .single();
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
    
    // Prefetch current month's shift data
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    
    queryClient.prefetchQuery({
      queryKey: ['shiftData', userId, format(startDate, 'yyyy-MM')],
      queryFn: async () => {
        const { data } = await supabase
          .from('shift_overrides')
          .select('*')
          .eq('employee_id', userId)
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'));
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
    
    // Prefetch current year's salary data
    queryClient.prefetchQuery({
      queryKey: ['salaryData', userId, currentYear],
      queryFn: async () => {
        const { data } = await supabase
          .from('salaries')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false });
        return data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
  
  /**
   * Prefetch schedule data
   */
  const prefetchSchedule = async (monthOffset: number = 0) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const targetMonth = new Date(currentYear, currentMonth + monthOffset, 1);
    const monthKey = format(targetMonth, 'yyyy-MM');
    
    queryLogger.log(['prefetch'], `Prefetching schedule data for ${monthKey}`);
    
    queryClient.prefetchQuery({
      queryKey: ['schedule', userId, monthKey],
      queryFn: async () => {
        const startDate = startOfMonth(targetMonth);
        const endDate = endOfMonth(targetMonth);
        
        const [shiftResponse, holidayResponse] = await Promise.all([
          supabase
            .from('shift_overrides')
            .select('*')
            .eq('employee_id', userId)
            .gte('date', format(startDate, 'yyyy-MM-dd'))
            .lte('date', format(endDate, 'yyyy-MM-dd')),
            
          supabase
            .from('holidays')
            .select('*')
            .gte('date', format(startDate, 'yyyy-MM-dd'))
            .lte('date', format(endDate, 'yyyy-MM-dd'))
        ]);
        
        return {
          shifts: shiftResponse.data || [],
          holidays: holidayResponse.data || [],
          month: targetMonth
        };
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };
  
  /**
   * Prefetch leave balance data
   */
  const prefetchLeaveBalance = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    queryLogger.log(['prefetch'], 'Prefetching leave balance data');
    
    queryClient.prefetchQuery({
      queryKey: ['leaveBalance', userId, currentYear],
      queryFn: async () => {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', userId)
          .single();
          
        const { data: leaveAllocationData } = await supabase
          .from('leave_allocations')
          .select('*')
          .eq('employee_id', userId)
          .eq('year', currentYear);
          
        const { data: inLieuData } = await supabase
          .from('in_lieu_records')
          .select('*')
          .eq('employee_id', userId)
          .eq('year', currentYear);
          
        const { data: leavesData } = await supabase
          .from('leaves')
          .select('*')
          .eq('employee_id', userId)
          .eq('status', 'approved');
          
        return {
          employee: employeeData,
          allocations: leaveAllocationData || [],
          inLieu: inLieuData || [],
          leaves: leavesData || []
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
  
  return {
    prefetchDashboard,
    prefetchSchedule,
    prefetchLeaveBalance
  };
} 