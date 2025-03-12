import { QueryClient, Query } from '@tanstack/react-query';
import { PersistQueryClientProvider, PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { logger } from './logger';

interface StoredCache {
  timestamp: number;
  buster: string;
  cacheState: any;
}

/**
 * Custom filter function for deciding which queries to persist
 */
export function shouldPersistQuery(query: Query<unknown, Error, unknown, readonly unknown[]>): boolean {
  // Don't persist real-time data that changes frequently
  if (query.queryKey[0] === 'shiftData') {
    return false;
  }

  // Only persist if the data exists and has any values
  return query.state.data !== undefined;
}

/**
 * Create a storage persister for React Query cache
 */
export function createQueryPersister(): Persister {
  try {
    // Storage persister that uses localStorage
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'SALARYCURSOR_QUERY_CACHE',
      // Serialize/deserialize functions to handle complex objects
      serialize: (data: PersistedClient) => {
        try {
          // Remove undefined values and circular references
          const cleaned = JSON.parse(JSON.stringify(data));
          return JSON.stringify(cleaned);
        } catch (error) {
          logger.error('Error serializing query cache', error);
          return JSON.stringify({});
        }
      },
      deserialize: (cachedString: string) => {
        try {
          return JSON.parse(cachedString) as PersistedClient;
        } catch (error) {
          logger.error('Error deserializing query cache', error);
          return {} as PersistedClient;
        }
      }
    });
  } catch (error) {
    logger.error('Failed to create query persister:', error);
    // Return a no-op persister if creation fails
    return {
      persistClient: async () => Promise.resolve(),
      restoreClient: async () => Promise.resolve(undefined),
      removeClient: async () => Promise.resolve(),
    } as Persister;
  }
}

// Apply filter to QueryClient configuration
export function getPersistedOptions() {
  return {
    persister: createQueryPersister(),
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
    },
  };
}

/**
 * Helper to remove persisted cache
 */
export function clearPersistedCache(): void {
  try {
    localStorage.removeItem('SALARYCURSOR_QUERY_CACHE');
    logger.info('Query cache cleared');
  } catch (error) {
    logger.error('Error clearing query cache', error);
  }
} 