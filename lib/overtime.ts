import { supabase } from './supabase';

// Function to update user overtime in the database
export const updateUserOvertime = async (date: string, hours: number, employeeId: string) => {
  try {
    // Calculate the month start date
    const monthStart = new Date(date);
    monthStart.setDate(1);

    // Get current overtime hours for the month
    const { data: currentSalary, error: fetchError } = await supabase
      .from('salaries')
      .select('overtime_hours')
      .eq('employee_id', employeeId)
      .eq('month', monthStart.toISOString().substring(0, 7) + '-01')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError;
    }

    // Calculate new overtime hours (add to existing if any)
    const currentHours = currentSalary?.overtime_hours || 0;
    const newHours = currentHours + hours;

    // Update the salaries table with the new overtime total
    const { error: salaryError } = await supabase
      .from('salaries')
      .upsert({
        employee_id: employeeId,
        month: monthStart.toISOString().substring(0, 7) + '-01',
        overtime_hours: newHours,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,month'
      });

    if (salaryError) {
      throw salaryError;
    }

    console.log('Overtime updated successfully');
  } catch (error) {
    console.error('Error updating overtime:', error);
    // Don't throw the error, just log it
    // This prevents the shift update from failing if overtime update fails
  }
};
