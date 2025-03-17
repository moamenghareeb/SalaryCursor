import React from 'react';
import { format } from 'date-fns';
import DayCell from './DayCell';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface CalendarProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  monthData,
  onDayClick
}) => {
  const { year, month, name, days } = monthData;
  
  // Day of week headers
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Chunk the days into weeks (arrays of 7 days)
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  return (
    <div className="calendar w-full">
      {/* Calendar header */}
      <div className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
        {name} {year}
      </div>
      
      {/* Calendar grid */}
      <div className="border-0 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-gray-800/20 shadow-lg">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {weekdayLabels.map((day, index) => (
            <div 
              key={day} 
              className={`
                py-3 font-medium text-center text-sm
                ${index === 0 || index === 6 
                  ? 'text-gray-700 dark:text-gray-300' 
                  : 'text-gray-800 dark:text-gray-200'}
              `}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-gray-100/50 dark:bg-gray-800/40">
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day) => (
                <DayCell 
                  key={day.date.toString()} 
                  day={day} 
                  onClick={() => onDayClick && onDayClick(day)} 
                  ariaLabel={`Select ${new Date(day.date).toDateString()}`} 
                  title={`Select ${new Date(day.date).toDateString()}`} 
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {Object.entries(ShiftLegendItems).map(([type, item]) => (
          <div key={type} className="flex items-center">
            <span className={`w-4 h-4 rounded-sm mr-2 ${item.colorClass}`}></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Legend items for shift types (moved to schedule.tsx)
export const ShiftLegendItems: Record<ShiftType, { label: string, colorClass: string }> = {
  'Day': { 
    label: 'Day Shift (7am-7pm)', 
    colorClass: 'bg-blue-500' 
  },
  'Night': { 
    label: 'Night Shift (7pm-7am)', 
    colorClass: 'bg-green-500'
  },
  'Off': { 
    label: 'Off Duty', 
    colorClass: 'bg-red-500'
  },
  'Leave': { 
    label: 'On Leave', 
    colorClass: 'bg-yellow-500' 
  },
  'Public': { 
    label: 'Public Holiday', 
    colorClass: 'bg-orange-500' 
  },
  'Overtime': { 
    label: 'Overtime', 
    colorClass: 'bg-pink-500'
  },
  'InLieu': {
    label: 'In-Lieu Time',
    colorClass: 'bg-purple-500'
  }
};

export default Calendar; 