import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '../../lib/prisma'; // Assuming you're using Prisma ORM
import { errorHandler } from '../../lib/errorHandler';
import { validateSalaryInput } from '../../lib/validateInput';

// Define SalaryData interface
interface SalaryData {
  employee_id: string;
  month: string;
  basic_salary: number;
  cost_of_living: number;
  shift_allowance: number;
  overtime_hours: number;
  overtime_pay: number;
  variable_pay: number;
  deduction: number;
  total_salary: number;
  exchange_rate: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    const salaryData = await prisma.salary.findUnique({
      where: { userId },
      select: {
        month: true,
        basicSalary: true,
        costOfLiving: true,
        shiftAllowance: true,
        overtimeHours: true,
        deduction: true
      }
    });

    return res.status(200).json(salaryData || {});
  }

  if (req.method === 'POST') {
    // Validate input
    validateSalaryInput(req.body);

    const { 
      month, 
      basicSalary, 
      costOfLiving, 
      shiftAllowance, 
      overtimeHours, 
      deduction 
    } = req.body;

    // Advanced calculation with logging
    const calculatedData = {
      overtimeRate: basicSalary / 160 * 1.5,
      overtimePay: overtimeHours * (basicSalary / 160 * 1.5),
      grossSalary: basicSalary + costOfLiving + shiftAllowance + 
                   (overtimeHours * (basicSalary / 160 * 1.5)),
      netSalary: basicSalary + costOfLiving + shiftAllowance + 
                 (overtimeHours * (basicSalary / 160 * 1.5)) - 
                 deduction
    };

    const savedSalary = await prisma.salary.upsert({
      where: { userId },
      update: {
        month,
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimeHours,
        deduction,
        // Store calculated fields for reference
        calculatedGrossSalary: calculatedData.grossSalary,
        calculatedNetSalary: calculatedData.netSalary
      },
      create: {
        userId,
        month,
        basicSalary,
        costOfLiving,
        shiftAllowance,
        overtimeHours,
        deduction,
        calculatedGrossSalary: calculatedData.grossSalary,
        calculatedNetSalary: calculatedData.netSalary
      }
    });

    return res.status(200).json({
      ...savedSalary,
      calculatedData
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default errorHandler(handler); 