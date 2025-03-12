import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryLogger } from './queryLogger';

export interface SalaryRecord {
  id: string;
  created_at: string;
  employee_id: string;
  month: string;
  base_salary: number;
  overtime_pay?: number;
  bonuses?: number;
  deductions?: number;
  total_salary: number;
  notes?: string;
}

export interface MonthlySalary {
  month: number;
  name: string;
  total: number;
}

export interface SalaryData {
  currentSalary: number | null;
  yearlyTotal: number | null;
  monthlySalaries: MonthlySalary[];
}

export function useSalaryData(userId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();
  
  return useQuery<SalaryData>({
    queryKey: ['salaryData', userId, currentYear],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      queryLogger.log(['salaryData', userId], `Fetching salary data for user ${userId} for year ${currentYear}`);
      
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        queryLogger.error(['salaryData', userId], `Error fetching salary data: ${error.message}`, error);
        throw error;
      }
      
      // Process the salary data
      if (!data || data.length === 0) {
        return {
          currentSalary: null,
          yearlyTotal: null,
          monthlySalaries: []
        };
      }
      
      // Find current month's salary
      const currentMonth = new Date().getMonth() + 1;
      const targetFormats = [
        `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        `${currentYear}-${currentMonth}`,
        `${currentMonth}/${currentYear}`,
        `${String(currentMonth).padStart(2, '0')}/${currentYear}`,
        `${currentMonth}-${currentYear}`,
        `${String(currentMonth).padStart(2, '0')}-${currentYear}`
      ];
      
      const currentMonthRecord = data.find(record => {
        if (!record.month) return false;
        const monthStr = String(record.month).trim();
        return targetFormats.some(format => 
          monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
        );
      });
      
      // Filter records for selected year
      const yearRecords = data.filter(record => {
        if (!record.month) return false;
        const monthStr = String(record.month).trim();
        return monthStr.includes(String(currentYear));
      });
      
      // Calculate yearly total and monthly breakdown
      const yearlyTotal = yearRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
      
      // Generate monthly data
      const monthlyData: MonthlySalary[] = [];
      for (let m = 1; m <= 12; m++) {
        const monthRecords = yearRecords.filter(record => {
          const monthStr = String(record.month).trim();
          const monthFormats = [
            `${currentYear}-${String(m).padStart(2, '0')}`,
            `${currentYear}-${m}`,
            `${m}/${currentYear}`,
            `${String(m).padStart(2, '0')}/${currentYear}`,
            `${m}-${currentYear}`,
            `${String(m).padStart(2, '0')}-${currentYear}`
          ];
          return monthFormats.some(format => 
            monthStr === format || monthStr.startsWith(format + '-') || monthStr.includes(format)
          );
        });
        
        if (monthRecords.length > 0) {
          const monthTotal = monthRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
          const monthName = new Date(currentYear, m-1, 1).toLocaleString('default', { month: 'long' });
          monthlyData.push({
            month: m,
            name: monthName,
            total: monthTotal
          });
        }
      }
      
      return {
        currentSalary: currentMonthRecord?.total_salary || data[0]?.total_salary || null,
        yearlyTotal,
        monthlySalaries: monthlyData
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 