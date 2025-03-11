import { NextApiRequest, NextApiResponse } from 'next';
import { saveExchangeRate } from '../../../lib/exchange-rate';
import { supabase } from '../../../lib/supabase';

// Default fallback rate
const DEFAULT_EXCHANGE_RATE = 50.60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session from request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Check if user is admin
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (employeeError || !employeeData || !employeeData.is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Allow manual specification of rate in the request body
    let rate = DEFAULT_EXCHANGE_RATE;
    
    if (req.body && req.body.rate && typeof req.body.rate === 'number') {
      rate = parseFloat(req.body.rate.toFixed(2));
    } else {
      // Try to fetch the latest rate from APIs first
      try {
        // Use a direct fetch to get the rate
        const response = await fetch('https://api.exchangerate.host/latest?base=USD');
        if (response.ok) {
          const data = await response.json();
          if (data.rates && data.rates.EGP) {
            rate = parseFloat(data.rates.EGP.toFixed(2));
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch current rate:', fetchError);
        // Continue with default rate if fetch fails
      }
    }

    // Save the rate to the database and cache
    const success = await saveExchangeRate(rate);

    if (success) {
      return res.status(200).json({ 
        success: true, 
        rate,
        message: `Exchange rate updated successfully to ${rate} EGP per USD`
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to save exchange rate',
        rate // Return the rate even though save failed
      });
    }
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 