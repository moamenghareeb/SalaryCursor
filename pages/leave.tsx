import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import type { Employee as BaseEmployee, Leave } from '../types';
import type { InLieuRecord as BaseInLieuRecord } from '../types';
import type { Leave as LeaveType } from '../types/models';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider, pdf } from '@react-pdf/renderer';
import Head from 'next/head';
import { FiDownload, FiCalendar, FiEdit, FiTrash, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { leaveService } from '../lib/leaveService';

// Extend the Employee type to include annual_leave_balance and hire_date
interface Employee extends BaseEmployee {
  annual_leave_balance: number;
  leave_balance?: number; // For backward compatibility
  hire_date: Date;
}

// Extend the InLieuRecord type to include status and reason
interface InLieuRecord extends BaseInLieuRecord {
  status?: string;
  reason?: string;
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
        setSuccess('Leave request updated successfully');
      } else {
        // Submit new leave
        const { error: insertError } = await supabase
          .from('leaves')
          .insert([{
            employee_id: employee.id,
            start_date: startDate,
            end_date: endDate,
            days_taken: days,
            reason,
            leave_type: leaveType,
            year,
          }]);

        if (insertError) throw insertError;
        setSuccess('Leave request submitted successfully');
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

  // Function to handle In-Lieu Of submission
  const handleInLieuOf = async () => {
    if (!employee || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Calculate days between dates
      const days = calculateDays(startDate, endDate);
      
      // Calculate additional leave balance (0.667 days per day)
      const additionalBalance = Number((days * 0.667).toFixed(2));

      // First get the current balance
      const { data: currentEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('annual_leave_balance')
        .eq('id', employee.id)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new balance, ensuring we handle null values properly
      const currentBalance = Number(currentEmployee.annual_leave_balance || 0);
      const newBalance = currentBalance + additionalBalance;
      
      console.log('In-lieu calculation:', {
        currentBalance,
        additionalBalance,
        newBalance,
        days
      });

      // Update the leave balance in the database
      const { data, error } = await supabase
        .from('employees')
        .update({ annual_leave_balance: newBalance })
        .eq('id', employee.id)
        .select()
        .single();

      if (error) throw error;

      // Record the in-lieu addition
      const { error: recordError } = await supabase
        .from('in_lieu_records')
        .insert({
          employee_id: employee.id,
          start_date: startDate,
          end_date: endDate,
          days_count: days,
          leave_days_added: additionalBalance
        });

      if (recordError) throw recordError;

      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setShowInLieuForm(false);
      
      // Properly refresh all data including leave balance
      await fetchData();
      
      setSuccess(`Successfully added ${additionalBalance} days to your leave balance`);
    } catch (error: any) {
      console.error('Error adding in-lieu days:', error);
      setError(error.message || 'Failed to add in-lieu days');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (leave: Leave) => {
    setEditingLeave(leave);
    setStartDate(leave.start_date);
    setEndDate(leave.end_date);
    setReason(leave.reason);
    setLeaveType(leave.leave_type || 'Annual');
  };

  const handleCancelEdit = () => {
    setEditingLeave(null);
    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('Annual');
  };

  const handleUpdateYears = async () => {
    if (!employee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({ years_of_service: yearsOfService })
        .eq('id', employee.id);

      if (error) throw error;

      setIsEditingYears(false);
      await fetchData();
    } catch (error) {
      console.error('Error updating years of service:', error);
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
      const isCurrentYearLeave = new Date(leave.start_date).getFullYear() === currentYear;
      
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

  const handleDeleteInLieu = async (record: InLieuRecord) => {
    if (!confirm(`Are you sure you want to delete this in-lieu record? This will reduce your leave balance by ${record.leave_days_added} days.`)) {
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

      console.log('Attempting to delete in-lieu record:', record.id);
      console.log('In-lieu record details:', record);
      
      // Check if this is the last in-lieu record
      const isLastRecord = inLieuRecords.length === 1;
      
      // Immediately remove from UI for instant feedback
      setInLieuRecords(prevRecords => prevRecords.filter(r => r.id !== record.id));
      
      // Use an API endpoint to handle this as a transaction
      // If you don't have an API endpoint, we'll do it directly but risks inconsistency
      
      // Step 1: Get current balance
      const { data: currentEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('annual_leave_balance')
        .eq('id', user.user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching employee record:', fetchError);
        setError(`Cannot fetch employee record: ${fetchError.message}`);
        
        // Revert UI if update process failed
        fetchData();
        setLoading(false);
        return;
      }

      // Step 2: Calculate new balance, ensuring it doesn't go below 0
      const currentBalance = Number(currentEmployee.annual_leave_balance || 0);
      const newBalance = Math.max(0, currentBalance - record.leave_days_added);
      
      console.log('In-lieu deletion calculation:', {
        currentBalance, 
        daysToRemove: record.leave_days_added,
        newBalance,
        isLastRecord
      });

      // If this is the last record, force new balance to be exactly 0
      const finalBalance = isLastRecord ? 0 : newBalance;

      // Immediately update the leave balance in the UI for instant feedback
      setAdditionalLeaveBalance(finalBalance);
      setLeaveBalance((baseLeaveBalance || 0) + finalBalance);

      // Step 3: Delete the in-lieu record FIRST with detailed logging
      console.log('Executing Supabase delete for in-lieu ID:', record.id);
      const deleteResponse = await supabase
        .from('in_lieu_records')
        .delete()
        .eq('id', record.id);

      console.log('Delete response:', deleteResponse);

      if (deleteResponse.error) {
        console.error('Error deleting in-lieu record:', deleteResponse.error);
        setError(`Failed to delete in-lieu record: ${deleteResponse.error.message || 'Unknown error'}`);
        
        // Revert UI if deletion failed
        fetchData();
        setLoading(false);
        return;
      }
      
      // Log the count of affected rows to verify deletion worked
      console.log(`Deleted ${deleteResponse.count || 0} in-lieu records`);
      
      if (!deleteResponse.count || deleteResponse.count === 0) {
        setError('Delete operation completed but no records were affected. The record may no longer exist or you may not have permission to delete it.');
        fetchData();
        setLoading(false);
        return;
      }

      // Step 4: Update the leave balance
      console.log('Updating employee leave balance to:', finalBalance);
      const updateResponse = await supabase
        .from('employees')
        .update({ annual_leave_balance: finalBalance })
        .eq('id', user.user.id);

      console.log('Update response:', updateResponse);

      if (updateResponse.error) {
        console.error('Error updating balance:', updateResponse.error);
        // Critical error: Record deleted but balance not updated
        setError(`CRITICAL ERROR: Record was deleted but leave balance could not be updated: ${updateResponse.error.message || 'Unknown error'}. Please contact an administrator.`);
        
        // Even in critical error, refresh data to show current state
        fetchData();
        setLoading(false);
        return;
      }

      // Set success message
      setSuccess('In-lieu record deleted successfully');
      
      // Do a complete data refresh in the background to ensure consistency
      fetchData(true);
    } catch (error: any) {
      console.error('Error deleting in-lieu record:', error);
      setError(error.message || 'Failed to delete in-lieu record');
      
      // Revert UI if deletion failed
      fetchData();
    } finally {
      setLoading(false);
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
                        className="ml-2 text-apple-blue dark:text-blue-400 hover:text-apple-blue-hover"
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
                    placeholder="Why did you work on this day? (e.g. weekend emergency, public holiday coverage)"
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
            <div className="border-b border-gray-200 dark:border-dark-border mb-6">
              <div className="flex">
                <button
                  className={`pb-3 px-5 text-sm font-medium transition-colors relative ${
                    !showInLieuForm
                      ? (isDarkMode 
                          ? 'text-blue-400'
                          : 'text-apple-blue')
                      : (isDarkMode
                          ? 'text-dark-text-secondary hover:text-dark-text-primary'
                          : 'text-apple-gray hover:text-apple-gray-dark')
                  }`}
                  onClick={() => setShowInLieuForm(false)}
                >
                  Leave Requests
                  {!showInLieuForm && (
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 ${
                      isDarkMode ? 'bg-blue-500' : 'bg-apple-blue'
                    }`}></span>
                  )}
                </button>
                <button
                  className={`pb-3 px-5 text-sm font-medium transition-colors relative ${
                    showInLieuForm
                      ? (isDarkMode 
                          ? 'text-blue-400'
                          : 'text-apple-blue')
                      : (isDarkMode
                          ? 'text-dark-text-secondary hover:text-dark-text-primary'
                          : 'text-apple-gray hover:text-apple-gray-dark')
                  }`}
                  onClick={() => setShowInLieuForm(true)}
                >
                  In-Lieu Records
                  {showInLieuForm && (
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 ${
                      isDarkMode ? 'bg-blue-500' : 'bg-apple-blue'
                    }`}></span>
                  )}
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
                                {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
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
                                leave.leave_type === 'Annual' 
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                                  : leave.leave_type === 'Sick'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                    : leave.leave_type === 'Casual'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
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
                                {new Date(record.start_date).toLocaleDateString()} to {new Date(record.end_date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                                {record.reason || 'No reason provided'}
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
