import { supabase } from './supabase';
import { ShiftGroup, ScheduleType } from './types/schedule';

/**
 * Initialize schedule preferences for an employee
 * This function will create the schedule_preferences object for an employee
 * if it doesn't exist already.
 */
export async function initializeSchedulePreferences(
  userId?: string,
  options: {
    scheduleType?: ScheduleType;
    shiftGroup?: ShiftGroup;
    defaultWorkHours?: {
      start: string;
      end: string;
    }
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
      shiftGroup: options.shiftGroup || 'C', // Default to group C
      defaultWorkHours: options.defaultWorkHours || {
        start: '09:00',
        end: '17:00'
      }
    };

    // First check if employee exists and has schedule_preferences
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, schedule_preferences')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching employee:', fetchError);
      throw fetchError;
    }

    // If employee doesn't exist, create a new one
    if (!employee) {
      const { error: insertError } = await supabase
        .from('employees')
        .insert({
          id: userId,
          schedule_preferences: finalOptions,
          shift_group: finalOptions.shiftGroup,
          schedule_type: finalOptions.scheduleType
        });

      if (insertError) {
        console.error('Error creating employee with schedule preferences:', insertError);
        throw insertError;
      }

      return { success: true, action: 'created' };
    }

    // If employee exists but doesn't have schedule_preferences, update it
    if (!employee.schedule_preferences) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          schedule_preferences: finalOptions,
          shift_group: finalOptions.shiftGroup,
          schedule_type: finalOptions.scheduleType
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating employee with schedule preferences:', updateError);
        throw updateError;
      }

      return { success: true, action: 'updated' };
    }

    // If employee already has schedule preferences, do nothing
    return { success: true, action: 'none' };
  } catch (error) {
    console.error('Error initializing schedule preferences:', error);
    return { success: false, error };
  }
} 