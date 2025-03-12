import React from 'react';

export function StatsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
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

export function UpcomingShiftsSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-3 py-3 border-b border-gray-700">
          <div className="h-5 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-40 mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
      ))}
    </div>
  );
}

export function LeaveBalanceSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-700 rounded w-16"></div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4"></div>
      <div className="flex justify-center">
        <div className="h-5 bg-gray-700 rounded w-28 mt-3"></div>
      </div>
    </div>
  );
}

export function SalaryHistorySkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-700 rounded w-32"></div>
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-gray-700 w-8 h-8"></div>
          <div className="w-12 h-4 bg-gray-700 rounded"></div>
          <div className="p-1 rounded bg-gray-700 w-8 h-8"></div>
          <div className="ml-2 w-20 h-8 bg-gray-700 rounded"></div>
        </div>
      </div>
      
      <div className="h-64 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-700 p-3 rounded-md mb-3">
            <div className="flex justify-between mb-1">
              <div className="h-4 bg-gray-600 rounded w-20"></div>
              <div className="h-4 bg-gray-600 rounded w-24"></div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-gray-600 h-2 rounded-full"
                style={{ width: `${30 + (i * 15)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between">
        <div>
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-6 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="h-5 bg-gray-700 rounded w-24 self-end"></div>
      </div>
    </div>
  );
} 