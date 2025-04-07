import React from 'react';
import { useTheme } from '../lib/themeContext';
import { motion } from 'framer-motion';

const PremiumThemeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center justify-center">
      <motion.button
        onClick={toggleDarkMode}
        className={`
          relative w-12 h-7 rounded-full 
          transition-all duration-300 ease-in-out
          ${isDarkMode 
            ? 'bg-blue-500 shadow-inner shadow-blue-600/20' 
            : 'bg-gray-100 shadow-inner'
          }
          before:content-[''] 
          before:absolute before:inset-0 
          before:rounded-full before:transition-opacity
          ${isDarkMode
            ? 'before:bg-gradient-to-b before:from-blue-400 before:to-blue-600 before:opacity-100'
            : 'before:bg-gradient-to-b before:from-gray-100 before:to-gray-200 before:opacity-100'
          }
        `}
        whileTap={{ scale: 0.95 }}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <motion.div
          className={`
            absolute top-1/2 -mt-[10px] left-[2px]
            w-5 h-5 rounded-full
            shadow-lg
            flex items-center justify-center
            ${isDarkMode 
              ? 'bg-white' 
              : 'bg-white'
            }
          `}
          animate={{
            x: isDarkMode ? 20 : 0,
            backgroundColor: isDarkMode ? '#ffffff' : '#ffffff',
            boxShadow: isDarkMode 
              ? '0 2px 4px rgba(0, 0, 0, 0.2)' 
              : '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
          <div className={`
            absolute inset-0 rounded-full
            transition-opacity duration-200
            ${isDarkMode
              ? 'bg-gradient-to-b from-white to-gray-100 opacity-100'
              : 'bg-gradient-to-b from-white to-gray-100 opacity-100'
            }
          `} />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default PremiumThemeToggle; 