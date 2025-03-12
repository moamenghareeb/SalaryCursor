import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

interface YearlySalaryResponse {
  year: number;
  totalSalary: number;
  averageSalary: number;
  monthlyBreakdown: {
    month: number;
    name: string;
    total: number;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for token in Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  // Extract the token
  const token = authHeader.substring(7);
  console.log('[DEBUG] Using token from Authorization header');

  // Verify the token
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !userData.user) {
    console.error('Authentication error:', authError);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // User is authenticated - proceed
  console.log(`User authenticated via token: ${userData.user.email}`);

  if (req.method === 'GET') {
    const { employee_id, year } = req.query;
    
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Verify that the authenticated user is requesting their own data or is an admin
    if (userData.user.id !== employee_id) {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .from('employees')
        .select('is_admin')
        .eq('id', userData.user.id)
        .single();
      
      if (adminError || !adminCheck || !adminCheck.is_admin) {
        return res.status(403).json({ error: 'You can only access your own salary data' });
      }
    }
    
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    try {
      // Fetch all salary records for the specified year
      let query = supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee_id);
      
      // Order by month ascending
      query = query.order('month', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error on GET:', error);
        return res.status(500).json({ 
          error: error.message, 
          details: error.details || 'Database query failed', 
          hint: error.hint || 'Check database connection and permissions'
        });
      }
      
      if (!data || data.length === 0) {
        console.log('No salary data found for employee:', employee_id);
        return res.status(200).json({
          year: targetYear,
          totalSalary: 0,
          averageSalary: 0,
          monthlyBreakdown: []
        });
      }
      
      // Filter records for the target year
      const yearRecords = data.filter(record => {
        if (!record.month) return false;
        const monthStr = String(record.month).trim();
        return monthStr.includes(String(targetYear));
      });
      
      if (yearRecords.length === 0) {
        return res.status(200).json({
          year: targetYear,
          totalSalary: 0,
          averageSalary: 0,
          monthlyBreakdown: []
        });
      }
      
      // Calculate total salary for the year
      const yearlyTotal = yearRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
      const averageSalary = yearlyTotal / yearRecords.length;
      
      // Prepare monthly breakdown
      const monthlyBreakdown = [];
      for (let m = 1; m <= 12; m++) {
        const monthRecords = yearRecords.filter(record => {
          const monthStr = String(record.month).trim();
          const monthFormats = [
            `${targetYear}-${String(m).padStart(2, '0')}`,
            `${targetYear}-${m}`,
            `${m}/${targetYear}`,
            `${String(m).padStart(2, '0')}/${targetYear}`,
            `${m}-${targetYear}`,
            `${String(m).padStart(2, '0')}-${targetYear}`
          ];
          return monthFormats.some(format => 
            monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
          );
        });
        
        if (monthRecords.length > 0) {
          const monthTotal = monthRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
          const monthName = new Date(targetYear, m-1, 1).toLocaleString('default', { month: 'long' });
          monthlyBreakdown.push({
            month: m,
            name: monthName,
            total: monthTotal
          });
        }
      }
      
      // Log success for debugging
      console.log(`Successfully calculated yearly salary summary for ${employee_id} (Year: ${targetYear})`);
      
      // Return the aggregated data
      const response: YearlySalaryResponse = {
        year: targetYear,
        totalSalary: yearlyTotal,
        averageSalary: averageSalary,
        monthlyBreakdown: monthlyBreakdown
      };
      
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching yearly salary data:', error);
      return res.status(500).json({ error: 'Failed to fetch yearly salary data' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 