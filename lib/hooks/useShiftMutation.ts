import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { queryLogger } from './queryLogger';
import { format } from 'date-fns';
import { ShiftOverride } from './useShiftData';

export type ShiftUpdateData = {
  employeeId: string;
  date: string | Date;
  shiftType: string;
  notes?: string;
  isManual?: boolean;
};

export function useShiftMutation() {
  const queryClient = useQueryClient();
  
  // Add or update a shift
  const updateShift = useMutation({
    mutationFn: async (data: ShiftUpdateData) => {
      const { employeeId, date, shiftType, notes, isManual } = data;
      
      // Format date if it's a Date object
      const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      
      queryLogger.log(['shiftMutation'], `Updating shift for ${employeeId} on ${formattedDate}`);
      
      // First check if a record already exists
      const { data: existingData, error: checkError } = await supabase
        .from('shift_overrides')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', formattedDate)
        .maybeSingle();
        
      if (checkError) {
        queryLogger.error(['shiftMutation'], `Error checking existing shift: ${checkError.message}`, checkError);
        throw checkError;
      }
      
      let result;
      
      if (existingData) {
        // Update existing record
        const { data: updateData, error: updateError } = await supabase
          .from('shift_overrides')
          .update({
            shift_type: shiftType,
            notes,
            is_manual: isManual ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
          
        if (updateError) {
          queryLogger.error(['shiftMutation'], `Error updating shift: ${updateError.message}`, updateError);
          throw updateError;
        }
        
        result = updateData;
      } else {
        // Insert new record
        const { data: insertData, error: insertError } = await supabase
          .from('shift_overrides')
          .insert({
            employee_id: employeeId,
            date: formattedDate,
            shift_type: shiftType,
            notes,
            is_manual: isManual ?? true
          })
          .select()
          .single();
          
        if (insertError) {
          queryLogger.error(['shiftMutation'], `Error inserting shift: ${insertError.message}`, insertError);
          throw insertError;
        }
        
        result = insertData;
      }
      
      return result as ShiftOverride;
    },
    onSuccess: (data) => {
      // Get month from the date
      const date = new Date(data.date);
      const monthKey = format(date, 'yyyy-MM');
      
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['shiftData', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['schedule', data.employee_id, monthKey] });
    },
    onError: (error) => {
      queryLogger.error(['shiftMutation'], 'Shift update failed', error);
    }
  });
  
  // Delete a shift
  const deleteShift = useMutation({
    mutationFn: async (shiftId: string) => {
      queryLogger.log(['shiftMutation'], `Deleting shift with ID ${shiftId}`);
      
      // First get the shift data to know what queries to invalidate
      const { data: shiftData, error: fetchError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('id', shiftId)
        .single();
        
      if (fetchError) {
        queryLogger.error(['shiftMutation'], `Error fetching shift for deletion: ${fetchError.message}`, fetchError);
        throw fetchError;
      }
      
      // Delete the shift
      const { error: deleteError } = await supabase
        .from('shift_overrides')
        .delete()
        .eq('id', shiftId);
        
      if (deleteError) {
        queryLogger.error(['shiftMutation'], `Error deleting shift: ${deleteError.message}`, deleteError);
        throw deleteError;
      }
      
      return shiftData as ShiftOverride;
    },
    onSuccess: (data) => {
      // Get month from the date
      const date = new Date(data.date);
      const monthKey = format(date, 'yyyy-MM');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['shiftData', data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ['schedule', data.employee_id, monthKey] });
    },
    onError: (error) => {
      queryLogger.error(['shiftMutation'], 'Shift deletion failed', error);
    }
  });
  
  return {
    updateShift,
    deleteShift
  };
} 