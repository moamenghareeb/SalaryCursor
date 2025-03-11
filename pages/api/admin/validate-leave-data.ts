import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

type ValidationIssue = {
  table: string;
  recordId: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
};

type ValidationResponse = {
  timestamp: string;
  issues: ValidationIssue[];
  summary: {
    totalRecords: {
      employees: number;
      leaves: number;
      inLieuRecords: number;
      leaveAllocations: number;
      salaries: number;
    };
    issuesByTable: Record<string, number>;
    issuesBySeverity: {
      high: number;
      medium: number;
      low: number;
    };
  };
};

type Employee = {
  id: string;
  annual_leave_balance: number | null;
  leave_balance: number | null;
  years_of_service: number | null;
  employee_id: number | null;
  name: string | null;
  email: string | null;
  position: string | null;
};

type Leave = {
  id: string;
  days_taken: number | null;
  leave_type: string | null;
  status: string | null;
  employee_id: string | null;
  start_date: string | null;
  end_date: string | null;
};

type InLieuRecord = {
  id: string;
  leave_days_added: number | null;
  status: string | null;
  employee_id: string | null;
};

type LeaveAllocation = {
  id: string;
  allocated_days: number | null;
  type: string | null;
  employee_id: string | null;
  year: number | null;
};

type Salary = {
  id: string;
  employee_id: string | null;
  month: string | null;
  basic_salary: number | null;
  cost_of_living: number | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'This endpoint is only available in development mode' });
  }

  try {
    const issues: ValidationIssue[] = [];
    const summary = {
      totalRecords: {
        employees: 0,
        leaves: 0,
        inLieuRecords: 0,
        leaveAllocations: 0,
        salaries: 0
      },
      issuesByTable: {} as Record<string, number>,
      issuesBySeverity: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Validate employees table
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*');

    if (employeesError) {
      logger.error(`Error fetching employees: ${employeesError.message}`);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    summary.totalRecords.employees = employees?.length || 0;

    employees?.forEach((employee: Employee) => {
      // Required fields validation
      if (employee.annual_leave_balance === null || employee.annual_leave_balance === undefined) {
        issues.push({
          table: 'employees',
          recordId: employee.id,
          issue: 'Missing annual_leave_balance',
          severity: 'high'
        });
      }
      
      if (employee.leave_balance === null || employee.leave_balance === undefined) {
        issues.push({
          table: 'employees',
          recordId: employee.id,
          issue: 'Missing leave_balance',
          severity: 'high'
        });
      }

      // Additional employee validations
      if (!employee.years_of_service && employee.years_of_service !== 0) {
        issues.push({
          table: 'employees',
          recordId: employee.id,
          issue: 'Missing years_of_service',
          severity: 'high'
        });
      }

      if (!employee.employee_id) {
        issues.push({
          table: 'employees',
          recordId: employee.id,
          issue: 'Missing employee_id',
          severity: 'high'
        });
      }

      if (!employee.email) {
        issues.push({
          table: 'employees',
          recordId: employee.id,
          issue: 'Missing email',
          severity: 'high'
        });
      }

      // Business logic validation
      if (employee.years_of_service && employee.years_of_service >= 10) {
        if (employee.annual_leave_balance !== 24.67) {
          issues.push({
            table: 'employees',
            recordId: employee.id,
            issue: 'Incorrect annual leave balance for 10+ years of service (should be 24.67)',
            severity: 'high'
          });
        }
      } else if (employee.years_of_service !== null && employee.years_of_service < 10) {
        if (employee.annual_leave_balance !== 18.67) {
          issues.push({
            table: 'employees',
            recordId: employee.id,
            issue: 'Incorrect annual leave balance for <10 years of service (should be 18.67)',
            severity: 'high'
          });
        }
      }
    });

    // Validate leaves table
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('*');

    if (leavesError) {
      logger.error(`Error fetching leaves: ${leavesError.message}`);
      return res.status(500).json({ error: 'Failed to fetch leaves' });
    }

    summary.totalRecords.leaves = leaves?.length || 0;

    leaves?.forEach((leave: Leave) => {
      if (!leave.days_taken && leave.days_taken !== 0) {
        issues.push({
          table: 'leaves',
          recordId: leave.id,
          issue: 'Missing days_taken',
          severity: 'high'
        });
      }

      if (!leave.leave_type) {
        issues.push({
          table: 'leaves',
          recordId: leave.id,
          issue: 'Missing leave_type',
          severity: 'medium'
        });
      }

      if (!leave.status) {
        issues.push({
          table: 'leaves',
          recordId: leave.id,
          issue: 'Missing status',
          severity: 'medium'
        });
      }

      if (!leave.employee_id) {
        issues.push({
          table: 'leaves',
          recordId: leave.id,
          issue: 'Missing employee_id',
          severity: 'high'
        });
      }

      if (!leave.start_date || !leave.end_date) {
        issues.push({
          table: 'leaves',
          recordId: leave.id,
          issue: 'Missing start_date or end_date',
          severity: 'high'
        });
      }
    });

    // Validate in_lieu_records table
    const { data: inLieuRecords, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('*');

    if (inLieuError) {
      logger.error(`Error fetching in_lieu_records: ${inLieuError.message}`);
      return res.status(500).json({ error: 'Failed to fetch in_lieu_records' });
    }

    summary.totalRecords.inLieuRecords = inLieuRecords?.length || 0;

    inLieuRecords?.forEach((record: InLieuRecord) => {
      if (!record.leave_days_added && record.leave_days_added !== 0) {
        issues.push({
          table: 'in_lieu_records',
          recordId: record.id,
          issue: 'Missing leave_days_added',
          severity: 'high'
        });
      }

      if (!record.status) {
        issues.push({
          table: 'in_lieu_records',
          recordId: record.id,
          issue: 'Missing status',
          severity: 'medium'
        });
      }

      if (!record.employee_id) {
        issues.push({
          table: 'in_lieu_records',
          recordId: record.id,
          issue: 'Missing employee_id',
          severity: 'high'
        });
      }
    });

    // Validate leave_allocations table
    const { data: leaveAllocations, error: allocationsError } = await supabase
      .from('leave_allocations')
      .select('*');

    if (allocationsError) {
      logger.error(`Error fetching leave_allocations: ${allocationsError.message}`);
      return res.status(500).json({ error: 'Failed to fetch leave_allocations' });
    }

    summary.totalRecords.leaveAllocations = leaveAllocations?.length || 0;

    leaveAllocations?.forEach((allocation: LeaveAllocation) => {
      if (!allocation.allocated_days && allocation.allocated_days !== 0) {
        issues.push({
          table: 'leave_allocations',
          recordId: allocation.id,
          issue: 'Missing allocated_days',
          severity: 'high'
        });
      }

      if (!allocation.type) {
        issues.push({
          table: 'leave_allocations',
          recordId: allocation.id,
          issue: 'Missing type',
          severity: 'medium'
        });
      }

      if (!allocation.employee_id) {
        issues.push({
          table: 'leave_allocations',
          recordId: allocation.id,
          issue: 'Missing employee_id',
          severity: 'high'
        });
      }

      if (!allocation.year) {
        issues.push({
          table: 'leave_allocations',
          recordId: allocation.id,
          issue: 'Missing year',
          severity: 'high'
        });
      }
    });

    // Validate salaries table
    const { data: salaries, error: salariesError } = await supabase
      .from('salaries')
      .select('*');

    if (salariesError) {
      logger.error(`Error fetching salaries: ${salariesError.message}`);
      return res.status(500).json({ error: 'Failed to fetch salaries' });
    }

    summary.totalRecords.salaries = salaries?.length || 0;

    salaries?.forEach((salary: Salary) => {
      if (!salary.employee_id) {
        issues.push({
          table: 'salaries',
          recordId: salary.id,
          issue: 'Missing employee_id',
          severity: 'high'
        });
      }

      if (!salary.month) {
        issues.push({
          table: 'salaries',
          recordId: salary.id,
          issue: 'Missing month',
          severity: 'high'
        });
      }

      if (!salary.basic_salary && salary.basic_salary !== 0) {
        issues.push({
          table: 'salaries',
          recordId: salary.id,
          issue: 'Missing basic_salary',
          severity: 'high'
        });
      }

      if (!salary.cost_of_living && salary.cost_of_living !== 0) {
        issues.push({
          table: 'salaries',
          recordId: salary.id,
          issue: 'Missing cost_of_living',
          severity: 'medium'
        });
      }
    });

    // Calculate summary statistics
    issues.forEach(issue => {
      summary.issuesByTable[issue.table] = (summary.issuesByTable[issue.table] || 0) + 1;
      summary.issuesBySeverity[issue.severity]++;
    });

    const response: ValidationResponse = {
      timestamp: new Date().toISOString(),
      issues,
      summary
    };

    return res.status(200).json(response);

  } catch (error: any) {
    logger.error(`Unexpected error in data validation: ${error.message}`);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
} 