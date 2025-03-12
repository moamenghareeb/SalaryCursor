import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePrefetch } from '../lib/hooks';

type PrefetchTarget = 'dashboard' | 'schedule' | 'leave' | 'salary';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetchTarget: PrefetchTarget;
  monthOffset?: number; // For schedule prefetching
}

/**
 * Enhanced link component that prefetches data for the target page on hover
 */
export default function PrefetchLink({ href, children, className = '', prefetchTarget, monthOffset }: PrefetchLinkProps) {
  const { prefetchDashboard, prefetchSchedule, prefetchLeaveBalance } = usePrefetch();
  
  const handlePrefetch = () => {
    switch (prefetchTarget) {
      case 'dashboard':
        prefetchDashboard();
        break;
      case 'schedule':
        prefetchSchedule(monthOffset);
        break;
      case 'leave':
        prefetchLeaveBalance();
        break;
      case 'salary':
        // Currently using dashboard prefetch since it includes salary data
        prefetchDashboard();
        break;
    }
  };
  
  return (
    <Link 
      href={href} 
      className={className}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {children}
    </Link>
  );
} 