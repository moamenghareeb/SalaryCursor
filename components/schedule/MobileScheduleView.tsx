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
    <div className="bg-black min-h-screen">
      {/* Navigation row (pre-existing from app) */}
      <div className="flex items-center justify-between rounded-lg bg-gray-800/40 mx-4 my-6 p-2">
        <button className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-xl font-medium text-white">
          March 2025
        </div>
        
        <div className="flex space-x-2">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
            Today
          </button>
        </div>
      </div>
      
      {/* Calendar container */}
      <div className="bg-black mx-4 rounded-lg overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <h1 className="text-5xl font-bold text-white">
            March
          </h1>
        </div>
        
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center border-b border-gray-800">
          {['S', 'S', 'M', 'T', 'W', 'T', 'F'].map((dayLabel, i) => (
            <div key={i} className="py-2 text-sm font-medium text-gray-400">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        {weekRows.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className={`${weekIndex > 0 ? 'border-t border-gray-800' : ''}`}>
            <div className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                const isOutsideMonth = !day.isCurrentMonth;
                const shiftType = day.personalShift.type;
                const shiftStyle = shiftConfig[shiftType];
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      relative border-r border-gray-800 last:border-r-0
                      ${isSelected ? 'bg-gray-800' : ''}
                      ${isOutsideMonth ? 'opacity-40' : ''}
                      min-h-[100px]
                    `}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
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