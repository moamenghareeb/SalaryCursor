import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

// Import your get30DayAverageRate and saveExchangeRate functions
import { get30DayAverageRate, saveExchangeRate } from '../../../lib/exchange-rate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize Supabase server client (with cookies)
  const supabaseServerClient = createServerSupabaseClient({ req, res });

  try {
    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabaseServerClient.auth.getSession();
    
    if (authError || !session) {
      return res.status(401).json({ error: 'Unauthorized - Not authenticated' });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Check if user is an admin
    const { data: employee, error: employeeError } = await supabaseServerClient
      .from('employees')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (employeeError || !employee) {
      return res.status(401).json({ error: 'Unauthorized - Employee not found' });
    }

    if (!employee.is_admin) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // User is authenticated and is an admin, proceed with rate update
    const newRate = await get30DayAverageRate();
    
    if (newRate) {
      saveExchangeRate(newRate);
      return res.status(200).json({ success: true, rate: newRate });
    } else {
      return res.status(500).json({ error: 'Failed to fetch new rate' });
    }
  } catch (error) {
    console.error('Error in admin update-exchange-rate:', error);
    return res.status(500).json({ error: 'Server error' });
  }
} 