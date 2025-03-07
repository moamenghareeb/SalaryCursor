import React from 'react';
import { LeaveBalance, LeaveRequest } from '../../types';

interface LeaveOverviewProps {
  balance: LeaveBalance;
  history: LeaveRequest[];
  onRequestLeave: () => void;
}

export default function LeaveOverview({ balance, history, onRequestLeave }: LeaveOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balance */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Balance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Annual Leave</p>
            <p className="text-2xl font-semibold text-gray-900">{balance.annual} days</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Sick Leave</p>
            <p className="text-2xl font-semibold text-gray-900">{balance.sick} days</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Unpaid Leave</p>
            <p className="text-2xl font-semibold text-gray-900">{balance.unpaid} days</p>
          </div>
        </div>
      </div>

      {/* Request Leave Button */}
      <div>
        <button
          onClick={onRequestLeave}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Request Leave
        </button>
      </div>

      {/* Leave History */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Leave History</h3>
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-500">No leave history available.</p>
          ) : (
            history.map((leave) => (
              <div key={leave.id} className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{leave.type} Leave</p>
                    <p className="text-sm text-gray-500">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                    {leave.reason && (
                      <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 