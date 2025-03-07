import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Fetch employee data
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', user.id)
      .single();

    if (employeeError) {
      throw employeeError;
    }

    // Fetch leave statistics
    const { data: leaveData, error: leaveError } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', user.id);

    if (leaveError) {
      throw leaveError;
    }

    // Calculate statistics
    const currentYear = new Date().getFullYear();
    const currentYearLeaves = leaveData?.filter(leave => 
      new Date(leave.start_date).getFullYear() === currentYear
    ) || [];

    const totalLeaveTaken = currentYearLeaves.reduce((sum, leave) => 
      sum + leave.days_taken, 0
    );

    const stats = {
      totalEmployees: 1, // Since this is for a single employee
      totalLeaveTaken,
      remainingLeave: (employeeData?.annual_leave_balance || 0) - totalLeaveTaken,
      recentLeaveRequests: currentYearLeaves.slice(0, 5)
    };

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics',
      error: error.message 
    });
  }
} 