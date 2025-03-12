import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryLogger } from './queryLogger';

export interface Employee {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  employee_id: string;
  position: string;
  department?: string;
  hire_date?: string;
  status?: string;
  // Add other fields as needed based on your schema
}

export function useEmployee(userId?: string) {
  return useQuery({
    queryKey: ['employee', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      queryLogger.log(['employee', userId], `Fetching employee data for user ${userId}`);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        queryLogger.error(['employee', userId], `Error fetching employee data: ${error.message}`, error);
        throw error;
      }
      
      return data as Employee;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 