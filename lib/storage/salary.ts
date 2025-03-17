import { BasicSalaryCalculation } from '../calculations/salary';

export function saveInputsToLocalStorage(data: BasicSalaryCalculation, employeeId: string) {
  if (typeof window !== 'undefined' && employeeId) {
    const storageKey = `salary_inputs_${employeeId}`;
    try {
      // Store only user input fields, not calculated values
      const inputsToSave = {
        basicSalary: data.basicSalary || 0,
        costOfLiving: data.costOfLiving || 0,
        shiftAllowance: data.shiftAllowance || 0,
        overtimeHours: data.overtimeHours || 0,
        deduction: data.deduction || 0,
      };
      localStorage.setItem(storageKey, JSON.stringify(inputsToSave));
      console.log('✅ Saved salary inputs to localStorage:', inputsToSave);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}

export function loadInputsFromLocalStorage(employeeId: string) {
  if (typeof window !== 'undefined' && employeeId) {
    try {
      const storageKey = `salary_inputs_${employeeId}`;
      console.log('Looking for localStorage data with key:', storageKey);
      
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('✅ Found and loaded salary inputs from localStorage:', parsedData);
        return {
          basicSalary: parsedData.basicSalary || 0,
          costOfLiving: parsedData.costOfLiving || 0,
          shiftAllowance: parsedData.shiftAllowance || 0,
          overtimeHours: parsedData.overtimeHours || 0,
          deduction: parsedData.deduction || 0,
        };
      } else {
        console.log('No saved inputs found in localStorage');
      }
    } catch (error) {
      console.error('Error loading saved inputs:', error);
    }
  }
  return null;
}

export function clearSavedInputs(employeeId: string) {
  if (typeof window !== 'undefined' && employeeId) {
    try {
      const storageKey = `salary_inputs_${employeeId}`;
      localStorage.removeItem(storageKey);
      console.log('✅ Cleared localStorage data for key:', storageKey);
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
  return false;
} 