import React from 'react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ShiftType } from '../../lib/types/schedule';

// Define color schemes for different shift types (copied from DayCell component)
const shiftColors: Record<ShiftType, string> = {
  'Day': 'bg-blue-500 dark:bg-blue-600',
  'Night': 'bg-indigo-600 dark:bg-indigo-700',
  'Off': 'bg-gray-400 dark:bg-gray-600',
  'Leave': 'bg-yellow-500 dark:bg-yellow-600',
  'Public': 'bg-orange-500 dark:bg-orange-600',
  'Overtime': 'bg-pink-500 dark:bg-pink-600'
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

const UpcomingShifts: React.FC<UpcomingShiftsProps> = ({ shifts, isLoading }) => {
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
      <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Upcoming Shifts</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700 p-3 rounded animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-5 bg-gray-600 rounded w-20"></div>
                <div className="h-5 bg-gray-600 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-600 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4 text-white">Upcoming Shifts</h2>
      
      {shifts.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p>No upcoming shifts scheduled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift, index) => {
            const shiftColorClass = shiftColors[shift.type];
            
            return (
              <div key={index} className="bg-gray-700 p-3 rounded hover:bg-gray-650 transition-colors">
                <div className="flex justify-between mb-1">
                  <div className="font-medium text-white flex items-center">
                    <span className={`w-3 h-3 rounded-full ${shiftColorClass} mr-2`}></span>
                    {formatShiftDate(shift.date)}
                  </div>
                  <div className="text-sm text-gray-300">
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {shift.type} Shift {shift.notes && <span>• {shift.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <a 
          href="/schedule" 
          className="text-blue-400 hover:text-blue-300 text-sm flex justify-center items-center"
        >
          View Full Schedule
        </a>
      </div>
    </div>
  );
};

export default UpcomingShifts; 