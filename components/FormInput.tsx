import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { FiAlertCircle } from 'react-icons/fi';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string;
  name: string;
  error?: FieldError;
  icon?: ReactNode;
  containerClassName?: string;
  register?: UseFormRegisterReturn;
  helperText?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, name, error, icon, containerClassName = '', className = '', register, helperText, ...props }, ref) => {
    return (
      <div className={`mb-4 ${containerClassName}`}>
        <label
          htmlFor={name}
          className="block text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-1"
        >
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            id={name}
            {...(register || { name })}
            ref={ref}
            className={`w-full ${icon ? 'pl-10' : 'px-3'} py-2 border ${
              error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
            } rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue dark:bg-dark-surface dark:text-dark-text-primary ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <div 
            id={`${name}-error`} 
            className="mt-1 flex items-center text-sm text-red-500 dark:text-red-400 animate-fadeIn"
          >
            <FiAlertCircle className="mr-1" />
            <span>{error.message}</span>
          </div>
        )}
        {!error && helperText && (
          <div 
            id={`${name}-helper`}
            className="mt-1 text-sm text-apple-gray dark:text-dark-text-secondary"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput; 