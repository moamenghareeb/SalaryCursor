import React from 'react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import type { Employee as BaseEmployee, Leave, InLieuRecord } from '../types';
import type { Leave as LeaveType } from '../types/models';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider } from '@react-pdf/renderer';

// Extend the Employee type to include annual_leave_balance
interface Employee extends BaseEmployee {
  annual_leave_balance: number;
  leave_balance?: number; // For backward compatibility
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
const LeavePDF = ({ employee, leaveData, totalLeaveBalance, leaveTaken, remainingLeave, year }: any) => (
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
      
      <View style={styles.summaryContainer}>
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) return;

      // Fetch employee details
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (employeeError) throw employeeError;
      
      setEmployee(employeeData);
      setYearsOfService(employeeData.years_of_service);

      // Calculate base leave balance based on years of service
      const baseLeave = employeeData.years_of_service >= 10 ? 24.67 : 18.67;
      
      // Add any additional leave balance from in-lieu time
      const additionalLeave = Number(employeeData.annual_leave_balance) || 0;
      const totalLeaveBalance = baseLeave + additionalLeave;
      
      // Set the various leave balances
      setBaseLeaveBalance(baseLeave);
      setAdditionalLeaveBalance(additionalLeave);
      setLeaveBalance(totalLeaveBalance);
      console.log('Total leave balance:', totalLeaveBalance, 'Base:', baseLeave, 'Additional:', employeeData.annual_leave_balance);

      // Fetch all leaves
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', user.user.id)
        .order('start_date', { ascending: false });

      if (leaveError) throw leaveError;
      
      setLeaves(leaveData || []);

