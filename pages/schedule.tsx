import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  getDay, 
  addDays, 
  parseISO, 
  isWithinInterval,
  differenceInDays,
  addBusinessDays,
  isSameDay 
} from 'date-fns';
import { FaPencilAlt, FaShareAlt } from 'react-icons/fa';
import { FiMenu } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Calendar from '../components/calendar/Calendar';
import { ShiftType, shiftColors } from '../components/calendar/DayCell';
import { useScheduleData } from '../lib/hooks/useScheduleData';
import { getHolidaysForRange } from '../lib/holidaysStore';

// Add cache helpers
const CACHE_KEYS = {
  LEAVE_RECORDS: 'schedule_leave_records',
  SHIFT_OVERRIDES: 'schedule_shift_overrides',
  EMPLOYEE_GROUP: 'schedule_employee_group',
  SCHEDULE_TYPE: 'schedule_type'
};

// Helper function to get cached data
const getCachedData = (key: string, defaultValue: any = null) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error retrieving ${key} from cache:`, error);
    return defaultValue;
  }
};

// Helper function to set cached data
const setCachedData = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to cache:`, error);
  }
};

// Schedule types - Remove this section completely
// type ShiftType = 'Day' | 'Night' | 'Off' | 'Leave' | 'Public' | 'Overtime';

interface ScheduleDay {
  date: Date;
  type: ShiftType;
  notes?: string;
  inCurrentMonth: boolean;
}

// Function to calculate shift for a specific date based on group and anchor dates
const calculateShift = (date: Date, group: 'A' | 'B' | 'C' | 'D'): ShiftType => {
  // Anchor dates (day of year) and cycles for each group in 2025
  const anchors = {
    'A': { date: new Date(2025, 0, 4), cycle: 1 }, // Jan 4, first day shift
    'B': { date: new Date(2025, 0, 2), cycle: 1 }, // Jan 2, first day shift
    'C': { date: new Date(2025, 0, 1), cycle: 4 }, // Jan 1, second night shift
    'D': { date: new Date(2025, 0, 1), cycle: 2 }, // Jan 1, second day shift
  };
  
  const anchor = anchors[group];
  
  // Day of year for target and anchor dates
  const targetDayOfYear = getDayOfYear(date);
  const anchorDayOfYear = getDayOfYear(anchor.date);
  
  // Calculate the cycle day (1-8)
  const yearOffset = date.getFullYear() - anchor.date.getFullYear();
  const daysOffset = targetDayOfYear - anchorDayOfYear + (yearOffset * 365);
  const cycleDay = ((anchor.cycle - 1 + daysOffset) % 8) + 1;
  
  // Map cycle day to shift type
  if (cycleDay === 1) return 'Day'; // First day shift
  if (cycleDay === 2) return 'Day'; // Second day shift  
  if (cycleDay === 3) return 'Night'; // First night shift
  if (cycleDay === 4) return 'Night'; // Second night shift
  return 'Off'; // Days 5-8 are off days
};

// Helper function to get day of year
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

