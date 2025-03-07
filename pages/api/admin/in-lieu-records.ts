import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Using the admin client for privileged operations
  const supabase = supabaseAdmin;
  
  // Extract the authorization token
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  
  try {
    // Verify the user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const userId = userData.user.id;
    
    // Check if user is an admin
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (employeeError) throw employeeError;
    
    if (!employeeData.is_admin) {
      return res.status(403).json({ error: 'Not authorized. Admin access required.' });
    }
    
    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Get all in-lieu records with employee information
      const { data, error } = await supabase
        .from('in_lieu_records')
        .select(`
          *,
          employees:employee_id (
            name,
            email,
            employee_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      // Create an in-lieu record for an employee
      const { employee_id, start_date, end_date } = req.body;
      
      if (!employee_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Calculate days between dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
      
      // Calculate additional leave days (0.667 per day)
      const additionalBalance = Number((days * 0.667).toFixed(2));
      
      // Get employee's current leave balance
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('annual_leave_balance')
        .eq('id', employee_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newBalance = Number(employee.annual_leave_balance || 0) + additionalBalance;
      
      // Update employee's leave balance
      const { error: updateError } = await supabase
        .from('employees')
        .update({ annual_leave_balance: newBalance })
        .eq('id', employee_id);
      
      if (updateError) throw updateError;
      
      // Create in-lieu record
      const { data: record, error: insertError } = await supabase
        .from('in_lieu_records')
        .insert({
          employee_id,
          start_date,
          end_date,
          days_count: days,
          leave_days_added: additionalBalance
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return res.status(201).json({
        message: 'In-lieu time added successfully',
        daysAdded: additionalBalance,
        newBalance,
        record
      });
      
    } else if (req.method === 'DELETE') {
      // Delete an in-lieu record
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing record ID' });
      }
      
      // Get the record to be deleted
      const { data: recordToDelete, error: fetchError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!recordToDelete) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      // Get current employee balance
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('annual_leave_balance')
        .eq('id', recordToDelete.employee_id)
        .single();
      
      if (empError) throw empError;
      
      // Calculate new balance
      const newBalance = Math.max(0, Number(employee.annual_leave_balance) - recordToDelete.leave_days_added);
      
      // Update employee balance
      const { error: updateError } = await supabase
        .from('employees')
        .update({ annual_leave_balance: newBalance })
        .eq('id', recordToDelete.employee_id);
      
      if (updateError) throw updateError;
      
      // Delete the record
      const { error: deleteError } = await supabase
        .from('in_lieu_records')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      return res.status(200).json({
        message: 'Record deleted successfully',
        daysRemoved: recordToDelete.leave_days_added,
        newBalance
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
} 