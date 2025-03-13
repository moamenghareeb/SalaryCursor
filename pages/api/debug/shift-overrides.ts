import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { format, endOfMonth } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This is a debugging endpoint, only available in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Get the latest session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    // If not authenticated, return dummy data for debugging
    const testUserId = userId || '00000000-0000-0000-0000-000000000000';
    
    // Parse month parameter (YYYY-MM)
    const monthParam = req.query.month as string;
    let startDate: string;
    let endDate: string;
    
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split('-').map(Number);
      const dateObj = new Date(year, month - 1, 1); // Months are 0-indexed in JS
      startDate = format(dateObj, 'yyyy-MM-dd');
      endDate = format(endOfMonth(dateObj), 'yyyy-MM-dd');
    } else {
      // Default to current month
      const now = new Date();
      startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    }
    
    // Get shift overrides for the specified month
    const { data: overrides, error } = await supabase
      .from('shift_overrides')
      .select('*')
      .eq('employee_id', testUserId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching shift overrides:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Count in-lieu shifts
    const inLieuShifts = overrides?.filter(o => o.shift_type === 'InLieu') || [];
    
    return res.status(200).json({
      period: {
        startDate,
        endDate
      },
      userId: testUserId,
      isAuthenticated: !!userId,
      total: overrides?.length || 0,
      inLieuCount: inLieuShifts.length,
      hasInLieu: inLieuShifts.length > 0,
      inLieuShifts,
      allOverrides: overrides || []
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 