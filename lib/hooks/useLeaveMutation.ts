import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryLogger } from './queryLogger';
import { format } from 'date-fns';

export interface LeaveRequest {
  employeeId: string;
  startDate: string | Date;
  endDate: string | Date;
  reason: string;
  leaveType: string;
  attachmentUrl?: string;
}

export interface LeaveRecord {
  id: string;
  created_at: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  leave_type: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  review_date?: string;
  review_notes?: string;
}

export function useLeaveMutation() {
  const queryClient = useQueryClient();
  
  // Request leave
  const requestLeave = useMutation({
    mutationFn: async (leaveData: LeaveRequest) => {
      const { employeeId, startDate, endDate, reason, leaveType, attachmentUrl } = leaveData;
      
      // Format dates if they're Date objects
      const formattedStartDate = typeof startDate === 'string' ? startDate : format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = typeof endDate === 'string' ? endDate : format(endDate, 'yyyy-MM-dd');
      
      queryLogger.log(['leaveMutation'], `Requesting leave for ${employeeId} from ${formattedStartDate} to ${formattedEndDate}`);
      
      // Insert leave request
      const { data, error } = await supabase
        .from('leaves')
        .insert({
          employee_id: employeeId,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          reason,
          leave_type: leaveType,
          attachment_url: attachmentUrl,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) {
        queryLogger.error(['leaveMutation'], `Error requesting leave: ${error.message}`, error);
        throw error;
      }
      
      return data as LeaveRecord;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', data.employee_id] });
      
      // Get the year from the start date
      const year = new Date(data.start_date).getFullYear();
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', data.employee_id, year] });
      
      // Also invalidate pending leaves list
      queryClient.invalidateQueries({ queryKey: ['leaves', data.employee_id] });
    },
    onError: (error) => {
      queryLogger.error(['leaveMutation'], 'Leave request failed', error);
    }
  });
  
  // Cancel leave request
  const cancelLeave = useMutation({
    mutationFn: async (leaveId: string) => {
      queryLogger.log(['leaveMutation'], `Cancelling leave request with ID ${leaveId}`);
      
      // First get the leave data to know what queries to invalidate
      const { data: leaveData, error: fetchError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', leaveId)
        .single();
        
      if (fetchError) {
        queryLogger.error(['leaveMutation'], `Error fetching leave for cancellation: ${fetchError.message}`, fetchError);
        throw fetchError;
      }
      
      // Only pending leaves can be cancelled (deleted)
      if (leaveData.status !== 'pending') {
        const error = new Error(`Cannot cancel leave in ${leaveData.status} status`);
        queryLogger.error(['leaveMutation'], error.message, error);
        throw error;
      }
      
      // Delete the leave request
      const { error: deleteError } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);
        
      if (deleteError) {
        queryLogger.error(['leaveMutation'], `Error cancelling leave: ${deleteError.message}`, deleteError);
        throw deleteError;
      }
      
      return leaveData as LeaveRecord;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', data.employee_id] });
      
      // Get the year from the start date
      const year = new Date(data.start_date).getFullYear();
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', data.employee_id, year] });
      
      // Also invalidate pending leaves list
      queryClient.invalidateQueries({ queryKey: ['leaves', data.employee_id] });
    },
    onError: (error) => {
      queryLogger.error(['leaveMutation'], 'Leave cancellation failed', error);
    }
  });
  
  return {
    requestLeave,
    cancelLeave
  };
} 