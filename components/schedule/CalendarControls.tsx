import React from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ShiftGroup, ScheduleType } from '../../lib/types/schedule';

// Icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const TodayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <line x1="12" y1="14" x2="12" y2="18"></line>
  </svg>
);

interface CalendarControlsProps {
  currentDate: Date;
  employeeGroup: ShiftGroup;
  scheduleType: ScheduleType;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onGroupChange: () => void;
  onScheduleTypeChange: (type: ScheduleType) => void;
  isUpdating?: boolean;
}

const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'shift', label: 'Shift-Based Schedule' },
  { value: 'regular', label: 'Regular Working Hours' }
];

const CalendarControls: React.FC<CalendarControlsProps> = ({
  currentDate,
  employeeGroup,
  scheduleType,
  onPrevMonth,
  onNextMonth,
  onToday,
  onGroupChange,
  onScheduleTypeChange,
  isUpdating = false
}) => {
  // Current month display string
  const currentMonthLabel = format(currentDate, 'MMMM yyyy');
  
  // Handle schedule type change
  const handleScheduleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onScheduleTypeChange(e.target.value as ScheduleType);
  };
  
  return (
    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6">
      {/* Left side - Navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onPrevMonth}
          disabled={isUpdating}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        
        <span className="text-lg font-medium text-gray-800 dark:text-gray-200 min-w-[120px] text-center">
          {currentMonthLabel}
        </span>
        
        <button
          onClick={onNextMonth}
          disabled={isUpdating}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
        
        <button
          onClick={onToday}
          disabled={isUpdating}
          className="ml-2 px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 flex items-center space-x-1 transition"
          aria-label="Go to today"
        >
          <TodayIcon />
          <span className="hidden sm:inline">Today</span>
        </button>
      </div>
      
      {/* Right side - Filters */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        {/* Group selector */}
        {scheduleType === 'shift' && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Shift Group:
            </label>
            <button
              onClick={onGroupChange}
              disabled={isUpdating}
              className={`
                px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              Group {employeeGroup} <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Change</span>
            </button>
          </div>
        )}
        
        {/* Schedule type selector */}
        <div className="flex items-center space-x-2">
          <label htmlFor="schedule-type-selector" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Schedule Type:
          </label>
          <select
            id="schedule-type-selector"
            value={scheduleType}
            onChange={handleScheduleTypeChange}
            disabled={isUpdating}
            className={`
              px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {SCHEDULE_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CalendarControls; 