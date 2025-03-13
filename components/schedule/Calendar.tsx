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
      <div className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
        {name} {year}
      </div>
      
      {/* Calendar grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7">
          {weekdayLabels.map((day, index) => (
            <div 
              key={day} 
              className={`
                py-2 font-semibold text-center text-sm
                ${index === 0 || index === 6 
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' 
                  : 'bg-gray-50 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200'}
              `}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7">
            {week.map((day) => (
              <DayCell 
                key={day.date} 
                day={day}
                onClick={onDayClick}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Calendar legend */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Legend</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
          {(Object.keys(ShiftLegendItems) as ShiftType[]).map(type => {
            const item = ShiftLegendItems[type];
            return (
              <div key={type} className="flex items-center">
                <div 
                  className={`w-4 h-4 rounded mr-2 ${item.colorClass}`}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Legend items for shift types
const ShiftLegendItems: Record<ShiftType, { label: string, colorClass: string }> = {
  'Day': { 
    label: 'Day Shift (7am-7pm)', 
    colorClass: 'bg-blue-500 dark:bg-blue-600' 
  },
  'Night': { 
    label: 'Night Shift (7pm-7am)', 
    colorClass: 'bg-indigo-600 dark:bg-indigo-700' 
  },
  'Off': { 
    label: 'Off Duty', 
    colorClass: 'bg-gray-400 dark:bg-gray-600' 
  },
  'Leave': { 
    label: 'On Leave', 
    colorClass: 'bg-yellow-500 dark:bg-yellow-600' 
  },
  'Public': { 
    label: 'Public Holiday', 
    colorClass: 'bg-orange-500 dark:bg-orange-600' 
  },
  'Overtime': { 
    label: 'Overtime', 
    colorClass: 'bg-pink-500 dark:bg-pink-600' 
  },
  'InLieu': {
    label: 'In-Lieu Time',
    colorClass: 'bg-purple-500 dark:bg-purple-600'
  }
};

export default Calendar; 