const SchedulePage: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [employeeGroup, setEmployeeGroup] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [scheduleType, setScheduleType] = useState<'regular' | 'shift'>('shift');
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [shiftOverrides, setShiftOverrides] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dbTablesStatus, setDbTablesStatus] = useState({
    employees: true,
    leave_requests: true,
    shift_overrides: false  // Default to false until confirmed to exist
  });
  
  // Get the current user ID
  const [userId, setUserId] = useState<string | null>(null);
  
  // Use our enhanced hook to fetch and process schedule data
  const { data: scheduleData, isLoading: scheduleLoading } = useScheduleData(
    userId || undefined,
    currentDate,
    employeeGroup
  );
  
  // Network status monitoring
  useEffect(() => {
    // Event handler for when browser comes online
    const handleOnline = () => {
      console.log('Application is back online');
      setIsOffline(false);
      // Sync any offline changes
      syncOfflineChanges().then(() => {
        // Refetch data when we're back online
        fetchData();
      });
    };
    
    // Event handler for when browser goes offline
    const handleOffline = () => {
      console.log('Application is offline');
      setIsOffline(true);
    };
    
    // Check initial status
    setIsOffline(!navigator.onLine);
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Sync offline changes with the server
  const syncOfflineChanges = async () => {
    // Check if we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Cannot sync offline changes: No active session');
      return;
    }
    
    try {
      // Get locally cached shift overrides
      const cachedOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
      
      // Find any overrides marked as pending
      const pendingOverrides = cachedOverrides.filter((o: any) => o.is_pending === true);
      
      if (pendingOverrides.length > 0) {
        toast.loading(`Syncing ${pendingOverrides.length} offline changes...`);
        
        // Process each pending override
        for (const override of pendingOverrides) {
          try {
            // Remove the is_pending flag and local ID prefix
            const { is_pending, ...cleanOverride } = override;
            if (cleanOverride.id.startsWith('local-')) {
              delete cleanOverride.id;
            }
            
            // Insert or update in the database
            const { data, error } = await supabase
              .from('shift_overrides')
              .upsert(cleanOverride, { onConflict: 'employee_id,date' });
              
            if (error) {
              console.error('Error syncing override:', error);
              continue; // Try the next one
            }
          } catch (overrideError) {
            console.error('Error processing override:', overrideError);
          }
        }
        
        // Update the cached overrides to remove pending flag
        const updatedOverrides = cachedOverrides.map((o: any) => {
          if (o.is_pending) {
            return { ...o, is_pending: false };
          }
          return o;
        });
        
        setCachedData(CACHE_KEYS.SHIFT_OVERRIDES, updatedOverrides);
        toast.success('Offline changes synced successfully');
      }
    } catch (error) {
      console.error('Error syncing offline changes:', error);
      toast.error('Failed to sync some offline changes');
    }
  };
  
  // Function to fetch all data
  const fetchData = async () => {
    if (isOffline) {
      return; // Don't try to fetch if we're offline
    }
    
    setIsLoading(true);
    // Check if tables exist in Supabase first
    const checkTables = async () => {
      try {
        console.log('Checking for required database tables...');
        
        // Check leaves table (previously leave_requests)
        const { error: leaveError } = await supabase
          .from('leaves')
          .select('id')
          .limit(1);
          
        if (leaveError) {
          console.log('leaves check result:', leaveError);
          if (leaveError.code === '42P01' || leaveError.message?.includes('does not exist')) {
            console.log('leaves table does not exist');
            setDbTablesStatus(prev => ({ ...prev, leave_requests: false }));
          }
        } else {
          console.log('leaves table exists');
          setDbTablesStatus(prev => ({ ...prev, leave_requests: true }));
        }
        
        // Check shift_overrides table
        const { error: shiftError } = await supabase
          .from('shift_overrides')
          .select('id')
          .limit(1);
          
        if (shiftError) {
          console.log('shift_overrides check result:', shiftError);
          if (shiftError.code === '42P01' || shiftError.message?.includes('does not exist')) {
            console.log('shift_overrides table does not exist');
            setDbTablesStatus(prev => ({ ...prev, shift_overrides: false }));
          }
        } else {
          console.log('shift_overrides table exists');
          setDbTablesStatus(prev => ({ ...prev, shift_overrides: true }));
        }
        
        // Print final status for debugging
        setTimeout(() => {
          console.log('Database tables status:', dbTablesStatus);
        }, 500);
        
      } catch (error: any) {
        console.error('Error checking table existence:', error);
        
        // If we get a 404 HTTP error, it also means the table doesn't exist
        if (error?.status === 404) {
          if (error.url?.includes('leaves')) {
            setDbTablesStatus(prev => ({ ...prev, leave_requests: false }));
          }
          if (error.url?.includes('shift_overrides')) {
            setDbTablesStatus(prev => ({ ...prev, shift_overrides: false }));
          }
        }
      }
    };
    
    try {
      // Check if tables exist in Supabase first
      await checkTables();
      await Promise.all([
        fetchEmployeeInfo(),
        fetchLeaveRecords(),
        fetchShiftOverrides()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch all necessary data when month changes or online status changes
  useEffect(() => {
    fetchData();
  }, [currentDate, isOffline]);
  
  // Fetch employee info to get assigned group
  const fetchEmployeeInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          // Check if the error is due to missing table
          if (error.code === '42P01') {
            setDbTablesStatus(prev => ({ ...prev, employees: false }));
            return;
          }
          throw error;
        }
        
        if (data) {
          // Set employee group from database if available
          if (data.shift_group) {
            setEmployeeGroup(data.shift_group as 'A' | 'B' | 'C' | 'D');
            setCachedData(CACHE_KEYS.EMPLOYEE_GROUP, data.shift_group);
          }
          
          // Set schedule type from database if available
          setScheduleType(data.schedule_type || 'shift');
          setCachedData(CACHE_KEYS.SCHEDULE_TYPE, data.schedule_type || 'shift');
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        
        // Use cached data if available
        const cachedGroup = getCachedData(CACHE_KEYS.EMPLOYEE_GROUP);
        if (cachedGroup) {
          setEmployeeGroup(cachedGroup as 'A' | 'B' | 'C' | 'D');
        }
        
        const cachedType = getCachedData(CACHE_KEYS.SCHEDULE_TYPE);
        if (cachedType) {
          setScheduleType(cachedType as 'regular' | 'shift');
        }
        
        // Don't show error toast if table doesn't exist
        if (dbTablesStatus.employees) {
          toast.error('Failed to load employee data');
        }
      }
    }
  };
  
  // Fetch leave records for the displayed date range
  const fetchLeaveRecords = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        // If we already know the table doesn't exist, don't try to fetch
        if (!dbTablesStatus.leave_requests) {
          console.log('Skipping leave records fetch - table does not exist');
          
          // Use cached data if available
          const cachedLeave = getCachedData(CACHE_KEYS.LEAVE_RECORDS, []);
          setLeaveRecords(cachedLeave);
          return;
        }

        // Calculate the date range including padding days
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        // Get previous month padding
        const startDayOfWeek = getDay(monthStart);
        const fetchStart = new Date(monthStart);
        if (startDayOfWeek > 0) {
          fetchStart.setDate(fetchStart.getDate() - startDayOfWeek);
        }
        
        // Get next month padding
        const endDayOfWeek = getDay(monthEnd);
        const fetchEnd = new Date(monthEnd);
        if (endDayOfWeek < 6) {
          fetchEnd.setDate(fetchEnd.getDate() + (6 - endDayOfWeek));
        }
        
        const startDate = format(fetchStart, 'yyyy-MM-dd');
        const endDate = format(fetchEnd, 'yyyy-MM-dd');
        
        try {
          const { data, error } = await supabase
            .from('leaves')  // Changed from leave_requests
            .select('*')
            .eq('employee_id', session.user.id)
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
            
          if (error) {
            // Check if the error is due to missing table
            if (error.code === '42P01') {
              setDbTablesStatus(prev => ({ ...prev, leave_requests: false }));
              setLeaveRecords([]);
              
              // Use cached data if available
              const cachedLeave = getCachedData(CACHE_KEYS.LEAVE_RECORDS, []);
              setLeaveRecords(cachedLeave);
              return;
            }
            throw error;
          }
          
          const leaveData = data || [];
          console.log('Fetched leave records:', leaveData.length, leaveData);
          setLeaveRecords(leaveData);
          
          // Cache the results for offline use
          setCachedData(CACHE_KEYS.LEAVE_RECORDS, leaveData);
          
          // Create shift overrides for each day in leave periods
          if (dbTablesStatus.shift_overrides) {
            await syncLeaveToShiftOverrides(leaveData);
          }
        } catch (error: any) {
          // If the error is a 404, it means the table doesn't exist
          if (error?.status === 404) {
            setDbTablesStatus(prev => ({ ...prev, leave_requests: false }));
            setLeaveRecords([]);
            console.error('Error fetching leave records:', error);
          }
          throw error;
        }
      } catch (error) {
        console.error('Error fetching leave records:', error);
        // Set empty leave records as fallback or use cached data
        const cachedLeave = getCachedData(CACHE_KEYS.LEAVE_RECORDS, []);
        setLeaveRecords(cachedLeave);
        
        // Don't show error toast if table doesn't exist
        if (dbTablesStatus.leave_requests) {
          toast.error('Failed to load leave records');
        }
      }
    }
  };
  
  // Sync leave records to shift overrides to ensure consistency
  const syncLeaveToShiftOverrides = async (leaveRecords: any[]) => {
    if (!dbTablesStatus.shift_overrides || leaveRecords.length === 0) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const userId = session.user.id;
    
    try {
      // For each leave record, create shift overrides for every day in the range
      for (const leave of leaveRecords) {
        // Process both approved and pending leave requests
        if (leave.status !== 'Approved' && leave.status !== 'approved' && 
            leave.status !== 'Pending' && leave.status !== 'pending') continue;
        
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        // Create array of all days in the leave period
        const days = [];
        const currentDay = new Date(startDate);
        
        while (currentDay <= endDate) {
          days.push(format(currentDay, 'yyyy-MM-dd'));
          currentDay.setDate(currentDay.getDate() + 1);
        }
        
        // Get existing shift overrides in this date range
        const { data: existingOverrides } = await supabase
          .from('shift_overrides')
          .select('*')
          .eq('employee_id', userId)
          .in('date', days);
          
        const existingDates = (existingOverrides || []).map(o => o.date);
        
        // Create batch array for new overrides
        const newOverrides = [];
        
        for (const day of days) {
          // Skip if already has an override
          if (existingDates.includes(day)) continue;
          
          newOverrides.push({
            employee_id: userId,
            date: day,
            shift_type: 'Leave',
            source: 'leave_sync'  // Track that this was created by sync
          });
        }
        
        // Insert new overrides in batch if any
        if (newOverrides.length > 0) {
          console.log(`Creating ${newOverrides.length} shift overrides for leave period`);
          const { error } = await supabase
            .from('shift_overrides')
            .insert(newOverrides);
          
          if (error) {
            console.error('Error creating shift overrides for leave:', error);
          }
        }
      }
      
      // Refresh shift overrides
      await fetchShiftOverrides();
    } catch (error) {
      console.error('Error syncing leave to shift overrides:', error);
    }
  };
  
  // Fetch shift overrides for the displayed date range
  const fetchShiftOverrides = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        // If we already know the table doesn't exist, don't try to fetch
        if (!dbTablesStatus.shift_overrides) {
          console.log('Skipping shift overrides fetch - table does not exist');
          
          // Use cached data if available
          const cachedOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
          setShiftOverrides(cachedOverrides);
          return;
        }

        // Calculate the date range including padding days
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        // Get previous month padding
        const startDayOfWeek = getDay(monthStart);
        const fetchStart = new Date(monthStart);
        if (startDayOfWeek > 0) {
          fetchStart.setDate(fetchStart.getDate() - startDayOfWeek);
        }
        
        // Get next month padding
        const endDayOfWeek = getDay(monthEnd);
        const fetchEnd = new Date(monthEnd);
        if (endDayOfWeek < 6) {
          fetchEnd.setDate(fetchEnd.getDate() + (6 - endDayOfWeek));
        }
        
        const startDate = format(fetchStart, 'yyyy-MM-dd');
        const endDate = format(fetchEnd, 'yyyy-MM-dd');
        
        try {
          const { data, error } = await supabase
            .from('shift_overrides')
            .select('*')
            .eq('employee_id', session.user.id)
            .gte('date', startDate)
            .lte('date', endDate);
            
          if (error) {
            // Check if the error is due to missing table
            if (error.code === '42P01') {
              setDbTablesStatus(prev => ({ ...prev, shift_overrides: false }));
              setShiftOverrides([]);
              return;
            }
            throw error;
          }
          
          setShiftOverrides(data || []);
          // Cache the results for offline use
          setCachedData(CACHE_KEYS.SHIFT_OVERRIDES, data || []);
        } catch (error: any) {
          // If the error is a 404, it means the table doesn't exist
          if (error?.status === 404) {
            setDbTablesStatus(prev => ({ ...prev, shift_overrides: false }));
            setShiftOverrides([]);
            return;
          }
          throw error;
        }
      } catch (error) {
        console.error('Error fetching shift overrides:', error);
        // Set empty shift overrides as fallback or use cached data
        const cachedOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
        setShiftOverrides(cachedOverrides);
        
        // Don't show error toast if table doesn't exist
        if (dbTablesStatus.shift_overrides) {
          toast.error('Failed to load shift overrides');
        }
      }
    }
  };
  
  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        
        // Fetch the employee's shift group if available
        try {
          const { data: employee } = await supabase
            .from('employees')
            .select('shift_group')
            .eq('id', session.user.id)
            .single();
            
          if (employee?.shift_group) {
            setEmployeeGroup(employee.shift_group as 'A' | 'B' | 'C' | 'D');
          }
        } catch (error) {
          console.error('Error fetching employee shift group:', error);
        }
      }
    };
    
    getCurrentUser();
  }, []);
  
  // Memoize the shift data
  const shiftsData = React.useMemo(() => {
    const result: Record<string, ShiftType> = {};
    const notesData: Record<string, string> = {};
    
    // If we have schedule data from our hook, use it
    if (scheduleData?.days) {
      scheduleData.days.forEach(day => {
        result[day.date] = day.shiftType as ShiftType;
        if (day.notes) {
          notesData[day.date] = day.notes;
        }
      });
    } else {
      // Fallback to the old calculation method
      // Add calculated shifts for current month based on employee group
      if (scheduleType === 'shift') {
        // Get current date to determine month/year we're showing
        const monthDate = currentDate;
        const monthYear = monthDate.getFullYear();
        const monthNum = monthDate.getMonth();
        
        // Generate dates for the whole month
        for (let day = 1; day <= 31; day++) {
          const date = new Date(monthYear, monthNum, day);
          
          // Skip if not a valid date (e.g., Feb 30)
          if (date.getMonth() !== monthNum) continue;
          
          const dateStr = format(date, 'yyyy-MM-dd');
          result[dateStr] = calculateShift(date, employeeGroup);
        }
      }
      
      // Apply leave records
      leaveRecords.forEach(leave => {
        try {
          const startDate = parseISO(leave.start_date);
          const endDate = parseISO(leave.end_date);
          const dates = [];
          
          // Create array of all dates in the leave period
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Mark each date as leave
          dates.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            result[dateStr] = 'Leave';
            notesData[dateStr] = leave.reason || 'Leave';
          });
        } catch (e) {
          console.error('Error processing leave record', e);
        }
      });
      
      // Apply shift overrides (these take highest priority)
      shiftOverrides.forEach(override => {
        const dateStr = override.date;
        result[dateStr] = override.shift_type;
      });
    }
    
    return { shifts: result, notes: notesData };
  }, [scheduleData, scheduleType, currentDate, employeeGroup, leaveRecords, shiftOverrides]);

  const handleUpdateShift = async (dateStr: string, type: ShiftType, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to update shifts');
        return;
      }
      
      // Create a new override object
      const newOverride = {
        id: `local-${Date.now()}`, // Temporary ID for offline mode
        employee_id: user.id,
        date: dateStr,
        shift_type: type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_pending: isOffline, // Mark as pending if offline
        source: 'manual' // Track that this was manually created
      };
      
      if (isOffline) {
        // In offline mode, save to local storage
        const existingOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
        
        // Find if we already have an override for this date
        const existingIndex = existingOverrides.findIndex((o: any) => 
          o.employee_id === user.id && o.date === dateStr
        );
        
        if (existingIndex >= 0) {
          // Update existing override
          existingOverrides[existingIndex] = newOverride;
        } else {
          // Add new override
          existingOverrides.push(newOverride);
        }
        
        // Save back to cache
        setCachedData(CACHE_KEYS.SHIFT_OVERRIDES, existingOverrides);
        setShiftOverrides(existingOverrides);
        
        toast.success('Shift updated (offline mode)');
      } else {
        // Online mode - send directly to Supabase
        // Note: We ignore notes as it's not in our schema
        const { error } = await supabase
          .from('shift_overrides')
          .upsert({
            employee_id: user.id,
            date: dateStr,
            shift_type: type,
            source: 'manual'
          }, { onConflict: 'employee_id,date' });
          
        if (error) {
          console.error('Error updating shift:', error);
          toast.error('Failed to update shift');
          return;
        }
        
        // Refresh shift overrides
        fetchShiftOverrides();
        toast.success('Shift updated');
      }
    } catch (error) {
      console.error('Error in handleUpdateShift:', error);
      toast.error('An error occurred updating the shift');
    }
  };
  
  const handleChangeGroup = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = event.target.value as 'A' | 'B' | 'C' | 'D';
    setEmployeeGroup(newGroup);
    setCachedData(CACHE_KEYS.EMPLOYEE_GROUP, newGroup);
    
    // Update employee record if online
    if (!isOffline) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('employees')
            .update({ shift_group: newGroup })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error updating shift group:', error);
      }
    }
  };
  
  const handleChangeScheduleType = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as 'regular' | 'shift';
    setScheduleType(newType);
    setCachedData(CACHE_KEYS.SCHEDULE_TYPE, newType);
  };

  // Handle month navigation
  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Simplify the loading indicator to use scheduleLoading
  const isPageLoading = isLoading || scheduleLoading;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          
          <div className="flex space-x-2">
            <select
              value={employeeGroup}
              onChange={handleChangeGroup}
              className="bg-gray-700 text-white p-2 rounded-md"
              aria-label="Select shift group"
            >
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="C">Group C</option>
              <option value="D">Group D</option>
            </select>
            
            <select
              value={scheduleType}
              onChange={handleChangeScheduleType}
              className="bg-gray-700 text-white p-2 rounded-md"
              aria-label="Select schedule type"
            >
              <option value="shift">Shift Schedule</option>
              <option value="regular">Regular Schedule</option>
            </select>
            
            <button
              className="p-2 bg-gray-700 rounded-md"
              aria-label="Menu"
            >
              <FiMenu className="text-white" />
            </button>
            
            <button
              className="p-2 bg-blue-600 rounded-md"
              aria-label="Share schedule"
            >
              <FaShareAlt className="text-white" />
            </button>
          </div>
        </div>
        
        {isPageLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Calendar 
            shifts={shiftsData.shifts}
            notes={shiftsData.notes}
            onUpdateShift={handleUpdateShift}
          />
        )}

        {isOffline && (
          <div className="mt-4 p-3 bg-yellow-800 text-yellow-100 rounded-md">
            <p className="font-semibold">You're in offline mode</p>
            <p className="text-sm">Your changes will be synced when you reconnect.</p>
          </div>
        )}
        
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-white mb-2">Shift Legend</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-gray-800 rounded-md">
            {Object.entries(shiftColors).map(([type, color]) => (
              <div key={`legend-${type}`} className="flex items-center">
                <div className={`w-5 h-5 rounded mr-2 ${color}`}></div>
                <span className="text-white">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SchedulePage; 