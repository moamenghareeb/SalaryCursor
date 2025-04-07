import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDay, ShiftType } from '../../lib/types/schedule';
import { updateUserOvertime } from '../../lib/overtime';
import { useAuth } from '../../lib/authContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface ShiftEditModalProps {
  day: CalendarDay | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, shiftType: ShiftType, notes?: string) => void;
  isLoading?: boolean;
}

const SHIFT_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'Day', label: 'Day Shift (7am-7pm)' },
  { value: 'Night', label: 'Night Shift (7pm-7am)' },
  { value: 'Off', label: 'Off Duty' },
  { value: 'Leave', label: 'On Leave' },
  { value: 'Overtime', label: 'Overtime' },
  { value: 'InLieu', label: 'In-Lieu Time' }
];

const ShiftEditModal: React.FC<ShiftEditModalProps> = ({ 
  day, 
  isOpen, 
  onClose,
  onSave,
  isLoading
}) => {
  const auth = useAuth() as any;
  const user = auth?.user;
  const queryClient = useQueryClient();
  // Form state
  const [selectedShift, setSelectedShift] = useState<ShiftType>('Off');
  const [notes, setNotes] = useState<string>('');
  const [formProcessing, setFormProcessing] = useState(false);
  
  // Initialize form when day changes
  useEffect(() => {
    if (day) {
      setSelectedShift(day.personalShift.type);
      setNotes(day.personalShift.notes || '');
    }
  }, [day]);
  
  // Handle close
  const handleClose = () => {
    if (!formProcessing && !isLoading) {
      onClose();
    }
  };
  
  // Handle save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (day && !isLoading && user) {
      setFormProcessing(true);
      
      // Track whether we had a change to/from overtime
      const wasOvertime = day.personalShift.type === 'Overtime';
      const nowOvertime = selectedShift === 'Overtime';
      
      // Update the shift and notes
      onSave(day.date, selectedShift, notes === '' ? undefined : notes);
      
      // If the selected shift is Overtime, add 24 hours to the user's overtime
      if (nowOvertime) {
        const overtimeHours = 24;
        // Call the function to update the user's overtime
        updateUserOvertime(day.date, overtimeHours, user.id)
          .then(() => {
            // Force immediate refetch of salary and overtime data
            const monthStart = new Date(day.date);
            monthStart.setDate(1);
            const monthKey = monthStart.toISOString().substring(0, 7);
            
            // Invalidate and refetch salary and overtime data
            queryClient.invalidateQueries({ queryKey: ['salaries'] });
            queryClient.invalidateQueries({ queryKey: ['overtime'] });
            queryClient.refetchQueries({ queryKey: ['salaries'] });
            queryClient.refetchQueries({ queryKey: ['overtime'] });
            
            // Clear form processing
            setFormProcessing(false);
          });
      } 
      // If changing from Overtime to another shift type, update to remove overtime
      else if (wasOvertime && !nowOvertime) {
        // Remove overtime from the overtime table
        console.log(`Removing overtime for ${day.date}`);
        
        // First, delete the overtime record if it exists
        supabase
          .from('overtime')
          .delete()
          .eq('employee_id', user.id)
          .eq('date', day.date)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to delete overtime record:', error);
              toast.error('Failed to update overtime. Please try again.');
            } else {
              console.log('Successfully deleted overtime record, recalculating salary...');
              
              // After deleting, refetch to update overtime calculations
              const monthStart = new Date(day.date);
              monthStart.setDate(1);
              
              // Force recalculation of overtime totals in the salary
              updateUserOvertime(day.date, 0, user.id, true)
                .then(() => {
                  // Invalidate and refetch ALL queries
                  queryClient.invalidateQueries();
                  setTimeout(() => {
                    queryClient.refetchQueries();
                    
                    // Done processing
                    setFormProcessing(false);
                    toast.success('Overtime removed successfully');
                  }, 500);
                })
                .catch((error: Error) => {
                  console.error('Error recalculating overtime:', error);
                  setFormProcessing(false);
                });
            }
          })
          .catch(err => {
            console.error('Error removing overtime:', err);
            setFormProcessing(false);
          });
      } else {
        // Other changes don't need special handling
        setFormProcessing(false);
      }
    }
  };
  
  // Handle resetting to original shift
  const handleReset = () => {
    if (day && day.personalShift.originalType) {
      setSelectedShift(day.personalShift.originalType);
      setNotes('');
    }
  };
  
  // Return null if not open or no day selected
  if (!isOpen || !day) {
    return null;
  }
  
  // Format the date for display
  const formattedDate = format(new Date(day.date), 'EEEE, MMMM d, yyyy');
  
  // Base/original shift (what would be scheduled without override)
  const originalShift = day.personalShift.originalType || day.personalShift.type;
  const originalShiftName = SHIFT_OPTIONS.find(option => option.value === originalShift)?.label || originalShift;
  
  // Get which groups are on shifts for this day
  const groupsOnDayShift = day.groupAssignments.dayShift.map(g => 
    `Group ${g.group}${g.isFirstDay ? ' (1st day)' : ' (2nd day)'}`
  ).join(', ');
  
  const groupsOnNightShift = day.groupAssignments.nightShift.map(g => 
    `Group ${g.group}${g.isFirstNight ? ' (1st night)' : ' (2nd night)'}`
  ).join(', ');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Edit Shift
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formattedDate}
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSave} className="p-4">
          {/* Shift assignment information */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shift Assignments for this Date:
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                Day Shift: {groupsOnDayShift}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>
                Night Shift: {groupsOnNightShift}
              </p>
            </div>
          </div>
          
          {/* Current/original shift */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Originally Scheduled
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200">
              {originalShiftName}
              {day.personalShift.shiftNumber && (
                <span className="ml-1 font-semibold">({day.personalShift.shiftNumber})</span>
              )}
            </div>
          </div>
          
          {/* Shift selector */}
          <div className="mb-4">
            <label htmlFor="shift-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Override Shift Type
            </label>
            <select
              id="shift-type"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as ShiftType)}
              disabled={isLoading || formProcessing}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {SHIFT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || formProcessing}
              placeholder="Add any notes or reason for the override"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-gray-500"
              rows={3}
            ></textarea>
          </div>
          
          {/* Holiday indicator */}
          {day.holiday && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-md">
              <p className="text-sm font-medium">
                Note: This day is marked as &quot;{day.holiday.name}&quot;
              </p>
            </div>
          )}
          
          {/* Weekend indicator */}
          {day.isWeekend && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md">
              <p className="text-sm font-medium">
                Note: This is a weekend day ({format(new Date(day.date), 'EEEE')})
              </p>
            </div>
          )}
          
          {/* Group change indicator */}
          {day.hasGroupChange && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md">
              <p className="text-sm font-medium">
                Note: Your group assignment changed on this date
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between mt-6">
            <div>
              {day.personalShift.isOverridden && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading || formProcessing}
                  className="px-3 py-1 text-sm rounded-md text-red-600 hover:text-red-700
                    border border-red-200 hover:border-red-300
                    dark:text-red-400 dark:hover:text-red-300
                    dark:border-red-800 dark:hover:border-red-700
                    focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  Reset to Original
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading || formProcessing}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || formProcessing}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700
                  text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                  flex items-center space-x-1"
              >
                {isLoading || formProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftEditModal; 