import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

type SalaryData = {
  month: string;
  totalSalary: number;
  basicSalary: number;
  overtimePay: number;
};

const SalaryTrendChart: React.FC = () => {
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchSalaryTrends = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/salary/trends');
        
        // Transform the data if needed
        const formattedData = response.data.map((item: any) => ({
          month: item.month,
          totalSalary: parseFloat(item.total_salary),
          basicSalary: parseFloat(item.basic_salary),
          overtimePay: parseFloat(item.overtime_pay),
        }));
        
        setSalaryData(formattedData);
      } catch (err) {
        console.error('Error fetching salary trends:', err);
        setError('Failed to load salary trend data');
        toast.error('Failed to load salary trends');
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryTrends();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  if (error || salaryData.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 text-apple-gray-dark dark:text-dark-text-primary">
        <p className="text-center mb-4">{error || 'No salary data available'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  const textColor = isDarkMode ? '#b3b3b3' : '#1d1d1f';
  const gridColor = isDarkMode ? '#2a2a2a' : '#e0e0e0';

  return (
    <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-apple-gray-dark dark:text-dark-text-primary">
          Salary Trends
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'line'
                ? 'bg-apple-blue text-white'
                : 'bg-gray-100 dark:bg-dark-surface dark:border dark:border-dark-border text-apple-gray-dark dark:text-dark-text-primary'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'area'
                ? 'bg-apple-blue text-white'
                : 'bg-gray-100 dark:bg-dark-surface dark:border dark:border-dark-border text-apple-gray-dark dark:text-dark-text-primary'
            }`}
          >
            Area
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart
              data={salaryData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="month" 
                stroke={textColor}
                tick={{ fill: textColor }}  
              />
              <YAxis 
                stroke={textColor}
                tick={{ fill: textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                  border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e6e6e6'}`,
                  color: textColor,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalSalary"
                name="Total Salary"
                stroke="#0071e3"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="basicSalary"
                name="Basic Salary"
                stroke="#34c759"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="overtimePay"
                name="Overtime Pay"
                stroke="#ff9500"
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={salaryData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="month" 
                stroke={textColor}
                tick={{ fill: textColor }}  
              />
              <YAxis 
                stroke={textColor}
                tick={{ fill: textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                  border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e6e6e6'}`,
                  color: textColor,
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalSalary"
                name="Total Salary"
                stroke="#0071e3"
                fill="#0071e3"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="basicSalary"
                name="Basic Salary"
                stroke="#34c759"
                fill="#34c759"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="overtimePay"
                name="Overtime Pay"
                stroke="#ff9500"
                fill="#ff9500"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalaryTrendChart; 