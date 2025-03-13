import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format, addMonths, subMonths } from 'date-fns';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// Components
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import Calendar from '../components/schedule/Calendar';
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

const EMPLOYEE_GROUPS = [
  { id: 'A', name: 'Group A' },
  { id: 'B', name: 'Group B' },
  { id: 'C', name: 'Group C' },
  { id: 'D', name: 'Group D' }
];

const SchedulePage: React.FC = () => {
  // Router
  const router = useRouter();
  
  // Authentication state
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
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
  
  // Determine the schedule information to display
  const scheduleInfo = scheduleType === 'regular' ? (
    <div>
      <h3 className="text-lg font-medium mb-2">Regular Work Hours</h3>
      <ul className="space-y-2 list-disc pl-5">
        <li>Sunday – Wednesday: 07:45 AM – 04:00 PM</li>
        <li>Thursday: 07:45 AM – 01:30 PM</li>
        <li>Friday & Saturday: Off</li>
      </ul>
    </div>
  ) : (
    <div>
      <h3 className="text-lg font-medium mb-2">Shift-Based Work (8-Day Cycle)</h3>
      <ul className="space-y-2 list-disc pl-5">
        <li>Day 1-2: Day Shift (07:00 AM – 07:00 PM)</li>
        <li>Day 3-4: Night Shift (07:00 PM – 07:00 AM)</li>
        <li>Day 5-8: Off Duty</li>
      </ul>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You are currently assigned to <strong>Group {employeeGroup}</strong>
        </p>
        <button
          onClick={handleGroupChangeClick}
          className="mt-2 sm:mt-0 px-3 py-1 text-sm rounded-md bg-blue-50 hover:bg-blue-100 
            text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-800/40 dark:text-blue-400
            focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
        >
          Change Group
        </button>
      </div>
    </div>
  );
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Schedule</h1>
          
          {/* View mode toggle */}
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'current' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setViewMode('future')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'future' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Future Months
            </button>
          </div>
        </div>
        
        {isLoading ? (
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
              isUpdating={isLoading || isUpdatingGroup || isUpdatingScheduleType}
            />
            
            {/* Main calendar */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <Calendar 
                monthData={monthData}
                onDayClick={handleDayClick}
              />
            </div>
            
            {/* Schedule information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
              {scheduleInfo}
              
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
            </div>
            
            {/* Color legend key */}
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legend:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 mr-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Day Shift</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-indigo-600 mr-2"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Night Shift</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 mr-2"></div>
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