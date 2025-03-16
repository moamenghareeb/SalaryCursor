import { supabase } from './supabase';

// Function to update user overtime in the database
export const updateUserOvertime = async (date: string, hours: number, employeeId: string) => {
  try {
    // Check if there's an existing overtime record for this date
    const { data: existing, error: checkError } = await supabase
      .from('overtime')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('overtime')
        .update({
          hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('overtime')
        .insert({
          employee_id: employeeId,
          date,
          hours,
          source: 'schedule'
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Calculate and update monthly overtime total in salaries table
    const monthStart = new Date(date);
    monthStart.setDate(1); // Set to first day of month

    const { data: monthlyTotal, error: totalError } = await supabase
      .rpc('calculate_monthly_overtime_total', {
        p_employee_id: employeeId,
        p_month: monthStart.toISOString()
      });

    if (totalError) {
      throw totalError;
    }

    // Update the salaries table with the new overtime total
    const { error: salaryError } = await supabase
      .from('salaries')
      .update({
        overtime_hours: monthlyTotal,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('month', monthStart.toISOString().substring(0, 7) + '-01');

    if (salaryError) {
      throw salaryError;
    }

    console.log('Overtime updated successfully');
  } catch (error) {
    console.error('Error updating overtime:', error);
    throw new Error('Failed to update overtime.');
  }
};
