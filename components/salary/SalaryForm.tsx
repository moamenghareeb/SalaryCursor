import React, { useState, useEffect } from 'react';
import { FiSave, FiAlertCircle } from 'react-icons/fi';
import { SimplifiedEmployee } from '@/lib/utils/employeeUtils';

// Define validation rules and error messages
interface ValidationRules {
  min?: number;
  max?: number;
  required?: boolean;
  integer?: boolean;
}

interface FieldValidation {
  [key: string]: ValidationRules;
}

// Field validation rules
const validationRules: FieldValidation = {
  basicSalary: { min: 0, required: true },
  costOfLiving: { min: 0 },
  shiftAllowance: { min: 0 },
  otherEarnings: { min: 0 },
  deduction: { min: 0 },
  manualOvertimeHours: { min: 0, integer: true }
};

interface SalaryFormProps {
  employee?: SimplifiedEmployee;
  salaryCalc: {
    basicSalary: number;
    costOfLiving: number;
    shiftAllowance: number;
    otherEarnings: number; // Added other earnings
    overtimeHours: number;
    overtimePay: number;
    deduction: number;
    rateRatio?: number; // Added exchange rate ratio
    totalSalary?: number;
    exchangeRate?: number;
    variablePay?: number;
    manualOvertimeHours?: number;
  };
  setSalaryCalc?: React.Dispatch<React.SetStateAction<any>>;
  scheduleOvertimeHours?: number;
  manualOvertimeHours?: number;
  setManualOvertimeHours?: React.Dispatch<React.SetStateAction<number>>;
  setScheduleOvertimeHours?: React.Dispatch<React.SetStateAction<number>>;
  selectedMonth?: number;
  selectedYear?: number;
  onDateChange?: (year: number, month: number) => void;
  onInputChange?: (field: keyof SalaryFormProps['salaryCalc'] | 'manualOvertimeHours', value: number) => void;
  onManualUpdateRate?: () => void;
  exchangeRate?: number;
}

