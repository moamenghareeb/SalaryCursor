import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PublicHoliday } from '../types';

interface PublicHolidayManagerProps {
  employeeId: string;
  currentYear: number;
  onLeaveBalanceUpdate?: () => void;
}

const PublicHolidayManager: React.FC<PublicHolidayManagerProps> = ({ 
  employeeId, 
  currentYear,
  onLeaveBalanceUpdate 
}) => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchHolidays();
    }
  }, [employeeId, currentYear]);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newHolidayDate || !newHolidayDescription) {
      setError('Please provide both date and description');
      return;
    }

    try {
      setIsLoading(true);

      if (editingHoliday) {
        // Update existing holiday
        const { error } = await supabase
          .from('public_holidays')
          .update({
            holiday_date: newHolidayDate,
            description: newHolidayDescription,
          })
          .eq('id', editingHoliday.id);

        if (error) throw error;
        setSuccess('Holiday updated successfully');
      } else {
        // Create new holiday
        const { error } = await supabase
          .from('public_holidays')
          .insert([{
            employee_id: employeeId,
            holiday_date: newHolidayDate,
            description: newHolidayDescription,
            leave_credit: 0.67,
          }]);

        if (error) throw error;
        setSuccess('Holiday added successfully');
      }

      // Reset form and refresh data
      setNewHolidayDate('');
      setNewHolidayDescription('');
      setEditingHoliday(null);
      await fetchHolidays();
      
      // Notify parent component that leave balance should be updated
      if (onLeaveBalanceUpdate) {
        onLeaveBalanceUpdate();
      }
    } catch (error: any) {
      console.error('Error submitting holiday:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday);
    setNewHolidayDate(holiday.holiday_date.substring(0, 10)); // Format date for input
    setNewHolidayDescription(holiday.description);
  };

  const handleCancelEdit = () => {
    setEditingHoliday(null);
    setNewHolidayDate('');
    setNewHolidayDescription('');
  };

  const handleDelete = async (holiday: PublicHoliday) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('public_holidays')
        .delete()
        .eq('id', holiday.id);

      if (error) throw error;

      setSuccess('Holiday deleted successfully');
      await fetchHolidays();
      
      // Notify parent component that leave balance should be updated
      if (onLeaveBalanceUpdate) {
        onLeaveBalanceUpdate();
      }
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-medium text-gray-900">
          Public Holidays Management
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <>
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

          <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min={`${currentYear}-01-01`}
                max={`${currentYear}-12-31`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newHolidayDescription}
                onChange={(e) => setNewHolidayDescription(e.target.value)}
                placeholder="Holiday description"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <div className="flex space-x-2 w-full">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                >
                  {isLoading ? '...' : editingHoliday ? 'Update' : 'Add'}
                </button>
                {editingHoliday && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Credit
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                      No public holidays found for {currentYear}
                    </td>
                  </tr>
                ) : (
                  holidays.map((holiday) => (
                    <tr key={holiday.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(holiday.holiday_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {holiday.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {holiday.leave_credit} days
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(holiday)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Note:</strong> Each public holiday adds 0.67 days to your annual leave balance.</p>
            <p className="mt-1">Total additional leave: {(holidays.length * 0.67).toFixed(2)} days</p>
          </div>
        </>
      )}
    </div>
  );
};

export default PublicHolidayManager; 