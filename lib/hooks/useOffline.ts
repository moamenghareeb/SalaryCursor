import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../offlineStorage';
import { logger } from '../logger';

interface UseOfflineOptions {
  key?: string;
  syncInterval?: number;
}

interface UseOfflineReturn {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasOfflineData: boolean;
  syncNow: () => Promise<void>;
}

export function useOffline({ key, syncInterval = 60000 }: UseOfflineOptions = {}): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  // Check for offline data
  const checkOfflineData = useCallback(async () => {
    if (key) {
      try {
        const data = await offlineStorage.get(key);
        setHasOfflineData(!!data);
      } catch (error) {
        logger.error('Error checking offline data:', error);
      }
    }
  }, [key]);

  // Sync function
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      await offlineStorage.processMutationQueue();
      await checkOfflineData();
      setLastSyncTime(new Date());
      logger.info('Offline data synchronized successfully');
    } catch (error) {
      logger.error('Error syncing offline data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, checkOfflineData]);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow(); // Try to sync when coming back online
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Periodic sync
  useEffect(() => {
    if (!syncInterval) return;

    const intervalId = setInterval(() => {
      if (isOnline && !isSyncing) {
        syncNow();
      }
    }, syncInterval);

    return () => clearInterval(intervalId);
  }, [isOnline, isSyncing, syncInterval, syncNow]);

  // Initial check for offline data
  useEffect(() => {
    checkOfflineData();
  }, [checkOfflineData]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    hasOfflineData,
    syncNow
  };
} 