import React from 'react';
import { useOffline } from '../lib/hooks/useOffline';

interface OfflineStatusProps {
  className?: string;
}

export function OfflineStatus({ className = '' }: OfflineStatusProps) {
  const { isOnline, isSyncing, lastSyncTime, hasOfflineData, syncNow } = useOffline({
    syncInterval: 300000 // 5 minutes
  });

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center">
        <div
          className={`h-2 w-2 rounded-full mr-2 ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      {hasOfflineData && (
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mx-2">•</span>
          <span className="text-sm text-amber-600 dark:text-amber-400">
            Pending changes
          </span>
        </div>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mx-2">•</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Sync Button */}
      {(hasOfflineData || !isOnline) && (
        <button
          onClick={() => syncNow()}
          disabled={!isOnline || isSyncing}
          className={`ml-2 inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded
            ${
              isOnline
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800'
            }`}
        >
          {isSyncing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Syncing...
            </>
          ) : (
            'Sync Now'
          )}
        </button>
      )}
    </div>
  );
} 