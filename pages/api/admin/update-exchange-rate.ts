import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { get30DayAverageRate, saveExchangeRate } from '../../../lib/exchange-rate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No valid token provided' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    // Verify the token and get user data
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Check if user is an admin
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (employeeError || !employee) {
      return res.status(401).json({ error: 'Unauthorized - Employee not found' });
    }

    if (!employee.is_admin) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // User is authenticated and is an admin, proceed with rate update
    const newRate = await get30DayAverageRate();
    
    if (!newRate) {
      return res.status(500).json({ error: 'Failed to fetch new rate' });
    }

    // Save the new rate to database and cache
    const success = await saveExchangeRate(newRate);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save new rate' });
    }

    return res.status(200).json({ success: true, rate: newRate });

  } catch (error) {
    console.error('Error in update-exchange-rate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 