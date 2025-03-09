import React, { ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  isLoading = false,
  loadingText = 'Loading...',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={isLoading || disabled}
      className={`relative flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-apple-blue hover:bg-apple-blue-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-apple-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
        className
      }`}
      {...props}
    >
      {isLoading && (
        <div className="absolute left-4 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      )}
      <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
      {isLoading && <span className="absolute">{loadingText}</span>}
    </button>
  );
};

export default LoadingButton; 