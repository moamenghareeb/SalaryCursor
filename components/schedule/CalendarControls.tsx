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

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ScheduleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="M8 14h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M16 14h.01"></path>
    <path d="M8 18h.01"></path>
    <path d="M12 18h.01"></path>
    <path d="M16 18h.01"></path>
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
    <div className="mb-8 space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-[var(--sc-bg-secondary)] rounded-xl shadow-sm p-3 border border-[var(--sc-border-color)]">
        <button
          onClick={onPrevMonth}
          disabled={isUpdating}
          className="p-2 rounded-lg hover:bg-[var(--sc-accent-light)] text-[var(--sc-text-primary)] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        
        <h2 className="text-xl font-bold text-[var(--sc-text-primary)] tracking-wide">
          {currentMonthLabel}
        </h2>
        
        <button
          onClick={onNextMonth}
          disabled={isUpdating}
          className="p-2 rounded-lg hover:bg-[var(--sc-accent-light)] text-[var(--sc-text-primary)] transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>
      
      {/* Actions and filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Today button */}
        <button
          onClick={onToday}
          disabled={isUpdating}
          className={`
            flex items-center justify-center gap-2 p-3 rounded-xl
            bg-[var(--sc-accent-light)] text-[var(--sc-accent-color)] font-medium transition-colors
            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label="Go to today"
        >
          <TodayIcon />
          <span>Today</span>
        </button>
        
        {/* Group selector */}
        {scheduleType === 'shift' && (
          <button
            onClick={onGroupChange}
            disabled={isUpdating}
            className={`
              flex items-center justify-center gap-2 p-3 rounded-xl
              bg-[var(--sc-accent-light)] text-[var(--sc-accent-color)] font-medium transition-colors
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label="Change group"
          >
            <GroupIcon />
            <span>Group {employeeGroup}</span>
          </button>
        )}
        
        {/* Schedule type selector */}
        <div className={`
          flex items-center gap-2 p-3 rounded-xl
          bg-[var(--sc-accent-light)] text-[var(--sc-accent-color)] transition-colors
        `}>
          <ScheduleIcon />
          <select
            id="schedule-type-selector"
            value={scheduleType}
            onChange={handleScheduleTypeChange}
            disabled={isUpdating}
            className={`
              flex-1 bg-transparent border-none outline-none font-medium
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label="Select schedule type"
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