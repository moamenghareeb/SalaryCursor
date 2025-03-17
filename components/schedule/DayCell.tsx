import React from 'react';
import { format } from 'date-fns';
import { ShiftType, ShiftGroup, CalendarDay, GroupShiftInfo } from '../../lib/types/schedule';

interface DayCellProps {
  day: CalendarDay;
  onClick?: (day: CalendarDay) => void;
  ariaLabel: string;
  title: string;
}

// Define color schemes for different shift types
const shiftColors: Record<ShiftType, { bg: string; text: string }> = {
  'Day': { 
    bg: 'bg-blue-500', 
    text: 'text-white' 
  },
  'Night': { 
    bg: 'bg-green-500', 
    text: 'text-white' 
  },
  'Off': { 
    bg: 'bg-red-500', 
    text: 'text-white' 
  },
  'Leave': { 
    bg: 'bg-yellow-500', 
    text: 'text-white' 
  },
  'Public': { 
    bg: 'bg-orange-500', 
    text: 'text-white' 
  },
  'Overtime': { 
    bg: 'bg-pink-500', 
    text: 'text-white' 
  },
  'InLieu': {
    bg: 'bg-purple-500',
    text: 'text-white'
  }
};

const DayCell: React.FC<DayCellProps> = ({ day, onClick, ariaLabel, title }) => {
  const { 
    date, 
    dayOfMonth, 
    isCurrentMonth, 
    isToday, 
    isWeekend, 
    personalShift, 
    holiday,
    groupAssignments,
    hasGroupChange
  } = day;
  
  const handleClick = () => {
    if (onClick && isCurrentMonth) {
      onClick(day);
    }
  };
  
  // Get the appropriate color scheme for this shift
  const shiftColor = shiftColors[personalShift.type];
  
  // Format groups for display with shift indicators
  const formatGroupList = (groups: GroupShiftInfo[]): string => {
    return groups.map(g => 
      `${g.group}${g.isFirstDay ? ' (1st)' : g.isFirstNight ? ' (1st)' : ' (2nd)'}`
    ).join(', ');
  };
  
  const groupsOnDayShift = formatGroupList(groupAssignments.dayShift);
  const groupsOnNightShift = formatGroupList(groupAssignments.nightShift);
  
  return (
    <div 
      className={`
        relative min-h-[100px] p-2 border border-gray-200 dark:border-gray-700
        ${!isCurrentMonth ? 'opacity-40 bg-gray-50 dark:bg-gray-800/30' : ''}
        ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
        ${hasGroupChange ? 'ring-1 ring-green-500 dark:ring-green-400' : ''}
        hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors
        ${onClick && isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Date number */}
      <div className={`
        flex justify-between items-center
        ${isToday ? 'font-bold' : ''}
      `}>
        <span className={`
          text-sm font-medium rounded-full w-6 h-6 flex items-center justify-center
          ${isToday ? 'bg-blue-500 text-white' : ''}
        `}>
          {dayOfMonth}
        </span>
        
        {isWeekend && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(date), 'EEE')}
          </span>
        )}
      </div>
      
      {/* Shift badge - now full width and colored background */}
      <div className={`
        mt-2 py-1 px-2 rounded text-center text-sm font-medium
        ${shiftColor.bg} ${shiftColor.text}
        ${personalShift.isOverridden ? 'border-l-2 border-white' : ''}
      `}>
        {personalShift.type}
        {personalShift.shiftNumber && (
          <span className="ml-1 font-bold">({personalShift.shiftNumber})</span>
        )}
        {personalShift.isOverridden && personalShift.originalType && (
          <span className="ml-1 text-xs opacity-70">(was {personalShift.originalType})</span>
        )}
      </div>
      
      {/* Holiday indicator */}
      {holiday && (
        <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 truncate" title={holiday.name}>
          {holiday.name}
        </div>
      )}
      
      {/* Notes */}
      {personalShift.notes && (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate" title={personalShift.notes}>
          {personalShift.notes}
        </div>
      )}
      
      {/* Group change indicator */}
      {hasGroupChange && (
        <div className="mt-1 text-xs text-green-600 dark:text-green-400">
          Group change applied
        </div>
      )}
      
      {/* Groups on shift */}
      <div className="mt-2 space-y-1">
        {groupAssignments.dayShift.length > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Day: {groupsOnDayShift}
            </span>
          </div>
        )}
        
        {groupAssignments.nightShift.length > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Night: {groupsOnNightShift}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCell; 