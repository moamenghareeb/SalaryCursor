import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

// Add this interface definition for FormattedLeaveData
interface FormattedLeaveData {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  is_team_member?: boolean;
  employee_name?: string;
  reason?: string;
  duration?: number;
}

// Define leave event types
interface LeaveEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  leaveType: 'annual' | 'sick' | 'unpaid' | 'in-lieu';
  status: 'approved' | 'pending' | 'rejected';
  allDay: boolean;
  isTeamMember: boolean;
  employeeName: string;
  reason: string;
}

interface NewLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: DateSelectArg | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

// Modal component for creating new leave requests
const NewLeaveModal: React.FC<NewLeaveModalProps> = ({
  isOpen,
  onClose,
  selectedDates,
  onSubmit,
  isSubmitting,
}) => {
  const [leaveType, setLeaveType] = useState<string>('annual');
  const [reason, setReason] = useState<string>('');
  const { isDarkMode } = useTheme();

  if (!isOpen || !selectedDates) return null;

  const startDate = new Date(selectedDates.start);
  const endDate = new Date(selectedDates.end);
  endDate.setDate(endDate.getDate() - 1); // FullCalendar's end date is exclusive

  // Calculate duration in days
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      leave_type: leaveType,
      reason,
      duration: diffDays,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center animate-fadeIn">
      <div className={`w-full max-w-md p-6 rounded-apple ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white text-apple-gray-dark'}`}>
        <h2 className="text-xl font-semibold mb-4">Request Leave</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <div className={`p-3 rounded-md ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
              <p>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</p>
              <p className="text-sm mt-1 text-apple-gray dark:text-dark-text-secondary">
                {diffDays} day{diffDays > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                isDarkMode 
                  ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="in-lieu">In-Lieu Time</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-apple-blue focus:border-apple-blue ${
                isDarkMode 
                  ? 'bg-dark-bg border-dark-border text-dark-text-primary' 
                  : 'bg-white border-gray-300'
              }`}
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md ${
                isDarkMode
                  ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80'
                  : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
              }`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Leave details modal
interface LeaveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: LeaveEvent | null;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}

const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onCancel,
  isCancelling,
}) => {
  const { isDarkMode } = useTheme();
  
  if (!isOpen || !event) return null;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  
  // Get status color
  const getStatusColor = () => {
    switch (event.status) {
      case 'approved': return 'text-green-600 dark:text-green-500';
      case 'pending': return 'text-yellow-600 dark:text-yellow-500';
      case 'rejected': return 'text-red-600 dark:text-red-500';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get leave type color
  const getLeaveTypeColor = () => {
    switch (event.leaveType) {
      case 'annual': return 'bg-blue-500';
      case 'sick': return 'bg-red-500';
      case 'unpaid': return 'bg-orange-500';
      case 'in-lieu': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center animate-fadeIn">
      <div className={`w-full max-w-md p-6 rounded-apple ${isDarkMode ? 'bg-dark-surface text-dark-text-primary' : 'bg-white text-apple-gray-dark'}`}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <div className={`text-sm font-medium ${getStatusColor()} capitalize`}>
            {event.status}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <div className={`w-3 h-3 rounded-full mr-2 ${getLeaveTypeColor()}`}></div>
            <span className="capitalize">{event.leaveType.replace('-', ' ')} Leave</span>
          </div>
          <p className="text-sm mt-1 text-apple-gray dark:text-dark-text-secondary">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md ${
              isDarkMode
                ? 'bg-dark-bg text-dark-text-primary hover:bg-opacity-80'
                : 'bg-gray-100 text-apple-gray-dark hover:bg-gray-200'
            }`}
          >
            Close
          </button>
          
          {event.status === 'pending' && (
            <button
              onClick={() => onCancel(event.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LeaveCalendar: React.FC = () => {
  const [events, setEvents] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LeaveEvent | null>(null);
  const [selectedDates, setSelectedDates] = useState<DateSelectArg | null>(null);
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [creatingLeave, setCreatingLeave] = useState(false);
  const [cancellingLeave, setCancellingLeave] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const { isDarkMode, applyDarkModeClass } = useTheme();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  const { session } = useAuth();

  // Apply dark mode to calendar when component mounts or theme changes
  useEffect(() => {
    const calendarElement = document.querySelector('.fc');
    if (calendarElement) {
      if (isDarkMode) {
        calendarElement.classList.add('dark-theme-calendar');
      } else {
        calendarElement.classList.remove('dark-theme-calendar');
      }
    }
  }, [isDarkMode]);

  // Effect to apply theme to calendar after it has been initialized
  useEffect(() => {
    // Short delay to ensure calendar is rendered
    const timer = setTimeout(() => {
      applyDarkModeClass();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [applyDarkModeClass]);

  // Fetch leave data with retry mechanism
  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('LeaveCalendar session:', session);
      
      // Use session from useAuth
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }

      // Add caching parameter and auth token
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/leave/calendar?t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      // Format events for the calendar
      const formattedEvents: LeaveEvent[] = response.data.map((leave: FormattedLeaveData) => ({
        id: leave.id,
        title: leave.is_team_member ? `${leave.employee_name}: ${leave.leave_type}` : `${leave.leave_type}`,
        start: leave.start_date,
        end: leave.end_date,
        leaveType: leave.leave_type as 'annual' | 'sick' | 'unpaid' | 'in-lieu',
        status: leave.status as 'approved' | 'pending' | 'rejected',
        allDay: true,
        isTeamMember: leave.is_team_member || false,
        employeeName: leave.employee_name || '',
        reason: leave.reason || ''
      }));
      
      setEvents(formattedEvents);
      setLoading(false);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching leave data:', err);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Employee data not found. Please contact HR.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please try again in a moment.');
      } else {
        setError(err.response?.data?.message || 'Failed to load leave data. Please try again.');
      }
      
      setLoading(false);
      
      // If we haven't reached max retries and it's a server error or network error, retry after delay
      if (retryCount < maxRetries && (err.response?.status >= 500 || !err.response)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchLeaveData();
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }
    }
  };

  // Fetch data on initial load and when retry count changes
  useEffect(() => {
    fetchLeaveData();
  }, [retryCount]);

  // Handle retry button click
  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
    } else {
      // Reset retry count and try again
      setRetryCount(0);
      fetchLeaveData();
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDates(selectInfo);
    setShowNewLeaveModal(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setShowDetailsModal(true);
    }
  };

  const handleCreateLeave = async (leaveData: any) => {
    try {
      setCreatingLeave(true);
      const response = await axios.post('/api/leave/request', leaveData);
      toast.success('Leave request submitted successfully');
      
      // Add the new event to the calendar
      const newEvent: LeaveEvent = {
        id: response.data.id,
        title: `${leaveData.leave_type.charAt(0).toUpperCase() + leaveData.leave_type.slice(1)} Leave`,
        start: leaveData.start_date,
        end: leaveData.end_date,
        leaveType: leaveData.leave_type,
        status: 'pending',
        allDay: true,
        isTeamMember: false,
        employeeName: '',
        reason: ''
      };
      
      setEvents([...events, newEvent]);
      setShowNewLeaveModal(false);
    } catch (err) {
      console.error('Error creating leave request:', err);
      toast.error('Failed to submit leave request');
    } finally {
      setCreatingLeave(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      setCancellingLeave(true);
      await axios.delete(`/api/leave/request/${id}`);
      toast.success('Leave request cancelled successfully');
      
      // Remove the event from the calendar
      setEvents(events.filter(event => event.id !== id));
      setShowDetailsModal(false);
    } catch (err) {
      console.error('Error cancelling leave request:', err);
      toast.error('Failed to cancel leave request');
    } finally {
      setCancellingLeave(false);
    }
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const event = events.find(e => e.id === eventInfo.event.id);
    
    if (!event) return null;
    
    let bgColor = '';
    switch (event.leaveType) {
      case 'annual':
        bgColor = event.status === 'approved' ? 'bg-blue-500' : 'bg-blue-300';
        break;
      case 'sick':
        bgColor = event.status === 'approved' ? 'bg-red-500' : 'bg-red-300';
        break;
      case 'unpaid':
        bgColor = event.status === 'approved' ? 'bg-orange-500' : 'bg-orange-300';
        break;
      case 'in-lieu':
        bgColor = event.status === 'approved' ? 'bg-green-500' : 'bg-green-300';
        break;
      default:
        bgColor = 'bg-gray-500';
    }
    
    return (
      <div className={`px-2 py-1 rounded-sm ${bgColor} text-white flex items-center`}>
        <div className="text-xs truncate">{eventInfo.event.title}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
        <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
        >
          {retryCount >= maxRetries ? 'Try Again' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-white dark:bg-dark-surface rounded-xl shadow-sm p-4">
      {loading ? (
        <div className="flex justify-center items-center h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-[600px]">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none"
          >
            Retry
          </button>
        </div>
      ) : (
        // Use a unique ID for the calendar wrapper to help with theme application
        <div id="leave-calendar-wrapper" className={isDarkMode ? 'dark-theme-calendar' : ''}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth'
            }}
            events={events}
            eventContent={renderEventContent}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            height="auto"
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
          />
        </div>
      )}
      
      {/* New Leave Modal */}
      <NewLeaveModal
        isOpen={showNewLeaveModal}
        onClose={() => setShowNewLeaveModal(false)}
        selectedDates={selectedDates}
        onSubmit={handleCreateLeave}
        isSubmitting={creatingLeave}
      />
      
      {/* Leave Details Modal */}
      <LeaveDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        event={selectedEvent}
        onCancel={handleCancelLeave}
        isCancelling={cancellingLeave}
      />
    </div>
  );
};

export default LeaveCalendar; 