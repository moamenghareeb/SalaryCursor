import React from 'react';
import { format, isSameMonth } from 'date-fns';

// Define types
export type ShiftType = 'Day' | 'Night' | 'Off' | 'Leave' | 'Public' | 'Overtime';

export interface ScheduleDay {
  date: Date;
  type: ShiftType;
  notes?: string;
  inCurrentMonth: boolean;
}

// Shift colors map
export const shiftColors = {
  'Day': 'bg-blue-500',
  'Night': 'bg-green-500',
  'Off': 'bg-red-500',
  'Leave': 'bg-yellow-400',
  'Public': 'bg-orange-400',
  'Overtime': 'bg-pink-500',
};

interface DayCellProps {
  day: ScheduleDay;
  currentDate: Date;
  onClick: (day: ScheduleDay) => void;
}

const DayCell: React.FC<DayCellProps> = ({ day, currentDate, onClick }) => {
  const { date, type, notes, inCurrentMonth } = day;
  
  // Check if this is today's date
  const isToday = date.getDate() === new Date().getDate() && 
                  isSameMonth(date, new Date());
  
  return (
    <div 
      className={`p-1 border-t border-gray-700 ${inCurrentMonth ? '' : 'opacity-40'} min-h-20 cursor-pointer`}
      onClick={() => onClick(day)}
      aria-label={`${format(date, 'MMMM d, yyyy')}: ${type}${notes ? `, ${notes}` : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(day);
          e.preventDefault();
        }
      }}
    >
      <div className="flex justify-center items-center mb-1">
        <span className={`text-lg font-semibold ${
          isToday 
            ? 'text-white bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center' 
            : ''
        }`}>
          {date.getDate()}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className={`text-center p-1 rounded text-white ${shiftColors[type]}`}>
          {type}
        </div>
        {notes && (
          <div className="text-xs text-gray-300 flex items-center mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            {notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCell; 