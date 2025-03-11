import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { leaveService } from '../../../lib/leaveService';
import { logger } from '../../../lib/logger';

interface InLieuRecord {
  id: string;
  employee_id: string;
  date: string;
  days_added: number;
  leave_days_added: number;
  created_at: string;
  updated_at: string;
}

interface LeaveRecord {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeRecord {
  id: string;
  employee_id: number;
  name: string;
  email: string;
  position: string;
  leave_balance: number;
  annual_leave_balance: number;
  joining_date: string;
  created_at: string;
  updated_at: string;
}

interface DebugResult {
  leaveServiceCalculation: any; // Using any for now since we don't have the type from leaveService
  employeeRecord: EmployeeRecord | null;
  rawInLieuRecords: InLieuRecord[];
  rawLeaveRecords: LeaveRecord[];
  calculatedValues: {
    timestamp: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get auth token from request
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify authentication
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = userData.user.id;
    
    // Get comprehensive debug information
    const result: DebugResult = {
      leaveServiceCalculation: await leaveService.calculateLeaveBalance(userId),
      employeeRecord: null,
      rawInLieuRecords: [],
      rawLeaveRecords: [],
      calculatedValues: {
        timestamp: new Date().toISOString()
      }
    };
    
    // Fetch the raw employee record
    const { data: employeeData } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();
      
    result.employeeRecord = employeeData;
    
    // Fetch raw in-lieu records
    const { data: inLieuData } = await supabase
      .from('in_lieu_records')
      .select('*')
      .eq('employee_id', userId);
      
    result.rawInLieuRecords = inLieuData || [];
    
    // Fetch raw leave records for this year
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    
    const { data: leaveData } = await supabase
      .from('leaves')
      .select('*')
      .eq('employee_id', userId)
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);
      
    result.rawLeaveRecords = leaveData || [];
    
    // Return all debug information
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in leave audit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 