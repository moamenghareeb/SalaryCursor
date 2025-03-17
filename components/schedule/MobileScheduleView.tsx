import React, { useState, useEffect } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { CalendarDay, MonthData, ShiftType } from '../../lib/types/schedule';

interface MobileScheduleViewProps {
  monthData: MonthData;
  onDayClick?: (day: CalendarDay) => void;
}

// Shift type styling configuration with improved contrast and readability
const shiftConfig: Record<ShiftType, { 
  bgColor: string,
  textColor: string,
  label: string,
  icon?: string
}> = {
  'Day': { 
    bgColor: '#3b82f6', // Brighter blue for better visibility
    textColor: 'white',
    label: 'Day',
    icon: '☀️'
  },
  'Night': { 
    bgColor: '#10b981', // More vibrant green
    textColor: 'white',
    label: 'Night',
    icon: '🌙'
  },
  'Off': { 
    bgColor: '#ef4444', // Brighter red
    textColor: 'white',
    label: 'Off',
    icon: '⛔'
  },
  'Leave': { 
    bgColor: '#f59e0b', // More vibrant orange/amber
    textColor: 'white',
    label: 'Leave',
    icon: '✈️'
  },
  'Public': { 
    bgColor: '#8b5cf6', // More vibrant purple
    textColor: 'white',
    label: 'Public',
    icon: '🏛️'
  },
  'Overtime': { 
    bgColor: '#ec4899', // Brighter pink
    textColor: 'white',
    label: 'OT',
    icon: '⏱️'
  },
  'InLieu': { 
    bgColor: '#6366f1', // More vibrant indigo
    textColor: 'white',
    label: 'InLieu',
    icon: '🔄'
  }
};

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: () => void;
  currentMonth: number;
}

const DayCell: React.FC<DayCellProps> = ({ day, isSelected, onClick, currentMonth }) => {
  const shiftType = day.personalShift.type;
  const shiftStyle = shiftConfig[shiftType];
  const isToday = day.isToday;
  const cellDate = new Date(day.date);
  const isOutsideMonth = cellDate.getMonth() !== currentMonth;

  return (
    <div 
      className={`
        relative p-1 border-b border-gray-700 ${isOutsideMonth ? 'opacity-40' : ''}
        ${isSelected ? 'bg-gray-800' : isToday ? 'bg-gray-700' : 'bg-transparent'}
        rounded-lg transition-all duration-200 active:scale-95
      `}
      onClick={onClick}
    >
      {/* Day number with improved styling */}
      <div className={`
        ${isToday ? 'bg-white/10 rounded-full p-1.5' : 'p-1.5'}
        ${isSelected ? 'font-bold' : ''}
        flex justify-center items-center
      `}>
        <span className={`
          text-lg ${isOutsideMonth ? 'text-gray-500' : 'text-white'}
          ${isToday ? 'font-semibold' : ''}
        `}>
          {day.dayOfMonth}
        </span>
      </div>
      
      {/* Shift type indicator with icon */}
      {!isOutsideMonth && (
        <div className="flex justify-center mt-1">
          <div 
            className="py-1 px-2 rounded-md text-center flex items-center justify-center gap-1 shadow-sm"
            style={{
              backgroundColor: shiftStyle.bgColor,
              color: shiftStyle.textColor
            }}
          >
            {shiftStyle.icon && <span>{shiftStyle.icon}</span>}
            <span className="text-sm font-medium">{shiftStyle.label}</span>
          </div>
        </div>
      )}

      {/* Notes indicator */}
      {day.personalShift.notes && (
        <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full m-1"></div>
      )}
    </div>
  );
};

