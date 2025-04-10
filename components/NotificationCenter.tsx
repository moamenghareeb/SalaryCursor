import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiX, FiCheck, FiCalendar, FiDollarSign, FiClock, FiInfo } from 'react-icons/fi';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Define notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  isRead: boolean;
  link?: string;
  category?: 'salary' | 'leave' | 'system' | 'inlieu';
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDarkMode } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    
    // Close the dropdown when clicking outside of it
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications from the API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications');
      
      // Add proper check to ensure response.data is an array or has a notifications property
      if (response.data) {
        const responseData = response.data as any;
        // If response has notifications property (new API format)
        if (Array.isArray(responseData.notifications)) {
          setNotifications(responseData.notifications);
          setUnreadCount(responseData.unreadCount || 0);
        } 
        // If response is direct array (old API format)
        else if (Array.isArray(responseData)) {
          setNotifications(responseData);
          // Calculate unread count
          const unread = responseData.filter((notification: Notification) => !notification.isRead).length;
          setUnreadCount(unread);
        }
        // If neither format is valid, set empty array
        else {
          console.log('Unexpected notification data format', responseData);
          setNotifications([]);
          setUnreadCount(0);
        }
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, isRead: true })));
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Delete a notification
  const deleteNotification = async (id: string) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      
      // Update local state
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      setNotifications(updatedNotifications);
      
      // Recalculate unread count
      const unread = updatedNotifications.filter(notification => !notification.isRead).length;
      setUnreadCount(unread);
      
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
    }
  };

  // Get icon based on notification category
  const getNotificationIcon = (category?: string) => {
    switch (category) {
      case 'salary':
        return <FiDollarSign className="h-5 w-5 text-blue-500" />;
      case 'leave':
        return <FiCalendar className="h-5 w-5 text-green-500" />;
      case 'inlieu':
        return <FiClock className="h-5 w-5 text-purple-500" />;
      default:
        return <FiInfo className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with notification badge */}
      <button
        className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/30 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-md shadow-lg ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} ring-1 ring-black ring-opacity-5 animate-slideIn`}>
          <div className="px-4 py-3 border-b dark:border-dark-border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-apple-gray-dark dark:text-dark-text-primary">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-apple-blue hover:text-blue-600 font-medium dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                >
                  <FiCheck className="mr-1" />
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-apple-blue"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-apple-gray dark:text-dark-text-secondary">
                No notifications yet
              </div>
            ) : (
              <div>
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`relative p-4 border-b dark:border-dark-border ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0 mr-3">
                        {getNotificationIcon(notification.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary mb-0.5">
                          {notification.title}
                        </div>
                        <p className="text-sm text-apple-gray dark:text-dark-text-secondary">
                          {notification.message}
                        </p>
                        <p className="text-xs text-apple-gray dark:text-dark-text-secondary mt-1">
                          {new Date(notification.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex-shrink-0 self-start ml-2">
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                          aria-label="Delete notification"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="absolute inset-0 w-full h-full opacity-0"
                        aria-label="Mark as read"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-t dark:border-dark-border">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-sm font-medium text-center text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface/70 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 