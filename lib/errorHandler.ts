import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from './logger';
import axios, { AxiosError } from 'axios';

export function errorHandler(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error('API Error:', error)
      
      if (error instanceof Error) {
        // Categorize and handle different types of errors
        if (error.name === 'ValidationError') {
          return res.status(400).json({ 
            error: 'Validation Failed', 
            details: error.message 
          })
        }

        if (error.name === 'UnauthorizedError') {
          return res.status(401).json({ 
            error: 'Unauthorized', 
            message: error.message 
          })
        }

        // Generic server error
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: error.message 
        })
      }

      // Fallback for unexpected errors
      res.status(500).json({ 
        error: 'Unexpected Error', 
        message: 'An unknown error occurred' 
      })
    }
  }
}

// Common API response format
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: 'success' | 'error';
  timestamp: string;
}

// Error categories
export enum ErrorCategory {
  AUTH = 'authentication',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

// Get the error category based on error details
export const getErrorCategory = (error: any): ErrorCategory => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // HTTP response with error status
      const status = axiosError.response.status;
      
      if (status === 401 || status === 403) {
        return ErrorCategory.AUTH;
      } else if (status >= 500) {
        return ErrorCategory.SERVER;
      } else if (status >= 400) {
        return ErrorCategory.CLIENT;
      }
    } else if (axiosError.request) {
      // Request made but no response received
      return ErrorCategory.NETWORK;
    }
  } else if (error?.message?.includes('authentication') || error?.message?.includes('token')) {
    return ErrorCategory.AUTH;
  }
  
  return ErrorCategory.UNKNOWN;
};

// Get user-friendly error message
export const getUserFriendlyErrorMessage = (error: any, fallbackMessage: string = 'An unexpected error occurred'): string => {
  const category = getErrorCategory(error);
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Try to get message from response
    const responseData = axiosError.response?.data as any;
    if (responseData?.message) {
      return responseData.message;
    } else if (responseData?.error) {
      return responseData.error;
    }
    
    // Default messages based on status code
    if (axiosError.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    } else if (axiosError.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    } else if (axiosError.response?.status === 404) {
      return 'The requested resource was not found.';
    } else if (axiosError.response?.status === 500) {
      return 'The server encountered an error. Please try again later.';
    } else if (!axiosError.response && axiosError.request) {
      return 'Network error. Please check your connection and try again.';
    }
  }
  
  // Category-based fallback messages
  switch (category) {
    case ErrorCategory.AUTH:
      return 'Authentication error. Please sign in again.';
    case ErrorCategory.NETWORK:
      return 'Network error. Please check your connection and try again.';
    case ErrorCategory.SERVER:
      return 'Server error. Please try again later.';
    case ErrorCategory.CLIENT:
      return 'Something went wrong with your request.';
    default:
      return fallbackMessage;
  }
};

// Helper method for safe API calls with fallback
export async function safeApiCall<T>(
  apiCallFn: () => Promise<T>,
  fallbackData: T | null = null,
  errorMessage: string = 'Failed to fetch data'
): Promise<ApiResponse<T>> {
  try {
    const data = await apiCallFn();
    return {
      data,
      error: null,
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const category = getErrorCategory(error);
    const friendlyMessage = getUserFriendlyErrorMessage(error, errorMessage);
    
    logger.error(friendlyMessage, { error, category });
    
    return {
      data: fallbackData,
      error: friendlyMessage,
      status: 'error',
      timestamp: new Date().toISOString(),
    };
  }
}

// Common fallback data for different components
export const fallbackData = {
  dashboard: {
    employee: {
      id: 'fallback-id',
      name: 'Loading...',
      email: 'loading@example.com',
      position: 'Employee',
      department: 'Loading...',
    },
    latestSalary: {
      id: 'fallback-id',
      employee_id: 'fallback-id',
      month: new Date().toISOString().substring(0, 7),
      basic_salary: 0,
      total_salary: 0,
      created_at: new Date().toISOString(),
    },
    leaveBalance: 0,
    leaveTaken: 0,
    inLieuSummary: { count: 0, daysAdded: 0 },
  },
  
  leaveCalendar: [],
  
  notifications: [],
  
  profile: {
    id: 'fallback-id',
    name: 'Loading...',
    email: 'loading@example.com',
    position: 'Employee',
    department: 'Loading...',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    dob: '',
    emergency_contact: '',
  },
}; 