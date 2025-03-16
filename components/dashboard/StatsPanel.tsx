import React from 'react';
import { FaCalendarAlt, FaDollarSign, FaUserClock } from 'react-icons/fa';
import { StatsPanelProps } from '../../lib/types/salary';

export interface StatsData {
  monthlyEarnings: number;
  overtimeHours: number;
  shiftChanges?: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ data }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Monthly Earnings
        </h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
          EGP {data.monthlyEarnings.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Overtime Hours
        </h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
          {data.overtimeHours} hrs
        </p>
      </div>
    </div>
  );
};

export default StatsPanel; 