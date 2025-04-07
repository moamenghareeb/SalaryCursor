import { supabase } from './supabase';

/**
 * Directly delete overtime record for a specific date
 * @param date Date of the overtime in YYYY-MM-DD format
 * @param employeeId Employee ID to delete overtime for
 * @returns Promise resolving to the deletion result
 */
export const deleteOvertimeForDate = async (date: string, employeeId: string) => {
  console.log(`Deleting overtime for employee ${employeeId} on date ${date}`);
  
  try {
    const { data, error } = await supabase
      .from('overtime')
      .delete()
      .eq('employee_id', employeeId)
      .eq('date', date);
      
    if (error) {
      console.error('Error deleting overtime record:', error);
      throw error;
    }
    
    console.log('Successfully deleted overtime record');
    
    // After deletion, update the salary record
    return updateUserOvertime(date, 0, employeeId, true);
  } catch (error) {
    console.error('Error in deleteOvertimeForDate:', error);
    throw error;
  }
};

// Function to update user overtime in the database
export const updateUserOvertime = async (date: string, hours: number, employeeId: string, forceRecalculate = false) => {
  try {
    console.log(`Updating overtime: date=${date}, hours=${hours}, employeeId=${employeeId}, forceRecalculate=${forceRecalculate}`);
    
    // Calculate the month start date
    const monthStart = new Date(date);
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().substring(0, 7) + '-01';

    // If force recalculating due to removal of overtime, make sure the entry is deleted
    if (forceRecalculate && hours === 0) {
      // Delete the overtime record if it exists
      console.log(`Forced recalculation - deleting overtime record for ${date}`);
      
      const { error: deleteError } = await supabase
        .from('overtime')
        .delete()
        .eq('employee_id', employeeId)
        .eq('date', date);

      if (deleteError) {
        console.error('Error deleting overtime record:', deleteError);
      } else {
        console.log('Successfully deleted overtime record during forced recalculation');
      }
    }
    
    // If not force recalculating, ensure the overtime record exists in the overtime table
    if (hours > 0 && !forceRecalculate) {
      console.log(`Adding/updating overtime record for ${date} with ${hours} hours`);
      
      const { error: overtimeError } = await supabase
        .from('overtime')
        .upsert({
          employee_id: employeeId,
          date: date,
          hours: hours,
          source: 'schedule'
        }, {
          onConflict: 'employee_id,date'
        });

      if (overtimeError) {
        console.error('Error updating overtime record:', overtimeError);
        throw overtimeError;
      }
    }

    // Now fetch all overtime entries for this month to calculate the total
    console.log(`Fetching all overtime entries for month ${monthKey}`);
    
    const { data: overtimeEntries, error: fetchError } = await supabase
      .from('overtime')
      .select('hours, date')
      .eq('employee_id', employeeId)
      .gte('date', monthStart.toISOString().substring(0, 7) + '-01')
      .lt('date', new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString().substring(0, 10));

    if (fetchError) {
      console.error('Error fetching overtime entries:', fetchError);
      throw fetchError;
    }

    // Calculate total overtime hours for the month
    const totalOvertimeHours = overtimeEntries?.reduce((total, entry) => total + (entry.hours || 0), 0) || 0;
    console.log(`Total overtime hours for ${monthKey}: ${totalOvertimeHours}`);
    console.log('Overtime entries:', overtimeEntries);

    // Update the salaries table with the new overtime total
    console.log(`Updating salary record for ${monthKey} with ${totalOvertimeHours} overtime hours`);
    
    const { error: salaryError } = await supabase
      .from('salaries')
      .upsert({
        employee_id: employeeId,
        month: monthKey,
        overtime_hours: totalOvertimeHours
      }, {
        onConflict: 'employee_id,month'
      });

    if (salaryError) {
      console.error('Error updating salary record:', salaryError);
      throw salaryError;
    }

    // Calculate overtime pay and update the salary record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('basic_salary, cost_of_living')
      .eq('id', employeeId)
      .single();
      
    if (!employeeError && employee) {
      const basicSalary = employee.basic_salary || 0;
      const costOfLiving = employee.cost_of_living || 0;
      const hourlyRate = (basicSalary + costOfLiving) / 210;
      const overtimePay = hourlyRate * totalOvertimeHours;
      
      // Update the overtime pay field
      console.log(`Updating overtime pay to ${overtimePay}`);
      
      const { error: updatePayError } = await supabase
        .from('salaries')
        .update({ overtime_pay: overtimePay })
        .eq('employee_id', employeeId)
        .eq('month', monthKey);
        
      if (updatePayError) {
        console.error('Error updating overtime pay:', updatePayError);
      }

      // If there are no overtime entries and we're force recalculating,
      // make sure overtime values are explicitly set to zero
      if (forceRecalculate && overtimeEntries?.length === 0) {
        console.log('No overtime entries found, explicitly setting to zero');
        
        const { error: zeroUpdateError } = await supabase
          .from('salaries')
          .update({ 
            overtime_hours: 0,
            overtime_pay: 0 
          })
          .eq('employee_id', employeeId)
          .eq('month', monthKey);
          
        if (zeroUpdateError) {
          console.error('Error setting overtime to zero:', zeroUpdateError);
        } else {
          console.log('Successfully set overtime to zero for month with no entries');
        }
      }
    }

    console.log('Overtime updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating overtime:', error);
    // Don't throw the error, just log it and return failure
    // This prevents the shift update from failing if overtime update fails
    return { success: false, error };
  }
};
