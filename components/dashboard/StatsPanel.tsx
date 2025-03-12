import React from 'react';
import { FaCalendarAlt, FaDollarSign, FaUserClock } from 'react-icons/fa';

export interface StatsData {
  monthlyEarnings: number;
  overtimeHours: number;
  shiftChanges?: number;
}

interface StatsPanelProps {
  stats: StatsData;
  isLoading: boolean;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg shadow-md animate-pulse">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gray-700 rounded-full mr-2"></div>
              <div className="h-4 bg-gray-700 rounded w-24"></div>
            </div>
            <div className="h-8 bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: 'Monthly Earnings',
      value: stats.monthlyEarnings,
      icon: <FaDollarSign className="text-green-500" />,
      description: 'Estimated before tax',
      formatter: (v: number) => `EGP ${v.toLocaleString()}`,
      color: 'text-green-400'
    },
    {
      title: 'Overtime Hours',
      value: stats.overtimeHours,
      icon: <FaUserClock className="text-yellow-500" />,
      description: 'Extra hours this month',
      formatter: (v: number) => `${v} hrs`,
      color: 'text-yellow-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-md transition-transform hover:scale-105">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2">
              {item.icon}
            </div>
            <span className="text-gray-400 text-sm">{item.title}</span>
          </div>
          <div className={`text-2xl font-bold ${item.color} mb-1`}>
            {item.formatter(item.value)}
          </div>
          <p className="text-gray-500 text-xs">{item.description}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsPanel; 