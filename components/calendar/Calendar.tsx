import React from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import DayCell, { ScheduleDay, ShiftType } from './DayCell';
import ShiftModal from './ShiftModal';

interface CalendarProps {
  shifts: Record<string, ShiftType>;
  notes?: Record<string, string>;
  onUpdateShift: (date: string, type: ShiftType, notes?: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ shifts, notes = {}, onUpdateShift }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<ScheduleDay | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Generate all dates for the calendar view (including overflow days from prev/next months)
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    }).map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date,
        type: shifts[dateStr] || 'Day',
        notes: notes[dateStr],
        inCurrentMonth: isSameMonth(date, monthStart),
      } as ScheduleDay;
    });
  }, [currentDate, shifts, notes]);

  // Navigate to previous/next month
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Handle click on a day cell
  const handleDayClick = (day: ScheduleDay) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  // Handle shift update from modal
  const handleSaveShift = (updatedDay: ScheduleDay) => {
    const dateStr = format(updatedDay.date, 'yyyy-MM-dd');
    onUpdateShift(dateStr, updatedDay.type, updatedDay.notes);
  };

  return (
    <div className="p-3 bg-gray-900 rounded-lg shadow-lg">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600"
            aria-label="Previous month"
          >
            &lt;
          </button>
          <button
            onClick={goToToday}
            className="p-2 bg-blue-600 rounded hover:bg-blue-500 text-sm"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600"
            aria-label="Next month"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-gray-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border border-gray-700 rounded overflow-hidden">
        {calendarDays.map((day, index) => (
          <DayCell
            key={index}
            day={day}
            currentDate={currentDate}
            onClick={handleDayClick}
          />
        ))}
      </div>

      {/* Shift Edit Modal */}
      <ShiftModal
        isOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        selectedDay={selectedDay}
        onSave={handleSaveShift}
      />
    </div>
  );
};

export default Calendar; 