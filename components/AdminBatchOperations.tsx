import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiUpload, FiDownload, FiUsers, FiDollarSign, FiCalendar, FiMail } from 'react-icons/fi';
import { useAuth } from '../lib/authContext';

type BatchOperationType = 'salaryUpdate' | 'leaveApproval' | 'userNotification' | 'exportData';

interface SelectedItems {
  [key: string]: boolean;
}

const AdminBatchOperations: React.FC = () => {
  const [operationType, setOperationType] = useState<BatchOperationType>('salaryUpdate');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<any>({
    percentage: 5,
    effectiveDate: new Date().toISOString().split('T')[0],
    notificationTitle: 'Important Update',
    notificationMessage: '',
    leaveAction: 'approve',
  });
  
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/employees');
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please check your permissions.');
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedItems({
      ...selectedItems,
      [id]: !selectedItems[id],
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    const newSelectedItems: SelectedItems = {};
    
    employees.forEach(employee => {
      newSelectedItems[employee.id] = isChecked;
    });
    
    setSelectedItems(newSelectedItems);
  };

  const getSelectedCount = () => {
    return Object.values(selectedItems).filter(Boolean).length;
  };

  const getSelectedIds = () => {
    return Object.entries(selectedItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const openModal = () => {
    if (getSelectedCount() === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const selectedIds = getSelectedIds();
    
    try {
      let endpoint = '';
      let payload = {};
      
      switch (operationType) {
        case 'salaryUpdate':
          endpoint = '/api/admin/batch-salary-update';
          payload = {
            employeeIds: selectedIds,
            percentage: parseFloat(formValues.percentage),
            effectiveDate: formValues.effectiveDate,
          };
          break;
          
        case 'leaveApproval':
          endpoint = '/api/admin/batch-leave-action';
          payload = {
            employeeIds: selectedIds,
            action: formValues.leaveAction,
          };
          break;
          
        case 'userNotification':
          endpoint = '/api/admin/batch-notification';
          payload = {
            employeeIds: selectedIds,
            title: formValues.notificationTitle,
            message: formValues.notificationMessage,
            type: 'info',
            category: 'system',
          };
          break;
          
        case 'exportData':
          endpoint = '/api/admin/export-employee-data';
          payload = {
            employeeIds: selectedIds,
            format: 'csv',
          };
          // Handle direct download for exports
          const response = await axios.post(endpoint, payload, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `employee-data-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          
          toast.success('Data exported successfully');
          setIsModalOpen(false);
          setIsSubmitting(false);
          return;
      }
      
      // For all operations except exportData
      const currentType = operationType;
      if (currentType === 'salaryUpdate' || currentType === 'leaveApproval' || currentType === 'userNotification') {
        await axios.post(endpoint, payload);
        toast.success(`Batch operation completed successfully`);
      }
      
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error performing batch operation:', err);
      toast.error('Failed to perform batch operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 text-apple-gray-dark dark:text-dark-text-primary">
        <p className="text-center mb-4">{error}</p>
        <button
          onClick={() => fetchEmployees()}
          className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card overflow-hidden">
      <div className="px-6 py-4 border-b dark:border-dark-border">
        <h2 className="text-xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
          Batch Operations
        </h2>
        <p className="mt-1 text-sm text-apple-gray dark:text-dark-text-secondary">
          Perform actions on multiple employees at once.
        </p>
      </div>
      
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <label className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1">
              Operation Type
            </label>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setOperationType('salaryUpdate')}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-l-md ${
                  operationType === 'salaryUpdate'
                    ? 'bg-apple-blue text-white'
                    : 'bg-white dark:bg-dark-surface text-apple-gray-dark dark:text-dark-text-primary border border-gray-300 dark:border-dark-border'
                }`}
              >
                <FiDollarSign className="mr-2" />
                Salary Update
              </button>
              <button
                type="button"
                onClick={() => setOperationType('leaveApproval')}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium ${
                  operationType === 'leaveApproval'
                    ? 'bg-apple-blue text-white'
                    : 'bg-white dark:bg-dark-surface text-apple-gray-dark dark:text-dark-text-primary border-t border-b border-gray-300 dark:border-dark-border'
                }`}
              >
                <FiCalendar className="mr-2" />
                Leave Actions
              </button>
              <button
                type="button"
                onClick={() => setOperationType('userNotification')}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium ${
                  operationType === 'userNotification'
                    ? 'bg-apple-blue text-white'
                    : 'bg-white dark:bg-dark-surface text-apple-gray-dark dark:text-dark-text-primary border-t border-b border-gray-300 dark:border-dark-border'
                }`}
              >
                <FiMail className="mr-2" />
                Notifications
              </button>
              <button
                type="button"
                onClick={() => setOperationType('exportData')}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-r-md ${
                  operationType === 'exportData'
                    ? 'bg-apple-blue text-white'
                    : 'bg-white dark:bg-dark-surface text-apple-gray-dark dark:text-dark-text-primary border border-gray-300 dark:border-dark-border'
                }`}
              >
                <FiDownload className="mr-2" />
                Export Data
              </button>
            </div>
          </div>
          
          <div className="ml-auto">
            <button
              onClick={openModal}
              disabled={getSelectedCount() === 0}
              className={`px-4 py-2 text-white rounded-md flex items-center ${
                getSelectedCount() === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-apple-blue hover:bg-apple-blue-hover'
              }`}
            >
              <FiUpload className="mr-2" />
              Apply to {getSelectedCount()} selected
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-dark-bg">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-apple-gray uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-apple-blue focus:ring-apple-blue border-gray-300 rounded"
                    onChange={handleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-apple-gray uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-apple-gray uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-apple-gray uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-apple-gray uppercase tracking-wider">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
              {employees.map((employee) => (
                <tr 
                  key={employee.id}
                  className={selectedItems[employee.id] ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-apple-blue focus:ring-apple-blue border-gray-300 rounded"
                      checked={!!selectedItems[employee.id]}
                      onChange={() => handleCheckboxChange(employee.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary">
                      {employee.first_name} {employee.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-apple-gray dark:text-dark-text-secondary">
                      {employee.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-apple-gray dark:text-dark-text-secondary">
                      {employee.department}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      {employee.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal for batch operations */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-apple ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white text-apple-gray-dark'}`}>
            <h2 className="text-xl font-semibold mb-4">
              {operationType === 'salaryUpdate' && 'Batch Salary Update'}
              {operationType === 'leaveApproval' && 'Batch Leave Actions'}
              {operationType === 'userNotification' && 'Send Batch Notification'}
              {operationType === 'exportData' && 'Export Employee Data'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              {operationType === 'salaryUpdate' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Percentage Increase/Decrease
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="percentage"
                        value={formValues.percentage}
                        onChange={handleFormChange}
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue pl-7 ${
                          isDarkMode 
                            ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                            : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-apple-gray-dark dark:text-dark-text-secondary">%</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-apple-gray dark:text-dark-text-secondary">
                      Use positive numbers for increases, negative for decreases.
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      name="effectiveDate"
                      value={formValues.effectiveDate}
                      onChange={handleFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                        isDarkMode 
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                          : 'bg-white border-gray-300'
                      }`}
                      required
                    />
                  </div>
                </>
              )}
              
              {operationType === 'leaveApproval' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">
                    Leave Action
                  </label>
                  <select
                    name="leaveAction"
                    value={formValues.leaveAction}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                      isDarkMode 
                        ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                        : 'bg-white border-gray-300'
                    }`}
                    required
                  >
                    <option value="approve">Approve Pending Leaves</option>
                    <option value="reject">Reject Pending Leaves</option>
                  </select>
                </div>
              )}
              
              {operationType === 'userNotification' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      name="notificationTitle"
                      value={formValues.notificationTitle}
                      onChange={handleFormChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                        isDarkMode 
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                          : 'bg-white border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">
                      Notification Message
                    </label>
                    <textarea
                      name="notificationMessage"
                      value={formValues.notificationMessage}
                      onChange={handleFormChange}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                        isDarkMode 
                          ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                          : 'bg-white border-gray-300'
                      }`}
                      required
                    ></textarea>
                  </div>
                </>
              )}
              
              {operationType === 'exportData' && (
                <div className="mb-6">
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary mb-2">
                    This will export data for {getSelectedCount()} selected employees in CSV format.
                  </p>
                  <p className="text-sm text-apple-gray dark:text-dark-text-secondary">
                    The export will include personal details, salary information, and leave records.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-md ${
                    isDarkMode
                      ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80'
                      : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
                  }`}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBatchOperations; 