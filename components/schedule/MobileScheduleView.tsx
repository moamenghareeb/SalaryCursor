import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface MobileScheduleViewProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

// Define color mapping for different shift types
const shiftColorMap: Record<ShiftType, string> = {
  'Day': 'bg-blue-500',
  'Night': 'bg-green-500',
  'Off': 'bg-red-500',
  'Leave': 'bg-yellow-500',
  'Public': 'bg-orange-500',
  'Overtime': 'bg-pink-500',
  'InLieu': 'bg-purple-500'
};

// Text colors for shift types
const shiftTextColorMap: Record<ShiftType, string> = {
  'Day': 'text-blue-600 dark:text-blue-400',
  'Night': 'text-green-600 dark:text-green-400',
  'Off': 'text-red-600 dark:text-red-400',
  'Leave': 'text-yellow-600 dark:text-yellow-400',
  'Public': 'text-orange-600 dark:text-orange-400',
  'Overtime': 'text-pink-600 dark:text-pink-400',
  'InLieu': 'text-purple-600 dark:text-purple-400'
};

const MobileScheduleView: React.FC<MobileScheduleViewProps> = ({ 
  monthData,
  onDayClick 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visibleDays, setVisibleDays] = useState<CalendarDay[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  // Initialize with today or current month
  useEffect(() => {
    if (monthData && monthData.days) {
      // Find today in month data or default to first day of current month
      const today = new Date();
      const todayIndex = monthData.days.findIndex(day => 
        day.isCurrentMonth && isSameDay(new Date(day.date), today)
      );
      
      if (todayIndex >= 0) {
        setSelectedDayIndex(todayIndex);
        setSelectedDate(new Date(monthData.days[todayIndex].date));
      } else {
        // Default to first day of current month
        const currentMonthFirstDayIndex = monthData.days.findIndex(day => day.isCurrentMonth);
        if (currentMonthFirstDayIndex >= 0) {
          setSelectedDayIndex(currentMonthFirstDayIndex);
          setSelectedDate(new Date(monthData.days[currentMonthFirstDayIndex].date));
        }
      }
      
      // Get visible days (all days in the month data)
      setVisibleDays(monthData.days);
    }
  }, [monthData]);
  
  // Handle day selection
  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    setSelectedDate(new Date(visibleDays[index].date));
  };
  
  // Handle day click (for edit)
  const handleDayClick = () => {
    if (onDayClick && visibleDays.length > 0) {
      onDayClick(visibleDays[selectedDayIndex]);
    }
  };
  
  // Get detailed info for selected day
  const getSelectedDay = () => {
    if (!visibleDays.length || selectedDayIndex >= visibleDays.length) return null;
    return visibleDays[selectedDayIndex];
  };
  
  const selectedDay = getSelectedDay();
  
  // Group days into weeks for grid display
  const weekRows: CalendarDay[][] = [];
  if (visibleDays.length > 0) {
    for (let i = 0; i < visibleDays.length; i += 7) {
      weekRows.push(visibleDays.slice(i, Math.min(i + 7, visibleDays.length)));
    }
  }
  
  if (!selectedDay) {
    return <div className="p-4 text-center">Loading schedule...</div>;
  }
  
  return (
    <div className="mobile-schedule-view space-y-5">
      {/* Header with month and year */}
      <div className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">
        {monthData.name} {monthData.year}
      </div>
      
      {/* Calendar grid - simplified and modern */}
      <div className="mb-4">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
            <div key={i} className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
          {weekRows.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
                    className={`
                      py-3 flex flex-col items-center relative
                      ${!day.isCurrentMonth ? 'opacity-40' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors
                    `}
                    disabled={!day.isCurrentMonth}
                  >
                    {/* Date number */}
                    <span className={`
                      text-sm font-medium mb-1
                      ${day.isToday ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : 
                        'text-gray-800 dark:text-gray-200'}
                    `}>
                      {day.dayOfMonth}
                    </span>
                    
                    {/* Shift indicator dot */}
                    <span className={`w-2 h-2 rounded-full ${shiftColorMap[day.personalShift.type]}`}></span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected day detail card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        {/* Day header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {format(new Date(selectedDay.date), 'EEEE, MMMM d')}
            </h3>
            <p className={`font-medium ${shiftTextColorMap[selectedDay.personalShift.type]}`}>
              {selectedDay.personalShift.type}
              {selectedDay.personalShift.shiftNumber && (
                <span className="ml-1 text-xs text-gray-500">({selectedDay.personalShift.shiftNumber})</span>
              )}
            </p>
          </div>
          
          {/* Edit button */}
          <button 
            onClick={handleDayClick}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        {/* Groups on shift section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Groups on shift today:
          </h4>
          
          {/* Day shift groups */}
          {selectedDay.groupAssignments.dayShift.length > 0 && (
            <div className="flex items-start">
              <span className="w-3 h-3 rounded-full bg-blue-500 mt-1 mr-2 flex-shrink-0"></span>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Day:</span>{' '}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDay.groupAssignments.dayShift.map(g => `Group ${g.group}${g.isFirstDay ? ' (1st)' : ' (2nd)'}`).join(', ')}
                </span>
              </div>
            </div>
          )}
          
          {/* Night shift groups */}
          {selectedDay.groupAssignments.nightShift.length > 0 && (
            <div className="flex items-start">
              <span className="w-3 h-3 rounded-full bg-green-500 mt-1 mr-2 flex-shrink-0"></span>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Night:</span>{' '}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDay.groupAssignments.nightShift.map(g => `Group ${g.group}${g.isFirstNight ? ' (1st)' : ' (2nd)'}`).join(', ')}
                </span>
              </div>
            </div>
          )}
          
          {selectedDay.groupAssignments.dayShift.length === 0 && selectedDay.groupAssignments.nightShift.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No groups working today</p>
          )}
        </div>
        
        {/* Additional information */}
        {(selectedDay.personalShift.isOverridden || selectedDay.personalShift.notes || selectedDay.holiday) && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Show override info */}
            {selectedDay.personalShift.isOverridden && selectedDay.personalShift.originalType && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1.5">
                Changed from {selectedDay.personalShift.originalType}
              </div>
            )}
            
            {/* Show notes if any */}
            {selectedDay.personalShift.notes && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                <span className="font-medium">Notes:</span> {selectedDay.personalShift.notes}
              </div>
            )}
            
            {/* Show holiday */}
            {selectedDay.holiday && (
              <div className="text-xs text-orange-600 dark:text-orange-400">
                {selectedDay.holiday.name} ({selectedDay.holiday.isOfficial ? 'Official' : 'Unofficial'})
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Shift legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(shiftColorMap).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${color} mr-1.5`}></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileScheduleView; 