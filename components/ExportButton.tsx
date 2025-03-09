import React, { useState } from 'react';
import { FiDownload, FiFileText, FiX } from 'react-icons/fi';
import { exportData } from '../lib/exportUtils';

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[];
  columns: { key: keyof T; header: string }[];
  filename: string;
  label?: string;
  className?: string;
}

function ExportButton<T extends Record<string, any>>({
  data,
  columns,
  filename,
  label = 'Export',
  className = '',
}: ExportButtonProps<T>) {
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    exportData(data, columns, format, filename);
    setShowOptions(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className={`flex items-center px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-sm text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-surface/80 focus:outline-none transition-colors ${className}`}
        aria-haspopup="true"
        aria-expanded={showOptions}
      >
        <FiDownload className="mr-2" />
        {label}
      </button>

      {showOptions && (
        <>
          {/* Backdrop for clicking outside */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowOptions(false)}
          ></div>
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-md shadow-lg z-20 animate-slideIn border border-gray-200 dark:border-dark-border">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-dark-border">
              <span className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary">Export Options</span>
              <button 
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="py-1">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-left text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface/80"
                onClick={() => handleExport('csv')}
              >
                <FiFileText className="mr-2" />
                CSV
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-left text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface/80"
                onClick={() => handleExport('excel')}
              >
                <FiFileText className="mr-2" />
                Excel
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-left text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface/80"
                onClick={() => handleExport('pdf')}
              >
                <FiFileText className="mr-2" />
                PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ExportButton; 