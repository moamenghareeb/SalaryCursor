import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const calculation = req.body;
      
      const { data, error } = await supabase
        .from('salary_calculations')
        .insert([calculation])
        .select()
        .single();

      if (error) {
        console.error('Error saving calculation:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
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
        .from('salary_calculations')
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