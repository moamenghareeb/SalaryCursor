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
        console.log(`Setting employee group to: ${employeeData.shift_group}`);
        setEmployeeGroup(employeeData.shift_group as ShiftGroup);
      }
      
      if (employeeData.schedule_type) {
        setScheduleType(employeeData.schedule_type as ScheduleType);
      }
    }
  }, [employeeData]);
  
  // Add logging when employeeGroup changes
  useEffect(() => {
    console.log(`Current employee group: ${employeeGroup}`);
  }, [employeeGroup]);
  
  // Generate month data with added logging
  const monthData = !isHolidaysLoading && !isLeavesLoading && !isOverridesLoading
    ? (() => {
        console.log(`Generating calendar for ${year}-${month+1} with group ${employeeGroup}`);
        return generateMonthCalendar(
          year,
          month,
          employeeGroup,
          holidays || {},
          leaves || {},
          overrides || {},
          groupChanges || {}
        );
      })()
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
  
  // Direct date setter function
  const setDate = (date: Date) => {
    setCurrentDate(date);
  };
  
  // Mutation to update shift override
  const updateShiftMutation = useMutation({
    mutationFn: async ({ date, shiftType, notes }: { date: string; shiftType: ShiftType; notes?: string }) => {
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Get the existing shift override (if any) to check the *previous* type
      const { data: existingOverride, error: fetchError } = await supabase
        .from('shift_overrides')
        .select('id, shift_type')
        .eq('employee_id', authUser)
        .eq('date', date)
        .maybeSingle();
        
      if (fetchError) throw fetchError;
      
      const previousShiftType = existingOverride?.shift_type;
      
      console.log(`[Update Shift] Date: ${date}, New Shift: ${shiftType}, Previous Shift: ${previousShiftType}`);

      // Determine if we are changing *from* Overtime
      const changingFromOvertime = previousShiftType === 'Overtime' && shiftType !== 'Overtime';
      console.log(`[Update Shift] Is changing from Overtime? ${changingFromOvertime}`);

      // If adding an overtime shift (or keeping it)
      if (shiftType === 'Overtime') {
        try {
          console.log(`[Update Shift] Adding/Updating overtime for ${date}`);
          // Add/Update overtime record
          const { error: overtimeError } = await supabase
            .from('overtime')
            .upsert({
              employee_id: authUser,
              date: date,
              hours: 24, // Standard shift length
              source: 'schedule'
            }, {
              onConflict: 'employee_id,date'
            });

          if (overtimeError) {
            console.error('[Update Shift] Error recording overtime:', overtimeError);
          }

          // Recalculate salary for the month
          console.log(`[Update Shift] Triggering salary recalculation after adding overtime for ${date}...`);
          await recalculateSalaryOvertime(date, authUser);
          
        } catch (error) {
          console.error('[Update Shift] Error handling overtime addition:', error);
        }
      } 
      // If specifically changing *away* from an overtime shift
      else if (changingFromOvertime) {
        try {
          console.log(`[Overtime Removal] Condition met. Attempting to delete overtime for user ${authUser} on date ${date}.`);
          // Delete from overtime tracking
          const { data: deleteData, error: deleteError } = await supabase
            .from('overtime')
            .delete()
            .eq('employee_id', authUser)
            .eq('date', date)
            .select(); // Add select() to get feedback on what was deleted

          if (deleteError) {
            console.error(`[Overtime Removal] Failed to delete overtime tracking for ${date}:`, deleteError);
            toast.error(`Failed to remove overtime record for ${date}. DB Error: ${deleteError.message}`);
          } else {
             console.log(`[Overtime Removal] Successfully executed delete for ${date}. Records affected: ${deleteData?.length || 0}`, deleteData);
             if (deleteData?.length > 0) {
               toast.success(`Overtime record for ${date} removed.`);
             } else {
               console.warn(`[Overtime Removal] Delete command executed but no matching overtime record found for user ${authUser} on ${date}.`);
               // Use standard toast for warning
               toast(`No overtime record found to remove for ${date}.`, { icon: '⚠️' }); 
             }
          }

          // Recalculate salary for the month after attempting deletion
          console.log(`[Overtime Removal] Triggering salary recalculation for ${date}...`);
          await recalculateSalaryOvertime(date, authUser);
          
        } catch (error) {
          console.error('[Overtime Removal] Error during overtime removal process:', error);
          toast.error('An error occurred while removing overtime. Please check console.');
        }
      }

      // If removing a leave (changing from Leave to something else)
      if (previousShiftType === 'Leave' && shiftType !== 'Leave') {
        try {
          // Find and delete the leave record for this date
          const { data: leaveRecord, error: findError } = await supabase
            .from('leaves')
            .select('id, days_taken')
            .eq('employee_id', authUser)
            .lte('start_date', date)
            .gte('end_date', date)
            .maybeSingle();
            
          if (findError) {
            console.error('Error finding leave record:', findError);
          } else if (leaveRecord) {
            // Delete the leave record
            const { error: deleteError } = await supabase
              .from('leaves')
              .delete()
              .eq('id', leaveRecord.id);
              
            if (deleteError) {
              console.error('Error deleting leave record:', deleteError);
            } else {
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: ['leaves'] });
              queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
            }
          }
        } catch (error) {
          console.error('Error handling leave record deletion:', error);
        }
      }
      
      // If changing from InLieu to another type, delete the in-lieu record
      if (previousShiftType === 'InLieu' && shiftType !== 'InLieu') {
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
      
      // Update or create shift override - this happens regardless of overtime/leave changes
      console.log(`[Update Shift] Updating/Creating shift override for ${date} to type ${shiftType}`);
      let result = { success: true, action: '' };
      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('shift_overrides')
          .update({
            shift_type: shiftType,
            notes: notes === undefined ? null : notes,
            source: 'schedule_page'
          })
          .eq('id', existingOverride.id);
          
        if (error) {
           console.error('[Update Shift] Error updating shift override:', error);
           throw error;
        }
        result.action = 'updated';
        console.log(`[Update Shift] Successfully updated override for ${date}`);
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
          
        if (error) {
           console.error('[Update Shift] Error creating shift override:', error);
           throw error;
        }
        result.action = 'created';
        console.log(`[Update Shift] Successfully created override for ${date}`);
      }
      
      return result;
    },
    onSuccess: (data, variables) => {
      // Show success message
      toast.success(`Shift for ${format(parseISO(variables.date), 'PPP')} ${data.action} successfully`);
      
      // Get the month for the changed date
      const month = variables.date.substring(0, 7);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['shift-overrides', authUser, month] });
      queryClient.invalidateQueries({ queryKey: ['overtime', authUser, month] });
      queryClient.invalidateQueries({ queryKey: ['salaries', authUser, month] });
      
      // Force immediate refetch of salary data
      queryClient.refetchQueries({ queryKey: ['salaries'] });
      queryClient.refetchQueries({ queryKey: ['overtime'] });
      
      // Delay and force another refetch to ensure data is updated
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['salaries'] });
        queryClient.refetchQueries({ queryKey: ['overtime'] });
      }, 500);
      
      // If it was an overtime change, make a more specific refetch
      if (variables.shiftType === 'Overtime' || variables.date) {
        // Extract the month from the date to update month-specific queries
        const monthDate = new Date(variables.date);
        const monthKey = monthDate.toISOString().substring(0, 7);
        
        // Force refetch of any salary data for this specific month
        queryClient.invalidateQueries({ queryKey: ['salaries', authUser, monthKey] });
        queryClient.invalidateQueries({ queryKey: ['overtime', authUser, monthKey] });
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
      
      // Allow any valid group selection
      console.log(`Group change requested to: ${group}, effective from: ${effectiveDate}`);
      
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
    onSuccess: (_, variables) => {
      // Show success message
      toast.success(`Your shift group has been set to Group ${variables.group}`);
      
      // Update local state immediately
      setEmployeeGroup(variables.group);
      
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
  
  // Helper function to recalculate salary overtime for a given month
  const recalculateSalaryOvertime = async (date: string, employeeId: string) => {
    const monthStart = new Date(date);
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().substring(0, 7) + '-01';
    
    console.log(`[Recalc Salary] Recalculating overtime for ${monthKey}`);

    try {
      // Get all overtime entries for the month
      const { data: overtimeEntries, error: overtimeError } = await supabase
        .from('overtime')
        .select('hours')
        .eq('employee_id', employeeId)
        .gte('date', monthKey)
        .lt('date', new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString().substring(0, 10));
        
      if (overtimeError) {
        throw new Error(`[Recalc Salary] Error fetching overtime entries: ${overtimeError.message}`);
      }

      // Calculate total overtime hours
      const totalOvertimeHours = overtimeEntries?.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
      console.log(`[Recalc Salary] Total overtime hours for ${monthKey}: ${totalOvertimeHours}`);

      // Get current salary record to calculate pay AND check existence
      const { data: currentSalary, error: fetchError } = await supabase
        .from('salaries')
        .select('id, basic_salary, cost_of_living') // Select id to check existence
        .eq('employee_id', employeeId)
        .eq('month', monthKey)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No row found
        throw new Error(`[Recalc Salary] Error fetching salary record: ${fetchError.message}`);
      }

      // If no salary record exists for this month, we can't update it.
      if (!currentSalary) {
        console.log(`[Recalc Salary] No existing salary record found for ${monthKey}. Skipping update.`);
        // Optionally, notify user or handle differently if needed.
        return; 
      }

      // Calculate overtime pay using the fetched salary data
      const basicSalary = currentSalary.basic_salary || 0;
      const costOfLiving = currentSalary.cost_of_living || 0;
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const overtimePay = hourlyRate * totalOvertimeHours;

      console.log(`[Recalc Salary] Calculated overtime pay for ${monthKey}: ${overtimePay}`);

      // *Update* the existing salary record with recalculated values (DO NOT UPSERT)
      const { error: updateError } = await supabase
        .from('salaries')
        .update({ // Use update instead of upsert
          overtime_hours: totalOvertimeHours,
          overtime_pay: overtimePay
        })
        .eq('employee_id', employeeId) // Match existing record
        .eq('month', monthKey);

      if (updateError) {
        throw new Error(`[Recalc Salary] Failed to update salary overtime: ${updateError.message}`);
      } else {
        console.log(`[Recalc Salary] Salary overtime updated successfully for ${monthKey}: ${totalOvertimeHours} hours, ${overtimePay} pay`);
        // Force refresh of related queries to update UI
        queryClient.invalidateQueries({ queryKey: ['salaries'] });
        queryClient.invalidateQueries({ queryKey: ['overtime'] });
        // Delay refetch slightly to allow DB changes to propagate
        setTimeout(() => {
           queryClient.refetchQueries({ queryKey: ['salaries'] });
           queryClient.refetchQueries({ queryKey: ['overtime'] });
        }, 100);
      }
    } catch (error) {
      console.error('[Recalc Salary] Error recalculating salary overtime:', error);
      toast.error(`Error updating salary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    setDate,
    
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