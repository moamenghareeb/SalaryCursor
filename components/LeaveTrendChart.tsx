import React, { useEffect, useState } from 'react';
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
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

type MonthlyLeaveData = {
  month: string;
  annual: number;
  sick: number;
  unpaid: number;
  inLieu: number;
};

type LeaveTypeData = {
  name: string;
  value: number;
  color: string;
};

const LeaveTrendChart: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyLeaveData[]>([]);
  const [typeData, setTypeData] = useState<LeaveTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/leave/trends');
        
        // Transform the monthly data
        const formattedMonthlyData = response.data.monthly.map((item: any) => ({
          month: item.month,
          annual: parseFloat(item.annual_leave || 0),
          sick: parseFloat(item.sick_leave || 0),
          unpaid: parseFloat(item.unpaid_leave || 0),
          inLieu: parseFloat(item.in_lieu || 0),
        }));
        
        // Transform the type data for pie chart
        const leaveTypes = [
          { name: 'Annual Leave', value: response.data.summary.annual || 0, color: '#0071e3' },
          { name: 'Sick Leave', value: response.data.summary.sick || 0, color: '#ff3b30' },
          { name: 'Unpaid Leave', value: response.data.summary.unpaid || 0, color: '#ff9500' },
          { name: 'In Lieu Time', value: response.data.summary.inLieu || 0, color: '#34c759' },
        ];
        
        setMonthlyData(formattedMonthlyData);
        setTypeData(leaveTypes);
      } catch (err) {
        console.error('Error fetching leave trends:', err);
        setError('Failed to load leave trend data');
        toast.error('Failed to load leave trends');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  if (error || (monthlyData.length === 0 && typeData.length === 0)) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 text-apple-gray-dark dark:text-dark-text-primary">
        <p className="text-center mb-4">{error || 'No leave data available'}</p>
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
          Leave Trends
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-apple-blue text-white'
                : 'bg-gray-100 dark:bg-dark-surface dark:border dark:border-dark-border text-apple-gray-dark dark:text-dark-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              chartType === 'pie'
                ? 'bg-apple-blue text-white'
                : 'bg-gray-100 dark:bg-dark-surface dark:border dark:border-dark-border text-apple-gray-dark dark:text-dark-text-primary'
            }`}
          >
            By Type
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={monthlyData}
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
              <Bar dataKey="annual" name="Annual Leave" fill="#0071e3" />
              <Bar dataKey="sick" name="Sick Leave" fill="#ff3b30" />
              <Bar dataKey="unpaid" name="Unpaid Leave" fill="#ff9500" />
              <Bar dataKey="inLieu" name="In Lieu Time" fill="#34c759" />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                  border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e6e6e6'}`,
                  color: textColor,
                }}
                formatter={(value: number) => [`${value} days`, '']}
              />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LeaveTrendChart; 