import React, { useRef, useEffect } from 'react';
import { toast, Toast, ToastPosition, Toaster, resolveValue } from 'react-hot-toast';
import { useTheme } from '../lib/themeContext';
import { FiX } from 'react-icons/fi';

interface CustomToastProps {
  position?: ToastPosition;
}

// Swipeable toast component
const SwipeableToast = ({ t, isDarkMode }: { t: Toast; isDarkMode: boolean }) => {
  const toastRef = useRef<HTMLDivElement>(null);
  let touchStartX = 0;
  let touchEndX = 0;

  useEffect(() => {
    const toastEl = toastRef.current;
    if (!toastEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX = e.touches[0].clientX;
      const diffX = touchEndX - touchStartX;
      
      // Only allow swiping right for right-positioned toasts and left for left-positioned toasts
      if ((t.position?.includes('right') && diffX < 0) || 
          (t.position?.includes('left') && diffX > 0) ||
          (!t.position && diffX < 0)) { // Default is top-right
        // Calculate the amount to translate, capped at 100px
        const translateX = Math.min(Math.abs(diffX), 100) * (diffX < 0 ? -1 : 1);
        toastEl.style.transform = `translateX(${translateX}px)`;
        toastEl.style.opacity = `${1 - Math.abs(diffX) / 200}`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = touchEndX - touchStartX;
      const swipeDistance = Math.abs(diffX);
      
      // If swipe is significant enough, dismiss the toast
      if (swipeDistance > 100) {
        toast.dismiss(t.id);
      } else {
        // Reset position if swipe wasn't complete
        toastEl.style.transform = 'translateX(0)';
        toastEl.style.opacity = '1';
      }
    };

    toastEl.addEventListener('touchstart', handleTouchStart);
    toastEl.addEventListener('touchmove', handleTouchMove);
    toastEl.addEventListener('touchend', handleTouchEnd);

    return () => {
      toastEl.removeEventListener('touchstart', handleTouchStart);
      toastEl.removeEventListener('touchmove', handleTouchMove);
      toastEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [t.id, t.position]);

  return (
    <div
      ref={toastRef}
      className="flex items-center w-full justify-between"
      style={{
        animation: t.visible ? 'toast-enter 0.35s ease' : 'toast-exit 0.4s ease forwards',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      <div className="flex-1 mr-3 font-medium">
        {resolveValue(t.message, t)}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className={`flex items-center justify-center w-6 h-6 rounded-full ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
        } transition-colors`}
        aria-label="Close toast"
      >
        <FiX className="w-3 h-3" />
      </button>
    </div>
  );
};

export const CustomToast: React.FC<CustomToastProps> = ({ position = 'top-right' }) => {
  const { isDarkMode } = useTheme();

  return (
    <Toaster
      position={position}
      gutter={12}
      containerStyle={{
        top: 24,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          maxWidth: '420px',
          borderRadius: '8px',
          background: isDarkMode ? '#1e293b' : '#ffffff',
          color: isDarkMode ? '#e2e8f0' : '#334155',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px 16px',
          border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        success: {
          style: {
            borderLeft: '4px solid #10B981',
          },
          iconTheme: {
            primary: '#10B981',
            secondary: 'white',
          },
        },
        error: {
          style: {
            borderLeft: '4px solid #EF4444',
          },
          iconTheme: {
            primary: '#EF4444',
            secondary: 'white',
          },
        },
        loading: {
          style: {
            borderLeft: '4px solid #3B82F6',
          },
          iconTheme: {
            primary: '#3B82F6',
            secondary: 'white',
          },
        },
      }}
    >
      {(t) => <SwipeableToast t={t} isDarkMode={isDarkMode} />}
    </Toaster>
  );
};

// Add CSS for toast animations
export const toastStyles = `
@keyframes toast-enter {
  0% {transform: translateX(100%); opacity: 0;}
  100% {transform: translateX(0); opacity: 1;}
}

@keyframes toast-exit {
  0% {transform: translateX(0); opacity: 1;}
  100% {transform: translateX(100%); opacity: 0;}
}

@media (prefers-reduced-motion) {
  @keyframes toast-enter {
    0% {opacity: 0;}
    100% {opacity: 1;}
  }
  
  @keyframes toast-exit {
    0% {opacity: 1;}
    100% {opacity: 0;}
  }
}
`; 