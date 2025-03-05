import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Employee {
  id: string;
  annual_leave_balance: number;
  years_of_service: number;
  annual_leave_entitlement: number;
  leave_taken_this_year: number;
  // Add other employee fields as needed
}

export default function AnnualLeave() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  
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
      
      alert(`Successfully added ${additionalBalance} days to your leave balance`);
    } catch (error) {
      console.error('Error adding in-lieu days:', error);
      alert('Failed to add in-lieu days. Please try again.');
    }
  };

  // Function to handle leave submission
  const handleSubmitLeave = async () => {
    // TODO: Implement leave submission logic
    alert('Leave submission not implemented yet');
  };

  // Fetch employee data on component mount
  useEffect(() => {
    const fetchEmployee = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          setEmployee(data);
        }
      }
    };
    
    fetchEmployee();
  }, []);

  return (
    <div className="annual-leave-container">
      <h1>Annual Leave Management</h1>
      
      {/* Leave Balance Section */}
      <div className="leave-balance-section">
        <h2>Leave Balance</h2>
        <div className="balance-details">
          <p>Years of Service: {employee?.years_of_service || 0} years</p>
          <p>Annual Leave Entitlement: {employee?.annual_leave_entitlement || 0} days</p>
          <p>Leave Taken This Year: {employee?.leave_taken_this_year || 0} days</p>
          <p>Remaining Leave: {employee?.annual_leave_balance || 0} days</p>
        </div>
      </div>

      {/* Submit Leave Request Section */}
      <div className="leave-request-section">
        <h2>Submit Leave Request</h2>
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <div className="button-group">
          <button 
            className="submit-leave-button"
            onClick={handleSubmitLeave}
          >
            Submit Leave
          </button>
          <button 
            className="in-lieu-button"
            onClick={handleInLieuOf}
          >
            Add In-Lieu Of
          </button>
        </div>
      </div>

      {/* Leave History Section */}
      <div className="leave-history-section">
        <h2>Leave History</h2>
        <div className="history-table">
          {/* Add your leave history table here */}
        </div>
      </div>

      <style jsx>{`
        .annual-leave-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .leave-balance-section,
        .leave-request-section,
        .leave-history-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .submit-leave-button,
        .in-lieu-button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.3s;
        }

        .submit-leave-button {
          background-color: #1a73e8;
          color: white;
        }

        .in-lieu-button {
          background-color: #4CAF50;
          color: white;
        }

        .submit-leave-button:hover {
          background-color: #1557b0;
        }

        .in-lieu-button:hover {
          background-color: #45a049;
        }
      `}</style>
    </div>
  );
} 