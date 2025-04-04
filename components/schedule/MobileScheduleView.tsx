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
  label: string
}> = {
  'Day': { 
    bgColor: '#3b82f6', // Brighter blue for better visibility
    textColor: 'white',
    label: 'Day'
  },
  'Night': { 
    bgColor: '#10b981', // More vibrant green
    textColor: 'white',
    label: 'Night'
  },
  'Off': { 
    bgColor: '#ef4444', // Brighter red
    textColor: 'white',
    label: 'Off'
  },
  'Leave': { 
    bgColor: '#f59e0b', // More vibrant orange/amber
    textColor: 'white',
    label: 'Leave'
  },
  'Public': { 
    bgColor: '#8b5cf6', // More vibrant purple
    textColor: 'white',
    label: 'Public'
  },
  'Overtime': { 
    bgColor: '#ec4899', // Brighter pink
    textColor: 'white',
    label: 'OT'
  },
  'InLieu': { 
    bgColor: '#6366f1', // More vibrant indigo
    textColor: 'white',
    label: 'InLieu'
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
        relative sc-day-cell
        ${isOutsideMonth ? 'opacity-40' : ''}
        ${isSelected ? 'bg-[var(--sc-day-selected-bg)] text-[var(--sc-day-selected-text)]' : 
          isToday ? 'bg-[var(--sc-day-today-bg)]' : 'bg-transparent'}
        rounded-sm transition-all duration-200 active:scale-95
      `}
      onClick={onClick}
    >
      {/* Day number with improved styling */}
      <div className={`
        ${isToday ? 'bg-[var(--sc-day-today-bg)] rounded-full p-1' : 'p-1'}
        ${isSelected ? 'font-bold' : ''}
        flex justify-center items-center
      `}>
        <span className={`
          text-base ${isOutsideMonth ? 'text-[var(--sc-day-inactive)]' : 'text-[var(--sc-text-primary)]'}
          ${isToday ? 'font-semibold' : ''}
        `}>
          {day.dayOfMonth}
        </span>
      </div>
      
      {/* Shift type indicator without icon */}
      {!isOutsideMonth && (
        <div className="shift-indicator">
          <div 
            className="py-0.5 px-1 rounded-md text-center flex items-center justify-center shadow-sm"
            style={{
              backgroundColor: shiftStyle.bgColor,
              color: shiftStyle.textColor
            }}
          >
            <span className="text-xs font-medium">{shiftStyle.label}</span>
          </div>
        </div>
      )}

      {/* Notes indicator */}
      {day.personalShift.notes && (
        <div className="notes-indicator"></div>
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
    }
  }, [monthData]);

  // Update visible days when month data changes
  useEffect(() => {
    if (monthData?.days) {
      setVisibleDays(monthData.days);
    }
  }, [monthData]);

  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
    if (onDayClick) {
      onDayClick(visibleDays[index]);
    }
  };

  if (!monthData?.days) return null;

  const selectedDay = visibleDays[selectedDayIndex];
  const selectedShift = selectedDay?.personalShift;
  const selectedShiftConfig = selectedShift ? shiftConfig[selectedShift.type] : null;

  // Calculate week rows for the calendar
  const weekRows = [];
  let currentRow = [];
  
  for (let i = 0; i < visibleDays.length; i++) {
    currentRow.push(visibleDays[i]);
    if (currentRow.length === 7) {
      weekRows.push(currentRow);
      currentRow = [];
    }
  }

  // Add remaining days to last row if any
  if (currentRow.length > 0) {
    weekRows.push(currentRow);
  }

  return (
    <div className="space-y-4 sc-mobile-calendar">
      {/* Calendar grid with improved spacing */}
      <div className="grid grid-cols-7 bg-[var(--sc-day-bg)] rounded-t-lg mx-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => (
          <div key={i} className={`
            py-1 text-center font-medium text-xs
            ${i === 0 || i === 6 ? 'text-[var(--sc-day-inactive)]' : 'text-[var(--sc-text-primary)]'}
          `}>
            {dayLabel}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-0 p-0 bg-[var(--sc-day-bg)] rounded-b-lg mx-0">
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
      
      {/* Selected day details - only show if there's enough space */}
      {selectedDay && (
        <div className="bg-[var(--sc-day-bg)] rounded-lg p-3 mt-2 mx-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-[var(--sc-text-primary)]">
              {format(new Date(selectedDay.date), 'EEEE, MMMM d')}
            </h3>
            
            {selectedDay.isToday && (
              <span className="bg-[var(--sc-day-today-bg)] text-[var(--sc-text-primary)] text-xs px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
          
          {selectedShiftConfig && (
            <div className="mb-2">
              <div 
                className="py-1.5 px-2 rounded-lg flex items-center"
                style={{
                  backgroundColor: selectedShiftConfig.bgColor,
                  color: selectedShiftConfig.textColor
                }}
              >
                <span className="font-medium">{selectedShift.type} Shift</span>
              </div>
              
              {selectedShift.notes && (
                <div className="bg-[var(--sc-bg-secondary)] rounded-lg p-2 mt-2 text-[var(--sc-text-secondary)] text-xs">
                  <div className="font-medium text-[var(--sc-text-primary)] mb-1">Notes:</div>
                  {selectedShift.notes}
                </div>
              )}
            </div>
          )}
          
          {selectedDay.groupAssignments && (
            <div className="space-y-1">
              {selectedDay.groupAssignments.dayShift.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[var(--sc-text-secondary)]">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Day shift: Groups {selectedDay.groupAssignments.dayShift.map(g => g.group).join(', ')}</span>
                </div>
              )}
              
              {selectedDay.groupAssignments.nightShift.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[var(--sc-text-secondary)]">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
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
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-[var(--sc-accent-color)] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform"
        aria-label="Edit schedule"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
};

export default MobileScheduleView; 