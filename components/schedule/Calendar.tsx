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
    <div className="sc-calendar">
      {/* Calendar header */}
      <div className="text-2xl font-bold mb-6 text-center text-[var(--sc-text-primary)] pb-2 border-b border-[var(--sc-border-color)]">
        {name} {year}
      </div>
      
      {/* Calendar grid */}
      <div className="border border-[var(--sc-border-color)] rounded-xl overflow-hidden bg-[var(--sc-bg-secondary)] shadow-sm">
        {/* Calendar container */}
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-[var(--sc-bg-tertiary)] border-b border-[var(--sc-border-color)] py-1">
          {/* Weekday headers */}
          {weekdayLabels.map((day, index) => (
            <div 
              key={day} 
              className={`
                py-3 font-medium text-center text-sm
                ${index === 0 || index === 6 
                  ? 'text-[var(--sc-text-secondary)]' 
                  : 'text-[var(--sc-text-primary)]'}
              `}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 p-2 bg-[var(--sc-bg-secondary)]">
          {/* Calendar days */}
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
      <div className="mt-6 sc-shift-legend">
        {/* Shift type legend */}
        {Object.entries(ShiftLegendItems).map(([type, item]) => (
          <div key={type} className="sc-shift-legend-item">
            <span 
              className="color-indicator" 
              style={{ 
                backgroundColor: type === 'Day' ? 'var(--sc-day-shift-color)' :
                         type === 'Night' ? 'var(--sc-night-shift-color)' :
                         type === 'Off' ? 'var(--sc-off-color)' :
                         type === 'Leave' ? 'var(--sc-leave-color)' :
                         type === 'Public' ? 'var(--sc-public-color)' :
                         type === 'Overtime' ? 'var(--sc-overtime-color)' :
                         'var(--sc-inlieu-color)'
              }}
            ></span>
            <span className="text-[var(--sc-text-secondary)]">{item.label}</span>
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