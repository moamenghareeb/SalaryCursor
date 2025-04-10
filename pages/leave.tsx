import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import type { Employee as BaseEmployee, Leave } from '../types';
import type { InLieuRecord as BaseInLieuRecord } from '../types';
import type { Leave as LeaveModelType } from '../types/models';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, pdf } from '@react-pdf/renderer';
import Head from 'next/head';
import { FiDownload, FiCalendar, FiEdit, FiTrash, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { leaveService } from '../lib/leaveService';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, differenceInDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';

// Define ShiftType enum to fix the type error
type ShiftType = 'InLieu' | 'Leave' | 'Regular' | 'Sick' | 'Vacation';

// Define LeaveType enum for leave types
type LeaveTypeValue = 'Annual' | 'Casual' | 'Sick' | 'Unpaid' | 'Compassionate';

// Extend the Employee type to include annual_leave_balance and hire_date
interface Employee extends BaseEmployee {
  annual_leave_balance: number;
  leave_balance?: number; // For backward compatibility
  hire_date: Date;
}

// Extend the InLieuRecord type to include the actual fields from the database
interface InLieuRecord extends BaseInLieuRecord {
  // Override the properties to match the database schema
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  leave_days_added: number;
  created_at?: string;
  updated_at?: string;
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
    color: '#112246',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '33%',
    borderStyle: 'solid',
    borderColor: '#bfbfbf',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 5,
    backgroundColor: '#f2f2f2',
  },
  tableCol: {
    width: '33%',
    borderStyle: 'solid',
    borderColor: '#bfbfbf',
    borderRightWidth: 1,
    padding: 5,
  },
  tableHeader: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
    margin: 4,
  },
  summaryContainer: {
    marginTop: 20,
    borderTop: 1,
    borderTopColor: '#112246',
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: 'grey',
  },
});

// Add type for PDFDownloadLink render prop
interface PDFRenderProps {
  blob: Blob | null;
  url: string | null;
  loading: boolean;
  error: Error | null;
}

