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

// Schedule types
type ShiftType = 'Day' | 'Night' | 'Off' | 'Leave' | 'Public' | 'Overtime';

interface ScheduleDay {
  date: Date;
  type: ShiftType;
  notes?: string;
  inCurrentMonth: boolean;
}

// Shift colors
const shiftColors = {
  'Day': 'bg-blue-500',
  'Night': 'bg-green-500',
  'Off': 'bg-red-500',
  'Leave': 'bg-yellow-400',
  'Public': 'bg-orange-400',
  'Overtime': 'bg-pink-500',
};

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

// Egyptian holidays for 2025
const holidays = [
  { date: '2025-01-07', name: 'Copti' },
  { date: '2025-01-25', name: 'Revol' },
  { date: '2025-03-31', name: 'Eid el' },
  { date: '2025-04-01', name: 'Eid el' },
  { date: '2025-04-02', name: 'Eid el' },
  { date: '2025-04-03', name: 'Eid el' },
  { date: '2025-04-19', name: 'Copti' },
  { date: '2025-04-20', name: 'Copti' },
  { date: '2025-04-21', name: 'Sprin' },
  { date: '2025-04-25', name: 'Sinai' },
  { date: '2025-05-01', name: 'Labor' },
];

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
  
  // Generate calendar data for the current month view
  const calendarData = React.useMemo(() => {
    if (isLoading) return { days: [], weeks: [] };
    
    // Calculate the date range
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Get previous month padding
    const startDayOfWeek = getDay(monthStart);
    const calendarStart = new Date(monthStart);
    if (startDayOfWeek > 0) {
      calendarStart.setDate(calendarStart.getDate() - startDayOfWeek);
    }
    
    // Get next month padding
    const endDayOfWeek = getDay(monthEnd);
    const calendarEnd = new Date(monthEnd);
    if (endDayOfWeek < 6) {
      calendarEnd.setDate(calendarEnd.getDate() + (6 - endDayOfWeek));
    }
    
    // Get all days to display
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    // Process each day
    const days = calendarDays.map(date => {
      // Format date for comparisons
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Check if date has an override (only if table exists)
      const override = dbTablesStatus.shift_overrides ? shiftOverrides.find(o => 
        format(parseISO(o.date), 'yyyy-MM-dd') === formattedDate
      ) : null;
      
      // Check if date is within approved leave (only if table exists)
      const isLeave = dbTablesStatus.leave_requests ? leaveRecords.some(leave => {
        const leaveStart = parseISO(leave.start_date);
        const leaveEnd = parseISO(leave.end_date);
        
        return isWithinInterval(date, {
          start: leaveStart,
          end: leaveEnd
        });
      }) : false;
      
      // Check if date is a holiday
      const holiday = holidays.find(h => h.date === formattedDate);
      
      // Determine shift type
      let shiftType: ShiftType;
      
      if (isLeave) {
        shiftType = 'Leave';
      } else if (override) {
        shiftType = override.shift_type as ShiftType;
      } else if (scheduleType === 'regular') {
        // Regular work hours (Sunday-Thursday)
        const dayOfWeek = getDay(date);
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
        
        if (isWeekend) {
          shiftType = 'Off';
        } else {
          shiftType = 'Day';
        }
      } else {
        // Shift work hours based on group
        shiftType = calculateShift(date, employeeGroup);
      }
      
      return {
        date,
        type: shiftType,
        notes: holiday?.name,
        inCurrentMonth: isSameMonth(date, currentDate),
      };
    });
    
    // Group days into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return { days, weeks };
  }, [currentDate, leaveRecords, shiftOverrides, scheduleType, employeeGroup, isLoading, dbTablesStatus]);
  
  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  // Day click handler
  const handleDayClick = (day: ScheduleDay) => {
    setSelectedDay(day.date);
    setShowEditModal(true);
  };
  
  // Shift update handler
  const handleEditShift = async (type: ShiftType) => {
    if (!selectedDay) return;
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to update shifts');
      return;
    }
    
    // If type is Leave, we need to handle it specially by creating a leave request
    if (type === 'Leave') {
      return await handleLeaveRequest();
    }
    
    // Check if shift_overrides table exists
    if (!dbTablesStatus.shift_overrides) {
      toast.error('Shift overrides feature is not available. Database table missing.');
      setShowEditModal(false);
      setSelectedDay(null);
      return;
    }
    
    // If we're offline, store changes locally
    if (isOffline) {
      try {
        const formattedDate = format(selectedDay, 'yyyy-MM-dd');
        
        // Get current cached overrides
        let cachedOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
        
        // Check if an override already exists
        const existingIndex = cachedOverrides.findIndex(
          (o: any) => o.employee_id === session.user.id && format(new Date(o.date), 'yyyy-MM-dd') === formattedDate
        );
        
        if (existingIndex >= 0) {
          // Update existing override
          cachedOverrides[existingIndex].shift_type = type;
        } else {
          // Create new override
          cachedOverrides.push({
            id: `local-${Date.now()}`,
            employee_id: session.user.id,
            date: formattedDate,
            shift_type: type,
            is_pending: true // Flag to indicate it needs to be synced
          });
        }
        
        // Save to local storage
        setCachedData(CACHE_KEYS.SHIFT_OVERRIDES, cachedOverrides);
        
        // Update state
        setShiftOverrides(cachedOverrides);
        toast.success(`Shift updated to ${type} (Offline Mode)`);
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      } catch (error) {
        console.error('Error updating shift in offline mode:', error);
        toast.error('Failed to update shift in offline mode');
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      }
    }
    
    // Online mode - proceed as before
    try {
      const formattedDate = format(selectedDay, 'yyyy-MM-dd');
      
      // Check if an override already exists
      const { data: existingOverride, error: overrideError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', session.user.id)
        .eq('date', formattedDate)
        .single();
        
      if (overrideError && overrideError.code !== 'PGRST116') {
        throw overrideError;
      }
      
      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('shift_overrides')
          .update({ shift_type: type })
          .eq('id', existingOverride.id);
          
        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase
          .from('shift_overrides')
          .insert({
            employee_id: session.user.id,
            date: formattedDate,
            shift_type: type,
          });
          
        if (error) throw error;
      }
      
      // Refresh shift overrides
      await fetchShiftOverrides();
      toast.success(`Shift updated to ${type}`);
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    }
    
    setShowEditModal(false);
    setSelectedDay(null);
  };
  
  // New function to handle leave requests
  const handleLeaveRequest = async () => {
    if (!selectedDay) return;
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to request leave');
      return;
    }
    
    try {
      const formattedDate = format(selectedDay, 'yyyy-MM-dd');
      const year = selectedDay.getFullYear();
      
      // Show loading toast
      const loadingToast = toast.loading('Submitting leave request...');
      
      // Check if this is an existing leave period using the leaves table
      let existingLeaveRequest = null;
      const { data: leaves, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', session.user.id)
        .lte('start_date', formattedDate)
        .gte('end_date', formattedDate);
        
      if (!error && leaves && leaves.length > 0) {
        existingLeaveRequest = leaves[0];
      }
      
      if (existingLeaveRequest) {
        // Existing leave period found, update the shift_override
        await handleUpdateShiftOverride(formattedDate, 'Leave');
        toast.dismiss(loadingToast);
        toast.success('Day marked as Leave (matched existing leave period)');
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      }
      
      // Create a new leave request
      // Always use the leaves table
      const { error: insertError } = await supabase
        .from('leaves')
        .insert({
          employee_id: session.user.id,
          year: year,
          start_date: formattedDate,
          end_date: formattedDate,
          days_taken: 1,
          reason: 'Requested from schedule page',
          status: 'Approved',
          leave_type: 'Annual'
        });
        
      if (insertError) throw insertError;
      
      // Also update the shift_override for consistency
      await handleUpdateShiftOverride(formattedDate, 'Leave');
      
      toast.dismiss(loadingToast);
      toast.success('Leave request submitted successfully');
      
      // Refresh data
      await fetchLeaveRecords();
      await fetchShiftOverrides();
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request: ' + error.message);
    }
    
    setShowEditModal(false);
    setSelectedDay(null);
  };
  
  // Helper function to update shift override
  const handleUpdateShiftOverride = async (date: string, type: ShiftType) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    if (!dbTablesStatus.shift_overrides) {
      console.log('Shift overrides table does not exist, skipping update');
      return false;
    }
    
    try {
      // Check if an override already exists
      const { data: existingOverride, error: overrideError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', session.user.id)
        .eq('date', date)
        .single();
        
      if (overrideError && overrideError.code !== 'PGRST116') {
        throw overrideError;
      }
      
      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('shift_overrides')
          .update({ shift_type: type })
          .eq('id', existingOverride.id);
          
        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase
          .from('shift_overrides')
          .insert({
            employee_id: session.user.id,
            date: date,
            shift_type: type,
          });
          
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating shift override:', error);
      return false;
    }
  };
  
  // Reset shift override handler
  const handleRemoveOverride = async () => {
    if (!selectedDay) return;
    
    // Check if this day is part of a leave request and confirm if the user wants to cancel their leave
    const formattedDate = format(selectedDay, 'yyyy-MM-dd');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in');
      return;
    }
    
    let isPartOfLeave = false;
    let leaveRecord = null;
    
    // Check if this is part of a leave period
    if (dbTablesStatus.leave_requests) {
      // Use leave_requests table
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', session.user.id)
        .lte('start_date', formattedDate)
        .gte('end_date', formattedDate);
        
      if (!error && data && data.length > 0) {
        isPartOfLeave = true;
        leaveRecord = data[0];
      }
    } else {
      // Try leaves table if it exists
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', session.user.id)
        .lte('start_date', formattedDate)
        .gte('end_date', formattedDate);
        
      if (!error && data && data.length > 0) {
        isPartOfLeave = true;
        leaveRecord = data[0];
      }
    }
    
    if (isPartOfLeave && leaveRecord) {
      // This is part of a leave period, ask if they want to cancel it
      if (confirm(`This day is part of a leave request from ${format(new Date(leaveRecord.start_date), 'PP')} to ${format(new Date(leaveRecord.end_date), 'PP')}. Do you want to cancel this leave request?`)) {
        try {
          // Handle leave cancellation based on whether it's a single day or multi-day leave
          const isSingleDayLeave = format(new Date(leaveRecord.start_date), 'yyyy-MM-dd') === format(new Date(leaveRecord.end_date), 'yyyy-MM-dd');
          
          if (isSingleDayLeave) {
            // Delete the leave record if it's just for this day
            const table = dbTablesStatus.leave_requests ? 'leave_requests' : 'leaves';
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', leaveRecord.id);
              
            if (error) throw error;
            
            toast.success('Leave request cancelled successfully');
          } else {
            // For multi-day leave, we would need more complex logic to split the leave period
            // This is a simplification - in a real app, you might want to allow splitting the leave
            toast.error('Cannot remove a single day from a multi-day leave period. Please modify your leave from the Leave page.');
            setShowEditModal(false);
            setSelectedDay(null);
            return;
          }
        } catch (error: any) {
          console.error('Error cancelling leave:', error);
          toast.error('Failed to cancel leave: ' + error.message);
          setShowEditModal(false);
          setSelectedDay(null);
          return;
        }
      } else {
        // User canceled the confirmation dialog
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      }
    }
    
    // Continue with normal shift override removal
    
    // Check if shift_overrides table exists
    if (!dbTablesStatus.shift_overrides) {
      toast.error('Shift overrides feature is not available. Database table missing.');
      setShowEditModal(false);
      setSelectedDay(null);
      return;
    }
    
    // If we're offline, handle locally
    if (isOffline) {
      try {
        // Get current cached overrides
        let cachedOverrides = getCachedData(CACHE_KEYS.SHIFT_OVERRIDES, []);
        
        // Filter out the override for this date
        cachedOverrides = cachedOverrides.filter(
          (o: any) => !(o.employee_id === session.user.id && format(new Date(o.date), 'yyyy-MM-dd') === formattedDate)
        );
        
        // Save to local storage
        setCachedData(CACHE_KEYS.SHIFT_OVERRIDES, cachedOverrides);
        
        // Update state
        setShiftOverrides(cachedOverrides);
        toast.success('Shift reset to default (Offline Mode)');
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      } catch (error) {
        console.error('Error resetting shift in offline mode:', error);
        toast.error('Failed to reset shift in offline mode');
        setShowEditModal(false);
        setSelectedDay(null);
        return;
      }
    }
    
    // Online mode - proceed as before
    try {
      // Delete the override
      const { error } = await supabase
        .from('shift_overrides')
        .delete()
        .eq('employee_id', session.user.id)
        .eq('date', formattedDate);
        
      if (error) throw error;
      
      // Refresh shift overrides
      await fetchShiftOverrides();
      await fetchLeaveRecords(); // Also refresh leave records in case we cancelled a leave
      toast.success('Shift reset to default');
    } catch (error) {
      console.error('Error removing shift override:', error);
      toast.error('Failed to reset shift');
    }
    
    setShowEditModal(false);
    setSelectedDay(null);
  };
  
  // Group change handler
  const handleChangeGroup = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const group = event.target.value as 'A' | 'B' | 'C' | 'D';
    
    // Update state immediately for better UX
    setEmployeeGroup(group);
    
    // Skip database update if employees table doesn't exist
    if (!dbTablesStatus.employees) {
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to change groups');
      return;
    }
    
    try {
      // Update database
      const { error } = await supabase
        .from('employees')
        .update({ shift_group: group })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      toast.success(`Group changed to ${group}`);
    } catch (error) {
      console.error('Error changing group:', error);
      toast.error('Failed to save group change');
    }
  };
  
  // Schedule type change handler
  const handleChangeScheduleType = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as 'regular' | 'shift';
    
    // Update state immediately for better UX
    setScheduleType(type);
    
    // Skip database update if employees table doesn't exist
    if (!dbTablesStatus.employees) {
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to change schedule type');
      return;
    }
    
    try {
      // Update database
      const { error } = await supabase
        .from('employees')
        .update({ schedule_type: type })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      toast.success(`Schedule type changed to ${type}`);
    } catch (error) {
      console.error('Error changing schedule type:', error);
      toast.error('Failed to save schedule type change');
    }
  };
  
  // Function to render day cell with shift information
  const renderDayCell = (day: ScheduleDay) => {
    const { date, type, notes, inCurrentMonth } = day;
    
    return (
      <div 
        key={date.toString()} 
        className={`p-1 border-t border-gray-700 ${inCurrentMonth ? '' : 'opacity-40'}`}
        onClick={() => handleDayClick(day)}
      >
        <div className="flex justify-center items-center mb-1">
          <span className={`text-lg font-semibold ${
            date.getDate() === new Date().getDate() && isSameMonth(date, new Date()) 
              ? 'text-white bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center' 
              : ''
          }`}>
            {date.getDate()}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className={`text-center p-1 rounded text-white ${shiftColors[type]}`}>
            {type}
          </div>
          {notes && (
            <div className="text-xs text-gray-300 flex items-center mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {notes}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="min-h-screen bg-black text-white px-4 py-6 pb-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-5xl font-bold">
            {format(currentDate, 'MMMM')}
          </h1>
          <div className="flex gap-4">
            <button 
              className="text-white text-2xl"
              aria-label="Share"
            >
              <FaShareAlt />
            </button>
            <button 
              className="text-white text-2xl"
              aria-label="Menu"
            >
              <FiMenu />
            </button>
          </div>
        </div>
        
        {/* Internet Connection Warning */}
        {isOffline && (
          <div className="bg-red-500 bg-opacity-20 text-red-300 p-3 rounded-lg mb-4 text-sm">
            <p className="font-semibold mb-1">⚠️ Offline Mode</p>
            <p>
              Your device appears to be offline. Some features may not work correctly.
              <button 
                onClick={fetchData}
                className="ml-2 bg-red-500 bg-opacity-30 hover:bg-opacity-50 px-2 py-1 rounded text-white"
              >
                Retry Connection
              </button>
            </p>
          </div>
        )}
        
        {/* Navigation Controls */}
        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={handlePreviousMonth}
            className="bg-blue-500 text-white px-4 py-1 rounded font-medium"
          >
            Prev
          </button>
          <button 
            onClick={handleToday}
            className="bg-gray-600 text-white px-4 py-1 rounded font-medium"
          >
            Today
          </button>
          <button 
            onClick={handleNextMonth}
            className="bg-blue-500 text-white px-4 py-1 rounded font-medium"
          >
            Next
          </button>
        </div>
        
        {/* Settings Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="mr-2">Group:</span>
              <select 
                value={employeeGroup} 
                onChange={handleChangeGroup}
                className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
                disabled={scheduleType === 'regular'}
              >
                <option value="A">Group A</option>
                <option value="B">Group B</option>
                <option value="C">Group C</option>
                <option value="D">Group D</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Type:</span>
            <select 
              value={scheduleType} 
              onChange={handleChangeScheduleType}
              className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
            >
              <option value="regular">Regular Hours</option>
              <option value="shift">Shift Hours</option>
            </select>
          </div>
        </div>
        
        {/* Missing Tables Warning */}
        {(!dbTablesStatus.employees || !dbTablesStatus.leave_requests || !dbTablesStatus.shift_overrides) && (
          <div className="bg-yellow-500 bg-opacity-20 text-yellow-300 p-3 rounded-lg mb-4 text-sm">
            <p className="font-semibold mb-1">⚠️ Development Mode</p>
            <p>
              Some database tables are missing. {' '}
              {!dbTablesStatus.employees && 'Employee settings'}
              {!dbTablesStatus.employees && !dbTablesStatus.leave_requests && ', '}
              {!dbTablesStatus.leave_requests && 'Leave records'}
              {(!dbTablesStatus.employees || !dbTablesStatus.leave_requests) && !dbTablesStatus.shift_overrides && ', '}
              {!dbTablesStatus.shift_overrides && 'Shift overrides'}
              {' '}will not be saved.
            </p>
          </div>
        )}
        
        {/* Calendar */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center border-b border-gray-700">
            <div className="py-2">S</div>
            <div className="py-2">S</div>
            <div className="py-2">M</div>
            <div className="py-2">T</div>
            <div className="py-2">W</div>
            <div className="py-2">T</div>
            <div className="py-2">F</div>
          </div>
          
          {/* Calendar grid */}
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading schedule...</p>
            </div>
          ) : (
            <div>
              {calendarData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-700">
                  {week.map((day) => (
                    <div 
                      key={day.date.toString()} 
                      className="min-h-20 cursor-pointer" 
                    >
                      {renderDayCell(day)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 py-2">
          <div className="flex justify-around items-center px-4">
            <button className="flex flex-col items-center text-white">
              <div className="text-2xl mb-1">📅</div>
              <span className="text-xs">Calendar</span>
            </button>
            <button className="flex flex-col items-center text-gray-500">
              <div className="text-2xl mb-1">📊</div>
              <span className="text-xs">Reports</span>
            </button>
            <button className="flex flex-col items-center text-gray-500">
              <div className="text-2xl mb-1">📝</div>
              <span className="text-xs">Templates</span>
            </button>
            <button className="flex flex-col items-center text-gray-500">
              <div className="text-2xl mb-1">⚙️</div>
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>
        
        {/* Floating action button */}
        <button 
          className="fixed bottom-20 right-6 bg-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
          onClick={() => {
            setSelectedDay(new Date());
            setShowEditModal(true);
          }}
        >
          <FaPencilAlt className="text-black text-xl" />
        </button>
        
        {/* Edit modal */}
        {showEditModal && selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-w-md">
              <h2 className="text-xl font-bold mb-4">
                Edit Shift: {format(selectedDay, 'MMMM d, yyyy')}
              </h2>
              
              {!dbTablesStatus.shift_overrides ? (
                <div className="mb-4 text-yellow-300 bg-yellow-900 bg-opacity-30 p-3 rounded">
                  <p>⚠️ Shift overrides are not available. Database table is missing.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button 
                    className={`${shiftColors['Day']} p-2 rounded text-white font-medium`}
                    onClick={() => handleEditShift('Day')}
                  >
                    Day Shift
                  </button>
                  <button 
                    className={`${shiftColors['Night']} p-2 rounded text-white font-medium`}
                    onClick={() => handleEditShift('Night')}
                  >
                    Night Shift
                  </button>
                  <button 
                    className={`${shiftColors['Off']} p-2 rounded text-white font-medium`}
                    onClick={() => handleEditShift('Off')}
                  >
                    Off Day
                  </button>
                  <button 
                    className={`${shiftColors['Overtime']} p-2 rounded text-white font-medium`}
                    onClick={() => handleEditShift('Overtime')}
                  >
                    Overtime
                  </button>
                  <button 
                    className={`${shiftColors['Leave']} p-2 rounded text-white font-medium col-span-2`}
                    onClick={() => handleEditShift('Leave')}
                  >
                    Leave
                  </button>
                </div>
              )}
              
              <div className="flex justify-between">
                {dbTablesStatus.shift_overrides && (
                  <button 
                    className="bg-gray-600 text-white px-4 py-2 rounded font-medium"
                    onClick={handleRemoveOverride}
                  >
                    Reset to Default
                  </button>
                )}
                <button 
                  className="bg-gray-600 text-white px-4 py-2 rounded font-medium ml-auto"
                  onClick={() => setShowEditModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SchedulePage; 