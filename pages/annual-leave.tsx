import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Employee {
  id: string;
  annual_leave_balance: number;
  // Add other employee fields as needed
}

export default function AnnualLeave() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    <div>
      <div className="submit-buttons-container" style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="submit-leave-button"
          onClick={handleSubmitLeave}
        >
          Submit Leave
        </button>
        
        <button 
          className="in-lieu-button"
          onClick={handleInLieuOf}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add In-Lieu Of
        </button>
      </div>
    </div>
  );
} 