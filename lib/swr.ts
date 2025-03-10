import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import useSWRMutation, { SWRMutationConfiguration } from 'swr/mutation';
import { apiGet, apiPost, apiPut, apiDelete } from './api';

// Global SWR fetcher using our authenticated API
const fetcher = async <T>(url: string): Promise<T> => {
  try {
    // Use our authenticated API utility
    const data = await apiGet<T>(url);
    return data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
};

// Default SWR config
export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when browser regains network connection
  revalidateIfStale: true, // Validate if data is stale
  revalidateOnMount: true, // Validate when component mounts
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  errorRetryCount: 3, // Only retry on error 3 times
  focusThrottleInterval: 5000, // Throttle focus events to every 5 seconds
  loadingTimeout: 3000, // Show loading state if it takes longer than 3 seconds
  shouldRetryOnError: (err) => {
    // Don't retry on 401/403 errors as they're auth-related
    if (err && (err.status === 401 || err.status === 403)) {
      return false;
    }
    return true;
  }
};

// Use this hook to fetch data with proper caching and revalidation
export function useData<T>(
  key: string | null,
  config?: SWRConfiguration
): SWRResponse<T, any> {
  return useSWR<T>(
    key, 
    key => fetcher<T>(key),
    {
      ...defaultSWRConfig,
      ...config,
    }
  );
}

// Async mutation fetcher for useSWRMutation
async function postFetcher<T>(key: string, { arg }: { arg: any }): Promise<T> {
  try {
    // Use our authenticated API utility
    const data = await apiPost<T>(key, arg);
    return data;
  } catch (error) {
    console.error(`Error posting data to ${key}:`, error);
    throw error;
  }
}

async function putFetcher<T>(key: string, { arg }: { arg: any }): Promise<T> {
  try {
    // Use our authenticated API utility
    const data = await apiPut<T>(key, arg);
    return data;
  } catch (error) {
    console.error(`Error putting data to ${key}:`, error);
    throw error;
  }
}

async function deleteFetcher<T>(key: string): Promise<T> {
  try {
    // Use our authenticated API utility
    const data = await apiDelete<T>(key);
    return data;
  } catch (error) {
    console.error(`Error deleting data from ${key}:`, error);
    throw error;
  }
}

// Use this hook to mutate data with optimistic updates
export function usePostMutation<T>(
  key: string,
  config?: SWRMutationConfiguration<T, any, string, any>
) {
  return useSWRMutation<T, any, string, any>(key, postFetcher, config);
}

export function usePutMutation<T>(
  key: string,
  config?: SWRMutationConfiguration<T, any, string, any>
) {
  return useSWRMutation<T, any, string, any>(key, putFetcher, config);
}

export function useDeleteMutation<T>(
  key: string,
  config?: SWRMutationConfiguration<T, any, string, any>
) {
  return useSWRMutation<T, any, string, any>(key, deleteFetcher, config);
}

// Cache management utilities
export const clearCache = (key: string) => {
  // The cache is automatically managed by SWR
  // This is just a convenience method to clear a specific key
  const cache = window.localStorage;
  const cacheKey = `swr-${key}`;
  cache.removeItem(cacheKey);
};

export const prefetchData = async <T>(url: string): Promise<void> => {
  try {
    // Prefetch data using our authenticated fetcher
    await fetcher<T>(url);
  } catch (error) {
    console.error('Error prefetching data:', error);
  }
};

export default {
  useData,
  usePostMutation,
  usePutMutation,
  useDeleteMutation,
  clearCache,
  prefetchData,
}; 