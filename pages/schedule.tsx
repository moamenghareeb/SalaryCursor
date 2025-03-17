import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format, addMonths, subMonths } from 'date-fns';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Components
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Calendar, { ShiftLegendItems } from '../components/schedule/Calendar';
import MobileScheduleView from '../components/schedule/MobileScheduleView';
import CalendarControls from '../components/schedule/CalendarControls';
import ShiftEditModal from '../components/schedule/ShiftEditModal';
import GroupChangeModal from '../components/schedule/GroupChangeModal';

// Hooks and utils
import { useSchedule } from '../lib/hooks/useSchedule';
import { 
  getRegularWorkHours, 
  getShiftWorkHours 
} from '../lib/utils/shiftCalculator';

// Types
import { CalendarDay, ShiftGroup, ShiftType, ScheduleType } from '../lib/types/schedule';

// Add import for the initializeSchedulePreferences function
import { initializeSchedulePreferences } from '../lib/initSchedulePreferences';

// Define types for the work hours
interface RegularWorkHours {
  start: string;
  end: string;
}

interface ShiftWorkHours {
  day: {
    start: string;
    end: string;
  };
  night: {
    start: string;
    end: string;
  };
}

const EMPLOYEE_GROUPS = [
  { id: 'A', name: 'Group A' },
  { id: 'B', name: 'Group B' },
  { id: 'C', name: 'Group C' },
  { id: 'D', name: 'Group D' }
];

// Default work hours for when utility functions aren't available
const DEFAULT_REGULAR_HOURS: RegularWorkHours = { 
  start: '9:00 AM', 
  end: '5:00 PM' 
};

const DEFAULT_SHIFT_HOURS: ShiftWorkHours = { 
  day: { start: '7:00 AM', end: '7:00 PM' },
  night: { start: '7:00 PM', end: '7:00 AM' }
};

// Define schedule type options
const SCHEDULE_TYPE_OPTIONS = [
  { value: 'shift' as ScheduleType, label: 'Shift-Based Schedule' },
  { value: 'regular' as ScheduleType, label: 'Regular Working Hours' }
];

