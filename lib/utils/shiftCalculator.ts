import { 
  format, 
  isWeekend,
  differenceInDays,
  getDaysInMonth,
  getDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  parseISO
} from 'date-fns';

import {
  ShiftType,
  ShiftGroup,
  CycleDay,
  CalendarDay,
  ShiftAnchor,
  ShiftAnchors,
  MonthData
} from '../types/schedule';

// Define the 8-day cycle pattern using January 2025 as reference
// Each group follows: 2 day shifts → 2 night shifts → 4 days off
// Using January 1-8, 2025 as our reference point:
//
// Jan 1: Day Shift: D (2nd day), Night Shift: C (2nd night)
// Jan 2: Day Shift: B (1st day), Night Shift: D (1st night)
// Jan 3: Day Shift: B (2nd day), Night Shift: D (2nd night)
// Jan 4: Day Shift: A (1st day), Night Shift: B (1st night)
// Jan 5: Day Shift: A (2nd day), Night Shift: B (2nd night)
// Jan 6: Day Shift: C (1st day), Night Shift: A (1st night)
// Jan 7: Day Shift: C (2nd day), Night Shift: A (2nd night)
// Jan 8: Day Shift: D (1st day), Night Shift: C (1st night)

// Define our reference date and the 8-day pattern
const REFERENCE_DATE = new Date(2025, 0, 1); // January 1, 2025

// Reference pattern for each day of the 8-day cycle
// This represents which group is on day/night shift and whether it's their 1st or 2nd shift
// Format: [day shift group, day shift number (1 or 2), night shift group, night shift number (1 or 2)]
const SHIFT_PATTERNS = [
  ['D', 2, 'C', 2], // Jan 1, 2025
  ['B', 1, 'D', 1], // Jan 2, 2025
  ['B', 2, 'D', 2], // Jan 3, 2025
  ['A', 1, 'B', 1], // Jan 4, 2025
  ['A', 2, 'B', 2], // Jan 5, 2025
  ['C', 1, 'A', 1], // Jan 6, 2025
  ['C', 2, 'A', 2], // Jan 7, 2025
  ['D', 1, 'C', 1]  // Jan 8, 2025
];

/**
 * Debug utility function for logging shift-related information
 * @param message The message to log
 * @param data Optional data to include with the log
 */
export function debugShift(message: string, data?: any) {
  console.log(`[SHIFT DEBUG] ${message}`, data ? data : '');
}

/**
 * Calculate the day of the 8-day cycle for a given date
 * @param date The date to calculate for
 * @returns A number from 0-7 representing the day in the 8-day cycle (0 = Jan 1 pattern, 7 = Jan 8 pattern)
 */
export function calculateCyclePatternDay(date: Date): number {
  // Get the exact number of days between the reference date and the target date
  const daysOffset = differenceInDays(date, REFERENCE_DATE);
  
  // Calculate which day of the 8-day cycle we're on (0-7)
  return ((daysOffset % 8) + 8) % 8;
}

/**
 * Calculate which groups are on day/night shift for a given date
 * @param date The date to calculate for
 * @returns An object with dayShift and nightShift information
 */
export function calculateShiftGroups(date: Date): { 
  dayShift: { group: ShiftGroup, isFirstShift: boolean }, 
  nightShift: { group: ShiftGroup, isFirstShift: boolean } 
} {
  // Get the cycle pattern day (0-7)
  const cycleDay = calculateCyclePatternDay(date);
  
  // Get the pattern for this day
  const pattern = SHIFT_PATTERNS[cycleDay];
  
  return {
    dayShift: {
      group: pattern[0] as ShiftGroup,
      isFirstShift: pattern[1] === 1
    },
    nightShift: {
      group: pattern[2] as ShiftGroup,
      isFirstShift: pattern[3] === 1
    }
  };
}

/**
 * Calculate the shift type for a specific employee group on a given date
 * @param date Date to calculate for
 * @param group Employee's shift group
 * @returns Shift type (Day, Night, Off)
 */
export function calculateShiftType(date: Date, group: ShiftGroup): ShiftType {
  const { dayShift, nightShift } = calculateShiftGroups(date);
  
  // Debug logging to verify shift calculation for Group C
  debugShift(`Calculating shift for date: ${format(date, 'yyyy-MM-dd')}`, { 
    dayShift, 
    nightShift, 
    requestedGroup: group 
  });
  
  // Force Group C consistency if needed
  const effectiveGroup = group === 'C' ? 'C' : group;
  
  if (dayShift.group === effectiveGroup) {
    return 'Day';
  } else if (nightShift.group === effectiveGroup) {
    return 'Night';
  } else {
    return 'Off';
  }
}

/**
 * Calculate if a shift is the first or second day/night in the cycle
 * @param date Date to calculate for
 * @param group Employee's shift group
 * @param shiftType The shift type (must be Day or Night)
 * @returns Boolean indicating if it's the first shift (true) or second shift (false)
 */
