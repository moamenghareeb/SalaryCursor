import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface MobileScheduleViewProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

// Shift type styling configuration
const shiftConfig: Record<ShiftType, { 
  bgColor: string,
  lightBgColor: string,
  textColor: string,
  label: string
}> = {
  'Day': { 
    bgColor: '#2563eb', 
    lightBgColor: '#3b82f6',
    textColor: 'white',
    label: 'Day'
  },
  'Night': { 
    bgColor: '#059669', 
    lightBgColor: '#10b981',
    textColor: 'white',
    label: 'Night'
  },
  'Off': { 
    bgColor: '#dc2626', 
    lightBgColor: '#ef4444',
    textColor: 'white',
    label: 'Off'
  },
  'Leave': { 
    bgColor: '#d97706', 
    lightBgColor: '#f59e0b',
    textColor: 'white',
    label: 'Leave'
  },
  'Public': { 
    bgColor: '#7c3aed', 
    lightBgColor: '#8b5cf6',
    textColor: 'white',
    label: 'Public'
  },
  'Overtime': { 
    bgColor: '#db2777', 
    lightBgColor: '#ec4899',
    textColor: 'white',
    label: 'OT'
  },
  'InLieu': { 
    bgColor: '#4f46e5', 
    lightBgColor: '#6366f1',
    textColor: 'white',
    label: 'InLieu'
  }
};

interface DayCellProps {
  day: CalendarDay;
  onClick: () => void;
  ariaLabel: string;
  title: string;
}

const DayCell: React.FC<DayCellProps> = ({ day, onClick, ariaLabel, title }) => {
  const shiftType = day.personalShift.type;
  const shiftStyle = shiftConfig[shiftType];
  const isSelected = day.isCurrentMonth;
  const isOutsideMonth = !day.isCurrentMonth;

  return (
    <div 
      className={`relative border-r border-gray-800 last:border-r-0
        ${isSelected ? 'bg-gray-800' : ''}
        ${isOutsideMonth ? 'opacity-40' : ''}
        min-h-[100px]
      `}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Day number */}
      <div className="py-2 px-2">
        <span className={`text-2xl font-medium ${isOutsideMonth ? 'text-gray-600' : 'text-white'}`}>
          {day.dayOfMonth}
        </span>
      </div>
      
      {/* Shift type pill */}
      {!isOutsideMonth && (
        <div className="px-2">
          <div 
            className="py-1 px-2 rounded-md text-center"
            style={{
              backgroundColor: shiftStyle.bgColor,
              color: shiftStyle.textColor
            }}
          >
            {shiftStyle.label}
          </div>
        </div>
      )}
      
      {/* Holiday indicator at bottom */}
      {day.holiday && (
        <div className="absolute bottom-1 left-2 flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
          <span className="text-xs text-green-400 truncate">
            {day.holiday.name}
          </span>
        </div>
      )}
    </div>
  );
};

const MobileScheduleView: React.FC<MobileScheduleViewProps> = ({ 
  monthData,
  onDayClick 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visibleDays, setVisibleDays] = useState<CalendarDay[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // System theme detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);
  
  // Initialize with today's date
  useEffect(() => {
    if (monthData?.days) {
      const today = new Date();
      const todayIndex = monthData.days.findIndex(day => 
        day.isCurrentMonth && isSameDay(new Date(day.date), today)
      );
      
      if (todayIndex >= 0) {
        setSelectedDayIndex(todayIndex);
        setSelectedDate(new Date(monthData.days[todayIndex].date));
      } else {
        const currentMonthFirstDayIndex = monthData.days.findIndex(day => day.isCurrentMonth);
        if (currentMonthFirstDayIndex >= 0) {
          setSelectedDayIndex(currentMonthFirstDayIndex);
          setSelectedDate(new Date(monthData.days[currentMonthFirstDayIndex].date));
        }
      }
      
      setVisibleDays(monthData.days);
    }
  }, [monthData]);
  
  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    setSelectedDate(new Date(visibleDays[index].date));
  };
  
  const handleDayClick = () => {
    if (onDayClick && visibleDays.length > 0) {
      onDayClick(visibleDays[selectedDayIndex]);
    }
  };
  
  const getSelectedDay = () => {
    if (!visibleDays.length || selectedDayIndex >= visibleDays.length) return null;
    return visibleDays[selectedDayIndex];
  };
  
  const selectedDay = getSelectedDay();
  
  // Group days into weeks
  const weekRows: CalendarDay[][] = [];
  if (visibleDays.length > 0) {
    for (let i = 0; i < visibleDays.length; i += 7) {
      weekRows.push(visibleDays.slice(i, Math.min(i + 7, visibleDays.length)));
    }
  }
  
  if (!selectedDay) {
    return <div className="p-4 text-center text-gray-600 dark:text-gray-300">Loading schedule...</div>;
  }
  
  return (
    <div className={`calendar-view ${isDarkMode ? 'dark' : 'light'}`}> 
      {weekRows.map((week, weekIndex) => (
        <div key={`week-${weekIndex}`} className={`${weekIndex > 0 ? 'border-t border-gray-800' : ''}`}>
          <div className="grid grid-cols-7">
            {week.map((day, dayIndex) => (
              <DayCell 
                key={day.date.toString()} 
                day={day} 
                onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))} 
                ariaLabel={`Select ${new Date(day.date).toDateString()}`} 
                title={`Select ${new Date(day.date).toDateString()}`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileScheduleView; 