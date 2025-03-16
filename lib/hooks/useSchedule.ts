import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { updateUserOvertime } from '../overtime';

import { 
  ShiftGroup,
  ShiftType,
  ScheduleType,
  MonthData,
  LeaveRecord,
  ShiftOverride,
  GroupChange
} from '../types/schedule';

import {
  generateMonthCalendar,
  calculateShiftType,
  debugShift
} from '../utils/shiftCalculator';

interface UseScheduleProps {
  userId?: string;
  initialDate?: Date;
  initialGroup?: ShiftGroup;
  initialScheduleType?: ScheduleType;
}

/**
 * Custom hook for fetching and managing schedule data
 */
export function useSchedule({
  userId,
  initialDate = new Date(),
  initialGroup = 'A',
  initialScheduleType = 'shift'
}: UseScheduleProps = {}) {
  // State for current date and employee group
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [employeeGroup, setEmployeeGroup] = useState<ShiftGroup>(initialGroup);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initialScheduleType);
  const [authUser, setAuthUser] = useState<string | undefined>(userId);
  
  const queryClient = useQueryClient();
  
  // Listen for auth state changes
  useEffect(() => {
    const setupAuth = async () => {
      // If userId was passed explicitly, use it
      if (userId) {
        setAuthUser(userId);
        return;
      }
      
      // Otherwise check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setAuthUser(session.user.id);
      }
    };
    
    setupAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthUser(session?.user?.id);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
  
  // Format date strings for queries
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = format(currentDate, 'yyyy-MM');

  // Fetch holidays for the current month
  const { data: holidays, isLoading: isHolidaysLoading } = useQuery({
    queryKey: ['holidays', monthKey],
    queryFn: async () => {
      // Create date range for fetching holidays
      const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
      const endDate = format(addMonths(new Date(year, month, 1), 1), 'yyyy-MM-dd');

      try {
        // Fetch holidays from the database
        const { data, error } = await supabase
          .from('holidays')
          .select('*')
          .gte('date', startDate)
          .lt('date', endDate);
          
        if (error) throw error;
        
        // Format holidays into map object by date
        const holidayMap: { [date: string]: { name: string; isOfficial: boolean } } = {};
        
        (data || []).forEach(holiday => {
          holidayMap[holiday.date] = {
            name: holiday.name,
            isOfficial: holiday.is_official || false
          };
        });
        
        return holidayMap;
      } catch (error) {
        console.error('Error fetching holidays:', error);
        return {};
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Fetch leave records if user is logged in
  const { data: leaves, isLoading: isLeavesLoading } = useQuery({
    queryKey: ['leaves', authUser, monthKey],
    queryFn: async () => {
      if (!authUser) return {};
      
      try {
        // Create date range for fetching leaves
        const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
        const endDate = format(addMonths(new Date(year, month, 1), 1), 'yyyy-MM-dd');
        
        // Fetch leave records from the database
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('employee_id', authUser)
          .gte('start_date', startDate)
          .lte('end_date', endDate);
          
        if (error) throw error;
        
        // Process leave records into map object by date
        const leaveMap: { [date: string]: { type: string; notes?: string } } = {};
        
        (data || []).forEach((leave: any) => {
          // Convert date strings to Date objects
          const startDate = parseISO(leave.start_date);
          const endDate = parseISO(leave.end_date);
          
          // Generate entries for all days in leave range
          let currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            
            leaveMap[dateStr] = {
              type: leave.type || 'Leave',
              notes: leave.reason
            };
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
        
        return leaveMap;
      } catch (error) {
        console.error('Error fetching leave records:', error);
        return {};
      }
    },
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch shift overrides if user is logged in
  const { data: overrides, isLoading: isOverridesLoading } = useQuery({
    queryKey: ['shift-overrides', authUser, monthKey],
    queryFn: async () => {
      if (!authUser) return {};
      
      try {
        // Create date range for fetching overrides
        const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
        const endDate = format(addMonths(new Date(year, month, 1), 1), 'yyyy-MM-dd');
        
        console.log(`Fetching shift overrides for ${authUser} from ${startDate} to ${endDate}`);
        
        // Fetch shift overrides from the database
        const { data, error } = await supabase
          .from('shift_overrides')
          .select('*')
          .eq('employee_id', authUser)
          .gte('date', startDate)
          .lt('date', endDate);
          
        if (error) throw error;
        
        // Log what we found
        console.log(`Found ${data?.length || 0} shift overrides for the month`);
        
        // Check specifically for InLieu shifts
        const inLieuShifts = data?.filter(shift => shift.shift_type === 'InLieu') || [];
        if (inLieuShifts.length > 0) {
          console.log(`Found ${inLieuShifts.length} InLieu shifts:`, inLieuShifts);
        } else {
          console.log('No InLieu shifts found for this month');
        }
        
        // Format overrides into map object by date
        const overridesMap: { [date: string]: { type: ShiftType; notes?: string } } = {};
        
        (data || []).forEach(override => {
          overridesMap[override.date] = {
            type: override.shift_type as ShiftType,
            notes: override.notes
          };
          
          // Debug what we're adding to the map
          if (override.shift_type === 'InLieu') {
            console.log(`Adding InLieu shift to overrides map for date: ${override.date}`);
          }
        });
        
        return overridesMap;
      } catch (error) {
        console.error('Error fetching shift overrides:', error);
        return {};
      }
    },
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch group changes if user is logged in
  const { data: groupChanges, isLoading: isGroupChangesLoading } = useQuery({
    queryKey: ['group-changes', authUser],
    queryFn: async () => {
      if (!authUser) return {};
      
      try {
        // Fetch group changes from the database
        const { data, error } = await supabase
          .from('group_changes')
          .select('*')
          .eq('employee_id', authUser)
          .order('effective_date', { ascending: true });
          
        if (error) throw error;
        
        // Format group changes into map object by date
        const changesMap: { [date: string]: { oldGroup: ShiftGroup; newGroup: ShiftGroup } } = {};
        
        (data || []).forEach(change => {
          changesMap[change.effective_date] = {
            oldGroup: change.old_group as ShiftGroup,
            newGroup: change.new_group as ShiftGroup
          };
        });
        
        return changesMap;
      } catch (error) {
        console.error('Error fetching group changes:', error);
        return {};
      }
    },
    enabled: !!authUser,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });
  
  // Fetch employee data if user is logged in
  const { data: employeeData, isLoading: isEmployeeLoading } = useQuery({
    queryKey: ['employee', authUser],
    queryFn: async () => {
      if (!authUser) return null;
      
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', authUser)
          .single();
          
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching employee data:', error);
        return null;
      }
    },
    enabled: !!authUser,
    staleTime: 60 * 60 * 1000, // 60 minutes
  });
  
  // Update employee settings when data changes
  useEffect(() => {
    if (employeeData) {
      // Update state with employee's preferences
      if (employeeData.shift_group) {
        setEmployeeGroup(employeeData.shift_group as ShiftGroup);
      }
      if (employeeData.schedule_type) {
        setScheduleType(employeeData.schedule_type as ScheduleType);
      }
    }
  }, [employeeData]);
  
  // Generate month data
  const monthData = !isHolidaysLoading && !isLeavesLoading && !isOverridesLoading
    ? generateMonthCalendar(
        year,
        month,
        employeeGroup,
        holidays || {},
        leaves || {},
        overrides || {},
        groupChanges || {}
      )
    : null;
  
  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Mutation to update shift override
  const updateShiftMutation = useMutation({
    mutationFn: async ({ date, shiftType, notes }: { date: string; shiftType: ShiftType; notes?: string }) => {
      if (!authUser) {
        throw new Error('User not authenticated');
      }
      
      // Check if there's an existing override for this date
      const { data: existing, error: fetchError } = await supabase
        .from('shift_overrides')
        .select('id, shift_type')
        .eq('employee_id', authUser)
        .eq('date', date)
        .maybeSingle();
        
      if (fetchError) throw fetchError;
      
      let result = { success: true, action: '' };
      
      // If changing from InLieu to another type, delete the in-lieu record
      if (existing?.shift_type === 'InLieu' && shiftType !== 'InLieu') {
        try {
          // Find and delete the in-lieu record for this date
          const { data: inLieuRecord, error: findError } = await supabase
            .from('in_lieu_records')
            .select('id, leave_days_added')
            .eq('employee_id', authUser)
            .lte('start_date', date)
            .gte('end_date', date)
            .maybeSingle();
            
          if (findError) {
            console.error('Error finding in-lieu record:', findError);
          } else if (inLieuRecord) {
            // Delete the in-lieu record
            const { error: deleteError } = await supabase
              .from('in_lieu_records')
              .delete()
              .eq('id', inLieuRecord.id);
              
            if (deleteError) {
              console.error('Error deleting in-lieu record:', deleteError);
            } else {
              // Update leave balance
              const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('annual_leave_balance')
                .eq('id', authUser)
                .single();
                
              if (!empError && employee) {
                const newBalance = Math.max(0, Number(employee.annual_leave_balance) - inLieuRecord.leave_days_added);
                await supabase
                  .from('employees')
                  .update({ annual_leave_balance: newBalance })
                  .eq('id', authUser);
              }
              
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: ['in-lieu'] });
              queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
            }
          }
        } catch (error) {
          console.error('Error handling in-lieu record deletion:', error);
        }
      }
      
      // Update or create shift override
      if (existing) {
        // Update existing override
        const { error } = await supabase
          .from('shift_overrides')
          .update({
            shift_type: shiftType,
            notes: notes === undefined ? null : notes,
            source: 'schedule_page'
          })
          .eq('id', existing.id);
          
        if (error) throw error;
        result.action = 'updated';
      } else {
        // Create new override
        const { error } = await supabase
          .from('shift_overrides')
          .insert({
            employee_id: authUser,
            date,
            shift_type: shiftType,
            notes: notes === undefined ? null : notes,
            source: 'schedule_page'
          });
          
        if (error) throw error;
        result.action = 'created';
      }
      
      // If the shift type is "Leave", create or update a leave record
      if (shiftType === 'Leave') {
        try {
          // Check if there's an existing leave record for this date
          const { data: existingLeave, error: leaveError } = await supabase
            .from('leaves')
            .select('id')
            .eq('employee_id', authUser)
            .lte('start_date', date)
            .gte('end_date', date)
            .eq('leave_type', 'Annual') // Assuming this is for annual leave
            .maybeSingle();
            
          if (leaveError) {
            console.error('Error checking for existing leave:', leaveError);
          } else if (!existingLeave) {
            // No existing leave record covering this date, create a new one-day leave
            const { error: insertError } = await supabase
              .from('leaves')
              .insert({
                employee_id: authUser,
                start_date: date,
                end_date: date,
                days_taken: 1, // Single day
                leave_type: 'Annual',
                reason: notes || 'Created from schedule page',
                status: 'Approved', // Auto-approve leaves created from schedule
                year: new Date(date).getFullYear()
              });
              
            if (insertError) {
              console.error('Error creating leave record:', insertError);
            } else {
              console.log(`Created leave record for ${date}`);
              // Invalidate leave-related queries
              queryClient.invalidateQueries({ queryKey: ['leaves'] });
            }
          }
        } catch (leaveError) {
          console.error('Exception when handling leave record:', leaveError);
          // Don't fail the whole operation if leave record creation fails
        }
      }
      
      // If shift type is "InLieu", create an in-lieu record
      if (shiftType === 'InLieu') {
        try {
          // Check if there's an existing in-lieu record for this date
          const { data: existingInLieu, error: inLieuError } = await supabase
            .from('in_lieu_records')
            .select('id')
            .eq('employee_id', authUser)
            .lte('start_date', date)
            .gte('end_date', date)
            .maybeSingle();
            
          if (inLieuError) {
            console.error('Error checking for existing in-lieu record:', inLieuError);
          } else if (!existingInLieu) {
            // Calculate leave days added (2/3 day credit per day worked in lieu)
            const leaveAdded = 0.667; // Standard rate for 1 day
            
            // Create a new in-lieu record
            const { error: insertError } = await supabase
              .from('in_lieu_records')
              .insert({
                employee_id: authUser,
                start_date: date,
                end_date: date,
                days_count: 1, // Single day
                leave_days_added: leaveAdded
              });
              
            if (insertError) {
              console.error('Error creating in-lieu record:', insertError);
            } else {
              console.log(`Created in-lieu record for ${date}`);
              // Invalidate leave-related queries
              queryClient.invalidateQueries({ queryKey: ['in-lieu'] });
              queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
            }
          }
        } catch (inLieuError) {
          console.error('Exception when handling in-lieu record:', inLieuError);
          // Don't fail the whole operation if in-lieu record creation fails
        }
      }
      
      // Handle overtime calculation
      if (shiftType === 'Overtime') {
        try {
          await updateUserOvertime(date, 24, authUser);
        } catch (error) {
          // If overtime update fails, don't block the shift update
          console.error('Failed to update overtime:', error);
        }
      } else {
        try {
          // If changing from overtime to another shift type, remove overtime record
          const { error: deleteError } = await supabase
            .from('salaries')
            .update({
              overtime_hours: 0,
              updated_at: new Date().toISOString()
            })
            .eq('employee_id', authUser)
            .eq('month', new Date(date).toISOString().substring(0, 7) + '-01');

          if (deleteError) {
            console.error('Failed to clear overtime:', deleteError);
          }
        } catch (error) {
          console.error('Failed to clear overtime:', error);
        }
      }
      
      return result;
    },
    onSuccess: (data, variables) => {
      // Show success message
      toast.success(`Shift for ${format(parseISO(variables.date), 'PPP')} ${data.action} successfully`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['shift-overrides', authUser, monthKey] });
      
      // Depending on shift type, invalidate other relevant queries
      if (variables.shiftType === 'Leave') {
        // Invalidate leave queries to reflect the new leave record
        queryClient.invalidateQueries({ queryKey: ['leaves', authUser] });
        queryClient.invalidateQueries({ queryKey: ['leaveBalance', authUser] });
      } else if (variables.shiftType === 'InLieu') {
        // Invalidate in-lieu queries to reflect the new in-lieu record
        queryClient.invalidateQueries({ queryKey: ['in-lieu', authUser] });
        queryClient.invalidateQueries({ queryKey: ['leaveBalance', authUser] });
      }
    },
    onError: (error) => {
      console.error('Error updating shift override:', error);
      toast.error(`Failed to update shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Mutation to update group
  const updateGroupMutation = useMutation({
    mutationFn: async ({ group, effectiveDate }: { group: ShiftGroup; effectiveDate: string }) => {
      if (!authUser) {
        throw new Error('User not authenticated');
      }
      
      // First, update the employee record
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          shift_group: group
        })
        .eq('id', authUser);
        
      if (updateError) throw updateError;
      
      // Then, record the group change
      const { error: changeError } = await supabase
        .from('group_changes')
        .insert({
          employee_id: authUser,
          old_group: employeeGroup,
          new_group: group,
          effective_date: effectiveDate,
          request_date: new Date().toISOString(),
          status: 'approved' // Auto-approve changes
        });
        
      if (changeError) throw changeError;
      
      return { success: true };
    },
    onSuccess: () => {
      // Show success message
      toast.success('Shift group updated successfully');
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['employee', authUser] });
      queryClient.invalidateQueries({ queryKey: ['group-changes', authUser] });
    },
    onError: (error) => {
      console.error('Error updating shift group:', error);
      toast.error(`Failed to update shift group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Mutation to update schedule type
  const updateScheduleTypeMutation = useMutation({
    mutationFn: async (type: ScheduleType) => {
      if (!authUser) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('employees')
        .update({
          schedule_type: type
        })
        .eq('id', authUser);
        
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: (_, newType) => {
      // Update local state
      setScheduleType(newType);
      
      // Show success message
      toast.success('Schedule type updated successfully');
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['employee', authUser] });
    },
    onError: (error) => {
      console.error('Error updating schedule type:', error);
      toast.error(`Failed to update schedule type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Update shift handler
  const updateShift = (date: string, shiftType: ShiftType, notes?: string) => {
    updateShiftMutation.mutate({ date, shiftType, notes });
  };
  
  // Update group handler
  const updateGroup = (group: ShiftGroup, effectiveDate?: string) => {
    // Use today's date as the effective date by default
    const finalEffectiveDate = effectiveDate || format(new Date(), 'yyyy-MM-dd');
    
    // Don't update if it's the same group
    if (group === employeeGroup) {
      return;
    }
    
    updateGroupMutation.mutate({ group, effectiveDate: finalEffectiveDate });
  };
  
  // Update schedule type handler
  const updateScheduleType = (type: ScheduleType) => {
    // Don't update if it's the same type
    if (type === scheduleType) {
      return;
    }
    
    updateScheduleTypeMutation.mutate(type);
  };
  
  // Return all needed data and functions
  return {
    currentDate,
    year,
    month,
    employeeGroup,
    scheduleType,
    monthData,
    employeeData,
    
    // Loading states
    isLoading: isHolidaysLoading || isLeavesLoading || isOverridesLoading || isEmployeeLoading || isGroupChangesLoading,
    
    // Navigation functions
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    
    // Update functions
    updateShift,
    updateGroup,
    updateScheduleType,
    
    // Mutation states
    isUpdatingShift: updateShiftMutation.isPending,
    isUpdatingGroup: updateGroupMutation.isPending,
    isUpdatingScheduleType: updateScheduleTypeMutation.isPending,
    
    // Refresh data function
    refreshData: () => {
      debugShift('Manual refresh of schedule data triggered');
      
      // Force refetch of all relevant queries
      if (authUser) {
        queryClient.invalidateQueries({ queryKey: ['holidays', monthKey] });
        queryClient.invalidateQueries({ queryKey: ['leaves', authUser, monthKey] });
        queryClient.invalidateQueries({ queryKey: ['shift-overrides', authUser, monthKey] });
        queryClient.invalidateQueries({ queryKey: ['group-changes', authUser] });
        
        // Force immediate refetch of shift overrides
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['shift-overrides', authUser, monthKey] });
        }, 100);
      }
    }
  };
} 