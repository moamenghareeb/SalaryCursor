import React, { useState, useEffect } from 'react';
import { PermanentDeduction } from '../types';

interface PermanentDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deduction: Partial<PermanentDeduction>) => Promise<void>;
  initialDeduction?: PermanentDeduction;
}

const deductionTypes = [
  'Pension Plan',
  'Health Insurance',
  'Loan Repayment',
  'Tax Withholding',
  'Other',
  'Custom'
];

export default function PermanentDeductionModal({
  isOpen, 
  onClose, 
  onSave,
  initialDeduction
}: PermanentDeductionModalProps) {
  const [deduction, setDeduction] = useState<Partial<PermanentDeduction>>({
    type: '',
    custom_name: '',
    amount: 0,
    is_active: true
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (initialDeduction) {
      setDeduction({
        type: initialDeduction.type,
        custom_name: initialDeduction.custom_name || '',
        amount: initialDeduction.amount,
        is_active: initialDeduction.is_active ?? true
      });
    }
  }, [initialDeduction]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!deduction.type) {
      newErrors.type = 'Deduction type is required';
    }

    if (deduction.type === 'Custom' && !deduction.custom_name) {
      newErrors.custom_name = 'Custom deduction name is required';
    }

    if (deduction.amount === undefined || deduction.amount < 0) {
      newErrors.amount = 'Amount must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      try {
        await onSave(deduction);
        onClose();
      } catch (error) {
        console.error('Error saving permanent deduction:', error);
        setErrors({ submit: 'Failed to save deduction. Please try again.' });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h2 className="text-xl font-semibold mb-4">
          {initialDeduction ? 'Edit Permanent Deduction' : 'Add Permanent Deduction'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deduction Type</label>
            <select
              value={deduction.type}
              onChange={(e) => {
                const selectedType = e.target.value;
                setDeduction(prev => ({
                  ...prev, 
                  type: selectedType,
                  custom_name: selectedType === 'Custom' ? '' : prev.custom_name
                }));
              }}
              className={`w-full p-2 border rounded ${errors.type ? 'border-red-500' : ''}`}
            >
              <option value="">Select Deduction Type</option>
              {deductionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
          </div>

          {deduction.type === 'Custom' && (
            <div>
              <label className="block text-sm font-medium mb-1">Custom Deduction Name</label>
              <input
                type="text"
                value={deduction.custom_name}
                onChange={(e) => setDeduction(prev => ({ ...prev, custom_name: e.target.value }))}
                className={`w-full p-2 border rounded ${errors.custom_name ? 'border-red-500' : ''}`}
                placeholder="Enter custom deduction name"
              />
              {errors.custom_name && <p className="text-red-500 text-xs mt-1">{errors.custom_name}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={deduction.amount}
              onChange={(e) => setDeduction(prev => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))}
              className={`w-full p-2 border rounded ${errors.amount ? 'border-red-500' : ''}`}
              placeholder="Enter deduction amount"
              min="0"
              step="0.01"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={deduction.is_active}
              onChange={(e) => setDeduction(prev => ({ ...prev, is_active: e.target.checked }))}
              className="mr-2"
            />
            <label className="text-sm">Is Active</label>
          </div>

          {errors.submit && <p className="text-red-500 text-xs mt-2">{errors.submit}</p>}

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 