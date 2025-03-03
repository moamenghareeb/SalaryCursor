import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PublicHoliday } from '../types';

interface PublicHolidayManagerProps {
  employeeId: string;
  currentYear: number;
  onLeaveBalanceUpdate: (additionalLeave: number) => void;
}

const PublicHolidayManager: React.FC<PublicHolidayManagerProps> = (props) => {
  const { employeeId, currentYear, onLeaveBalanceUpdate } = props;
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch existing public holidays for the employee
  useEffect(() => {
    const fetchPublicHolidays = async () => {
      try {
        const { data, error } = await supabase
          .from('public_holidays')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('year', currentYear);

        if (error) throw error;

        setPublicHolidays(data || []);
      } catch (err) {
        console.error('Error fetching public holidays:', err);
        setError('Failed to load public holidays');
      }
    };

    fetchPublicHolidays();
  }, [employeeId, currentYear]);

  // Add a new public holiday
  const handleAddPublicHoliday = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    try {
      // Check if holiday already exists
      const existingHoliday = publicHolidays.find(
        ph => ph.date === selectedDate
      );

      if (existingHoliday) {
        setError('This public holiday has already been added');
        return;
      }

      const newHoliday: Omit<PublicHoliday, 'id' | 'created_at' | 'updated_at'> = {
        employee_id: employeeId,
        date: selectedDate,
        description: description || 'Worked Public Holiday',
        leave_credit: 0.67,
        year: currentYear
      };

      const { data, error } = await supabase
        .from('public_holidays')
        .insert(newHoliday)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const updatedHolidays = [...publicHolidays, data];
      setPublicHolidays(updatedHolidays);

      // Notify parent component about leave balance update
      onLeaveBalanceUpdate(0.67);

      // Reset form
      setSelectedDate('');
      setDescription('');
      setError(null);
    } catch (err) {
      console.error('Error adding public holiday:', err);
      setError('Failed to add public holiday');
    }
  };

  // Remove a public holiday
  const handleRemovePublicHoliday = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('public_holidays')
        .delete()
        .eq('id', holidayId);

      if (error) throw error;

      // Update local state
      const updatedHolidays = publicHolidays.filter(ph => ph.id !== holidayId);
      setPublicHolidays(updatedHolidays);

      // Notify parent component about leave balance update
      onLeaveBalanceUpdate(-0.67);
    } catch (err) {
      console.error('Error removing public holiday:', err);
      setError('Failed to remove public holiday');
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Public Holidays Worked</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      <div className="flex space-x-2 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-grow p-2 border rounded"
          min={`${currentYear}-01-01`}
          max={`${currentYear}-12-31`}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="flex-grow p-2 border rounded"
        />
        <button
          onClick={handleAddPublicHoliday}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add Holiday
        </button>
      </div>

      {publicHolidays.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-lg font-medium mb-2">Added Public Holidays</h4>
          {publicHolidays.map((holiday) => (
            <div 
              key={holiday.id} 
              className="flex justify-between items-center bg-gray-100 p-3 rounded"
            >
              <div>
                <p className="font-medium">
                  {new Date(holiday.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {holiday.description && (
                  <p className="text-sm text-gray-600">{holiday.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  +{holiday.leave_credit} Leave Days
                </span>
                <button
                  onClick={() => handleRemovePublicHoliday(holiday.id!)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No public holidays added yet</p>
      )}
    </div>
  );
};

export default PublicHolidayManager; 