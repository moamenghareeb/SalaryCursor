import { supabase } from './supabase';
import { ShiftGroup, ScheduleType } from './types/schedule';

/**
 * Initialize schedule preferences for an employee
 * This function will set up the necessary shift group and schedule type
 * for an employee if they aren't already set.
 */
export async function initializeSchedulePreferences(
  userId?: string,
  options: {
    scheduleType?: ScheduleType;
    shiftGroup?: ShiftGroup;
  } = {}
) {
  try {
    // Get current user if userId not provided
    if (!userId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('User not authenticated');
      }
      userId = session.user.id;
    }

    // Set default options
    const finalOptions = {
      scheduleType: options.scheduleType || 'shift',
      shiftGroup: options.shiftGroup || 'C' // Default to group C
    };

    // First check if employee exists
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, shift_group, schedule_type')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching employee:', fetchError);
      throw fetchError;
    }

    // If employee doesn't exist, create a new one
    if (!employee) {
      const { error: insertError } = await supabase
        .from('employees')
        .insert({
          id: userId,
          shift_group: finalOptions.shiftGroup,
          schedule_type: finalOptions.scheduleType,
          // Add any other required fields for your employees table
          name: 'Employee', // You may need to adjust these default values
          email: '',       // based on your table requirements
          position: 'Staff'
        });

      if (insertError) {
        console.error('Error creating employee:', insertError);
        throw insertError;
      }

      return { success: true, action: 'created' };
    }

    // If employee exists but shift_group or schedule_type are not set, update them
    if (!employee.shift_group || !employee.schedule_type) {
      const updates: any = {};
      
      if (!employee.shift_group) {
        updates.shift_group = finalOptions.shiftGroup;
      }
      
      if (!employee.schedule_type) {
        updates.schedule_type = finalOptions.scheduleType;
      }
      
      // Only update if there are changes to make
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('employees')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating employee:', updateError);
          throw updateError;
        }

        return { success: true, action: 'updated' };
      }
    }

    // If employee already has preferences set up, do nothing
    return { success: true, action: 'none' };
  } catch (error) {
    console.error('Error initializing schedule preferences:', error);
    return { success: false, error };
  }
} 