import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const calculation = req.body;
      
      // Try to find existing record for this employee and month
      const { data: existingRecord, error: findError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', calculation.employee_id)
        .eq('month', calculation.month || `${new Date().toISOString().substring(0, 7)}-01`)
        .single();
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('salaries')
          .update(calculation)
          .eq('id', existingRecord.id)
          .select()
          .single();
          
        result = { data, error };
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('salaries')
          .insert([calculation])
          .select()
          .single();
          
        result = { data, error };
      }

      if (result.error) {
        console.error('Error saving calculation:', result.error);
        return res.status(500).json({ error: result.error.message });
      }

      return res.status(200).json(result.data);
    } catch (error) {
      console.error('Error in salary_calculations API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      const { employee_id } = req.query;

      if (!employee_id) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching calculations:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in salary_calculations API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 