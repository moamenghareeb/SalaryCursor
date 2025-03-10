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

// Extend the Employee type to include annual_leave_balance
interface Employee extends BaseEmployee {
  annual_leave_balance: number;
  leave_balance?: number; // For backward compatibility
}

// Extend the InLieuRecord type to include status
interface InLieuRecord extends BaseInLieuRecord {
  status?: string; // Add optional status property
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

      // Calculate base leave balance based on years of service
      const baseLeave = employeeData.years_of_service >= 10 ? 24.67 : 18.67;
      
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
      
      // IMPORTANT: Check if the employee's database balance doesn't match the actual records
      // If no in-lieu records exist but balance is not 0, reset it to 0 in database
      if (inLieuData.length === 0 && employeeData.annual_leave_balance > 0) {
        console.log('No in-lieu records found but balance is not 0, resetting to 0');
        // Reset the employee's annual_leave_balance to 0
        const { error: resetError } = await supabase
          .from('employees')
          .update({ annual_leave_balance: 0 })
          .eq('id', userId);
        
        if (resetError) {
          console.error('Error resetting leave balance:', resetError);
        } else {
          console.log('Successfully reset leave balance to 0');
          // Update local value to match database
          employeeData.annual_leave_balance = 0;
        }
      }
      
      // Add any additional leave balance from in-lieu time
      const additionalLeave = Number(employeeData.annual_leave_balance || 0);
      const totalLeaveBalance = baseLeave + additionalLeave;
      
      // Set the various leave balances
      setBaseLeaveBalance(baseLeave);
      setAdditionalLeaveBalance(additionalLeave);
      setLeaveBalance(totalLeaveBalance);
      console.log('Leave balance calculation:', {
        baseLeave,
        additionalLeave,
        totalLeaveBalance,
        employeeBalance: employeeData.annual_leave_balance,
        inLieuRecordCount: inLieuData.length
      });

      // Calculate total days taken for current year
      const currentYear = new Date().getFullYear();
      const currentYearLeaves = leaveData.filter(leave => 
        new Date(leave.start_date).getFullYear() === currentYear
      );
      
      const total = currentYearLeaves.reduce((sum, item) => sum + item.days_taken, 0);
      console.log('Leave taken this year calculation:', {
        currentYear,
        currentYearLeaves,
        total,
        remaining: totalLeaveBalance - total
      });
      setLeaveTaken(total);
      
      // Clear any previous success messages after a data refresh, unless preserveSuccess is true
      if (!preserveSuccess) {
        setSuccess(null);
      }
      
