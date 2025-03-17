import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface MobileScheduleViewProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

// Modern shift theme configuration
const shiftTheme: Record<ShiftType, { 
  color: string,
  gradient: string,
  icon: React.ReactNode
}> = {
  'Day': {
    color: 'var(--color-day)',
    gradient: 'var(--gradient-day)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
  },
  'Night': {
    color: 'var(--color-night)',
    gradient: 'var(--gradient-night)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4-2.28 5.389 5.389 0 01-1.14-5.26A9.017 9.017 0 0012 3z"/></svg>
  },
  'Off': {
    color: 'var(--color-off)',
    gradient: 'var(--gradient-off)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31A7.902 7.902 0 0112 20zm6.31-3.1L7.1 5.69A7.902 7.902 0 0112 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
  },
  'Leave': {
    color: 'var(--color-leave)',
    gradient: 'var(--gradient-leave)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.66 17.66L12 23.31l-5.66-5.65M12 20.35V12"/><path d="M9.17 14.83L14.83 14.83M4 9.77h16M2 5.5h20"/></svg>
  },
  'Public': {
    color: 'var(--color-public)',
    gradient: 'var(--gradient-public)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
  },
  'Overtime': {
    color: 'var(--color-overtime)',
    gradient: 'var(--gradient-overtime)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  },
  'InLieu': {
    color: 'var(--color-inlieu)',
    gradient: 'var(--gradient-inlieu)',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9h2c0 3.87 3.13 7 7 7s7-3.13 7-7-3.13-7-7-7c-1.93 0-3.68.79-4.94 2.06L11 9H3V1l3.89 3.89C8.37 3.34 10.69 2 13.5 2c4.97 0 9 4.03 9 9z"/></svg>
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
      // Initial check
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      
      // Listen for changes
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
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  return (
    <div className={`${isDarkMode ? 'theme-dark' : 'theme-light'} px-4 py-6 transition-colors duration-200`}>
      <style jsx global>{`
        .theme-dark {
          --bg-primary: #121927;
          --bg-secondary: #1a2133;
          --bg-tertiary: #242e42;
          --text-primary: #ffffff;
          --text-secondary: #a0aec0;
          --text-tertiary: #64748b;
          --border-color: rgba(255, 255, 255, 0.1);
          --calendar-bg: #1a2133;
          --day-bg: #242e42;
          --day-outside: #1a2133;
          --today-indicator: #3b82f6;
          
          --color-day: #3b82f6;
          --color-night: #10b981;
          --color-off: #ef4444;
          --color-leave: #f59e0b;
          --color-public: #8b5cf6;
          --color-overtime: #ec4899;
          --color-inlieu: #6366f1;
          
          --gradient-day: linear-gradient(135deg, #3b82f6, #2563eb);
          --gradient-night: linear-gradient(135deg, #10b981, #059669);
          --gradient-off: linear-gradient(135deg, #ef4444, #dc2626);
          --gradient-leave: linear-gradient(135deg, #f59e0b, #d97706);
          --gradient-public: linear-gradient(135deg, #8b5cf6, #7c3aed);
          --gradient-overtime: linear-gradient(135deg, #ec4899, #db2777);
          --gradient-inlieu: linear-gradient(135deg, #6366f1, #4f46e5);
        }
        
        .theme-light {
          --bg-primary: #f7fafc;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f1f5f9;
          --text-primary: #1a202c;
          --text-secondary: #4a5568;
          --text-tertiary: #718096;
          --border-color: rgba(0, 0, 0, 0.1);
          --calendar-bg: #ffffff;
          --day-bg: #f1f5f9;
          --day-outside: #e2e8f0;
          --today-indicator: #3b82f6;
          
          --color-day: #3b82f6;
          --color-night: #10b981;
          --color-off: #ef4444;
          --color-leave: #f59e0b;
          --color-public: #8b5cf6;
          --color-overtime: #ec4899;
          --color-inlieu: #6366f1;
          
          --gradient-day: linear-gradient(135deg, #3b82f680, #2563eb80);
          --gradient-night: linear-gradient(135deg, #10b98180, #05966980);
          --gradient-off: linear-gradient(135deg, #ef444480, #dc262680);
          --gradient-leave: linear-gradient(135deg, #f59e0b80, #d9770680);
          --gradient-public: linear-gradient(135deg, #8b5cf680, #7c3aed80);
          --gradient-overtime: linear-gradient(135deg, #ec489980, #db277780);
          --gradient-inlieu: linear-gradient(135deg, #6366f180, #4f46e580);
        }
      `}</style>
      
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="text-xl font-semibold text-[var(--text-primary)]">
          {monthData.name} {monthData.year}
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <button className="px-4 py-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium text-sm">
            Today
          </button>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="bg-[var(--calendar-bg)] rounded-xl overflow-hidden shadow-sm border border-[var(--border-color)] mb-6">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center py-3 border-b border-[var(--border-color)]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
            <div key={i} className="text-xs font-medium text-[var(--text-tertiary)]">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="p-2">
          {weekRows.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                const isOutsideMonth = !day.isCurrentMonth;
                const shiftType = day.personalShift.type;
                const shiftStyle = shiftTheme[shiftType];
                
                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
                    disabled={isOutsideMonth}
                    className={`
                      relative flex flex-col items-center justify-center p-1
                      aspect-square rounded-lg transition duration-200
                      ${isOutsideMonth ? 'opacity-40 bg-[var(--day-outside)]' : 'bg-[var(--day-bg)]'}
                      ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] ring-[var(--today-indicator)] z-10' : ''}
                      focus:outline-none hover:bg-opacity-90
                    `}
                  >
                    {/* Day number */}
                    <span className={`
                      text-sm font-medium mb-0.5
                      ${isOutsideMonth ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}
                      ${day.isToday ? 'relative w-7 h-7 flex items-center justify-center' : ''}
                    `}>
                      {day.isToday && (
                        <span className="absolute inset-0 rounded-full bg-[var(--today-indicator)] opacity-20"></span>
                      )}
                      {day.dayOfMonth}
                    </span>
                    
                    {/* Shift indicator */}
                    {!isOutsideMonth && (
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ 
                          background: shiftStyle.gradient,
                          color: 'white',
                        }}
                      >
                        {shiftStyle.icon}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected day details */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden mb-6">
        {/* Header */}
        <div 
          className="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]"
          style={{ 
            background: shiftTheme[selectedDay.personalShift.type].gradient,
            color: 'white'
          }}
        >
          <div>
            <div className="text-xl font-bold">
              {format(new Date(selectedDay.date), 'EEEE')}
            </div>
            <div className="text-sm opacity-90">
              {format(new Date(selectedDay.date), 'MMMM d, yyyy')}
            </div>
          </div>
          
          <button 
            onClick={handleDayClick}
            className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        {/* Shift badge */}
        <div className="px-4 py-4">
          <div className="flex items-center mb-4">
            <div 
              className="w-10 h-10 rounded-lg mr-3 flex items-center justify-center"
              style={{ 
                background: shiftTheme[selectedDay.personalShift.type].gradient,
                color: 'white' 
              }}
            >
              {shiftTheme[selectedDay.personalShift.type].icon}
            </div>
            
            <div>
              <div className="font-semibold text-[var(--text-primary)]">
                {selectedDay.personalShift.type} Shift
                {selectedDay.personalShift.shiftNumber && (
                  <span className="text-xs ml-1 opacity-75">({selectedDay.personalShift.shiftNumber})</span>
                )}
              </div>
              
              {selectedDay.personalShift.isOverridden && selectedDay.personalShift.originalType && (
                <div className="text-xs text-[var(--color-day)]">
                  Changed from {selectedDay.personalShift.originalType}
                </div>
              )}
            </div>
          </div>
          
          {/* Groups */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-secondary)]">
              Groups on shift:
            </h4>
            
            <div className="space-y-3">
              {/* Day shift groups */}
              {selectedDay.groupAssignments.dayShift.length > 0 && (
                <div className="flex items-start">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center mr-2 flex-shrink-0"
                    style={{
                      background: 'var(--gradient-day)',
                      color: 'white'
                    }}
                  >
                    {shiftTheme['Day'].icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--text-secondary)]">Day:</div>
                    <div className="text-sm text-[var(--text-primary)]">
                      {selectedDay.groupAssignments.dayShift.map(g => `Group ${g.group}${g.isFirstDay ? ' (1st)' : ' (2nd)'}`).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Night shift groups */}
              {selectedDay.groupAssignments.nightShift.length > 0 && (
                <div className="flex items-start">
                  <div 
                    className="w-6 h-6 rounded flex items-center justify-center mr-2 flex-shrink-0"
                    style={{
                      background: 'var(--gradient-night)',
                      color: 'white'
                    }}
                  >
                    {shiftTheme['Night'].icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--text-secondary)]">Night:</div>
                    <div className="text-sm text-[var(--text-primary)]">
                      {selectedDay.groupAssignments.nightShift.map(g => `Group ${g.group}${g.isFirstNight ? ' (1st)' : ' (2nd)'}`).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedDay.groupAssignments.dayShift.length === 0 && selectedDay.groupAssignments.nightShift.length === 0 && (
                <div className="text-sm text-[var(--text-tertiary)] italic">
                  No groups scheduled today
                </div>
              )}
            </div>
          </div>
          
          {/* Notes and holiday info */}
          {(selectedDay.personalShift.notes || selectedDay.holiday) && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              {selectedDay.personalShift.notes && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">Notes:</div>
                  <div className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-2 rounded">
                    {selectedDay.personalShift.notes}
                  </div>
                </div>
              )}
              
              {selectedDay.holiday && (
                <div className="flex items-center text-[var(--color-public)]">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-sm">
                    {selectedDay.holiday.name} ({selectedDay.holiday.isOfficial ? 'Official' : 'Unofficial'})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Shift legend */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <div className="text-sm font-medium text-[var(--text-primary)]">Shift Legend</div>
        </div>
        
        <div className="p-3">
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            {Object.entries(shiftTheme).map(([type, style]) => (
              <div key={type} className="flex items-center">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center mr-2"
                  style={{ 
                    background: style.gradient,
                    color: 'white'
                  }}
                >
                  {style.icon}
                </div>
                <span className="text-sm text-[var(--text-primary)]">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileScheduleView; 