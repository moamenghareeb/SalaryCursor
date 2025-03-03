import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import type { Leave } from '../types';
import type { PublicHoliday } from '../types';
import PublicHolidayManager from '../components/PublicHolidayManager';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, BlobProvider } from '@react-pdf/renderer';

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
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveTaken, setLeaveTaken] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [yearsOfService, setYearsOfService] = useState<number>(0);
  const [isEditingYears, setIsEditingYears] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
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

      // Fetch all leaves
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', user.user.id)
        .order('start_date', { ascending: false });

      if (leaveError) throw leaveError;
      
      setLeaves(leaveData || []);

      // Fetch public holidays
      const { data: holidayData, error: holidayError } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('employee_id', user.user.id);

      if (holidayError) throw holidayError;

      // Calculate total days taken for current year
      const currentYearLeaves = (leaveData || []).filter(leave => {
        const leaveStartYear = new Date(leave.start_date).getFullYear();
        return leaveStartYear === currentYear;
      });
      
      const total = currentYearLeaves.reduce((sum, item) => sum + item.days_taken, 0);
      setLeaveTaken(total);

      // Calculate leave balance
      const initialLeaveBalance = 21; // Standard annual leave
      const takenLeave = total;
      const publicHolidayCredits = holidayData.reduce((sum, holiday) => sum + holiday.leave_credit, 0);
      
      setLeaveBalance(initialLeaveBalance - takenLeave + publicHolidayCredits);
      setPublicHolidays(holidayData || []);

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

      // Save public holidays
      if (publicHolidays.length > 0) {
        const { error: holidayError } = await supabase
          .from('public_holidays')
          .upsert(
            publicHolidays.map(holiday => ({
              employee_id: employee.id,
              date: holiday.date,
              description: holiday.description,
              leave_credit: 0.67
            })),
            { 
              onConflict: 'employee_id,date',
              ignoreDuplicates: true 
            }
          );

        if (holidayError) {
          console.error('Error saving public holidays:', holidayError);
          setError('Could not save public holidays');
        }
      }

      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setEditingLeave(null);
      setPublicHolidays([]);

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting leave:', error);
      setError(error.message || 'Failed to submit leave request');
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
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        setError('User not authenticated');
        return;
      }

      const { error: deleteError } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leave.id)
        .eq('employee_id', user.user.id);  // Add employee_id check for security

      if (deleteError) {
        console.error('Supabase Delete Error:', deleteError);
        setError(`Failed to delete leave: ${deleteError.message}`);
        return;
      }

      // Refresh data
      await fetchData();
      setSuccess('Leave deleted successfully');
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      setError(error.message || 'Failed to delete leave request');
    }
  };

  const handleLeaveBalanceUpdate = (additionalLeave: number) => {
    setLeaveBalance(prev => prev + additionalLeave);
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

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Annual Leave Entitlement</p>
                <p className="text-lg font-medium mt-1">{leaveBalance} days</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Leave Taken This Year</p>
                <p className="text-lg font-medium mt-1">{leaveTaken} days</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Remaining Leave</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {((leaveBalance || 0) - leaveTaken).toFixed(2)} days
                </p>
              </div>

              {/* Public Holidays Section */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-600">Public Holidays Worked</p>
                </div>

                {publicHolidays.map((holiday, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="date"
                      value={holiday.date}
                      onChange={(e) => {
                        const newPublicHolidays = [...publicHolidays];
                        newPublicHolidays[index] = {
                          ...newPublicHolidays[index],
                          date: e.target.value
                        };
                        setPublicHolidays(newPublicHolidays);
                      }}
                      className="w-1/2 p-1 border rounded text-xs"
                    />

                    <input
                      type="text"
                      placeholder="Description (Optional)"
                      value={holiday.description || ''}
                      onChange={(e) => {
                        const newPublicHolidays = [...publicHolidays];
                        newPublicHolidays[index] = {
                          ...newPublicHolidays[index],
                          description: e.target.value
                        };
                        setPublicHolidays(newPublicHolidays);
                      }}
                      className="w-1/2 p-1 border rounded text-xs"
                    />
                  </div>
                ))}

                <div className="mt-2">
                  <p className="text-xs text-gray-600">
                    Public Holidays: {publicHolidays.length} 
                    <span className="ml-2 text-green-600">
                      +{(publicHolidays.length * 0.67).toFixed(2)} days
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              {editingLeave ? 'Edit Leave Request' : 'Submit Leave Request'}
            </h2>

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
                >
                  {editingLeave ? 'Update Leave' : 'Submit Leave'}
                </button>

                {editingLeave && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full sm:w-auto bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-700"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
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
        </div>

        {/* Public Holiday Manager */}
        {employee && (
          <PublicHolidayManager
            employeeId={employee.id}
            currentYear={currentYear}
            onLeaveBalanceUpdate={handleLeaveBalanceUpdate}
          />
        )}
      </div>
    </Layout>
  );
}
