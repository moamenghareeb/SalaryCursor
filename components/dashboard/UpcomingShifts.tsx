import React from 'react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ShiftType } from '../../lib/types/schedule';
import Link from 'next/link';
import { useTheme } from '../../lib/themeContext';

// Define color schemes for different shift types using CSS variables
const shiftColorMap: Record<ShiftType, { dot: string; text: string }> = {
  Day: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  Night: { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  Off: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  Leave: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  Public: { dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  Overtime: { dot: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400' },
  InLieu: { dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' }
};

export interface UpcomingShift {
  date: Date;
  type: ShiftType;
  startTime: string;
  endTime: string;
  notes?: string;
}

interface UpcomingShiftsProps {
  shifts: UpcomingShift[];
  isLoading: boolean;
}

const UpcomingShifts: React.FC<UpcomingShiftsProps> = ({ shifts, isLoading = false }) => {
  const { isDarkMode } = useTheme();
  // Helper to format the date in a friendly way
  const formatShiftDate = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    
    // Check if it's within the next week
    const oneWeekFromNow = addDays(new Date(), 7);
    if (date < oneWeekFromNow) {
      return format(date, 'EEEE'); // Day name
    }
    
    return format(date, 'MMM d'); // Month and day
  };
  
  if (isLoading) {
    return (
      <div className="mt-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 dark:bg-gray-700 p-3 rounded animate-pulse">
            <div className="flex justify-between mb-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {shifts.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p>No upcoming shifts scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift, index) => {
            const shiftColor = shiftColorMap[shift.type];
            
            return (
              <div key={index} 
                className="bg-gray-50 dark:bg-gray-700/80 p-3 rounded-md 
                          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors 
                          border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between mb-1">
                  <div className="font-medium text-gray-900 dark:text-white flex items-center">
                    <span className={`w-3 h-3 rounded-full ${shiftColor.dot} mr-2`}></span>
                    {formatShiftDate(shift.date)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>
                <div className={`text-sm ${shiftColor.text}`}>
                  {shift.type} Shift {shift.notes && <span className="text-gray-500 dark:text-gray-400">• {shift.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingShifts;