import axios from 'axios';
import { supabase } from './supabase';

// Define AxiosRequestConfig type for compatibility
type AxiosRequestConfig = {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  [key: string]: any;
};

// Base API configuration
const API_CONFIG: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Create axios instance with base config
const api = axios.create(API_CONFIG);

// Helper to get auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to ensure auth token is included in requests
export const withAuth = async (config: AxiosRequestConfig = {}): Promise<AxiosRequestConfig> => {
  const token = await getAuthToken();
  
  return {
    ...config,
    headers: {
      ...config.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

// API request helpers with automatic auth token handling
export const apiGet = async <T>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const authConfig = await withAuth(config);
  try {
    const response = await api.get<T>(url, authConfig);
    return response.data;
  } catch (error: any) {
    console.error(`API GET error for ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiPost = async <T>(url: string, data: any, config: AxiosRequestConfig = {}): Promise<T> => {
  const authConfig = await withAuth(config);
  try {
    const response = await api.post<T>(url, data, authConfig);
    return response.data;
  } catch (error: any) {
    console.error(`API POST error for ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiPut = async <T>(url: string, data: any, config: AxiosRequestConfig = {}): Promise<T> => {
  const authConfig = await withAuth(config);
  try {
    const response = await api.put<T>(url, data, authConfig);
    return response.data;
  } catch (error: any) {
    console.error(`API PUT error for ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export const apiDelete = async <T>(url: string, config: AxiosRequestConfig = {}): Promise<T> => {
  const authConfig = await withAuth(config);
  try {
    const response = await api.delete<T>(url, authConfig);
    return response.data;
  } catch (error: any) {
    console.error(`API DELETE error for ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

export default api; 