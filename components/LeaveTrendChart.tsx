import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';
import { useTheme } from '../lib/themeContext';
import { toast } from 'react-hot-toast';

// Updated type definitions to match the API response
type MonthlyLeaveData = {
  month: string;
  annual: number;
  casual: number;
  sick: number;
  unpaid: number;
  total: number;
};

type LeaveTypeData = {
  name: string;
  value: number;
  color: string;
};

const LeaveTrendChart: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyLeaveData[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [retryCount, setRetryCount] = useState<number>(0);
  const { isDarkMode } = useTheme();

  // Function to fetch leave data with retry logic and better error handling
  const fetchLeaveData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/leave/trends', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      // Verify the response format
      if (response.data && 
          Array.isArray(response.data.monthlyData) && 
          Array.isArray(response.data.leaveTypeData)) {
        
        setMonthlyData(response.data.monthlyData);
        setLeaveTypeData(response.data.leaveTypeData);
        
        // Log data loading success
        console.log('Leave trend data loaded successfully');
      } else {
        console.warn('Invalid leave trend data format:', response.data);
        setError('Received invalid data format from server');
      }
    } catch (error) {
      console.error('Error fetching leave trend data:', error);
      
      // Provide user-friendly error message
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else if (error.response?.status === 404) {
          setError('Leave data not found. It might not be available yet.');
        } else if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again later.');
        } else if (!navigator.onLine) {
          setError('You appear to be offline. Please check your internet connection.');
        } else {
          setError('Failed to load leave trend data. Please try again later.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Retry mechanism with exponential backoff
  useEffect(() => {
    if (retryCount > 0 && retryCount <= 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying leave trend data fetch (attempt ${retryCount})...`);
        fetchLeaveData();
      }, Math.min(1000 * 2 ** retryCount, 10000)); // Exponential backoff with 10s max
      
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  // Initial data fetch
  useEffect(() => {
    fetchLeaveData();
  }, []);

  // Toggle chart type
  const toggleChartType = () => {
    setChartType(prevType => prevType === 'bar' ? 'pie' : 'bar');
  };

  // Handle retry button click
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchLeaveData();
  };

  // Bar chart custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-white dark:bg-gray-800 p-2 rounded shadow-md border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value} days`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-64 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading leave trend data...</p>
      </div>
    );
  }

  // Render error state with retry button
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-64 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-red-500 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-center text-gray-700 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No data state (empty results)
  if (monthlyData.length === 0 || leaveTypeData.every(item => item.value === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-64 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-gray-500 dark:text-gray-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-center text-gray-700 dark:text-gray-300">No leave data found for this year.</p>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-2">Any approved leave requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Leave Trends</h2>
        <div className="flex gap-2">
          <button
            onClick={toggleChartType}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            {chartType === 'bar' ? 'Show Pie Chart' : 'Show Bar Chart'}
          </button>
          <button
            onClick={fetchLeaveData}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="month" stroke={isDarkMode ? '#fff' : '#333'} />
              <YAxis stroke={isDarkMode ? '#fff' : '#333'} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#333' }} />
              <Bar dataKey="annual" name="Annual" fill="#8884d8" />
              <Bar dataKey="casual" name="Casual" fill="#82ca9d" />
              <Bar dataKey="sick" name="Sick" fill="#ffc658" />
              <Bar dataKey="unpaid" name="Unpaid" fill="#ff8042" />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={leaveTypeData.filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {leaveTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} days`, 'Duration']} />
              <Legend formatter={(value) => <span style={{ color: isDarkMode ? '#fff' : '#333' }}>{value}</span>} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LeaveTrendChart; 