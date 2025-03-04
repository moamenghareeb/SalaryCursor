import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle GET request to fetch salary data
  if (req.method === 'GET') {
    const { employee_id, month } = req.query;
    
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    try {
      let query = supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee_id);
      
      // If month is provided, filter by month
      if (month) {
        query = query.eq('month', month);
      }
      
      // Order by month descending (newest first)
      query = query.order('month', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error on GET:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching salary data:', error);
      return res.status(500).json({ error: 'Failed to fetch salary data' });
    }
  }
  
  // Handle POST request to save salary data
  if (req.method === 'POST') {
    const salaryData = req.body;
    
    if (!salaryData.employee_id || !salaryData.month) {
      return res.status(400).json({ error: 'Employee ID and month are required' });
    }
    
    try {
      // Check if a record already exists for this employee and month
      let existingRecord = null;
      const { data: recordData, error: checkError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', salaryData.employee_id)
        .eq('month', salaryData.month)
        .single();
      
      if (recordData) {
        existingRecord = recordData;
      }
      
      // Handle schema cache errors with a direct refresh
      if (checkError && checkError.message.includes('schema cache')) {
        console.log('Schema cache error detected, attempting to refresh...');
        
        try {
          // Force schema cache refresh with direct SQL
          const { error: refreshError } = await supabase.rpc('refresh_schema_cache');
          
          if (refreshError) {
            console.error('Error refreshing schema cache via RPC:', refreshError);
            
            // If RPC fails, try direct SQL as fallback
            const { error: sqlError } = await supabase.from('_temp_forced_refresh').select('*').limit(1);
            console.log('Forced fallback schema refresh result:', sqlError ? 'Error' : 'Success');
          }
          
          // Wait for cache to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (refreshErr) {
          console.error('Error during schema refresh attempt:', refreshErr);
        }
        
        // Try checking again after refresh
        const { data: recheckedRecord, error: recheckError } = await supabase
          .from('salaries')
          .select('id')
          .eq('employee_id', salaryData.employee_id)
          .eq('month', salaryData.month)
          .single();
        
        if (recheckError && recheckError.code !== 'PGRST116') {
          console.error('Error rechecking after schema refresh:', recheckError);
          return res.status(500).json({ error: `Database error: ${recheckError.message}` });
        }
        
        if (recheckedRecord) {
          existingRecord = recheckedRecord;
        }
      } else if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected if no record exists
        console.error('Error checking existing record:', checkError);
        return res.status(500).json({ error: `Database error: ${checkError.message}` });
      }
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('salaries')
          .update(salaryData)
          .eq('id', existingRecord.id);
      } else {
        // Insert new record
        result = await supabase
          .from('salaries')
          .insert(salaryData);
      }
      
      if (result.error) {
        console.error('Error saving salary data:', result.error);
        return res.status(500).json({ error: `Failed to save salary data: ${result.error.message}` });
      }
      
      return res.status(200).json({ message: 'Salary data saved successfully' });
    } catch (error) {
      console.error('Unexpected error saving salary data:', error);
      return res.status(500).json({ 
        error: 'An unexpected error occurred while saving salary data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
} 