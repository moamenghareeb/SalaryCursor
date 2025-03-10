import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { useTheme } from '../lib/themeContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
  const [isNewLeaveModalOpen, setIsNewLeaveModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<DateSelectArg | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LeaveEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/leave/calendar', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      // Process the response data to format for calendar
      const formattedEvents = response.data.map((leave: any) => {
        // Parse dates to add a day to end date for proper display
        const endDate = new Date(leave.end_date);
        endDate.setDate(endDate.getDate() + 1);
        
        // Set event title based on whether it's the user's leave or a team member's
        const title = leave.is_team_member 
          ? `${leave.employee_name}: ${leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave` 
          : `${leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave`;
        
        return {
          id: leave.id,
          title,
          start: leave.start_date,
          end: endDate.toISOString().split('T')[0],
          leaveType: leave.leave_type,
          status: leave.status,
          allDay: true,
          isTeamMember: leave.is_team_member,
          employeeName: leave.employee_name,
          reason: leave.reason
        };
      });
      
      setEvents(formattedEvents);
    } catch (err: any) {
      console.error('Error fetching leave data:', err);
      let errorMessage = 'Failed to load leave data';
      
      // Extract more specific error message if available
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchLeaveData();
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDates(selectInfo);
    setIsNewLeaveModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsDetailsModalOpen(true);
    }
  };

  const handleCreateLeave = async (leaveData: any) => {
    try {
      setIsSubmitting(true);
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
      setIsNewLeaveModalOpen(false);
    } catch (err) {
      console.error('Error creating leave request:', err);
      toast.error('Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      setIsCancelling(true);
      await axios.delete(`/api/leave/request/${id}`);
      toast.success('Leave request cancelled successfully');
      
      // Remove the event from the calendar
      setEvents(events.filter(event => event.id !== id));
      setIsDetailsModalOpen(false);
    } catch (err) {
      console.error('Error cancelling leave request:', err);
      toast.error('Failed to cancel leave request');
    } finally {
      setIsCancelling(false);
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
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 text-apple-gray-dark dark:text-dark-text-primary">
        <p className="text-center mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 transition-colors">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">
          Leave Calendar
        </h2>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-xs text-apple-gray dark:text-dark-text-secondary">Annual</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span className="text-xs text-apple-gray dark:text-dark-text-secondary">Sick</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
            <span className="text-xs text-apple-gray dark:text-dark-text-secondary">Unpaid</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs text-apple-gray dark:text-dark-text-secondary">In-Lieu</span>
          </div>
        </div>
      </div>
      
      <div className={`leave-calendar ${isDarkMode ? 'dark-theme-calendar' : ''}`}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          events={events}
          height="auto"
          eventBackgroundColor={isDarkMode ? '#1e1e1e' : '#f5f5f7'}
          eventBorderColor={isDarkMode ? '#2a2a2a' : '#e2e2e2'}
          eventTextColor={isDarkMode ? '#ffffff' : '#1d1d1f'}
          dayHeaderClassNames={isDarkMode ? 'text-dark-text-primary' : 'text-apple-gray-dark'}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week'
          }}
          buttonIcons={{
            prev: 'chevron-left',
            next: 'chevron-right'
          }}
          themeSystem="standard"
          dayCellClassNames={isDarkMode ? 'dark-calendar-cell' : ''}
          dayHeaderContent={(args) => {
            return (
              <div className={`text-sm font-medium ${isDarkMode ? 'text-dark-text-primary' : 'text-apple-gray-dark'}`}>
                {args.text}
              </div>
            )
          }}
        />
      </div>
      
      <NewLeaveModal
        isOpen={isNewLeaveModalOpen}
        onClose={() => setIsNewLeaveModalOpen(false)}
        selectedDates={selectedDates}
        onSubmit={handleCreateLeave}
        isSubmitting={isSubmitting}
      />
      
      <LeaveDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        onCancel={handleCancelLeave}
        isCancelling={isCancelling}
      />
      
      <style jsx global>{`
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: ${isDarkMode ? '#2a2a2a' : '#e5e5e5'};
        }
        
        .fc-theme-standard .fc-scrollgrid {
          border-color: ${isDarkMode ? '#2a2a2a' : '#e5e5e5'};
        }
        
        .fc-col-header-cell-cushion,
        .fc-daygrid-day-number {
          color: ${isDarkMode ? '#b3b3b3' : 'inherit'};
        }
        
        .fc-dark-theme .fc-button-primary {
          background-color: #1e1e1e;
          border-color: #2a2a2a;
          color: #fff;
        }
        
        .fc-dark-theme .fc-button-primary:hover {
          background-color: #2a2a2a;
        }
        
        .fc-dark-theme .fc-button-primary:disabled {
          background-color: #1e1e1e;
          opacity: 0.6;
        }
        
        .fc-dark-theme .fc-button-active {
          background-color: #0071e3 !important;
          border-color: #0071e3 !important;
        }
        
        .fc-day-today {
          background-color: ${isDarkMode ? 'rgba(0, 113, 227, 0.1)' : 'rgba(0, 113, 227, 0.05)'} !important;
        }
      `}</style>
    </div>
  );
};

export default LeaveCalendar; 