const SchedulePage: React.FC = () => {
  // Router
  const router = useRouter();
  
  // Authentication state
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Mobile detection state
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Initialize mobile detection on mount
  useEffect(() => {
    // Check if the screen is mobile sized
    const checkIfMobile = () => {
      setIsMobileView(window.innerWidth < 768); // 768px is standard tablet breakpoint
    };
    
    // Check immediately on component mount
    checkIfMobile();
    
    // Add resize listener to update when screen size changes
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up listener on unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          toast.error('Please log in to access the schedule page');
          router.push('/login');
          return;
        }
        setIsAuthChecking(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        toast.error('Authentication check failed');
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Modal states
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  // Date navigation state
  // Use separate type to fix comparisons
  type ViewMode = 'current' | 'future';
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [futureMonths, setFutureMonths] = useState<{year: number; month: number}[]>([]);
  
  // Use our custom hook for schedule data
  const {
    currentDate,
    employeeGroup,
    scheduleType,
    monthData,
    employeeData,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    updateShift,
    updateGroup,
    updateScheduleType,
    isUpdatingShift,
    isUpdatingGroup,
    isUpdatingScheduleType,
    refreshData
  } = useSchedule();
  
  // Combined loading state
  const isUpdating = isLoading || isUpdatingShift || isUpdatingGroup || isUpdatingScheduleType;
  
  // Generate future months data on component mount
  useEffect(() => {
    if (currentDate) {
      const months = [];
      const now = new Date();
      
      // Generate the next 11 months
      for (let i = 1; i <= 11; i++) {
        const futureDate = addMonths(now, i);
        months.push({
          year: futureDate.getFullYear(),
          month: futureDate.getMonth()
        });
      }
      
      setFutureMonths(months);
    }
  }, [currentDate]);
  
  // Listen for refresh events from the debug component
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Received refresh-schedule event');
      if (refreshData) {
        refreshData();
      }
    };
    
    window.addEventListener('refresh-schedule', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refresh-schedule', handleRefreshEvent);
    };
  }, [refreshData]);
  
  // Add state for tracking initialization status
  const [isInitializingPreferences, setIsInitializingPreferences] = useState(false);
  
  // Add a function to handle initializing preferences  
  const handleInitializePreferences = async () => {
    setIsInitializingPreferences(true);
    try {
      // Use the default group from the state
      const result = await initializeSchedulePreferences(undefined, {
        scheduleType: 'shift',
        shiftGroup: employeeGroup,
      });
      
      if (result.success) {
        toast.success('Schedule preferences set up successfully!');
        // Refresh the data
        if (refreshData) {
          refreshData();
        }
      } else {
        toast.error('Failed to set up schedule preferences');
      }
    } catch (error) {
      console.error('Error initializing preferences:', error);
      toast.error('An error occurred while setting up your schedule preferences');
    } finally {
      setIsInitializingPreferences(false);
    }
  };
  
  // Show loading state while checking auth
  if (isAuthChecking) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }
  
  // Handle day click to open edit modal
  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDay(day);
      setIsShiftModalOpen(true);
    }
  };
  
  // Handle save shift override
  const handleSaveShift = (date: string, shiftType: ShiftType, notes?: string) => {
    updateShift(date, shiftType, notes);
    setIsShiftModalOpen(false);
  };
  
  // Handle group change button click
  const handleGroupChangeClick = () => {
    if (scheduleType === 'shift') {
      setIsGroupModalOpen(true);
    }
  };
  
  // Handle save group change
  const handleSaveGroupChange = (group: ShiftGroup, effectiveDate: string) => {
    if (group !== employeeGroup) {
      // Show confirmation toast
      toast.success(`Group changed to ${group}, effective from ${format(new Date(effectiveDate), 'MMMM d, yyyy')}`);
      
      // Update the group with effective date
      updateGroup(group, effectiveDate);
      
      // Close the modal
      setIsGroupModalOpen(false);
    }
  };
  
  // Build the schedule information component
  const getScheduleInfo = () => {
    if (!employeeData?.shift_group || !employeeData?.schedule_type) {
      // Add a button to set up preferences
      return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg">
          <p className="mb-3">Schedule preferences not found. We need to set up your schedule preferences before you can use the calendar.</p>
          <button
            onClick={handleInitializePreferences}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
            disabled={isInitializingPreferences}
          >
            {isInitializingPreferences ? 'Setting up...' : 'Set Up Schedule Preferences'}
          </button>
        </div>
      );
    }
    
    // Regular schedule or shift-based info
    if (scheduleType === 'regular') {
      // Get work hours with proper fallback
      let workHours: RegularWorkHours = DEFAULT_REGULAR_HOURS;
      
      // Try to call the utility function if it exists
      if (typeof getRegularWorkHours === 'function') {
        try {
          const result = getRegularWorkHours(0);
          if (result && typeof result === 'object' && 'start' in result && 'end' in result) {
            workHours = result as RegularWorkHours;
          }
        } catch (error) {
          console.error('Error getting regular work hours:', error);
        }
      }
      
      return (
        <div>
          <h3 className="text-lg font-medium mb-2">Your Work Hours</h3>
          <div className="space-y-2">
            <p>
              <span className="text-gray-600 dark:text-gray-400">Monday - Friday:</span>{' '}
              <span className="font-medium">{workHours.start} to {workHours.end}</span>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Weekends:</span>{' '}
              <span className="font-medium">Off duty</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Any shift overrides are shown in the calendar.
            </p>
          </div>
        </div>
      );
    } else {
      // Get shift hours with proper fallback
      let shiftHours: ShiftWorkHours = DEFAULT_SHIFT_HOURS;
      
      // Try to call the utility function if it exists
      if (typeof getShiftWorkHours === 'function') {
        try {
          const result = getShiftWorkHours('Day' as ShiftType);
          if (result && typeof result === 'object' && 'day' in result && 'night' in result) {
            shiftHours = result as ShiftWorkHours;
          }
        } catch (error) {
          console.error('Error getting shift work hours:', error);
        }
      }
      
      return (
        <div>
          <h3 className="text-lg font-medium mb-2">Your Shift Schedule</h3>
          <div className="space-y-2">
            <p>
              <span className="text-gray-600 dark:text-gray-400">Day Shift:</span>{' '}
              <span className="font-medium">{shiftHours.day.start} to {shiftHours.day.end}</span>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Night Shift:</span>{' '}
              <span className="font-medium">{shiftHours.night.start} to {shiftHours.night.end}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Your shifts follow the Group {employeeGroup} rotation pattern.
            </p>
          </div>
        </div>
      );
    }
  };
  
  const scheduleInfo = getScheduleInfo();
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {isUpdating ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : !monthData ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg">
            Loading your schedule...
          </div>
        ) : viewMode === 'current' ? (
          // Current month view
          <div className="space-y-4">
            {/* Header section */}
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
              <h1 className="text-2xl font-bold text-white mb-4">Work Schedule</h1>
              
              <div className="flex flex-col space-y-3">
                {/* View mode toggle */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('current')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'current' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setViewMode('future')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'future' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Future
                  </button>
                </div>
                
                {/* Schedule settings */}
                <div className="grid grid-cols-2 gap-3">
                  {scheduleType === 'shift' && (
                    <div className="flex items-center space-x-2 bg-gray-800 dark:bg-gray-700 rounded-md px-3 py-2">
                      <span className="text-sm text-gray-300">Group {employeeGroup}</span>
                      <button
                        onClick={handleGroupChangeClick}
                        disabled={isUpdating}
                        className="text-blue-400 text-sm hover:underline disabled:opacity-50"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  <select
                    value={scheduleType}
                    onChange={(e) => updateScheduleType(e.target.value as ScheduleType)}
                    disabled={isUpdating}
                    className="bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 
                      text-white rounded-md px-3 py-2 text-sm appearance-none"
                  >
                    {SCHEDULE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Month Navigation */}
            <div className="bg-gray-800 dark:bg-gray-800 shadow-md rounded-lg p-3 flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={goToPreviousMonth}
                  disabled={isUpdating}
                  className="p-2 rounded-full text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-700/30 disabled:opacity-50 bg-blue-600"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-lg font-medium text-white dark:text-gray-200">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <button
                  onClick={goToNextMonth}
                  disabled={isUpdating}
                  className="p-2 rounded-full text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-700/30 disabled:opacity-50 bg-blue-600"
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                disabled={isUpdating}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                Today
              </button>
            </div>
            
            {/* Calendar component */}
            <div className="bg-gray-800 dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-4">
              {isMobileView ? (
                monthData && (
                  <MobileScheduleView 
                    monthData={monthData}
                    onDayClick={handleDayClick}
                  />
                )
              ) : (
                monthData && (
                  <Calendar 
                    monthData={monthData}
                    onDayClick={handleDayClick}
                  />
                )
              )}
            </div>
            
            {/* Schedule information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800 dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
              {scheduleInfo}
              
              {employeeData?.shift_group && employeeData?.schedule_type && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Your Schedule Settings</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="text-gray-400 dark:text-gray-400">Schedule Type:</span>{' '}
                      <span className="font-medium text-white">{scheduleType === 'regular' ? 'Regular Work Hours' : 'Shift-Based'}</span>
                    </p>
                    {scheduleType === 'shift' && (
                      <p>
                        <span className="text-gray-400 dark:text-gray-400">Assigned Group:</span>{' '}
                        <span className="font-medium text-white">Group {employeeGroup}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-400 dark:text-gray-400 mt-2">
                      You can change these settings using the controls above.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Color legend key (hidden on mobile - already in mobile view) */}
            {!isMobileView && (
              <div className="p-4 bg-gray-800 dark:bg-gray-800 shadow-md rounded-lg">
                <h3 className="text-sm font-medium text-white mb-2">Legend:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 mr-2 rounded-full"></div>
                    <span className="text-xs text-gray-300 dark:text-gray-300">Day Shift</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 mr-2 rounded-full"></div>
                    <span className="text-xs text-gray-300 dark:text-gray-300">Night Shift</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 mr-2 rounded-full"></div>
                    <span className="text-xs text-gray-300 dark:text-gray-300">Off Duty</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 mr-2 rounded-full"></div>
                    <span className="text-xs text-gray-300 dark:text-gray-300">On Leave</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Future months view
          <div className="space-y-4">
            {/* Header section for future view */}
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Work Schedule</h1>
              </div>
              
              <div className="flex flex-col space-y-3 mt-3">
                {/* View mode toggle */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('current')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'current' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setViewMode('future')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'future' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Future
                  </button>
                </div>
                
                {/* Schedule settings */}
                <div className="grid grid-cols-2 gap-3">
                  {scheduleType === 'shift' && (
                    <div className="flex items-center space-x-2 bg-gray-800 dark:bg-gray-700 rounded-md px-3 py-2">
                      <span className="text-sm text-gray-300">Group {employeeGroup}</span>
                      <button
                        onClick={handleGroupChangeClick}
                        disabled={isUpdating}
                        className="text-blue-400 text-sm hover:underline disabled:opacity-50"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  
                  <select
                    value={scheduleType}
                    onChange={(e) => updateScheduleType(e.target.value as ScheduleType)}
                    disabled={isUpdating}
                    className="bg-gray-800 dark:bg-gray-700 border border-gray-700 dark:border-gray-600 
                      text-white rounded-md px-3 py-2 text-sm appearance-none"
                  >
                    {SCHEDULE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-xl font-semibold text-white mb-4">
                Future Schedule (Next 11 Months)
              </h2>
            
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureMonths.map((month, index) => (
                  <div 
                    key={`${month.year}-${month.month}`}
                    className="p-4 bg-gray-700 dark:bg-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-lg font-medium text-white mb-2">
                      {format(new Date(month.year, month.month, 1), 'MMMM yyyy')}
                    </h3>
                    <p className="text-sm text-gray-300 mb-2">
                      Shift Group: <span className="font-medium">Group {employeeGroup}</span>
                    </p>
                    
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-gray-400 text-sm">
                        {index + 1} month{index > 0 ? 's' : ''} from now
                      </div>
                      <button
                        onClick={() => {
                          // Navigate to this month
                          for (let i = 0; i <= index; i++) {
                            goToNextMonth();
                          }
                          setViewMode('current');
                        }}
                        className="px-3 py-1 rounded text-sm bg-blue-600 text-white"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Shift edit modal */}
        <ShiftEditModal
          day={selectedDay}
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={handleSaveShift}
          isLoading={isUpdatingShift}
        />
        
        {/* Group change modal */}
        <GroupChangeModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onSave={handleSaveGroupChange}
          currentGroup={employeeGroup}
          isLoading={isUpdatingGroup}
        />
      </div>
    </Layout>
  );
};

export default SchedulePage; 