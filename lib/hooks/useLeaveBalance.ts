import { useQuery } from '@tanstack/react-query';
import { leaveService } from '../leaveService';
import { queryLogger } from './queryLogger';

export interface LeaveBalanceData {
  baseLeaveBalance: number;
  inLieuBalance: number;
  leaveTaken: number;
  remainingBalance: number;
  error?: string;
  lastUpdated?: number;
}

export function useLeaveBalance(userId?: string, year?: number) {
  return useQuery<LeaveBalanceData>({
    queryKey: ['leaveBalance', userId, year],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const currentYear = year || new Date().getFullYear();
      queryLogger.log(['leaveBalance', userId], `Calculating leave balance for user ${userId} for year ${currentYear}`);
      
      try {
        const result = await leaveService.calculateLeaveBalance(userId, currentYear);
        
        if (result.error) {
          queryLogger.error(['leaveBalance', userId], `Error calculating leave balance: ${result.error}`, result);
        }
        
        return {
          baseLeaveBalance: result.baseLeaveBalance || 0,
          inLieuBalance: result.inLieuBalance || 0,
          leaveTaken: result.leaveTaken || 0,
          remainingBalance: result.remainingBalance || 0,
          error: result.error,
          lastUpdated: result.lastUpdated || Date.now()
        };
      } catch (error: any) {
        queryLogger.error(['leaveBalance', userId], `Exception calculating leave balance: ${error.message}`, error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
} 