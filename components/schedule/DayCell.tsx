import React from 'react';
import { format } from 'date-fns';
import { ShiftType, ShiftGroup, CalendarDay, GroupShiftInfo } from '../../lib/types/schedule';

interface DayCellProps {
  day: CalendarDay;
  onClick?: (day: CalendarDay) => void;
  ariaLabel: string;
  title: string;
}

// Define color schemes for different shift types with improved colors
const shiftColors: Record<ShiftType, { 
  bg: string; 
  text: string; 
  icon?: string;
  border?: string;
}> = {
  'Day': { 
    bg: 'bg-blue-500/90', 
    text: 'text-white',
    icon: '☀️',
    border: 'border-blue-600'
  },
  'Night': { 
    bg: 'bg-green-500/90', 
    text: 'text-white',
    icon: '🌙',
    border: 'border-green-600'
  },
  'Off': { 
    bg: 'bg-red-500/90', 
    text: 'text-white',
    icon: '⛔',
    border: 'border-red-600'
  },
  'Leave': { 
    bg: 'bg-amber-500/90', 
    text: 'text-white',
    icon: '✈️',
    border: 'border-amber-600'
  },
  'Public': { 
    bg: 'bg-orange-500/90', 
    text: 'text-white',
    icon: '🏛️',
    border: 'border-orange-600'
  },
  'Overtime': { 
    bg: 'bg-pink-500/90', 
    text: 'text-white',
    icon: '⏱️',
    border: 'border-pink-600'
  },
  'InLieu': {
    bg: 'bg-purple-500/90',
    text: 'text-white',
    icon: '🔄',
    border: 'border-purple-600'
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
        relative min-h-[110px] p-2 border rounded-lg shadow-sm transition-all duration-200
        ${isCurrentMonth ? 'border-gray-200/70 dark:border-gray-700/70' : 'border-gray-100 dark:border-gray-800'}
        ${!isCurrentMonth ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/20' : 'bg-white dark:bg-gray-800/40'}
        ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
        ${hasGroupChange ? 'ring-1 ring-green-500/70 dark:ring-green-400/70' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-700/30 active:scale-98
        ${onClick && isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Date number and day label */}
      <div className={`
        flex justify-between items-center mb-2
        ${isToday ? 'font-bold' : ''}
      `}>
        <div className="flex items-center gap-1">
          <span className={`
            text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center
            ${isToday ? 'bg-blue-500 text-white dark:bg-blue-600' : 'text-gray-700 dark:text-gray-300'}
          `}>
            {dayOfMonth}
          </span>
          
          {isWeekend && (
            <span className="text-xs text-red-500/80 dark:text-red-400/80 font-medium ml-1">
              {format(new Date(date), 'E')}
            </span>
          )}
        </div>
        
        {personalShift.notes && (
          <span className="text-yellow-500 dark:text-yellow-400" title={personalShift.notes}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      
      {/* Shift badge - improved with icon and better styling */}
      <div className={`
        py-1.5 px-2 rounded-md text-center font-medium
        ${shiftColor.bg} ${shiftColor.text} ${shiftColor.border ? `border ${shiftColor.border}` : ''}
        flex items-center justify-center gap-1.5 shadow-sm
        ${personalShift.isOverridden ? 'border-l-2 border-white dark:border-l-gray-200' : ''}
      `}>
        {shiftColor.icon && <span>{shiftColor.icon}</span>}
        <span>{personalShift.type}</span>
        {personalShift.shiftNumber && (
          <span className="font-bold">({personalShift.shiftNumber})</span>
        )}
      </div>
      
      {/* Overridden status */}
      {personalShift.isOverridden && personalShift.originalType && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" />
          </svg>
          <span>was {personalShift.originalType}</span>
        </div>
      )}
      
      {/* Holiday indicator */}
      {holiday && (
        <div className="mt-1.5 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" />
          </svg>
          <span className="truncate" title={holiday.name}>{holiday.name}</span>
        </div>
      )}
      
      {/* Group change indicator */}
      {hasGroupChange && (
        <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 3.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 17a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM17.25 17a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM9 10a.75.75 0 01-.75.75h-5.5a.75.75 0 010-1.5h5.5A.75.75 0 019 10zM17.25 10.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM14 10a2 2 0 10-4 0 2 2 0 004 0zM10 16.25a2 2 0 10-4 0 2 2 0 004 0z" />
          </svg>
          <span>Group change</span>
        </div>
      )}
      
      {/* Groups on shift */}
      <div className="mt-2 space-y-1">
        {groupAssignments.dayShift.length > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate" title={`Day: ${groupsOnDayShift}`}>
              Day: {groupsOnDayShift}
            </span>
          </div>
        )}
        
        {groupAssignments.nightShift.length > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate" title={`Night: ${groupsOnNightShift}`}>
              Night: {groupsOnNightShift}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCell; 