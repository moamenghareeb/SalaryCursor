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
  textColor: string,
  label: string
}> = {
  'Day': { 
    bgColor: '#2563eb',
    textColor: 'white',
    label: 'Day'
  },
  'Night': { 
    bgColor: '#059669',
    textColor: 'white',
    label: 'Night'
  },
  'Off': { 
    bgColor: '#dc2626',
    textColor: 'white',
    label: 'Off'
  },
  'Leave': { 
    bgColor: '#d97706',
    textColor: 'white',
    label: 'Leav'
  },
  'Public': { 
    bgColor: '#7c3aed',
    textColor: 'white',
    label: 'Public'
  },
  'Overtime': { 
    bgColor: '#db2777',
    textColor: 'white',
    label: 'OT'
  },
  'InLieu': { 
    bgColor: '#4f46e5',
    textColor: 'white',
    label: 'InLieu'
  }
};

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: () => void;
}

const DayCell: React.FC<DayCellProps> = ({ day, isSelected, onClick }) => {
  const shiftType = day.personalShift.type;
  const shiftStyle = shiftConfig[shiftType];
  const isOutsideMonth = !day.isCurrentMonth;

  return (
    <div 
      className={`
        relative border-r border-b border-gray-800/90
        ${isSelected ? 'bg-gray-800/50' : ''}
        ${isOutsideMonth ? 'opacity-50' : ''}
        aspect-square
      `}
      onClick={onClick}
    >
      {/* Day number */}
      <div className="p-1.5">
        <span className={`text-2xl font-normal ${isOutsideMonth ? 'text-gray-600' : 'text-white'}`}>
          {day.dayOfMonth}
        </span>
      </div>
      
      {/* Shift type pill */}
      {!isOutsideMonth && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
          <div 
            className="py-0.5 px-2 rounded-md text-center text-sm"
            style={{
              backgroundColor: shiftStyle.bgColor,
              color: shiftStyle.textColor
            }}
          >
            {shiftStyle.label}
          </div>
        </div>
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
  
  if (!visibleDays.length) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }
  
  return (
    <div className="bg-black">
      {/* Calendar container with dark card background */}
      <div className="rounded-xl overflow-hidden bg-[#0a0a0a] mx-4">
        {/* Calendar header */}
        <div className="p-4 pb-2">
          <h1 className="text-6xl font-bold text-white">
            March
          </h1>
        </div>
        
        {/* Day of week headers */}
        <div className="grid grid-cols-7 text-center border-b border-gray-800/90">
          {['S', 'S', 'M', 'T', 'W', 'T', 'F'].map((dayLabel, i) => (
            <div key={i} className="py-2 text-sm font-normal text-gray-400">
              {dayLabel}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-t-0">
          {weekRows.map((week, weekIndex) => (
            <React.Fragment key={`week-${weekIndex}`}>
              {week.map((day) => (
                <DayCell 
                  key={day.date} 
                  day={day} 
                  isSelected={selectedDayIndex === visibleDays.findIndex(d => d.date === day.date)}
                  onClick={() => handleDaySelect(visibleDays.findIndex(d => d.date === day.date))} 
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Floating edit button - positioned in bottom right of screen */}
      <button 
        onClick={() => onDayClick && onDayClick(visibleDays[selectedDayIndex])}
        className="fixed bottom-36 right-6 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  );
};

export default MobileScheduleView; 