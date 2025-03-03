import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Deduction, DeductionType } from '../types';

interface PermanentDeductionModalProps {
  employeeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEDUCTION_TYPES: DeductionType[] = [
  'Pension Plan',
  'Retroactive',
  'Premium Card',
  'Mobile',
  'Absences',
  'Sick Leave',
  'Other'
];

const PermanentDeductionModal: React.FC<PermanentDeductionModalProps> = ({
  employeeId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newDeductionAmount, setNewDeductionAmount] = useState('');
  const [newDeductionType, setNewDeductionType] = useState<DeductionType>('Other');
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchDeductions();
    }
  }, [isOpen, employeeId]);

  const fetchDeductions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('deductions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_permanent', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeductions(data || []);
    } catch (error: any) {
      console.error('Error fetching deductions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewDeductionName('');
    setNewDeductionAmount('');
    setNewDeductionType('Other');
    setEditingDeduction(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newDeductionName || !newDeductionAmount) {
      setError('Please provide both name and amount');
      return;
    }

    const amount = parseFloat(newDeductionAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);

      if (editingDeduction) {
        // Update existing deduction
        const { error } = await supabase
          .from('deductions')
          .update({
            deduction_name: newDeductionName,
            amount,
            deduction_type: newDeductionType,
          })
          .eq('id', editingDeduction.id);

        if (error) throw error;
        setSuccess('Deduction updated successfully');
      } else {
        // Create new deduction
        const { error } = await supabase
          .from('deductions')
          .insert([{
            employee_id: employeeId,
            deduction_name: newDeductionName,
            amount,
            deduction_type: newDeductionType,
            is_permanent: true,
          }]);

        if (error) throw error;
        setSuccess('Deduction added successfully');
      }

      // Reset form and refresh data
      resetForm();
      await fetchDeductions();
      onSuccess(); // Notify parent component
    } catch (error: any) {
      console.error('Error submitting deduction:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (deduction: Deduction) => {
    setEditingDeduction(deduction);
    setNewDeductionName(deduction.deduction_name);
    setNewDeductionAmount(deduction.amount.toString());
    setNewDeductionType(deduction.deduction_type as DeductionType);
  };

  const handleDelete = async (deduction: Deduction) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deduction.id);

      if (error) throw error;

      setSuccess('Deduction deleted successfully');
      await fetchDeductions();
      onSuccess(); // Notify parent component
    } catch (error: any) {
      console.error('Error deleting deduction:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Manage Permanent Deductions</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
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

          <p className="text-sm text-gray-600 mb-4">
            Permanent deductions will automatically be applied to all future salary calculations.
          </p>

          <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newDeductionType}
                onChange={(e) => setNewDeductionType(e.target.value as DeductionType)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DEDUCTION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newDeductionName}
                onChange={(e) => setNewDeductionName(e.target.value)}
                placeholder="Deduction name"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newDeductionAmount}
                onChange={(e) => setNewDeductionAmount(e.target.value)}
                placeholder="0.00"
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
                  {isLoading ? '...' : editingDeduction ? 'Update' : 'Add'}
                </button>
                {editingDeduction && (
                  <button
                    type="button"
                    onClick={resetForm}
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
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deductions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                      No permanent deductions found
                    </td>
                  </tr>
                ) : (
                  deductions.map((deduction) => (
                    <tr key={deduction.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {deduction.deduction_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {deduction.deduction_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        ${deduction.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(deduction)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(deduction)}
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
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-4 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermanentDeductionModal; 