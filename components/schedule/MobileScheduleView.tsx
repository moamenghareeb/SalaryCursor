import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface MobileScheduleViewProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

// Define color mapping for different shift types
const shiftColorMap: Record<ShiftType, { bg: string, dot: string, text: string, icon: string }> = {
  'Day': { 
    bg: 'bg-blue-600', 
    dot: 'bg-blue-400', 
    text: 'text-blue-400',
    icon: '☀️'
  },
  'Night': { 
    bg: 'bg-green-600', 
    dot: 'bg-green-400', 
    text: 'text-green-400',
    icon: '🌙'
  },
  'Off': { 
    bg: 'bg-red-600', 
    dot: 'bg-red-400', 
    text: 'text-red-400',
    icon: '⭕'
  },
  'Leave': { 
    bg: 'bg-yellow-600', 
    dot: 'bg-yellow-400', 
    text: 'text-yellow-400',
    icon: '🏖️'
  },
  'Public': { 
    bg: 'bg-orange-600', 
    dot: 'bg-orange-400', 
    text: 'text-orange-400',
    icon: '🏛️'
  },
  'Overtime': { 
    bg: 'bg-pink-600', 
    dot: 'bg-pink-400', 
    text: 'text-pink-400',
    icon: '⏱️'
  },
  'InLieu': { 
    bg: 'bg-purple-600', 
    dot: 'bg-purple-400', 
    text: 'text-purple-400',
    icon: '🔄'
  }
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
    return <div className="p-4 text-center text-white">Loading schedule...</div>;
  }
  
  return (
    <div className="px-2 py-5">
      {/* Month and year title */}
      <div className="text-xl font-bold text-center text-white mb-6">
        {monthData.name} {monthData.year}
      </div>
      
      {/* Calendar grid */}
      <div className="mb-6">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
            <div key={i} className="text-xs font-medium text-gray-300">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="rounded-lg overflow-hidden">
          {weekRows.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const isSelected = selectedDayIndex === monthData.days.findIndex(d => d.date === day.date);
                const isOutsideMonth = !day.isCurrentMonth;
                const shiftType = day.personalShift.type;
                const shiftColor = shiftColorMap[shiftType];
                
                // Base background color based on shift for current month days
                const bgColor = isOutsideMonth ? 'bg-gray-800' : shiftColor.bg;
                
                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    onClick={() => handleDaySelect(monthData.days.findIndex(d => d.date === day.date))}
                    className={`
                      relative h-14 p-0 m-0.5
                      ${isOutsideMonth ? 'opacity-40' : ''}
                      ${isSelected ? 'ring-2 ring-white z-10' : ''}
                      ${bgColor}
                      rounded-md overflow-hidden
                      transition-all duration-150 hover:brightness-110
                    `}
                    disabled={isOutsideMonth}
                  >
                    {/* Day number at top */}
                    <div className="absolute top-1 left-0 right-0 flex justify-center">
                      <span className={`
                        text-sm font-medium text-white
                        ${day.isToday ? 'bg-white bg-opacity-20 w-6 h-6 rounded-full flex items-center justify-center' : ''}
                      `}>
                        {day.dayOfMonth}
                      </span>
                    </div>
                    
                    {/* Shift indicator icon */}
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                      <span className="text-xs">{shiftColor.icon}</span>
                    </div>
                    
                    {/* Gradient overlay for better text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected day detail card */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-5 border border-gray-700 mb-5">
        {/* Day header with edit button */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              {format(new Date(selectedDay.date), 'EEEE')}
            </h3>
            <p className="text-sm text-gray-300">
              {format(new Date(selectedDay.date), 'MMMM d, yyyy')}
            </p>
          </div>
          
          <button 
            onClick={handleDayClick}
            className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        
        {/* Shift status with enhanced visibility */}
        <div className={`mb-4 py-2 px-3 rounded-md flex items-center space-x-2 ${shiftColorMap[selectedDay.personalShift.type].bg} bg-opacity-30`}>
          <span className="text-lg">{shiftColorMap[selectedDay.personalShift.type].icon}</span>
          <span className={`font-medium ${shiftColorMap[selectedDay.personalShift.type].text}`}>
            {selectedDay.personalShift.type}
            {selectedDay.personalShift.shiftNumber && (
              <span className="ml-1 text-xs text-gray-400">({selectedDay.personalShift.shiftNumber})</span>
            )}
          </span>
        </div>
        
        {/* Groups on shift section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Groups on shift today:
          </h4>
          
          <div className="space-y-2">
            {/* Day shift groups */}
            {selectedDay.groupAssignments.dayShift.length > 0 && (
              <div className="flex items-start">
                <span className="text-lg mr-2 flex-shrink-0">☀️</span>
                <div>
                  <span className="text-sm font-medium text-gray-300">Day:</span>{' '}
                  <span className="text-sm text-gray-400">
                    {selectedDay.groupAssignments.dayShift.map(g => `Group ${g.group}${g.isFirstDay ? ' (1st)' : ' (2nd)'}`).join(', ')}
                  </span>
                </div>
              </div>
            )}
            
            {/* Night shift groups */}
            {selectedDay.groupAssignments.nightShift.length > 0 && (
              <div className="flex items-start">
                <span className="text-lg mr-2 flex-shrink-0">🌙</span>
                <div>
                  <span className="text-sm font-medium text-gray-300">Night:</span>{' '}
                  <span className="text-sm text-gray-400">
                    {selectedDay.groupAssignments.nightShift.map(g => `Group ${g.group}${g.isFirstNight ? ' (1st)' : ' (2nd)'}`).join(', ')}
                  </span>
                </div>
              </div>
            )}
            
            {selectedDay.groupAssignments.dayShift.length === 0 && selectedDay.groupAssignments.nightShift.length === 0 && (
              <p className="text-sm text-gray-400">No groups working today</p>
            )}
          </div>
        </div>
        
        {/* Additional information */}
        {(selectedDay.personalShift.isOverridden || selectedDay.personalShift.notes || selectedDay.holiday) && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {/* Show override info */}
            {selectedDay.personalShift.isOverridden && selectedDay.personalShift.originalType && (
              <div className="text-xs text-blue-400 mb-1.5">
                Changed from {selectedDay.personalShift.originalType}
              </div>
            )}
            
            {/* Show notes if any */}
            {selectedDay.personalShift.notes && (
              <div className="text-xs text-gray-400 mb-1.5">
                <span className="font-medium">Notes:</span> {selectedDay.personalShift.notes}
              </div>
            )}
            
            {/* Show holiday */}
            {selectedDay.holiday && (
              <div className="text-xs text-orange-400">
                {selectedDay.holiday.name} ({selectedDay.holiday.isOfficial ? 'Official' : 'Unofficial'})
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Shift legend with icons */}
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {Object.entries(shiftColorMap).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center">
              <span className="text-lg mr-1.5">{color.icon}</span>
              <span className="text-xs text-gray-300">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileScheduleView; 