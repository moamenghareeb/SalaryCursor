import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AnnualLeave() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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

      const numberOfDays = calculateDaysBetween(startDate, endDate);
      const additionalBalance = Number((numberOfDays * 0.667).toFixed(2));

      // Update the leave balance in the database
      const { data, error } = await supabase
        .from('employees')
        .update({ 
          annual_leave_balance: supabase.raw(`annual_leave_balance + ${additionalBalance}`)
        })
        .eq('id', employee.id)
        .select()
        .single();

      if (error) throw error;

      // Update the UI
      setEmployee(prev => ({
        ...prev,
        annual_leave_balance: prev.annual_leave_balance + additionalBalance
      }));

      // Clear the form
      setStartDate('');
      setEndDate('');
      
      alert(`Successfully added ${additionalBalance} days to your leave balance`);
    } catch (error) {
      console.error('Error adding in-lieu days:', error);
      alert('Failed to add in-lieu days. Please try again.');
    }
  };

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
            backgroundColor: '#4CAF50', // Green color
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