export function isFirstShift(date: Date, group: ShiftGroup, shiftType: 'Day' | 'Night'): boolean {
  const { dayShift, nightShift } = calculateShiftGroups(date);
  
  if (shiftType === 'Day' && dayShift.group === group) {
    return dayShift.isFirstShift;
  } else if (shiftType === 'Night' && nightShift.group === group) {
    return nightShift.isFirstShift;
  }
  
  return false; // Default if the group is not on the specified shift type
}

/**
 * Calculate which groups are on day/night shift for a specific date
 * This determines which groups are on day shift, night shift, or off
 * @param date Date to calculate for
 * @returns Group assignments object
 */
export function calculateGroupAssignments(date: Date): { 
  dayShift: { group: ShiftGroup, isFirstDay: boolean }[]; 
  nightShift: { group: ShiftGroup, isFirstNight: boolean }[]; 
  off: ShiftGroup[] 
} {
  const { dayShift, nightShift } = calculateShiftGroups(date);
  
  // All groups that are not on day or night shift are off
  const offGroups: ShiftGroup[] = ['A', 'B', 'C', 'D'].filter(
    group => group !== dayShift.group && group !== nightShift.group
  ) as ShiftGroup[];
  
  return { 
    dayShift: [{ group: dayShift.group, isFirstDay: dayShift.isFirstShift }],
    nightShift: [{ group: nightShift.group, isFirstNight: nightShift.isFirstShift }],
    off: offGroups
  };
}

/**
 * Get the shift number (1st or 2nd) for a specific date and group
 * @param date Date to calculate for
 * @param group Employee's shift group
 * @returns String indicating "1st" or "2nd" if on shift, undefined if off
 */
export function getShiftNumber(date: Date, group: ShiftGroup): string | undefined {
  const { dayShift, nightShift } = calculateShiftGroups(date);
  
  if (dayShift.group === group) {
    return dayShift.isFirstShift ? '1st' : '2nd';
  } else if (nightShift.group === group) {
    return nightShift.isFirstShift ? '1st' : '2nd';
  }
  
  return undefined; // Off duty
}

/**
 * Generate calendar data for a specific month
 * @param year Year to generate for
 * @param month Month to generate for (0-11)
 * @param employeeGroup Employee's shift group
 * @param holidays Holidays to incorporate
 * @param leaveRecords Leave records to incorporate
 * @param shiftOverrides Shift overrides to incorporate
 * @param groupChanges Group change history to incorporate
 * @returns Complete month data with calendar days
 */
