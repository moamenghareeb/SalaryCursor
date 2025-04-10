import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface RefreshButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  showText?: boolean;
}

export default function RefreshButton({
  className = '',
  size = 'md',
  variant = 'primary',
  showText = true
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Listen for messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REFRESH_COMPLETE') {
        setIsRefreshing(false);
        toast.success('App refreshed successfully!');
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Set size based on the size prop
  const sizeStyles = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  };

  // Set variant styles
  const variantStyles = {
    primary: 'bg-apple-blue hover:bg-apple-blue-hover text-white',
    secondary: 'bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-surface/80 text-gray-700 dark:text-gray-300'
  };

  // Handle refresh action
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // Step 1: Invalidate all queries in React Query
      await queryClient.invalidateQueries();
      
      // Step 2: Request service worker to refresh cache
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REFRESH_CACHE'
        });
      }
      
      // Step 3: Refresh the current page using Next.js router
      await router.replace(router.asPath);

      // Only set refreshing to false if service worker is not available
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
        setIsRefreshing(false);
        toast.success('App refreshed successfully!');
      }
    } catch (error) {
      console.error('Error refreshing the page:', error);
      setIsRefreshing(false);
      toast.error('Failed to refresh the app. Please try again.');
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        rounded-full flex items-center justify-center px-4 font-medium transition-colors duration-200
        disabled:opacity-70 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label="Refresh page"
    >
      <FiRefreshCw 
        className={`${isRefreshing ? 'animate-spin' : ''} ${showText ? 'mr-2' : ''}`} 
      />
      {showText && (
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
      )}
    </button>
  );
} 