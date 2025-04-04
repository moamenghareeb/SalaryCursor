import React from 'react';
import { FaCalendarAlt, FaDollarSign, FaUserClock } from 'react-icons/fa';
import { useTheme } from '../../lib/themeContext';

export interface StatsData {
  monthlyEarnings: number;
  overtimeHours: number;
  shiftChanges?: number;
}

interface StatsPanelProps {
  stats: StatsData | null | undefined;
  isLoading: boolean;
  error?: Error | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, isLoading, error }) => {
  const { isDarkMode } = useTheme();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className={`p-4 rounded-lg shadow-md animate-pulse ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center mb-2">
              <div className={`w-8 h-8 rounded-full mr-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
              <div className={`h-4 rounded w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
            <div className={`h-8 rounded w-16 mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className={`h-3 rounded w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center py-6">
            <p className={`text-red-500 ${isDarkMode ? 'dark:text-red-400' : ''}`}>
              Error loading data
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center py-6">
            <p className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
              No data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      title: 'Monthly Earnings',
      value: stats.monthlyEarnings || 0,
      icon: <FaDollarSign className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />,
      description: 'Estimated before tax',
      formatter: (v: number) => `EGP ${v.toLocaleString()}`,
      color: isDarkMode ? 'text-green-400' : 'text-green-500'
    },
    {
      title: 'Overtime Hours',
      value: stats.overtimeHours || 0,
      icon: <FaUserClock className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />,
      description: 'Extra hours this month',
      formatter: (v: number) => `${v} hrs`,
      color: isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div key={index} className={`p-4 rounded-lg shadow-md transition-transform hover:scale-105 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {item.icon}
            </div>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {item.title}
            </span>
          </div>
          <div className={`text-2xl font-bold ${item.color} mb-1`}>
            {item.formatter(item.value)}
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default StatsPanel;