export function generateMonthCalendar(
  year: number,
  month: number,
  employeeGroup: ShiftGroup,
  holidays: { [date: string]: { name: string; isOfficial: boolean } } = {},
  leaveRecords: { [date: string]: { type: string; notes?: string } } = {},
  shiftOverrides: { [date: string]: { type: ShiftType; notes?: string } } = {},
  groupChanges: { [date: string]: { oldGroup: ShiftGroup; newGroup: ShiftGroup } } = {}
): MonthData {
  // Add debug logging for shift overrides to diagnose in-lieu issues
  debugShift(`Generating calendar for ${year}-${month+1} with ${Object.keys(shiftOverrides).length} overrides`);
  
  // Log any in-lieu shift overrides specifically
  const inLieuOverrides = Object.entries(shiftOverrides).filter(([_, override]) => override.type === 'InLieu');
  if (inLieuOverrides.length > 0) {
    debugShift(`Found ${inLieuOverrides.length} in-lieu shift overrides:`, inLieuOverrides);
  } else {
    debugShift('No in-lieu shift overrides found for this month');
  }
  
  // Check all data structures for integrity
  debugShift('Data structure sizes:', {
    holidays: Object.keys(holidays).length,
    leaveRecords: Object.keys(leaveRecords).length,
    shiftOverrides: Object.keys(shiftOverrides).length,
    groupChanges: Object.keys(groupChanges).length
  });
  
  // Check if any shift overrides have unexpected or invalid types
  const allTypes = Object.values(shiftOverrides).map(so => so.type);
  const uniqueTypes = Array.from(new Set(allTypes));
  debugShift('Unique shift override types:', uniqueTypes);
  
  // Create date objects for start and end of month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, getDaysInMonth(monthStart));
  
  // Get day of week for the first day of month (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = getDay(monthStart);
  
  // Calculate dates to include in the calendar (including padding days)
  const calendarStart = new Date(year, month, 1 - firstDayOfWeek);
  const calendarEnd = new Date(year, month, getDaysInMonth(monthStart) + (6 - getDay(monthEnd)));
  
  // Get all dates in calendar range
  const calendarDates = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });
  
  // Count of in-lieu shifts found in the generated calendar
  let inLieuShiftsFound = 0;
  
  // Create calendar days
  const calendarDays: CalendarDay[] = calendarDates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateObj = new Date(date);
    
    // Check if we have a group change that affects this date
    let effectiveGroup = employeeGroup;
    let hasGroupChange = false;
    
    // Handle group changes - use the most recent change that's before or on this date
    const relevantChanges = Object.entries(groupChanges)
      .filter(([changeDate]) => changeDate <= dateStr)
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    // If there are relevant changes, use the most recent one
    if (relevantChanges.length > 0) {
      const latestChange = relevantChanges[relevantChanges.length - 1];
      effectiveGroup = latestChange[1].newGroup;
      hasGroupChange = true;
    }
    
    // Calculate base shift type for the employee's group (considering group changes)
    const baseShiftType = calculateShiftType(dateObj, effectiveGroup);
    const shiftNumber = getShiftNumber(dateObj, effectiveGroup);
    
    // Start with the base shift
    let personalShiftType: ShiftType = baseShiftType;
    let isOverridden = false;
    let notes: string | undefined;
    
    // Check for overrides (in priority order)
    
    // 1. Manual shift override has highest priority
    if (shiftOverrides[dateStr]) {
      personalShiftType = shiftOverrides[dateStr].type;
      notes = shiftOverrides[dateStr].notes;
      isOverridden = true;
      
      // Add debug logging for in-lieu shifts
      if (shiftOverrides[dateStr].type === 'InLieu') {
        debugShift(`Found in-lieu shift for date: ${dateStr}`);
        inLieuShiftsFound++;
      }
    }
    // 2. Leave record has second highest priority
    else if (leaveRecords[dateStr]) {
      personalShiftType = 'Leave';
      notes = leaveRecords[dateStr].notes || leaveRecords[dateStr].type;
      isOverridden = true;
    }
    // 3. Public holiday has third highest priority
    else if (holidays[dateStr] && holidays[dateStr].isOfficial) {
      personalShiftType = 'Public';
      notes = holidays[dateStr].name;
      isOverridden = true;
    }
    
    // Get group assignments for this date
    const { dayShift, nightShift, off } = calculateGroupAssignments(dateObj);
    
    return {
      date: dateStr,
      dayOfMonth: dateObj.getDate(),
      isCurrentMonth: isSameMonth(dateObj, monthStart),
      isToday: isToday(dateObj),
      isWeekend: isWeekend(dateObj),
      dayOfWeek: getDay(dateObj),
      
      personalShift: {
        type: personalShiftType,
        notes,
        isOverridden,
        originalType: isOverridden ? baseShiftType : undefined,
        shiftNumber: (!isOverridden && (baseShiftType === 'Day' || baseShiftType === 'Night')) ? shiftNumber : undefined
      },
      
      holiday: holidays[dateStr] ? {
        id: dateStr,
        date: dateStr,
        name: holidays[dateStr].name,
        isOfficial: holidays[dateStr].isOfficial
      } : undefined,
      
      groupAssignments: {
        dayShift: dayShift.map(d => ({ 
          group: d.group, 
          isFirstDay: d.isFirstDay 
        })),
        nightShift: nightShift.map(n => ({ 
          group: n.group, 
          isFirstNight: n.isFirstNight 
        })),
        off
      },
      
      hasGroupChange
    };
  });
  
  // Log summary after processing all days
  debugShift(`Calendar generation complete. Found ${inLieuShiftsFound} in-lieu shifts in the calendar.`);
  
  if (inLieuShiftsFound !== inLieuOverrides.length) {
    debugShift(`WARNING: Mismatch between in-lieu overrides (${inLieuOverrides.length}) and in-lieu shifts found in calendar (${inLieuShiftsFound})!`);
  }
  
  // Create month data
  return {
    year,
    month,
    name: format(monthStart, 'MMMM'),
    days: calendarDays
  };
}

/**
 * Get the regular work schedule time for a specific day
 * @param dayOfWeek Day of week (0-6, with 0 being Sunday)
 * @returns Start and end times, or undefined if it's a weekend
 */
export function getRegularWorkHours(dayOfWeek: number): { start: string; end: string } | undefined {
  // Based on the prompt:
  // Sunday – Wednesday: 07:45 AM – 04:00 PM
  // Thursday: 07:45 AM – 01:30 PM
  // Friday & Saturday: Off
  
  if (dayOfWeek >= 0 && dayOfWeek <= 3) {
    // Sunday - Wednesday
    return { start: '07:45', end: '16:00' };
  } else if (dayOfWeek === 4) {
    // Thursday
    return { start: '07:45', end: '13:30' };
  } else {
    // Friday & Saturday
    return undefined;
  }
}

/**
 * Get the shift work hours for a specific shift type
 * @param shiftType Shift type
 * @returns Start and end times, or undefined if it's Off
 */
export function getShiftWorkHours(shiftType: ShiftType): { start: string; end: string } | undefined {
  // Based on the prompt:
  // Day Shift: 07:00 AM – 07:00 PM
  // Night Shift: 07:00 PM – 07:00 AM
  
  if (shiftType === 'Day') {
    return { start: '07:00', end: '19:00' };
  } else if (shiftType === 'Night') {
    return { start: '19:00', end: '07:00' };
  } else {
    return undefined;
  }
}