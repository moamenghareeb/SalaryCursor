import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ShiftGroup } from '../../lib/types/schedule';

interface GroupChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ShiftGroup, effectiveDate: string) => void;
  currentGroup: ShiftGroup;
  isLoading?: boolean;
}

const GROUP_OPTIONS: { value: ShiftGroup; label: string }[] = [
  { value: 'A', label: 'Group A' },
  { value: 'B', label: 'Group B' },
  { value: 'C', label: 'Group C' },
  { value: 'D', label: 'Group D' }
];

const GroupChangeModal: React.FC<GroupChangeModalProps> = ({ 
  isOpen, 
  onClose,
  onSave,
  currentGroup,
  isLoading
}) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Form state
  const [selectedGroup, setSelectedGroup] = useState<ShiftGroup>(currentGroup);
  const [effectiveDate, setEffectiveDate] = useState<string>(today);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedGroup(currentGroup);
      setEffectiveDate(today);
    }
  }, [isOpen, currentGroup, today]);
  
  // Handle close
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };
  
  // Handle save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoading && selectedGroup !== currentGroup) {
      onSave(selectedGroup, effectiveDate);
    }
  };
  
  // Return null if not open
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Change Shift Group
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select your new shift group and when the change should take effect
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSave} className="p-4">
          {/* Current group */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Group
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200">
              Group {currentGroup}
            </div>
          </div>
          
          {/* Group selector */}
          <div className="mb-4">
            <label htmlFor="group-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Group
            </label>
            <select
              id="group-selector"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value as ShiftGroup)}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GROUP_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          {/* Effective date */}
          <div className="mb-4">
            <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Effective Date
            </label>
            <input
              type="date"
              id="effective-date"
              value={effectiveDate}
              min={today}
              onChange={(e) => setEffectiveDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This is the date when the new group assignment will take effect. Your previous shifts will remain unchanged.
            </p>
          </div>
          
          {/* Information about the change */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md mb-4">
            <p className="text-sm">
              <strong>Note:</strong> Changing your shift group will affect your schedule from the effective date forward. 
              Previous dates will retain their original group assignment.
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading || selectedGroup === currentGroup}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700
                text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                flex items-center space-x-1
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupChangeModal; 