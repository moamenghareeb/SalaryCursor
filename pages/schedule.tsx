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
  const [viewMode, setViewMode] = useState<'current' | 'future'>('current');
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
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Left side - Title and Navigation */}
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Work Schedule</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('current')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'current'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setViewMode('future')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'future'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    Future
                  </button>
                </div>
              </div>

              {/* Right side - Settings */}
              <div className="flex flex-wrap items-center gap-3">
                {scheduleType === 'shift' && (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Group {employeeGroup}</span>
                    <button
                      onClick={handleGroupChangeClick}
                      disabled={isUpdating}
                      className="text-blue-600 dark:text-blue-400 text-sm hover:underline disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                )}
                <select
                  value={scheduleType}
                  onChange={(e) => updateScheduleType(e.target.value as ScheduleType)}
                  disabled={isUpdating}
                  className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 
                    bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                    disabled:opacity-50"
                >
                  {SCHEDULE_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Month Navigation - Only show for current view */}
          {viewMode === 'current' && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  disabled={isUpdating}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/30 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <button
                  onClick={goToNextMonth}
                  disabled={isUpdating}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/30 disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <button
                onClick={goToToday}
                disabled={isUpdating}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                Today
              </button>
            </div>
          )}
        </div>
        
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
          <div className="space-y-6">
            {/* Calendar controls */}
            <CalendarControls 
              currentDate={currentDate}
              employeeGroup={employeeGroup}
              scheduleType={scheduleType}
              onPrevMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
              onGroupChange={handleGroupChangeClick}
              onScheduleTypeChange={updateScheduleType}
              isUpdating={isUpdating}
            />
            
            {/* Toggle between desktop and mobile view */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              {isMobileView ? (
                <MobileScheduleView 
                  monthData={monthData}
                  onDayClick={handleDayClick}
                />
              ) : (
                <Calendar 
                  monthData={monthData}
                  onDayClick={handleDayClick}
                />
              )}
            </div>
            
            {/* Schedule information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
              {scheduleInfo}
              
              {employeeData?.shift_group && employeeData?.schedule_type && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Your Schedule Settings</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">Schedule Type:</span>{' '}
                      <span className="font-medium">{scheduleType === 'regular' ? 'Regular Work Hours' : 'Shift-Based'}</span>
                    </p>
                    {scheduleType === 'shift' && (
                      <p>
                        <span className="text-gray-600 dark:text-gray-400">Assigned Group:</span>{' '}
                        <span className="font-medium">Group {employeeGroup}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      You can change these settings using the controls above.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Color legend key (hidden on mobile - already in mobile view) */}
            {!isMobileView && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legend:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Day Shift</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Night Shift</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Off Duty</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">On Leave</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Public Holiday</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-pink-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Overtime</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 mr-2"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">In-Lieu Time</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Future months view
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Future Schedule (Next 11 Months)
              </h2>
              <button
                onClick={() => setViewMode('current')}
                className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              >
                Back to Current Month
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {futureMonths.map((month, index) => (
                <div 
                  key={`${month.year}-${month.month}`}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                    {format(new Date(month.year, month.month, 1), 'MMMM yyyy')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Shift Group: <span className="font-medium">Group {employeeGroup}</span>
                  </p>
                  
                  {/* Would integrate with useSchedule to get actual shift data */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
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
                      className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
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