export function SalaryForm({ 
  employee,
  salaryCalc,
  scheduleOvertimeHours = 0,
  manualOvertimeHours = 0,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  onDateChange = () => {},
  onInputChange = () => {},
  exchangeRate = 31.50
}: SalaryFormProps) {
  const [formData, setFormData] = useState(salaryCalc);
  const [manualOvertimeHoursState, setManualOvertimeHours] = useState(manualOvertimeHours || 0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  // Update form when data changes
  useEffect(() => {
    setFormData(salaryCalc);
  }, [salaryCalc]);

  // Validate a field value against rules
  const validateField = (name: string, value: number): string => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && (value === undefined || value === null || value === 0)) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    if (rules.min !== undefined && value < rules.min) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} cannot be less than ${rules.min}`;
    }

    if (rules.max !== undefined && value > rules.max) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} cannot be more than ${rules.max}`;
    }

    if (rules.integer && !Number.isInteger(value)) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be a whole number`;
    }

    return '';
  };

  // Handle field blur to mark as touched
  const handleBlur = (name: string) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  // Update parent when manual overtime changes
  const handleManualOvertimeChange = (value: number) => {
    setManualOvertimeHours(value);
    
    // Validate
    const errorMessage = validateField('manualOvertimeHours', value);
    setErrors(prev => ({
      ...prev,
      manualOvertimeHours: errorMessage
    }));
    
    // Only update parent if valid
    if (!errorMessage) {
      onInputChange('manualOvertimeHours', value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    // Save the value in the local form state
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    // Validate the input
    const errorMessage = validateField(name, numValue);
    setErrors(prev => ({
      ...prev,
      [name]: errorMessage
    }));
    
    // Only update parent component if the value is valid
    if (!errorMessage) {
      onInputChange(name as keyof typeof salaryCalc, numValue);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Month
          </label>
          <select 
            value={selectedMonth}
            onChange={(e) => onDateChange(selectedYear, parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value={1}>January</option>
            <option value={2}>February</option>
            <option value={3}>March</option>
            <option value={4}>April</option>
            <option value={5}>May</option>
            <option value={6}>June</option>
            <option value={7}>July</option>
            <option value={8}>August</option>
            <option value={9}>September</option>
            <option value={10}>October</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year
          </label>
          <select 
            value={selectedYear}
            onChange={(e) => onDateChange(parseInt(e.target.value), selectedMonth)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {Array.from({ length: selectedYear - 2020 + 2 }, (_, i) => (
              <option key={2020 + i} value={2020 + i}>
                {2020 + i}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Basic Salary (X) (EGP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.basicSalary || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('basicSalary')}
            name="basicSalary"
            className={`w-full px-4 py-2 rounded-md border ${
              errors.basicSalary && touched.basicSalary 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            } focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800`}
          />
          {errors.basicSalary && touched.basicSalary && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <FiAlertCircle className="mr-1" />
              {errors.basicSalary}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cost of Living (Y) (EGP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.costOfLiving || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('costOfLiving')}
            name="costOfLiving"
            className={`w-full px-4 py-2 rounded-md border ${
              errors.costOfLiving && touched.costOfLiving 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            } focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800`}
          />
          {errors.costOfLiving && touched.costOfLiving && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <FiAlertCircle className="mr-1" />
              {errors.costOfLiving}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Shift Allowance (Z) (EGP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.shiftAllowance || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('shiftAllowance')}
            name="shiftAllowance"
            className={`w-full px-4 py-2 rounded-md border ${
              errors.shiftAllowance && touched.shiftAllowance 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            } focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800`}
          />
          {errors.shiftAllowance && touched.shiftAllowance && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <FiAlertCircle className="mr-1" />
              {errors.shiftAllowance}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Other Earnings (E) (EGP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.otherEarnings || ''}
            onChange={handleChange}
            onBlur={() => handleBlur('otherEarnings')}
            name="otherEarnings"
            className={`w-full px-4 py-2 rounded-md border ${
              errors.otherEarnings && touched.otherEarnings 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            } focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800`}
          />
          {errors.otherEarnings && touched.otherEarnings && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <FiAlertCircle className="mr-1" />
              {errors.otherEarnings}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Overtime Hours
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                id="scheduleOvertimeHours"
                name="scheduleOvertimeHours"
                value={scheduleOvertimeHours}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                readOnly
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                From Schedule
              </span>
            </div>
            
            <div className="flex items-center">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                id="manualOvertimeHours"
                name="manualOvertimeHours"
                value={manualOvertimeHoursState}
                onChange={(e) => handleManualOvertimeChange(Number(e.target.value))}
                onBlur={() => handleBlur('manualOvertimeHours')}
                className={`w-full px-4 py-2 rounded-md border ${
                  errors.manualOvertimeHours && touched.manualOvertimeHours 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                } focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800`}
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Additional
              </span>
            </div>
            
            <div className="flex items-center">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                id="totalOvertimeHoursDisplay"
                name="totalOvertimeHoursDisplay"
                value={scheduleOvertimeHours + manualOvertimeHoursState}
                className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                readOnly
              />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Total Overtime (O)
              </span>
            </div>
          </div>
          {errors.manualOvertimeHours && touched.manualOvertimeHours && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center">
              <FiAlertCircle className="mr-1" />
              {errors.manualOvertimeHours}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deductions (F) (EGP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.deduction || ''}
            onChange={handleChange}
            name="deduction"
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rate (EGP/USD):</span>
            <span className="ml-2 text-sm font-bold text-gray-900 dark:text-gray-100">{exchangeRate.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate/30.8 Ratio:</span>
            <span className="ml-2 text-sm font-bold text-blue-600 dark:text-blue-400">
              {(salaryCalc.rateRatio || (exchangeRate / 30.8)).toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}