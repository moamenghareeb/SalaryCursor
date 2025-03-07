import React from 'react';
import { useRouter } from 'next/router';
import SalaryManagement from '../../components/salary/SalaryManagement';

export default function EmployeePage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Employees
        </button>
      </div>

      <SalaryManagement employeeId={id as string} />
    </div>
  );
} 