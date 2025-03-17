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
    <div className="mobile-schedule-view">
      {/* Header with month and year */}
      <div className="text-xl font-semibold mb-4 text-center">
        {monthData.name} {monthData.year}
      </div>
      
      {/* Selected day detail card */}
      <div 
        className={`
          p-3 mb-4 rounded-lg border border-gray-200 dark:border-gray-700
          ${selectedDay.isWeekend ? 'bg-gray-50 dark:bg-gray-800/20' : 'bg-white dark:bg-gray-800'} 
          ${selectedDay.isToday ? 'ring-2 ring-blue-500' : ''}
          shadow-sm
        `}
        onClick={handleDayClick}
      >
        {/* Date and shift header combined */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${selectedDay.isToday 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}
            `}>
              {selectedDay.dayOfMonth}
            </div>
            <div>
              <div className="flex items-center">
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  {format(new Date(selectedDay.date), 'EEE')}
                </h3>
                <span className="mx-1 text-gray-400">·</span>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${shiftColorMap[selectedDay.personalShift.type]} mr-1`}></div>
                  <span className="text-sm font-medium">{selectedDay.personalShift.type}</span>
                  {selectedDay.personalShift.shiftNumber && (
                    <span className="ml-1 text-xs text-gray-500">({selectedDay.personalShift.shiftNumber})</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(selectedDay.date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          {/* Edit button */}
          <button 
            onClick={handleDayClick}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        {/* Compact info section */}
        <div className="space-y-1.5 text-sm">
          {/* Show override info inline */}
          {selectedDay.personalShift.isOverridden && selectedDay.personalShift.originalType && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Changed from {selectedDay.personalShift.originalType}
            </div>
          )}
          
          {/* Show notes if any */}
          {selectedDay.personalShift.notes && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {selectedDay.personalShift.notes}
            </div>
          )}
          
          {/* Show holiday inline */}
          {selectedDay.holiday && (
            <div className="text-xs text-orange-600 dark:text-orange-400">
              {selectedDay.holiday.name} ({selectedDay.holiday.isOfficial ? 'Official' : 'Unofficial'})
            </div>
          )}
          
          {/* Groups working today - compact view */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {selectedDay.groupAssignments.dayShift.length > 0 && (
              <span className="inline-flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                Day: {selectedDay.groupAssignments.dayShift.map(g => `${g.group}${g.isFirstDay ? ' (1st)' : ' (2nd)'}`).join(', ')}
                {selectedDay.groupAssignments.nightShift.length > 0 && <span className="mx-1">·</span>}
              </span>
            )}
            {selectedDay.groupAssignments.nightShift.length > 0 && (
              <span className="inline-flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                Night: {selectedDay.groupAssignments.nightShift.map(g => `${g.group}${g.isFirstNight ? ' (1st)' : ' (2nd)'}`).join(', ')}
              </span>
            )}
            {selectedDay.groupAssignments.dayShift.length === 0 && selectedDay.groupAssignments.nightShift.length === 0 && (
              <span>No groups working today</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Day selector - Grid calendar style */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Navigate Days:
        </h3>
        
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
            <div key={i} className="text-xs font-medium text-gray-500">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {weekRows.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
                    className={`
                      aspect-square flex flex-col items-center justify-center p-1 relative
                      ${!day.isCurrentMonth ? 'opacity-40' : ''}
                      ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 z-10' : ''}
                      ${day.isToday ? 'font-bold' : ''}
                    `}
                    disabled={!day.isCurrentMonth}
                  >
                    {/* Colored background for shift type */}
                    <div className={`absolute inset-1 rounded-md opacity-80 ${shiftColorMap[day.personalShift.type]}`}></div>
                    
                    {/* Date number on top of background */}
                    <span className="z-10 text-white font-medium">{day.dayOfMonth}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Shift legend */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Legend:</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(shiftColorMap).map(([type, color]) => (
            <div key={type} className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileScheduleView; 