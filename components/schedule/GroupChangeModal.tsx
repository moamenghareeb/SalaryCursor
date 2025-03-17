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

const GROUP_OPTIONS: { value: ShiftGroup; label: string; recommended?: boolean }[] = [
  { value: 'A', label: 'Group A' },
  { value: 'B', label: 'Group B' },
  { value: 'C', label: 'Group C', recommended: true },
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
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            onClick={onClose}
          ></div>
          
          {/* Modal */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md z-10 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
              Change Shift Group
            </h3>
            
            <form onSubmit={handleSave}>
              <div className="space-y-5">
                <div>
                  <label 
                    htmlFor="group" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Select Group
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GROUP_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedGroup(option.value)}
                        className={`px-3 py-2 rounded-md border relative ${
                          selectedGroup === option.value
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {option.label}
                        {option.recommended && (
                          <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-xs px-1 rounded-full">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-blue-600">
                    {selectedGroup === 'C' ? 
                      'Recommended - This will maintain your personal schedule.' :
                      'Note: Your schedule may not display correctly if you use a group other than Group C.'
                    }
                  </p>
                </div>

                <div>
                  <label 
                    htmlFor="effective-date" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
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
              </div>
              
              {/* Information about the change */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md mb-4 mt-5">
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
                  disabled={isLoading}
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
      )}
    </>
  );
};

export default GroupChangeModal; 