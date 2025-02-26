import React from 'react';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { Leave as LeaveType } from '../types';
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
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [days, setDays] = useState<number | null>(null);
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveData, setLeaveData] = useState<LeaveType[]>([]);
  const [totalLeaveBalance, setTotalLeaveBalance] = useState(0);
  const [leaveTaken, setLeaveTaken] = useState(0);
  const [remainingLeave, setRemainingLeave] = useState(0);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    if (employee) {
      fetchLeaveData();
    }
  }, [employee, year]);

  const fetchEmployeeData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) return;
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', userData.user.email)
        .single();
        
      if (error) throw error;
      
      setEmployee(data);
      
      // Calculate leave balance based on years of service
      const leaveBalance = data.years_of_service >= 10 ? 24.67 : 18.67;
      setTotalLeaveBalance(leaveBalance);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setLoading(false);
    }
  };

  const fetchLeaveData = async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', employee!.id)
        .eq('year', year)
        .order('month', { ascending: true });
        
      if (error) throw error;
      
      setLeaveData(data || []);
      
      // Calculate total leave taken
      const totalTaken = data ? data.reduce((sum, item) => sum + item.days_taken, 0) : 0;
      setLeaveTaken(totalTaken);
      
      // Calculate remaining leave
      setRemainingLeave(totalLeaveBalance - totalTaken);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !days) return;
    
    setSavingLeave(true);
    
    try {
      // Check if there's already a record for this month and year
      const { data: existingData, error: fetchError } = await supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
        
      if (fetchError) throw fetchError;
      
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('leaves')
          .update({ days_taken: days })
          .eq('id', existingData.id);
          
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('leaves')
          .insert({
            employee_id: employee.id,
            year,
            month,
            days_taken: days
          });
          
        if (insertError) throw insertError;
      }
      
      // Refresh leave data
      await fetchLeaveData();
      
      // Reset form
      setDays(null);
    } catch (error) {
      console.error('Error saving leave:', error);
    } finally {
      setSavingLeave(false);
    }
  };

  const handleYearChange = (selectedYear: number) => {
    setYear(selectedYear);
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
      <h1 className="text-3xl font-bold mb-6">Annual Leave Management</h1>
      
      {employee && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Leave Balance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-gray-600">Total Annual Leave</p>
              <p className="font-medium text-xl">{totalLeaveBalance} days</p>
              <p className="text-xs text-gray-500">
                {employee.years_of_service >= 10 ? 'Based on 10+ years of service' : 'Standard allocation'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-gray-600">Leave Taken</p>
              <p className="font-medium text-xl">{leaveTaken} days</p>
              <p className="text-xs text-gray-500">In {year}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-gray-600">Remaining Leave</p>
              <p className="font-medium text-xl text-blue-600">{remainingLeave.toFixed(2)} days</p>
              <p className="text-xs text-gray-500">As of today</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Record Leave</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block mb-1">Days Taken</label>
              <input
                type="number"
                value={days || ''}
                onChange={(e) => setDays(parseFloat(e.target.value) || 0)}
                step="0.5"
                min="0"
                className="w-full p-2 border rounded"
                placeholder="Enter days taken"
              />
            </div>
            
            <button
              type="submit"
              disabled={savingLeave || days === null || days <= 0}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {savingLeave ? 'Saving...' : 'Save Leave'}
            </button>
          </form>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Leave History</h2>
            <div className="flex items-center space-x-2">
              <span>Year:</span>
              <select
                value={year}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="p-1 border rounded"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          
          {leaveData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Taken</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Recorded</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveData.map((leave) => (
                    <tr key={leave.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(leave.year, leave.month - 1, 1).toLocaleString('default', { month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{leave.days_taken}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(leave.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No leave records found for {year}.</p>
          )}
          
          {employee && leaveData.length > 0 && (
            <div className="mt-6">
              <BlobProvider document={
                <LeavePDF 
                  employee={employee}
                  leaveData={leaveData}
                  totalLeaveBalance={totalLeaveBalance}
                  leaveTaken={leaveTaken}
                  remainingLeave={remainingLeave}
                  year={year}
                />
              }>
                {({ blob, url, loading, error }) => (
                  <a 
                    href={url || undefined} 
                    download={`leave-report-${year}-${employee.name}.pdf`}
                    className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    {loading ? 'Generating PDF...' : 'Download PDF Report'}
                  </a>
                )}
              </BlobProvider>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