// Leave PDF Component
const LeavePDF = ({ employee, leaveData, inLieuData, totalLeaveBalance, leaveTaken, remainingLeave, year }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Annual Leave Report</Text>
      
      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>
          Employee Information
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Name</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Employee ID</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Position</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{employee.name}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{employee.employee_id}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{employee.position}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>
          Leave Details for {year}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Month</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Days Taken</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableHeader}>Date Recorded</Text>
            </View>
          </View>
          {leaveData.map((leave: any) => (
            <View key={leave.id} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {new Date(leave.year, leave.month - 1, 1).toLocaleString('default', { month: 'long' })}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{leave.days_taken}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {new Date(leave.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      
      {/* Add in-lieu records section */}
      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>
          In-Lieu Time Records
        </Text>
        {inLieuData && inLieuData.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableHeader}>Date Range</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableHeader}>Days Worked</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableHeader}>Days Added</Text>
              </View>
            </View>
            {inLieuData.map((record: any) => (
              <View key={record.id} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{record.days_count}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{record.leave_days_added.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.tableCell}>No in-lieu records found</Text>
        )}
      </View>
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Base Annual Leave Entitlement</Text>
          <Text style={styles.summaryValue}>{employee.years_of_service >= 10 ? '24.67' : '18.67'} days</Text>
        </View>
        {inLieuData && inLieuData.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Additional Leave (In-Lieu)</Text>
            <Text style={styles.summaryValue}>
              {inLieuData.reduce((total: number, record: any) => total + record.leave_days_added, 0).toFixed(2)} days
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Annual Leave Entitlement</Text>
          <Text style={styles.summaryValue}>{totalLeaveBalance} days</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Leave Taken</Text>
          <Text style={styles.summaryValue}>{leaveTaken} days</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining Leave</Text>
          <Text style={styles.summaryValue}>{remainingLeave} days</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text>Generated on {new Date().toLocaleDateString()}</Text>
      </View>
    </Page>
  </Document>
);

export default function Leave() {
  const { isDarkMode } = useTheme();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [inLieuRecords, setInLieuRecords] = useState<InLieuRecord[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<number | null>(null);
  const [leaveTaken, setLeaveTaken] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('Annual');
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [showInLieuForm, setShowInLieuForm] = useState(false);
  const [yearsOfService, setYearsOfService] = useState<number>(0);
  const [isEditingYears, setIsEditingYears] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [baseLeaveBalance, setBaseLeaveBalance] = useState<number | null>(null);
  const [additionalLeaveBalance, setAdditionalLeaveBalance] = useState<number>(0);
  const queryClient = useQueryClient();
  const [inLieuStartDate, setInLieuStartDate] = useState<Date | null>(null);
  const [inLieuEndDate, setInLieuEndDate] = useState<Date | null>(null);
  const [inLieuNotes, setInLieuNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate remaining leave - will update whenever leaveBalance or leaveTaken changes
  const remainingLeave = useMemo(() => {
    if (leaveBalance === null) return null;
    return leaveBalance - leaveTaken;
  }, [leaveBalance, leaveTaken]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (preserveSuccess = false) => {
    setLoading(true);
    setError(null);

    if (!preserveSuccess) {
      setSuccess(null);
    }

    try {
      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setError('Authentication error: ' + userError.message);
        setLoading(false);
        return;
      }
      
      if (!userData.user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const userId = userData.user.id;
      console.log('Fetching data for user:', userId);

      // Fetch employee details
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        setError('Failed to fetch employee data: ' + employeeError.message);
        setLoading(false);
        return;
      }

      if (!employeeData) {
        console.error('No employee data found');
        setError('Employee record not found');
        setLoading(false);
        return;
      }
      
      setEmployee(employeeData);
      setYearsOfService(employeeData.years_of_service);
      
      // Fetch all leaves and in-lieu records before calculating balances
      console.log('Fetching leaves for employee:', userId);
      const leavesPromise = supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', userId)
        .order('start_date', { ascending: false });
        
      console.log('Fetching in-lieu records for employee:', userId);
      const inLieuPromise = supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });
        
      const [leavesResult, inLieuResult] = await Promise.all([leavesPromise, inLieuPromise]);
      
      // Handle leaves data
      if (leavesResult.error) {
        console.error('Error fetching leaves:', leavesResult.error);
        setError('Failed to fetch leave data: ' + leavesResult.error.message);
        setLoading(false);
        return;
      }
      
      const leaveData = leavesResult.data || [];
      console.log('Fetched leaves query result:', leavesResult);
      console.log('Fetched leaves:', leaveData.length, leaveData);
      setLeaves(leaveData);

      // Handle in-lieu data
      if (inLieuResult.error) {
        console.error('Error fetching in-lieu records:', inLieuResult.error);
        setError('Failed to fetch in-lieu data: ' + inLieuResult.error.message);
        setLoading(false);
        return;
      }
      
      const inLieuData = inLieuResult.data || [];
      console.log('Fetched in-lieu query result:', inLieuResult);
      console.log('Fetched in-lieu records:', inLieuData.length, inLieuData);
      setInLieuRecords(inLieuData);

      // NEW: Use the centralized leave service to calculate leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalanceResult = await leaveService.calculateLeaveBalance(userId, currentYear);
      
      if (leaveBalanceResult.error) {
        console.error('Error calculating leave balance:', leaveBalanceResult.error);
        setError('Failed to calculate leave balance: ' + leaveBalanceResult.error);
        setLoading(false);
        return;
      }
      
      // Set all the balance values from the service
      setBaseLeaveBalance(leaveBalanceResult.baseLeaveBalance);
      setAdditionalLeaveBalance(leaveBalanceResult.inLieuBalance);
      setLeaveBalance(leaveBalanceResult.baseLeaveBalance + leaveBalanceResult.inLieuBalance);
      setLeaveTaken(leaveBalanceResult.leaveTaken);
      
      console.log('Leave balance calculation from service:', {
        baseLeave: leaveBalanceResult.baseLeaveBalance,
        inLieuBalance: leaveBalanceResult.inLieuBalance,
        leaveTaken: leaveBalanceResult.leaveTaken,
        remainingBalance: leaveBalanceResult.remainingBalance
      });
      
      // Clear any previous success messages after a data refresh, unless preserveSuccess is true
      if (!preserveSuccess) {
        setSuccess(null);
      }
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setError('An unexpected error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !startDate || !endDate) return;

    setError(null);
    setSuccess(null);

    const days = calculateDays(startDate, endDate);
    const year = new Date(startDate).getFullYear();

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before start date');
      return;
    }

    // Validate against remaining leave
    if (!editingLeave && days > ((leaveBalance || 0) - leaveTaken)) {
      setError('Insufficient leave balance');
      return;
    }

    try {
      let leaveId;
      
      if (editingLeave) {
        // Update existing leave
        const { error: updateError } = await supabase
          .from('leaves')
          .update({
            start_date: startDate,
            end_date: endDate,
            days_taken: days,
            reason,
            leave_type: leaveType,
            year,
          })
          .eq('id', editingLeave.id);

        if (updateError) throw updateError;
        leaveId = editingLeave.id;
        setSuccess('Leave request updated successfully');
      } else {
        // Submit new leave
        const { data, error: insertError } = await supabase
          .from('leaves')
          .insert([{
            employee_id: employee.id,
            start_date: startDate,
            end_date: endDate,
            days_taken: days,
            reason,
            leave_type: leaveType,
            year,
            status: 'Approved',
          }])
          .select();

        if (insertError) throw insertError;
        
        if (data && data.length > 0) {
          leaveId = data[0].id;
        }
        
        setSuccess('Leave request submitted successfully');
      }

      // Also create shift overrides for each day in the leave period
      // (only for Annual leave type that would appear in the calendar)
      if (leaveType === 'Annual') {
        await createShiftOverridesForLeave(startDate, endDate);
      }

      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('Annual');
      setEditingLeave(null);

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting leave:', error);
      setError(error.message || 'Failed to submit leave request');
    }
  };

  // Helper function to create shift overrides for leave days
  const createShiftOverridesForLeave = async (start: string, end: string) => {
    try {
      // First check if shift_overrides table exists
      const { error: checkError } = await supabase
        .from('shift_overrides')
        .select('id')
        .limit(1);
        
        // If table doesn't exist, try to create it
        if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
          console.log('shift_overrides table does not exist, attempting to create it...');
          
          try {
            // Note: This requires you have sufficient privileges in Supabase
            // This is the SQL from the migration file
            const { error: createError } = await supabase.rpc('execute_sql', { 
              sql: `
              CREATE TABLE IF NOT EXISTS public.shift_overrides (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                employee_id UUID NOT NULL REFERENCES public.employees(id),
                date DATE NOT NULL,
                shift_type TEXT NOT NULL,
                source TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
                UNIQUE(employee_id, date)
              );
              
              ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;
              
              -- Users can read their own records
              CREATE POLICY "Users can read own shift_overrides"
              ON public.shift_overrides
              FOR SELECT
              TO authenticated
              USING (auth.uid() = employee_id);
              
              -- Users can insert their own records
              CREATE POLICY "Users can insert own shift_overrides"
              ON public.shift_overrides
              FOR INSERT
              TO authenticated
              WITH CHECK (auth.uid() = employee_id);
              
              -- Users can update their own records
              CREATE POLICY "Users can update own shift_overrides"
              ON public.shift_overrides
              FOR UPDATE
              TO authenticated
              USING (auth.uid() = employee_id)
              WITH CHECK (auth.uid() = employee_id);
              
              -- Users can delete their own records
              CREATE POLICY "Users can delete own shift_overrides"
              ON public.shift_overrides
              FOR DELETE
              TO authenticated
              USING (auth.uid() = employee_id);
              `
            });
            
            if (createError) {
              console.error('Failed to create shift_overrides table:', createError);
              return;
            }
            
            console.log('Successfully created shift_overrides table');
          } catch (createTableError) {
            console.error('Error creating shift_overrides table:', createTableError);
            console.log('Please run the SQL script from supabase/migrations/20240520_create_shift_overrides_table.sql in your Supabase project');
            return;
          }
        }
        
        // Create array of all days in the leave period
        const days = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        const currentDay = new Date(startDate);
        
        // Helper function for date formatting
        const formatDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        while (currentDay <= endDate) {
          days.push(formatDate(currentDay));
          currentDay.setDate(currentDay.getDate() + 1);
        }
        
        // Check which days already have overrides
        const { data: existingOverrides } = await supabase
          .from('shift_overrides')
          .select('date')
          .eq('employee_id', employee?.id || '')
          .in('date', days);
          
        const existingDates = (existingOverrides || []).map(o => o.date);
        
        // Create overrides for days that don't have them yet
        const newOverrides = [];
        
        for (const day of days) {
          // Skip if already has an override
          if (existingDates.includes(day)) continue;
          
          newOverrides.push({
            employee_id: employee?.id || '',
            date: day,
            shift_type: 'Leave',
            source: 'leave_page'
          });
        }
        
        // Insert new overrides in batch if any
        if (newOverrides.length > 0) {
          const { error } = await supabase
            .from('shift_overrides')
            .insert(newOverrides);
            
          if (error) throw error;
          
          console.log(`Created ${newOverrides.length} shift overrides for leave period`);
        }
    } catch (error) {
      console.error('Error creating shift overrides for leave:', error);
      // Don't block the main process if this fails
    }
  };

  // Add a helper function for date formatting (used in createShiftOverridesForLeave)
  const format = (date: Date, formatStr: string): string => {
    if (formatStr === 'yyyy-MM-dd') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Add more format options if needed
    return date.toISOString();
  };

  // Helper function to remove shift overrides for deleted leave
  const removeShiftOverridesForLeave = async (start: string | undefined, end: string | undefined) => {
    try {
      // Check if start and end dates are valid
      if (!start || !end) {
        console.log('Invalid start or end date for removing shift overrides');
        return;
      }
      
      // First check if shift_overrides table exists
      const { error: checkError } = await supabase
        .from('shift_overrides')
        .select('id')
        .limit(1);
        
      // If table doesn't exist, skip this step
      if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
        console.log('shift_overrides table does not exist, skipping removal');
        return;
      }
      
      // Create array of all days in the leave period
      const days = [];
      const startDate = new Date(start);
      const endDate = new Date(end);
      const currentDay = new Date(startDate);
      
      while (currentDay <= endDate) {
        days.push(format(currentDay, 'yyyy-MM-dd'));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      
      // Delete shift overrides that were created for this leave period
      // Only delete those with shift_type = 'Leave' to avoid removing other types of overrides
      const { error } = await supabase
        .from('shift_overrides')
        .delete()
        .eq('employee_id', employee?.id || '')
        .in('date', days)
        .eq('shift_type', 'Leave');
        
      if (error) throw error;

      // Get all affected months for proper invalidation
      const months = new Set(days.map(day => day.substring(0, 7))); // Get unique YYYY-MM
      
      // Invalidate queries for each affected month
      months.forEach(month => {
        queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee?.id, month] });
        queryClient.invalidateQueries({ queryKey: ['schedule', employee?.id, month] });
      });

      // Invalidate general queries
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      
      // Force immediate refetch of schedule data
      queryClient.refetchQueries({ queryKey: ['schedule'] });
      queryClient.refetchQueries({ queryKey: ['shift-overrides'] });
      
      console.log(`Removed shift overrides for leave period ${start} to ${end}`);
    } catch (error) {
      console.error('Error removing shift overrides for leave:', error);
      // Don't block the main process if this fails
    }
  };

  const handleDelete = async (leave: Leave) => {
    if (!confirm('Are you sure you want to delete this leave record?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      console.log('Attempting to delete leave:', leave.id);
      console.log('Leave record details:', leave);
      
      // Immediately remove from UI to provide instant feedback
      setLeaves(prevLeaves => prevLeaves.filter(l => l.id !== leave.id));
      
      // Recalculate leave taken for the current year
      const currentYear = new Date().getFullYear();
      const isCurrentYearLeave = leave.start_date 
        ? new Date(leave.start_date).getFullYear() === currentYear 
        : false;
      
      if (isCurrentYearLeave) {
        // Update leave taken for the current year
        setLeaveTaken(prev => {
          const newLeaveTaken = Math.max(0, prev - leave.days_taken);
          console.log(`Updating leave taken from ${prev} to ${newLeaveTaken} days after deleting ${leave.days_taken} days`);
          return newLeaveTaken;
        });

        // Log current leave balance state for debugging
        console.log('Current leave balance state:', {
          baseLeaveBalance,
          additionalLeaveBalance,
          totalLeaveBalance: leaveBalance,
          leaveTaken,
          remainingBefore: leaveBalance !== null ? leaveBalance - leaveTaken : null,
          remainingAfter: leaveBalance !== null ? leaveBalance - (leaveTaken - leave.days_taken) : null
        });
      }
      
      // Also remove any shift overrides for this leave period
      await removeShiftOverridesForLeave(leave.start_date, leave.end_date);
      
      // Attempt to delete the record with detailed logging
      console.log('Executing Supabase delete for leave ID:', leave.id);
      const deleteResponse = await supabase
        .from('leaves')
        .delete()
        .eq('id', leave.id);

      console.log('Delete response:', deleteResponse);

      if (deleteResponse.error) {
        console.error('Supabase Delete Error:', deleteResponse.error);
        setError(`Failed to delete leave: ${deleteResponse.error.message || 'Unknown error'}`);
        
        // Revert UI if deletion failed
        fetchData();
        setLoading(false);
        return;
      }

      // Log the count of affected rows to verify deletion worked
      console.log(`Deleted ${deleteResponse.count || 0} records`);
      
      if (!deleteResponse.count || deleteResponse.count === 0) {
        setError('Delete operation completed but no records were affected. The record may no longer exist or you may not have permission to delete it.');
        fetchData();
        setLoading(false);
        return;
      }

      // On successful deletion, set success message
      setSuccess('Leave deleted successfully');
      
      // Do a complete data refresh in the background to ensure consistency
      // but don't wait for it to complete
      fetchData(true);
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      setError(error.message || 'Failed to delete leave request');
      
      // Revert UI if deletion failed
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateYears = async () => {
    if (!employee) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update employee record with new years of service
      const { error: updateError } = await supabase
        .from('employees')
        .update({ years_of_service: yearsOfService })
        .eq('id', employee.id);
        
      if (updateError) throw updateError;
      
      setSuccess('Years of service updated successfully');
      setIsEditingYears(false);
      
      // Refresh data to update entitlements
      await fetchData(true);
    } catch (error: any) {
      console.error('Error updating years of service:', error);
      setError(error.message || 'Failed to update years of service');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (leave: Leave) => {
    setEditingLeave(leave);
    setStartDate(leave.start_date || '');
    setEndDate(leave.end_date || '');
    setReason(leave.reason || '');
    setLeaveType((leave.leave_type || 'Annual') as 'Annual' | 'Casual' | 'Sick' | 'Unpaid' | 'Compassionate');
    setShowInLieuForm(false);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingLeave(null);
    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('Annual');
  };

  // Define the missing refreshInLieuList function
  const refreshInLieuList = async () => {
    try {
      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('Auth error when refreshing in-lieu list:', userError);
        return;
      }

      // Fetch in-lieu records for the user
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userData.user.id)
        .order('start_date', { ascending: false });
      
      if (inLieuError) {
        console.error('Error fetching in-lieu records:', inLieuError);
        return;
      }
      
      // Update the state with the new in-lieu records
      setInLieuRecords(inLieuData || []);
      console.log('Refreshed in-lieu records:', inLieuData?.length || 0);
      
    } catch (error) {
      console.error('Error in refreshInLieuList:', error);
    }
  };

  // Update the handleInLieuOf function to remove the notes field
  const handleInLieuOf = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form from submitting and refreshing the page
    try {
      setIsSubmitting(true);
      
      // Get the current user session
      const session = await supabase.auth.getSession();
      
      if (!session?.data?.session) {
        throw new Error('No active session found');
      }
      
      // First create the in-lieu shift overrides
      console.log('Adding in-lieu time with auth session:', !!session.data.session);
      console.log('User ID:', session.data.session.user.id);
      
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      
      // Create an array of dates between start and end date (inclusive)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Verify we have valid dates
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Calculate months to invalidate for query refreshing
      const currentMonth = startDateObj.toISOString().substring(0, 7);
      const months = new Set([currentMonth]);
      
      // If date spans multiple months, add all affected months
      let tempDate = new Date(startDateObj);
      while (tempDate <= endDateObj) {
        months.add(tempDate.toISOString().substring(0, 7));
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      
      console.log("Will invalidate these months:", Array.from(months));
      
      // Create date array for all days in the range
      const dateArray = [];
      const tempDate2 = new Date(startDateObj);
      
      while (tempDate2 <= endDateObj) {
        dateArray.push(new Date(tempDate2).toISOString().split('T')[0]);
        tempDate2.setDate(tempDate2.getDate() + 1);
      }
      
      // Calculate the number of days and leave credit (2/3 day per in-lieu day)
      const daysCount = dateArray.length;
      const leaveAdded = parseFloat((daysCount * 0.667).toFixed(2));
      
      console.log(`Creating in-lieu record: ${daysCount} days (${leaveAdded} leave credit)`);
      
      // Create the in-lieu record without the notes field
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .insert([
          {
            employee_id: session.data.session.user.id,
            start_date: startDate,
            end_date: endDate,
            days_count: daysCount,
            leave_days_added: leaveAdded
          }
        ])
        .select();
      
      if (inLieuError) {
        console.error('Error adding in-lieu time:', inLieuError);
        throw new Error(`Error adding in-lieu time: ${inLieuError.message}`);
      }
      
      console.log('Successfully created in-lieu record:', inLieuData);
      
      // Now fetch existing shift overrides to avoid duplicates
      const { data: existingOverrides, error: fetchError } = await supabase
        .from('shift_overrides')
        .select('date')
        .eq('employee_id', session.data.session.user.id)
        .in('date', dateArray);
        
      if (fetchError) {
        console.error('Error fetching existing shift overrides:', fetchError);
        // Continue anyway, we'll handle conflicts with upsert
      }
      
      const existingDates = new Set((existingOverrides || []).map(o => o.date));
      console.log(`Found ${existingDates.size} existing shift overrides`);
      
      // Prepare shift overrides - create records for all dates and let upsert handle duplicates
      const shiftOverrides = dateArray.map(date => ({
        employee_id: session?.data?.session?.user?.id || '',
        date,
        shift_type: 'InLieu' as const,
        source: 'in_lieu_form'
      }));
      
      console.log('Creating shift overrides:', shiftOverrides?.length || 0);
      
      // Use upsert with onConflict strategy to handle duplicates
      const { data: shiftData, error: shiftError } = await supabase
        .from('shift_overrides')
        .upsert(shiftOverrides, { 
          onConflict: 'employee_id,date',
          ignoreDuplicates: true  // This will ignore rather than update existing records
        });
      
      if (shiftError) {
        console.error('Error adding shift overrides:', shiftError);
        
        // If we get a unique constraint error, we can continue since the in-lieu record is still valid
        if (shiftError.code === '23505') {
          console.log('Some shift overrides already exist. Continuing with in-lieu record creation.');
        } else {
          // For other errors, roll back the in-lieu record
          if (inLieuData?.[0]?.id) {
            console.log('Rolling back in-lieu record:', inLieuData[0].id);
            await supabase
              .from('in_lieu_records')
              .delete()
              .eq('id', inLieuData[0].id);
          }
          
          throw new Error(`Error adding shift overrides: ${shiftError.message}`);
        }
      } else {
        // Safely handle the shiftData response
        console.log('Successfully created shift overrides:', (shiftData ? (shiftData as unknown as any[]).length : 0));
      }
      
      // Force invalidate queries
      console.log('Invalidating queries for in-lieu period', startDate, 'to', endDate);
      
      // Add leave dates queries
      const queryKeys = Array.from(months).map(month => 
        ['shift-overrides', session?.data?.session?.user?.id || '', month]
      );
      
      // Trigger a full data refresh for all affected months
      await queryClient.invalidateQueries({ queryKey: ['leave-records', session?.data?.session?.user?.id || ''] });
      await queryClient.invalidateQueries({ queryKey: ['in-lieu-records', session?.data?.session?.user?.id || ''] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', session?.data?.session?.user?.id || ''] });
      
      // Invalidate shift overrides for all affected months
      for (const queryKey of queryKeys) {
        await queryClient.invalidateQueries({ queryKey });
      }
      
      // Clear form fields
      setStartDate('');
      setEndDate('');
      
      // Force a refresh of the calendar
      await refreshInLieuList();
      
      toast.success(`Added ${daysCount} days of in-lieu time`);
      
      // Close the in-lieu form
      setShowInLieuForm(false);
      
      // Refresh data to update UI
      fetchData(true);
      
    } catch (error: any) {
      console.error('Error in handleInLieuOf:', error);
      
      toast.error(error.message || 'Failed to add in-lieu time');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Create shift overrides for each day in the in-lieu date range
   */
  const createShiftOverridesForInLieu = async (startDate: Date, endDate: Date) => {
    if (!employee) {
      console.error('No employee data available for creating shift overrides');
      return;
    }
    
    try {
      // Generate all dates in the range
      const dates = eachDayOfInterval({ start: startDate, end: endDate });
      
      console.log(`Creating shift overrides for ${dates.length} days from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      
      // Check for existing overrides first to avoid duplicates
      const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
      
      const { data: existingOverrides, error: checkError } = await supabase
        .from('shift_overrides')
        .select('date')
        .eq('employee_id', employee.id)
        .in('date', dateStrings);
        
      if (checkError) throw checkError;
      
      // Filter out dates that already have overrides
      const existingDates = (existingOverrides || []).map(o => o.date);
      const newDates = dateStrings.filter(date => !existingDates.includes(date));
      
      console.log(`Found ${existingDates.length} existing overrides, creating ${newDates.length} new ones`);
      
      if (newDates.length === 0) {
        console.log('No new shift overrides needed - all dates already have overrides');
        return;
      }
      
      // Create new shift overrides
      const overrides = newDates.map(date => ({
        employee_id: employee.id,
        date,
        shift_type: 'InLieu' as ShiftType,
        source: 'in_lieu_page'
      }));
      
      // Insert new overrides
      const { error: insertError } = await supabase
        .from('shift_overrides')
        .insert(overrides);
        
      if (insertError) throw insertError;
      
      console.log(`Successfully created ${overrides.length} InLieu shift overrides`);
    } catch (error) {
      console.error('Error creating shift overrides for in-lieu time:', error);
      throw error;
    }
  };

  // Helper function to remove shift overrides for deleted in-lieu
  const removeShiftOverridesForInLieu = async (start: string, end: string) => {
    try {
      // First check if shift_overrides table exists
      const { error: checkError } = await supabase
        .from('shift_overrides')
        .select('id')
        .limit(1);
        
      // If table doesn't exist, skip this step
      if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
        console.log('shift_overrides table does not exist, skipping removal');
        return;
      }
      
      // Make sure we have a valid employee ID before proceeding
      if (!employee || !employee.id) {
        console.error('No employee ID available for removing shift overrides');
        return;
      }
      
      // Create array of all days in the in-lieu period
      const days = [];
      const startDate = new Date(start);
      const endDate = new Date(end);
      const currentDay = new Date(startDate);
      
      while (currentDay <= endDate) {
        days.push(format(currentDay, 'yyyy-MM-dd'));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      
      // Delete shift overrides that were created for this in-lieu period
      // Only delete those with shift_type = 'InLieu' to avoid removing other types of overrides
      const { error } = await supabase
        .from('shift_overrides')
        .delete()
        .eq('employee_id', employee.id)
        .in('date', days)
        .eq('shift_type', 'InLieu');
        
      if (error) throw error;
      
      // Invalidate schedule-related queries for all affected months
      const startMonth = format(startDate, 'yyyy-MM');
      const endMonth = format(endDate, 'yyyy-MM');
      
      // Invalidate the specific months affected
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id, startMonth] });
      if (startMonth !== endMonth) {
        queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id, endMonth] });
      }
      
      // Invalidate general queries
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      
      console.log(`Removed shift overrides for in-lieu period ${start} to ${end}`);
    } catch (error) {
      console.error('Error removing shift overrides for in-lieu:', error);
      // Don't block the main process if this fails
    }
  };

  const handleDeleteInLieu = async (record: InLieuRecord) => {
    if (!confirm('Are you sure you want to delete this in-lieu record?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Delete the record
      const { error: deleteError } = await supabase
        .from('in_lieu_records')
        .delete()
        .eq('id', record.id);

      if (deleteError) throw deleteError;
      
      // Also remove any shift overrides for this in-lieu period
      if (record.start_date && record.end_date) {
        await removeShiftOverridesForInLieu(record.start_date, record.end_date);
      }
      
      // Update UI immediately for better UX
      setInLieuRecords(prevRecords => prevRecords.filter(r => r.id !== record.id));
      
      // Update additional leave balance
      setAdditionalLeaveBalance(prev => {
        const newBalance = Math.max(0, prev - (record.leave_days_added || 0));
        return parseFloat(newBalance.toFixed(2));
      });
      
      setSuccess('In-lieu record deleted successfully');
      
      // Invalidate all relevant queries
      if (record.start_date && record.end_date && employee?.id) {
        const startMonth = format(new Date(record.start_date), 'yyyy-MM');
        const endMonth = format(new Date(record.end_date), 'yyyy-MM');
        
        // Invalidate the specific months affected
        queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
        queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id] });
        queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id, startMonth] });
        if (startMonth !== endMonth) {
          queryClient.invalidateQueries({ queryKey: ['shift-overrides', employee.id, endMonth] });
        }
        
        // Invalidate schedule data
        queryClient.invalidateQueries({ queryKey: ['schedule'] });
        queryClient.invalidateQueries({ queryKey: ['schedule', employee.id] });
        queryClient.invalidateQueries({ queryKey: ['schedule', employee.id, startMonth] });
        if (startMonth !== endMonth) {
          queryClient.invalidateQueries({ queryKey: ['schedule', employee.id, endMonth] });
        }
      }
      
      // Invalidate general queries
      queryClient.invalidateQueries({ queryKey: ['in-lieu'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      
      // Force refetch of all relevant queries
      queryClient.refetchQueries({ queryKey: ['schedule'] });
      queryClient.refetchQueries({ queryKey: ['shift-overrides'] });
      queryClient.refetchQueries({ queryKey: ['in-lieu'] });
      queryClient.refetchQueries({ queryKey: ['leaveBalance'] });
      
      // Full refresh in background
      await fetchData(true);
    } catch (error: any) {
      console.error('Error deleting in-lieu record:', error);
      setError(error.message || 'Failed to delete in-lieu record');
      
      // Revert UI state on error
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  // Add safe date formatting function
  const formatDateSafe = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Invalid date';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>Leave Management | SalaryCursor</title>
        </Head>
        
        <div className="space-y-6 animate-fadeIn">
          <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
            <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Leave Management</h1>
            <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
              Manage your leave requests and balance
            </p>
          </div>
          
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Leave Management | SalaryCursor</title>
      </Head>
      
      <div className="space-y-6 animate-fadeIn">
        <div className={`rounded-apple p-6 ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Leave Management</h1>
              <p className="mt-1 text-apple-gray dark:text-dark-text-secondary">
                Manage your leave requests and balance
              </p>
            </div>
            
            {/* Years of Service Edit */}
            <div className="mt-3 md:mt-0 flex items-center">
              <div className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} flex items-center space-x-3`}>
                <div className="flex flex-col">
                  <span className="text-xs text-apple-gray dark:text-dark-text-secondary">Years of Service</span>
                  {isEditingYears ? (
                    <div className="flex items-center mt-1">
                      <input
                        type="number"
                        value={yearsOfService}
                        onChange={(e) => setYearsOfService(parseInt(e.target.value) || 0)}
                        className={`w-16 px-2 py-1 rounded-md border text-sm ${
                          isDarkMode 
                            ? 'bg-dark-surface border-dark-border text-dark-text-primary focus:border-apple-blue' 
                            : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                        }`}
                      />
                      <div className="flex ml-2">
                        <button 
                          onClick={handleUpdateYears}
                          className="p-1 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-700"
                        >
                          <FiCheck size={14} />
                        </button>
                        <button 
                          onClick={() => setIsEditingYears(false)}
                          className="p-1 ml-1 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <span className="text-lg font-semibold text-apple-gray-dark dark:text-dark-text-primary">{yearsOfService}</span>
                      <button 
                        onClick={() => setIsEditingYears(true)}
                        className="ml-2 flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                      >
                        <FiEdit size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-10 border-l border-gray-200 dark:border-gray-700"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-apple-gray dark:text-dark-text-secondary">Affects Annual Entitlement</span>
                  <span className="text-lg font-semibold text-apple-gray-dark dark:text-dark-text-primary mt-1">
                    {yearsOfService >= 10 ? '24.67' : '18.67'} days
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className={`rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-apple-gray-lightest'} p-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Base Leave</h3>
                  <p className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary mt-1">
                    {baseLeaveBalance !== null ? baseLeaveBalance.toFixed(2) : '-'}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-dark-surface' : 'bg-white'}`}>
                  <FiCalendar className="w-5 h-5 text-apple-blue dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-2">
                Annual allocation based on your years of service
              </p>
            </div>
            
            <div className={`rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-apple-gray-lightest'} p-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-apple-gray dark:text-dark-text-secondary">In-Lieu Days</h3>
                  <p className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary mt-1">
                    {additionalLeaveBalance.toFixed(2)}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-dark-surface' : 'bg-white'}`}>
                  <FiCalendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-2">
                Additional days from {inLieuRecords.length} in-lieu records
              </p>
            </div>
            
            <div className={`rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-apple-gray-lightest'} p-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-apple-gray dark:text-dark-text-secondary">Leave Taken</h3>
                  <p className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary mt-1">
                    {leaveTaken.toFixed(2)}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-dark-surface' : 'bg-white'}`}>
                  <FiCalendar className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-2">
                Days used from {leaves.length} approved leave requests
              </p>
            </div>
            
            <div className={`rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} p-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Remaining Balance</h3>
                  <p className="text-2xl font-semibold text-blue-800 dark:text-blue-300 mt-1">
                    {remainingLeave !== null ? remainingLeave.toFixed(2) : '-'}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-800/30' : 'bg-white'}`}>
                  <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                Available days as of {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Status messages */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-apple">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-apple">
            {success}
          </div>
        )}
        
        {/* Leave Request and History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leave Request Form */}
          <div className={`lg:col-span-1 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-apple shadow-apple-card dark:shadow-dark-card p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">
                {showInLieuForm ? 'Add In-Lieu Time' : (editingLeave ? 'Edit Leave Request' : 'New Leave Request')}
              </h2>
              
              <button
                type="button"
                onClick={() => {
                  setShowInLieuForm(!showInLieuForm);
                  setEditingLeave(null);
                  setStartDate('');
                  setEndDate('');
                  setReason('');
                  setLeaveType('Annual');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDarkMode 
                    ? (showInLieuForm 
                        ? 'bg-dark-surface-light text-dark-text-primary border border-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700')
                    : (showInLieuForm
                        ? 'bg-gray-100 text-apple-gray-dark border border-gray-200'
                        : 'bg-apple-blue text-white hover:bg-apple-blue-hover')
                }`}
              >
                {showInLieuForm ? 'Back to Leave Form' : 'Add In-Lieu Time'}
              </button>
            </div>
            
            {/* Only show regular leave form if not showing in-lieu form */}
            {!showInLieuForm && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    required
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    rows={3}
                    placeholder="Enter reason for leave request (optional)"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  {editingLeave ? (
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${
                          isDarkMode
                            ? 'bg-dark-bg text-dark-text-primary hover:bg-dark-surface-light border border-gray-700'
                            : 'bg-white text-apple-gray-dark hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium bg-apple-blue hover:bg-apple-blue-hover text-white rounded-lg"
                      >
                        Update Leave
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium bg-apple-blue hover:bg-apple-blue-hover text-white rounded-lg"
                    >
                      Submit Leave Request
                    </button>
                  )}
                </div>
              </form>
            )}
            
            {/* In-Lieu Time form */}
            {showInLieuForm && (
              <form onSubmit={handleInLieuOf} className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary">
                    Use this form to record days worked outside normal hours that can be taken as leave later.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                        : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                    }`}
                    required
                  />
                </div>
                
                {/* Calculated Days and Credit Preview */}
                {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
                    <h4 className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-2">Preview</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-apple-gray dark:text-dark-text-secondary">Days Worked</p>
                        <p className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary">
                          {calculateDays(startDate, endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-apple-gray dark:text-dark-text-secondary">Leave Credit</p>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          {(calculateDays(startDate, endDate) * 0.667).toFixed(2)} days
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowInLieuForm(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        isDarkMode
                          ? 'bg-dark-bg text-dark-text-primary hover:bg-dark-surface-light border border-gray-700'
                          : 'bg-white text-apple-gray-dark hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium bg-apple-blue hover:bg-apple-blue-hover text-white rounded-lg"
                    >
                      Submit In-Lieu Time
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
          
          {/* Leave History and In-Lieu Records */}
          <div className={`lg:col-span-2 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-apple shadow-apple-card dark:shadow-dark-card p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Leave Records</h2>
              
              {/* Download Report Link */}
              {leaves.length > 0 && (
                <BlobProvider
                  document={
                    <LeavePDF 
                      employee={employee} 
                      leaveData={leaves} 
                      inLieuData={inLieuRecords} 
                      totalLeaveBalance={leaveBalance} 
                      leaveTaken={leaveTaken} 
                      remainingLeave={remainingLeave} 
                      year={new Date().getFullYear()} 
                    />
                  }
                >
                  {({ blob, url, loading, error }: PDFRenderProps) => (
                    <a
                      href={url || '#'}
                      download={`leave-report-${new Date().getFullYear()}.pdf`}
                      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-apple-blue hover:bg-apple-blue-hover text-white'
                      }`}
                      onClick={(e) => !url && e.preventDefault()}
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>{loading ? 'Generating...' : 'Download Report'}</span>
                    </a>
                  )}
                </BlobProvider>
              )}
            </div>
            
            {/* Tabs for Leave History and In-Lieu Records */}
            <div className="mb-6">
              <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl mb-6">
                <button
                  className={`flex-1 py-2 px-5 text-sm font-medium rounded-lg transition-all ${
                    !showInLieuForm
                      ? (isDarkMode 
                          ? 'bg-dark-surface text-blue-400 shadow-sm'
                          : 'bg-white text-apple-blue shadow-sm')
                      : (isDarkMode
                          ? 'text-dark-text-secondary hover:text-dark-text-primary'
                          : 'text-apple-gray hover:text-apple-gray-dark')
                  }`}
                  onClick={() => setShowInLieuForm(false)}
                >
                  Leave Requests
                </button>
                <button
                  className={`flex-1 py-2 px-5 text-sm font-medium rounded-lg transition-all ${
                    showInLieuForm
                      ? (isDarkMode 
                          ? 'bg-dark-surface text-blue-400 shadow-sm'
                          : 'bg-white text-apple-blue shadow-sm')
                      : (isDarkMode
                          ? 'text-dark-text-secondary hover:text-dark-text-primary'
                          : 'text-apple-gray hover:text-apple-gray-dark')
                  }`}
                  onClick={() => setShowInLieuForm(true)}
                >
                  In-Lieu Records
                </button>
              </div>
            </div>
            
            {/* Leave History Table */}
            {!showInLieuForm && (
              <>
                {leaves.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} text-xs uppercase`}>
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Date Range</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Days</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Type</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-dark-border">
                        {leaves.map((leave) => (
                          <tr key={leave.id} className={`${isDarkMode ? 'hover:bg-dark-bg' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-apple-gray-dark dark:text-dark-text-primary">
                                {formatDateSafe(leave.start_date)} to {formatDateSafe(leave.end_date)}
                              </div>
                              <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                                {leave.reason || 'No reason provided'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-apple-gray-dark dark:text-dark-text-primary">
                              {leave.days_taken}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                (() => {
                                  const leaveType = leave.leave_type as LeaveTypeValue | undefined;
                                  switch(leaveType) {
                                    case 'Annual': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
                                    case 'Sick': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                                    case 'Casual': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                                    case 'Unpaid': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
                                    case 'Compassionate': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
                                    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
                                  }
                                })()
                              }`}>
                                {leave.leave_type || 'Annual'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleEdit(leave)}
                                  className={`p-1.5 rounded-md ${
                                    isDarkMode
                                      ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-800/40'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}
                                  title="Edit"
                                >
                                  <FiEdit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(leave)}
                                  className={`p-1.5 rounded-md ${
                                    isDarkMode
                                      ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                  title="Delete"
                                >
                                  <FiTrash size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-apple-gray dark:text-dark-text-secondary">
                    <p>No leave records found.</p>
                    <p className="text-sm mt-1">Submit a new leave request to get started.</p>
                  </div>
                )}
              </>
            )}
            
            {/* In-Lieu Records Table */}
            {showInLieuForm && (
              <>
                {inLieuRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} text-xs uppercase`}>
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Date Range</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Days Worked</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Leave Added</th>
                          <th className="px-4 py-3 text-left font-medium text-apple-gray dark:text-dark-text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-dark-border">
                        {inLieuRecords.map((record) => (
                          <tr key={record.id} className={`${isDarkMode ? 'hover:bg-dark-bg' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-apple-gray-dark dark:text-dark-text-primary">
                                {formatDateSafe(record.start_date)} to {formatDateSafe(record.end_date)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-apple-gray-dark dark:text-dark-text-primary">
                              {record.days_count}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                                +{record.leave_days_added.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleDeleteInLieu(record)}
                                className={`p-1.5 rounded-md ${
                                  isDarkMode
                                    ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                                title="Delete"
                              >
                                <FiTrash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-apple-gray dark:text-dark-text-secondary">
                    <p>No in-lieu records found.</p>
                    <p className="text-sm mt-1">Add in-lieu time to increase your leave balance.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
