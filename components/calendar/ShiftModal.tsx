import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format } from 'date-fns';
import { ShiftType, ScheduleDay } from './DayCell';

interface ShiftModalProps {
  isOpen: boolean;
  closeModal: () => void;
  selectedDay: ScheduleDay | null;
  onSave: (updatedDay: ScheduleDay) => void;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  closeModal,
  selectedDay,
  onSave,
}) => {
  const [shiftType, setShiftType] = React.useState<ShiftType>('Day');
  const [notes, setNotes] = React.useState('');

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (selectedDay) {
      setShiftType(selectedDay.type);
      setNotes(selectedDay.notes || '');
    }
  }, [selectedDay]);

  const handleSave = () => {
    if (!selectedDay) return;
    
    const updatedDay: ScheduleDay = {
      ...selectedDay,
      type: shiftType,
      notes: notes.trim() || undefined,
    };
    
    onSave(updatedDay);
    closeModal();
  };

  if (!selectedDay) return null;

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={closeModal}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-white border-b border-gray-700 pb-2"
              >
                Edit Shift - {format(selectedDay.date, 'MMMM d, yyyy')}
              </Dialog.Title>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Shift Type
                </label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as ShiftType)}
                  className="w-full p-2 mb-4 bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select shift type"
                >
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                  <option value="Off">Off</option>
                  <option value="Leave">Leave</option>
                  <option value="Public">Public Holiday</option>
                  <option value="Overtime">Overtime</option>
                </select>

                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  aria-label="Shift notes"
                  placeholder="Add any notes about this shift"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  onClick={handleSave}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ShiftModal; 