      setLoading(false);
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
            year,
          }]);

        if (insertError) throw insertError;
        setSuccess('Leave request submitted successfully');
      }

      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
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
  };

  const handleCancelEdit = () => {
    setEditingLeave(null);
    setStartDate('');
    setEndDate('');
    setReason('');
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
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">Leave Management</h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            Manage your leave requests and balance
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className={`p-6 rounded-apple ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'} shadow-apple-card dark:shadow-dark-card`}>
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'} rounded-apple shadow-apple-card dark:shadow-dark-card p-6`}>
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Leave Balance</h2>
                    
                    <div className="flex items-center space-x-2">
                      {employee?.hire_date && (
                        <div className="bg-apple-blue-lightest dark:bg-dark-accent-light text-apple-blue dark:text-dark-accent px-3 py-1 rounded-full text-xs font-medium">
                          {isEditingYears ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={yearsOfService}
                                onChange={(e) => setYearsOfService(parseInt(e.target.value) || 0)}
                                className="w-12 px-2 py-1 rounded-lg border border-gray-200 dark:border-dark-border focus:border-apple-blue focus:ring-1 focus:ring-apple-blue outline-none"
                              />
                              <button 
                                onClick={handleUpdateYears}
                                className="text-green-500 hover:text-green-600"
                              >
                                <FiCheck size={16} />
                              </button>
                              <button 
                                onClick={() => setIsEditingYears(false)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <span>{yearsOfService} Years of Service</span>
                              <button 
                                onClick={() => setIsEditingYears(true)}
                                className="text-apple-blue dark:text-dark-accent hover:text-apple-blue-hover"
                              >
                                <FiEdit size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} rounded-apple p-4`}>
                      <h3 className="text-sm text-apple-gray dark:text-dark-text-secondary mb-1">Base Leave</h3>
                      <div className="text-xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
                        {baseLeaveBalance !== null ? baseLeaveBalance.toFixed(2) : '-'} days
                      </div>
                      <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                        Annual allocation
                      </div>
                    </div>
                    
                    <div className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} rounded-apple p-4`}>
                      <h3 className="text-sm text-apple-gray dark:text-dark-text-secondary mb-1">In-Lieu Days</h3>
                      <div className="text-xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
                        {additionalLeaveBalance.toFixed(2)} days
                      </div>
                      <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                        From {inLieuRecords.length} records
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} rounded-apple p-4`}>
                      <h3 className="text-sm text-apple-gray dark:text-dark-text-secondary mb-1">Leave Taken</h3>
                      <div className="text-xl font-medium text-apple-gray-dark dark:text-dark-text-primary">
                        {leaveTaken.toFixed(2)} days
                      </div>
                      <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                        From {leaves.length} leave requests
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className={`${isDarkMode ? 'bg-dark-accent-light' : 'bg-apple-blue-lightest'} rounded-apple p-4`}>
                      <h3 className="text-sm text-apple-blue dark:text-dark-accent mb-1">Remaining Leave</h3>
                      <div className="text-xl font-medium text-apple-blue dark:text-dark-accent">
                        {remainingLeave !== null ? remainingLeave.toFixed(2) : '-'} days
                      </div>
                      <div className="text-xs text-apple-gray dark:text-dark-text-tertiary mt-1">
                        As of {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Leave Request Card */}
            <div className="md:col-span-2 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Leave Request</h2>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInLieuForm(!showInLieuForm)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80' 
                        : 'bg-apple-gray-light text-apple-gray-dark hover:bg-gray-200'
                    }`}
                  >
                    {showInLieuForm ? 'Cancel In-Lieu Entry' : 'Add In-Lieu Time'}
                  </button>
                </div>
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
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
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
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
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
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        isDarkMode
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                          : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                      }`}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    {editingLeave ? (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={`px-4 py-2 rounded-md ${
                            isDarkMode
                              ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80'
                              : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
                        >
                          Update Leave
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
                      >
                        Submit Leave
                      </button>
                    )}
                  </div>
                </form>
              )}
              
              {/* In-Lieu Time form */}
              {showInLieuForm && (
                <form onSubmit={handleInLieuOf} className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-apple-gray-dark dark:text-dark-text-primary">Add In-Lieu Time</h3>
                    <p className="text-sm text-apple-gray dark:text-dark-text-secondary mt-1">
                      Use this form to record days worked outside normal hours that can be taken as leave later.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">Date Worked</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
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
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        isDarkMode
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary focus:border-apple-blue'
                          : 'border-gray-200 focus:border-apple-blue focus:ring-1 focus:ring-apple-blue'
                      }`}
                      rows={3}
                      required
                      placeholder="Why did you work on this day? (e.g. weekend emergency, public holiday coverage)"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowInLieuForm(false)}
                        className={`px-4 py-2 rounded-md ${
                          isDarkMode
                            ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80'
                            : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                      >
                        Submit In-Lieu
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Leave History Section */}
            <div className={`mt-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-apple shadow-apple-card dark:shadow-dark-card p-6`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">Leave History</h2>
                
                {leaves.length > 0 && (
                  <div className="flex items-center">
                    <PDFDownloadLink
                      document={<LeavePDF employee={employee} leaveData={leaves} inLieuData={inLieuRecords} totalLeaveBalance={leaveBalance} leaveTaken={leaveTaken} remainingLeave={remainingLeave} year={new Date().getFullYear()} />}
                      fileName={`Leave-Report-${new Date().getFullYear()}.pdf`}
                    >
                      {({ loading }) => (
                        <button
                          className={`flex items-center px-4 py-2 rounded-md text-sm ${
                            isDarkMode 
                              ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80' 
                              : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
                          }`}
                          disabled={loading}
                        >
                          <FiDownload className="mr-2" />
                          {loading ? 'Generating...' : 'Download Report'}
                        </button>
                      )}
                    </PDFDownloadLink>
                  </div>
                )}
              </div>
              
              {/* Display success message if present */}
              {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md">
                  {success}
                </div>
              )}
              
              {/* Leave table */}
              {leaves.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} border-b dark:border-dark-border`}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Date Range
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Days
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-dark-border">
                      {leaves.map((leave) => (
                        <tr key={leave.id} className={`${isDarkMode ? 'hover:bg-dark-bg' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 text-sm text-apple-gray-dark dark:text-dark-text-primary">
                            {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-apple-gray-dark dark:text-dark-text-primary">
                            {leave.days_taken}
                          </td>
                          <td className="px-4 py-3 text-sm text-apple-gray-dark dark:text-dark-text-primary">
                            {leave.reason || 'No reason provided'}
                          </td>
                          <td className="px-4 py-3 text-sm space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEdit(leave)}
                              className="text-apple-blue dark:text-dark-accent hover:text-apple-blue-hover"
                              title="Edit"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(leave)}
                              className="text-red-500 hover:text-red-600"
                              title="Delete"
                            >
                              <FiTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-8 ${isDarkMode ? 'text-dark-text-secondary' : 'text-apple-gray'}`}>
                  No leave records found for the current year.
                </div>
              )}
            </div>
            
            {/* In-Lieu Records Section */}
            <div className={`mt-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-apple shadow-apple-card dark:shadow-dark-card p-6`}>
              <h2 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary mb-4">In-Lieu Records</h2>
              
              {/* In-lieu table */}
              {inLieuRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} border-b dark:border-dark-border`}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-apple-gray dark:text-dark-text-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-dark-border">
                      {inLieuRecords.map((record) => (
                        <tr key={record.id} className={`${isDarkMode ? 'hover:bg-dark-bg' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 text-sm text-apple-gray-dark dark:text-dark-text-primary">
                            {new Date(record.start_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-apple-gray-dark dark:text-dark-text-primary">
                            {record.reason || 'No reason provided'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.status === 'approved' 
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                                : record.status === 'pending' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' 
                                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                            }`}>
                              {record.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleDeleteInLieu(record)}
                              className="text-red-500 hover:text-red-600"
                              title="Delete"
                            >
                              <FiTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-8 ${isDarkMode ? 'text-dark-text-secondary' : 'text-apple-gray'}`}>
                  No in-lieu records found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
