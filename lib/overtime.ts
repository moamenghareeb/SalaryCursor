import { supabase } from '../lib/supabase';

// Function to update user overtime in the database
export const updateUserOvertime = async (date: string, hours: number) => {
  try {
    // Assuming we have the employee ID available (this should be passed or accessed somehow)
    const employeeId = 'employee_id_here'; // Replace with actual employee ID logic

    // Update the overtime record in the database
    const { data, error } = await supabase
      .from('overtime')
      .insert({
        employee_id: employeeId,
        date: date,
        hours: hours,
      });

    if (error) {
      throw error;
    }

    console.log('Overtime updated successfully:', data);
  } catch (error) {
    console.error('Error updating overtime:', error);
    throw new Error('Failed to update overtime.');
  }
};
