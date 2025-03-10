import React from 'react';
import { useTheme } from '../lib/themeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium' }) => {
  const { isDarkMode } = useTheme();
  
  // Size mapping
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-10 w-10',
    large: 'h-16 w-16',
  };
  
  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-2 border-b-transparent ${isDarkMode ? 'border-dark-accent' : 'border-apple-blue'}`} />
  );
};

export default LoadingSpinner; 