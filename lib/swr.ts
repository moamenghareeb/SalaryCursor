import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import useSWRMutation, { SWRMutationConfiguration } from 'swr/mutation';
import axios from 'axios';

// Global SWR fetcher using axios
const fetcher = async (url: string) => {
  const response = await axios.get(url);
  return response.data;
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
};

// Use this hook to fetch data with proper caching and revalidation
export function useData<T>(
  key: string | null,
  config?: SWRConfiguration
): SWRResponse<T, any> {
  return useSWR<T>(key, fetcher, {
    ...defaultSWRConfig,
    ...config,
  });
}

// Async mutation fetcher for useSWRMutation
async function postFetcher(url: string, { arg }: { arg: any }) {
  try {
    const response = await axios.post(url, arg);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function putFetcher(url: string, { arg }: { arg: any }) {
  try {
    const response = await axios.put(url, arg);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function deleteFetcher(url: string) {
  try {
    const response = await axios.delete(url);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Use this hook to mutate data with optimistic updates
export function usePostMutation<T>(
  key: string,
  config?: SWRMutationConfiguration
) {
  return useSWRMutation<T, any, string, any>(key, postFetcher, config);
}

export function usePutMutation<T>(
  key: string,
  config?: SWRMutationConfiguration
) {
  return useSWRMutation<T, any, string, any>(key, putFetcher, config);
}

export function useDeleteMutation<T>(
  key: string,
  config?: SWRMutationConfiguration
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

export const prefetchData = async (url: string) => {
  try {
    // Prefetch data and store in SWR cache
    await fetcher(url);
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