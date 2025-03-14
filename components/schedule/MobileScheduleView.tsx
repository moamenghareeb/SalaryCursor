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
  'Night': 'bg-indigo-600',
  'Off': 'bg-gray-400',
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
      
      // Get visible days (current month only)
      const currentMonthDays = monthData.days.filter(day => day.isCurrentMonth);
      setVisibleDays(currentMonthDays);
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
  
  // Calculate days to show in the bottom scroller
  const getDaysToShow = () => {
    if (!visibleDays.length) return [];
    
    // Get 3 days before and 3 days after selected day
    const startIdx = Math.max(0, selectedDayIndex - 3);
    const endIdx = Math.min(visibleDays.length - 1, selectedDayIndex + 3);
    return visibleDays.slice(startIdx, endIdx + 1);
  };
  
  // Get detailed info for selected day
  const getSelectedDay = () => {
    if (!visibleDays.length || selectedDayIndex >= visibleDays.length) return null;
    return visibleDays[selectedDayIndex];
  };
  
  const selectedDay = getSelectedDay();
  const daysToShow = getDaysToShow();
  
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
          p-4 mb-6 rounded-lg border border-gray-200 dark:border-gray-700
          ${selectedDay.isWeekend ? 'bg-gray-50 dark:bg-gray-800/20' : 'bg-white dark:bg-gray-800'} 
          ${selectedDay.isToday ? 'ring-2 ring-blue-500' : ''}
          shadow-md
        `}
        onClick={handleDayClick}
      >
        {/* Date header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${selectedDay.isToday 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}
            `}>
              <span className="text-lg font-semibold">{selectedDay.dayOfMonth}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {format(new Date(selectedDay.date), 'EEEE')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(selectedDay.date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          {/* Edit indicator */}
          <button 
            onClick={handleDayClick}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        {/* Shift information */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <div className={`w-4 h-4 rounded-full ${shiftColorMap[selectedDay.personalShift.type]} mr-2`}></div>
            <h4 className="font-semibold">Your Shift: {selectedDay.personalShift.type}</h4>
            {selectedDay.personalShift.shiftNumber && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                {selectedDay.personalShift.shiftNumber}
              </span>
            )}
          </div>
          
          {selectedDay.personalShift.isOverridden && selectedDay.personalShift.originalType && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-sm mb-3">
              Shift changed from {selectedDay.personalShift.originalType}
            </div>
          )}
          
          {selectedDay.personalShift.notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-md">
              {selectedDay.personalShift.notes}
            </div>
          )}
        </div>
        
        {/* Holiday information */}
        {selectedDay.holiday && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md">
            <div className="font-semibold">{selectedDay.holiday.name}</div>
            <div className="text-sm">{selectedDay.holiday.isOfficial ? 'Official Holiday' : 'Unofficial Holiday'}</div>
          </div>
        )}
        
        {/* Group assignments */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
          <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Groups Working Today</h4>
          
          {selectedDay.groupAssignments.dayShift.length > 0 && (
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Day Shift: {selectedDay.groupAssignments.dayShift.map(g => `${g.group}${g.isFirstDay ? ' (1st)' : ' (2nd)'}`).join(', ')}
              </span>
            </div>
          )}
          
          {selectedDay.groupAssignments.nightShift.length > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Night Shift: {selectedDay.groupAssignments.nightShift.map(g => `${g.group}${g.isFirstNight ? ' (1st)' : ' (2nd)'}`).join(', ')}
              </span>
            </div>
          )}
          
          {selectedDay.groupAssignments.dayShift.length === 0 && selectedDay.groupAssignments.nightShift.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No group assignments for this day</div>
          )}
        </div>
      </div>
      
      {/* Day selector */}
      <div className="relative">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Navigate Days:
        </h3>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {visibleDays.map((day, index) => (
            <button
              key={day.date}
              onClick={() => handleDaySelect(index)}
              className={`
                flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center rounded-full
                text-sm border
                ${selectedDayIndex === index 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}
                ${day.isToday ? 'ring-2 ring-blue-300 dark:ring-blue-500' : ''}
              `}
            >
              <span className="text-xs">{format(new Date(day.date), 'E')}</span>
              <span className="font-semibold">{day.dayOfMonth}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Shift legend */}
      <div className="mt-8">
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