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
    <div className={`${isDarkMode ? 'bg-black' : 'bg-gray-100'} px-0 py-0`}>
      {/* Month title */}
      <div className="flex items-center justify-between p-4">
        <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {monthData.name}
        </h1>
        
        <div className="flex space-x-3">
          <button className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </button>
          
          <button className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className={`mt-2 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} rounded-t-xl overflow-hidden`}>
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center">
          {['S', 'S', 'M', 'T', 'W', 'T', 'F'].map((dayLabel, i) => (
            <div key={i} className={`py-3 text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${i > 0 && i % 2 === 1 ? 'border-l border-l-gray-700/20' : ''}`}>
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        {weekRows.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className={`${weekIndex > 0 ? 'border-t border-t-gray-700/20' : ''}`}>
            <div className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                const isOutsideMonth = !day.isCurrentMonth;
                const shiftType = day.personalShift.type;
                const shiftStyle = shiftConfig[shiftType];
                
                // Background colors
                let bgColor = isOutsideMonth 
                  ? (isDarkMode ? '#1e1e1e' : '#f3f4f6') 
                  : (isDarkMode ? '#232323' : 'white');
                
                if (isSelected) {
                  bgColor = isDarkMode ? '#333333' : 'white';
                }
                
                const holidayName = day.holiday?.name;
                const hasHoliday = !!holidayName;
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      relative ${dayIndex > 0 && dayIndex % 2 === 1 ? 'border-l border-l-gray-700/20' : ''}
                      ${isSelected ? (isDarkMode ? 'bg-[#333333]' : 'bg-white') : ''}
                      ${isOutsideMonth ? 'opacity-40' : ''}
                      h-32 min-h-[128px]
                    `}
                    style={{
                      backgroundColor: bgColor
                    }}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
                  >
                    {/* Day number */}
                    <div className="py-2 px-3">
                      <span className={`text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {day.dayOfMonth}
                      </span>
                    </div>
                    
                    {/* Shift type button */}
                    {!isOutsideMonth && (
                      <div className="px-2">
                        <div 
                          className="py-2 px-1 rounded-md text-center"
                          style={{
                            backgroundColor: isDarkMode ? shiftStyle.bgColor : shiftStyle.lightBgColor,
                            color: shiftStyle.textColor
                          }}
                        >
                          {shiftStyle.label}
                        </div>
                      </div>
                    )}
                    
                    {/* Holiday indicator at bottom */}
                    {hasHoliday && (
                      <div className="absolute bottom-2 left-2 flex items-center">
                        <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-green-500' : 'bg-green-600'} mr-1`}></div>
                        <span className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {holidayName}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Floating edit button */}
      <button 
        onClick={handleDayClick}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
};

export default MobileScheduleView; 