      // Fetch in-lieu records
      const { data: inLieuData, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', user.user.id)
        .order('created_at', { ascending: false });

      if (inLieuError) throw inLieuError;
      
      setInLieuRecords(inLieuData || []);

      // Calculate total days taken for current year
      const currentYear = new Date().getFullYear();
      const currentYearLeaves = (leaveData || []).filter(leave => {
        const leaveStartYear = new Date(leave.start_date).getFullYear();
        return leaveStartYear === currentYear;
      });
      
      const total = currentYearLeaves.reduce((sum, item) => sum + item.days_taken, 0);
      setLeaveTaken(total);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      
      // First, check if we can read the record (to verify it exists and we have access)
      const { data: leaveData, error: readError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', leave.id)
        .eq('employee_id', user.user.id)
        .single();
        
      if (readError) {
        console.error('Error verifying leave record:', readError);
        setError(`Cannot verify leave record: ${readError.message}`);
        setLoading(false);
        return;
      }
      
      if (!leaveData) {
        setError('Leave record not found or you do not have permission to delete it');
        setLoading(false);
        return;
      }

      // Attempt to delete the record
      const { error: deleteError } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leave.id);

      if (deleteError) {
        console.error('Supabase Delete Error:', deleteError);
        setError(`Failed to delete leave: ${deleteError.message}`);
        setLoading(false);
        return;
      }

      // Refresh data
      await fetchData();
      setSuccess('Leave deleted successfully');
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      setError(error.message || 'Failed to delete leave request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Annual Leave Management</h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Leave Balance</h2>
              <button
                onClick={() => setIsEditingYears(!isEditingYears)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit Years of Service
              </button>
            </div>

            <div className="space-y-4">
              {isEditingYears ? (
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={yearsOfService}
                    onChange={(e) => setYearsOfService(parseFloat(e.target.value) || 0)}
                    className="w-24 p-2 border rounded"
                    min="0"
                    step="0.1"
                  />
                  <button
                    onClick={handleUpdateYears}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingYears(false);
                      setYearsOfService(employee?.years_of_service || 0);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Years of Service</p>
                  <p className="text-lg font-medium mt-1">{yearsOfService} years</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Annual Leave Balance</h3>
                  <div className="text-3xl font-bold text-blue-700">
                    {leaveBalance !== null ? leaveBalance.toFixed(2) : '-'} days
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    <div>Base: {baseLeaveBalance !== null ? baseLeaveBalance.toFixed(2) : '-'} days</div>
                    {additionalLeaveBalance > 0 && (
                      <div className="font-medium">+{additionalLeaveBalance.toFixed(2)} in-lieu days</div>
                    )}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 mb-2">Leave Taken (This Year)</h3>
                  <div className="text-3xl font-bold text-green-700">{leaveTaken} days</div>
                  <div className="text-sm text-green-600 mt-1">
                    From {leaves.length} leave requests
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-900 mb-2">Remaining Leave</h3>
                  <div className="text-3xl font-bold text-purple-700">
                    {leaveBalance !== null ? (leaveBalance - leaveTaken).toFixed(2) : '-'} days
                  </div>
                  <div className="text-sm text-purple-600 mt-1">
                    As of {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Leave Request</h2>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInLieuForm(!showInLieuForm)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  {showInLieuForm ? 'Cancel In-Lieu Entry' : 'Add In-Lieu Time'}
                </button>
              </div>
            </div>
            
            {/* Only show regular leave form if not showing in-lieu form */}
            {!showInLieuForm && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 border rounded text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 border rounded text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border rounded text-base"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700"
                    disabled={loading}
                  >
                    {editingLeave ? 'Update Leave' : 'Submit Leave'}
                  </button>

                  {editingLeave && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-700"
                      disabled={loading}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            )}
            
            {/* In-Lieu Form */}
            {showInLieuForm && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-green-800 mb-3">Record In-Lieu Time</h3>
                <p className="text-sm text-green-700 mb-3">
                  Record days you worked (e.g., on holidays or weekends) to convert to leave days. 
                  Each day worked adds 0.667 days to your leave balance.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days to be Added</label>
                  <div className="p-2 bg-white border border-gray-300 rounded">
                    {startDate && endDate ? 
                      `${(calculateDays(startDate, endDate) * 0.667).toFixed(2)} days will be added to your balance` : 
                      'Select dates to calculate'
                    }
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleInLieuOf}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-green-700"
                  disabled={loading}
                >
                  Submit In-Lieu Time
                </button>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Leave History</h2>
              <div className="text-sm text-gray-500">
                Showing all leave requests
              </div>
            </div>

            {leaves.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaves.map((leave) => {
                        const startDate = new Date(leave.start_date);
                        const endDate = new Date(leave.end_date);
                        const isPast = endDate < new Date();
                        const isOngoing = startDate <= new Date() && endDate >= new Date();
                        
                        return (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-sm">{leave.year}</td>
                            <td className="px-3 py-3 text-sm">
                              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                            </td>
                            <td className="px-3 py-3 text-sm">{leave.days_taken}</td>
                            <td className="px-3 py-3 text-sm">{leave.reason}</td>
                            <td className="px-3 py-3 text-sm">
                              {isPast ? (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  Past
                                </span>
                              ) : isOngoing ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Ongoing
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  Upcoming
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              {true && (
                                <>
                                  <button
                                    onClick={() => handleEdit(leave)}
                                    className="text-blue-600 hover:text-blue-800 font-medium mr-2"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(leave)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No leave history available.</p>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mt-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">In-Lieu Records</h2>
              <div className="text-sm text-gray-500">
                Showing all in-lieu time recorded
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates Worked</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Worked</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Days Added</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inLieuRecords.length > 0 ? (
                    inLieuRecords.map((record) => {
                      const startDate = new Date(record.start_date);
                      const endDate = new Date(record.end_date);
                      const createdDate = new Date(record.created_at);
                      
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm">
                            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3 text-sm">{record.days_count}</td>
                          <td className="px-3 py-3 text-sm">{record.leave_days_added}</td>
                          <td className="px-3 py-3 text-sm">{createdDate.toLocaleDateString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-center text-gray-500">
                        No in-lieu records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