const MobileScheduleView: React.FC<MobileScheduleViewProps> = ({ 
  monthData,
  onDayClick 
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [visibleDays, setVisibleDays] = useState<CalendarDay[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const currentMonth = currentDate.getMonth();
  
  // Initialize with today's date
  useEffect(() => {
    if (monthData?.days) {
      const today = new Date();
      const todayIndex = monthData.days.findIndex(day => 
        day.isCurrentMonth && isSameDay(new Date(day.date), today)
      );
      
      if (todayIndex >= 0) {
        setSelectedDayIndex(todayIndex);
        setCurrentDate(new Date(monthData.days[todayIndex].date));
      } else {
        const currentMonthFirstDayIndex = monthData.days.findIndex(day => day.isCurrentMonth);
        if (currentMonthFirstDayIndex >= 0) {
          setSelectedDayIndex(currentMonthFirstDayIndex);
          setCurrentDate(new Date(monthData.days[currentMonthFirstDayIndex].date));
        }
      }
      
      setVisibleDays(monthData.days);
    }
  }, [monthData]);
  
  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    setCurrentDate(new Date(visibleDays[index].date));
    
    if (onDayClick) {
      onDayClick(visibleDays[index]);
    }
  };
  
  // Group days into weeks
  const weekRows: CalendarDay[][] = [];
  if (visibleDays.length > 0) {
    for (let i = 0; i < visibleDays.length; i += 7) {
      weekRows.push(visibleDays.slice(i, Math.min(i + 7, visibleDays.length)));
    }
  }
  
  // Get the selected day's shift information
  const selectedDay = visibleDays[selectedDayIndex];
  const selectedShift = selectedDay?.personalShift;
  const selectedShiftConfig = selectedShift ? shiftConfig[selectedShift.type] : null;
  
  if (!visibleDays.length) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }
  
  return (
    <div className="bg-[#121212]">
      {/* Calendar header */}
      <div className="p-4 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <button 
          onClick={() => onDayClick && onDayClick(selectedDay)}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
        >
          Today
        </button>
      </div>
      
      {/* Day of week headers */}
      <div className="grid grid-cols-7 bg-[#1a1a1a] rounded-t-xl mx-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
          <div key={i} className={`
            py-2 text-center font-medium text-sm 
            ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-300'}
          `}>
            {dayLabel}
          </div>
        ))}
      </div>
      
      {/* Calendar grid with improved spacing */}
      <div className="grid grid-cols-7 gap-1 p-2 bg-[#1a1a1a] rounded-b-xl mx-2 mb-4">
        {weekRows.map((week, weekIndex) => (
          <React.Fragment key={`week-${weekIndex}`}>
            {week.map((day) => (
              <DayCell 
                key={day.date} 
                day={day} 
                isSelected={selectedDayIndex === visibleDays.findIndex(d => d.date === day.date)}
                onClick={() => handleDaySelect(visibleDays.findIndex(d => d.date === day.date))}
                currentMonth={currentMonth}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      
      {/* Selected day details */}
      {selectedDay && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 mx-2 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold text-white">
              {format(new Date(selectedDay.date), 'EEEE, MMMM d')}
            </h3>
            
            {selectedDay.isToday && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
          
          {selectedShiftConfig && (
            <div className="mb-3">
              <div 
                className="py-2 px-3 rounded-lg flex items-center gap-2 mb-2"
                style={{
                  backgroundColor: selectedShiftConfig.bgColor,
                  color: selectedShiftConfig.textColor
                }}
              >
                {selectedShiftConfig.icon && (
                  <span className="text-xl">{selectedShiftConfig.icon}</span>
                )}
                <span className="font-medium">{selectedShift.type} Shift</span>
              </div>
              
              {selectedShift.notes && (
                <div className="bg-gray-800 rounded-lg p-3 text-gray-300 text-sm">
                  <div className="font-medium text-white mb-1">Notes:</div>
                  {selectedShift.notes}
                </div>
              )}
            </div>
          )}
          
          {selectedDay.groupAssignments && (
            <div className="space-y-2">
              {selectedDay.groupAssignments.dayShift.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Day shift: Groups {selectedDay.groupAssignments.dayShift.map(g => g.group).join(', ')}</span>
                </div>
              )}
              
              {selectedDay.groupAssignments.nightShift.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Night shift: Groups {selectedDay.groupAssignments.nightShift.map(g => g.group).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Floating action button - enhanced with better positioning and animation */}
      <button 
        onClick={() => onDayClick && onDayClick(selectedDay)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform"
        aria-label="Edit schedule"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
};

export default MobileScheduleView; 