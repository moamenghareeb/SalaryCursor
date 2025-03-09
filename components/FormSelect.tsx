import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';
import { FiAlertCircle } from 'react-icons/fi';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  error?: FieldError;
  containerClassName?: string;
  options: { value: string | number; label: string }[];
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, name, error, containerClassName = '', className = '', options, ...props }, ref) => {
    return (
      <div className={`mb-4 ${containerClassName}`}>
        <label
          htmlFor={name}
          className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1"
        >
          {label}
        </label>
        <select
          id={name}
          name={name}
          ref={ref}
          className={`w-full px-3 py-2 border ${
            error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
          } rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue appearance-none bg-white dark:bg-dark-surface dark:text-dark-text-primary ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div 
            id={`${name}-error`} 
            className="mt-1 flex items-center text-sm text-red-500 dark:text-red-400 animate-fadeIn"
          >
            <FiAlertCircle className="mr-1" />
            <span>{error.message}</span>
          </div>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormSelect; 