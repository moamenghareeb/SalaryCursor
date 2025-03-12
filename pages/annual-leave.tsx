import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../styles/AnnualLeave.module.css';

interface Employee {
  id: string;
  annual_leave_balance: number;
  years_of_service: number;
  annual_leave_entitlement: number;
  leave_taken_this_year: number;
  // Add other employee fields as needed
}

interface LeaveRequest {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
}

export default function AnnualLeave() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Function to calculate days between dates
  const calculateDaysBetween = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  };

  // Function to handle In-Lieu Of submission
  const handleInLieuOf = async () => {
    try {
      if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
      }

      if (!employee) {
        alert('Please log in first');
        return;
      }
      
      setLoading(true);

      const numberOfDays = calculateDaysBetween(startDate, endDate);
      const additionalBalance = Number((numberOfDays * 0.667).toFixed(2));

      // First get the current balance
      const { data: currentEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('annual_leave_balance')
        .eq('id', employee.id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = Number(currentEmployee.annual_leave_balance) + additionalBalance;

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
          days_count: numberOfDays,
          leave_days_added: additionalBalance
        });

      if (recordError) throw recordError;

      // Update the UI
      setEmployee({
        ...employee,
        annual_leave_balance: newBalance
      });

      // Clear the form
      setStartDate('');
      setEndDate('');
      setReason('');
      
      // Show success message
      setSuccessMessage(`Successfully added ${additionalBalance} days to your leave balance`);
      setTimeout(() => setSuccessMessage(''), 5000); // Clear after 5 seconds
    } catch (error) {
      console.error('Error adding in-lieu days:', error);
      alert('Failed to add in-lieu days. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle leave submission
  const handleSubmitLeave = async () => {
    // Implement leave submission logic here
    alert('Leave submission not implemented yet');
  };

  // Fetch employee data and leave requests on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch employee data
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!employeeError && employeeData) {
            setEmployee(employeeData);
          }
          
          // Fetch leave requests
          const { data: leaveData, error: leaveError } = await supabase
            .from('leaves')
            .select('*')
            .eq('employee_id', user.id)
            .order('start_date', { ascending: false });
            
          if (!leaveError && leaveData) {
            // Ensure compatibility with existing code by mapping days_taken to days if needed
            const formattedLeaveData = leaveData.map(leave => ({
              ...leave,
              days: leave.days_taken || leave.days || 0,
            }));
            setLeaveRequests(formattedLeaveData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="container">
      <h1>Annual Leave Management</h1>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      {/* Leave Balance Section */}
      <div className="card">
        <h2>Leave Balance</h2>
        
        <div className="balance-item">
          <div className="balance-label">Years of Service</div>
          <div className="balance-value">{employee?.years_of_service || 0} years</div>
        </div>
        
        <div className="balance-item">
          <div className="balance-label">Annual Leave Entitlement</div>
          <div className="balance-value">{employee?.annual_leave_entitlement || 0} days</div>
        </div>
        
        <div className="balance-item">
          <div className="balance-label">Leave Taken This Year</div>
          <div className="balance-value">{employee?.leave_taken_this_year || 0} days</div>
        </div>
        
        <div className="balance-item remaining-leave">
          <div className="balance-label">Remaining Leave</div>
          <div className="balance-value highlight">{employee?.annual_leave_balance || 0} days</div>
        </div>
      </div>
      
      {/* Leave Request Form */}
      <div className="card">
        <h2>Submit Leave Request</h2>
        
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="form-control"
            rows={4}
          />
        </div>
        
        <div className="button-group">
          <button 
            className="btn btn-primary"
            onClick={handleSubmitLeave}
            disabled={loading}
          >
            Submit Leave
          </button>
          <button 
            className="btn btn-success"
            onClick={handleInLieuOf}
            disabled={loading}
          >
            Add In-Lieu Of
          </button>
        </div>
      </div>
      
      {/* Leave History */}
      <div className="card">
        <div className="history-header">
          <h2>Leave History</h2>
          <span className="history-info">Showing all leave requests</span>
        </div>
        
        <table className="history-table">
          <thead>
            <tr>
              <th>YEAR</th>
              <th>DATES</th>
              <th>DAYS</th>
              <th>REASON</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.length > 0 ? (
              leaveRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.year}</td>
                  <td>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</td>
                  <td>{request.days}</td>
                  <td>{request.reason}</td>
                  <td>
                    <span className={`status-badge ${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="action-btn edit">Edit</button>
                    <button className="action-btn delete">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No leave history available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        
        h2 {
          font-size: 18px;
          margin-bottom: 15px;
        }
        
        .success-message {
          background-color: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .balance-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .remaining-leave {
          background-color: #f0f7ff;
          padding: 10px;
          border-radius: 4px;
          margin-top: 5px;
        }
        
        .highlight {
          color: #1a73e8;
          font-size: 18px;
          font-weight: bold;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .btn-primary {
          background-color: #1a73e8;
          color: white;
        }
        
        .btn-success {
          background-color: #4CAF50;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #1557b0;
        }
        
        .btn-success:hover {
          background-color: #45a049;
        }
        
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .history-info {
          color: #666;
          font-size: 14px;
        }
        
        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .history-table th {
          background-color: #f5f5f5;
          color: #333;
          font-weight: 600;
          text-align: left;
          padding: 10px;
        }
        
        .history-table td {
          padding: 10px;
          border-top: 1px solid #eee;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.ongoing {
          background-color: #e6f4ea;
          color: #0d652d;
        }
        
        .status-badge.approved {
          background-color: #e3f2fd;
          color: #0d47a1;
        }
        
        .status-badge.rejected {
          background-color: #feefe3;
          color: #b71c1c;
        }
        
        .actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          border: none;
        }
        
        .action-btn.edit {
          background-color: #e3f2fd;
          color: #1976d2;
        }
        
        .action-btn.delete {
          background-color: #fce8e6;
          color: #d32f2f;
        }
      `}</style>
    </div>
  );
} 