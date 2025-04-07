import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../lib/authContext';
import LoadingSpinner from './LoadingSpinner';

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

// Added fallback data to ensure chart always has something to display
const fallbackMonthlyData: MonthlyLeaveData[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
].map(month => ({
  month,
  annual: 0,
  casual: 0,
  sick: 0,
  unpaid: 0,
  total: 0,
}));

const fallbackLeaveTypeData: LeaveTypeData[] = [
  { name: 'Annual', value: 0, color: '#8884d8' },
  { name: 'Casual', value: 0, color: '#82ca9d' },
  { name: 'Sick', value: 0, color: '#ffc658' },
  { name: 'Unpaid', value: 0, color: '#ff8042' },
];

// Custom tooltip for the bar chart
const CustomTooltip = ({ active, payload, label }: any) => {
  const { isDarkMode } = useTheme();
  if (active && payload && payload.length) {
    return (
      <div className={`px-3 py-2 rounded-md shadow-lg ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white text-gray-800'}`}>
        <p className="font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value} day${entry.value !== 1 ? 's' : ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const LeaveTrendChart: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyLeaveData[]>(fallbackMonthlyData);
  const [leaveTypeData, setLeaveTypeData] = useState<LeaveTypeData[]>(fallbackLeaveTypeData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [retryCount, setRetryCount] = useState<number>(0);
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch leave data with retry logic and better error handling
  const fetchLeaveData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching leave trend data...');
      
      // Add authentication if available
      let headers: Record<string, string> = {
        'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await axios.get('/api/leave/trends', { headers });
      
      // Verify the response format
      const responseData = response.data as any;
      if (responseData && 
          Array.isArray(responseData.monthlyData) && 
          Array.isArray(responseData.leaveTypeData)) {
        
        // Check if there's actual data or just empty entries
        const hasData = responseData.monthlyData.some((month: MonthlyLeaveData) => 
          month.annual > 0 || month.casual > 0 || month.sick > 0 || month.unpaid > 0
        );
        
        setMonthlyData(responseData.monthlyData);
        setLeaveTypeData(responseData.leaveTypeData);
        setLastUpdated(new Date());
        
        // Only show success message if not the initial load and there's actual data
        if (forceRefresh) {
          if (hasData) {
            toast.success('Leave trend data updated successfully');
          } else {
            toast('No leave data found for the current year', {
              icon: 'ℹ️',
            });
          }
        }
        
        // Log data loading success
        console.log('Leave trend data loaded successfully', hasData ? 'with data' : 'but empty');
      } else {
        console.warn('Invalid leave trend data format:', response.data);
        setError('Received invalid data format from server');
        
        if (forceRefresh) {
          toast.error('Could not load leave trend data (invalid format)');
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching leave trend data:', error);
      
      const isAxiosError = (error: any): boolean => 
        error && typeof error === 'object' && 'response' in error && 'request' in error;
      
      // Provide user-friendly error message
      if (isAxiosError(error)) {
        const axiosError = error as any;
        if (axiosError.response?.status === 401) {
          setError('Session expired. Please refresh the page.');
          if (forceRefresh) toast.error('Your session has expired. Please log in again.');
        } else if (axiosError.response?.status === 404) {
          setError('Leave data not available');
          if (forceRefresh) toast.error('Leave data not found');
        } else if (axiosError.code === 'ECONNABORTED') {
          setError('Request timed out');
          if (forceRefresh) toast.error('Request timed out. Please try again later.');
        } else if (!navigator.onLine) {
          setError('You are offline');
          if (forceRefresh) toast.error('You are offline. Please check your connection.');
        } else {
          setError(`Error: ${axiosError.message || 'Unknown error'}`);
          if (forceRefresh) toast.error(`Could not load leave trend data: ${axiosError.message || 'Unknown error'}`);
        }
      } else {
        setError('Unknown error occurred');
        if (forceRefresh) toast.error('An unknown error occurred while loading leave data');
      }
      
      // After 3 retries, use fallback data to ensure something renders
      if (retryCount >= 2) {
        console.log('Using fallback data after multiple failures');
        // Keep using existing state which was initialized with fallback data
      }
    } finally {
      setLoading(false);
    }
  }, [session, retryCount]);

  // Initial data load
  useEffect(() => {
    fetchLeaveData();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(() => {
      fetchLeaveData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchLeaveData]);

  // Retry logic for failure cases
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying fetch (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        fetchLeaveData();
      }, 3000 * (retryCount + 1)); // exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, fetchLeaveData]);
  
  // Generate a helpful message when no data is available
  const getEmptyDataMessage = () => {
    if (leaveTypeData.every(item => item.value === 0)) {
      return (
        <div className="text-center mt-4">
          <p className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}>
            No leave data found for the current year.
          </p>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-dark-text-tertiary' : 'text-gray-400'}`}>
            Data will appear here once you have taken leave.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-6 rounded-apple shadow-apple-card ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-medium ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
          Leave Trends
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'bar' 
                ? (isDarkMode ? 'bg-dark-accent text-white' : 'bg-blue-500 text-white') 
                : (isDarkMode ? 'bg-dark-surface-secondary text-dark-text-primary' : 'bg-gray-100 text-gray-600')
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'pie' 
                ? (isDarkMode ? 'bg-dark-accent text-white' : 'bg-blue-500 text-white') 
                : (isDarkMode ? 'bg-dark-surface-secondary text-dark-text-primary' : 'bg-gray-100 text-gray-600')
            }`}
          >
            Pie
          </button>
          <button
            onClick={() => fetchLeaveData(true)}
            className={`p-1 rounded-md transition-colors ${
              isDarkMode ? 'hover:bg-dark-surface-secondary' : 'hover:bg-gray-100'
            }`}
            title="Refresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {lastUpdated && (
        <p className={`text-xs mb-2 ${isDarkMode ? 'text-dark-text-tertiary' : 'text-gray-400'}`}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className={`text-center ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>
            {error}
          </p>
          <button
            onClick={() => fetchLeaveData(true)}
            className={`mt-4 px-3 py-1 text-sm rounded-md ${
              isDarkMode ? 'bg-dark-accent text-white' : 'bg-blue-500 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
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
          {getEmptyDataMessage()}
        </>
      )}
    </div>
  );
};

export default LeaveTrendChart; 