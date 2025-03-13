/**
 * Schedule Types - Core types for the scheduling system
 */

export type ScheduleType = 'regular' | 'shift';

export type ShiftGroup = 'A' | 'B' | 'C' | 'D';

export type CycleDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ShiftType = 
  | 'Day'    // Day shift (7am-7pm)
  | 'Night'  // Night shift (7pm-7am)
  | 'Off'    // Off day
  | 'Leave'  // On approved leave
  | 'Public' // Public holiday
  | 'Overtime'
  | 'InLieu'; // Working in-lieu of a regular day off

export interface ShiftInfo {
  type: ShiftType;
  notes?: string;
  isOverridden?: boolean;
  originalType?: ShiftType;
  shiftNumber?: string; // "1st" or "2nd" for day/night shifts
}

export interface GroupShiftInfo {
  group: ShiftGroup;
  isFirstDay?: boolean;
  isFirstNight?: boolean;
}

export interface GroupAssignment {
  dayShift: GroupShiftInfo[];
  nightShift: GroupShiftInfo[];
  off: ShiftGroup[];
  date: string; // YYYY-MM-DD format
}

export interface GroupChange {
  id?: string;
  employeeId: string;
  oldGroup: ShiftGroup;
  newGroup: ShiftGroup;
  effectiveDate: string; // YYYY-MM-DD format
  requestDate: string; // YYYY-MM-DD format
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ShiftOverride {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD format
  shiftType: ShiftType;
  notes?: string;
  requestDate: string; // YYYY-MM-DD format
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD format
  name: string;
  isOfficial: boolean;
  notes?: string;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD format
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  
  // Shift information
  personalShift: ShiftInfo;
  holiday?: Holiday;
  
  // Group assignments
  groupAssignments: {
    dayShift: GroupShiftInfo[];
    nightShift: GroupShiftInfo[];
    off: ShiftGroup[];
  };
  
  // Indicates if this day has a group change applied
  hasGroupChange?: boolean;
}

export interface MonthData {
  year: number;
  month: number; // 0-11
  name: string; // Month name
  days: CalendarDay[];
}

// Shift calculation anchor data
export interface ShiftAnchor {
  date: Date;
  cycleDay: CycleDay;
  description: string;
}

export type ShiftAnchors = Record<ShiftGroup, ShiftAnchor>;

// Employee schedule preferences
export interface EmployeeSchedulePreferences {
  scheduleType: ScheduleType;
  shiftGroup?: ShiftGroup;
  defaultWorkHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

// Database records
export interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: string;      // Annual, Sick, etc.
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
} 