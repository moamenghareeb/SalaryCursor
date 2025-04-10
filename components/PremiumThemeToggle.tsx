import React from 'react';
import { useTheme } from '../lib/themeContext';
import { motion } from 'framer-motion';
import { FiMoon, FiSun } from 'react-icons/fi';

const PremiumThemeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <motion.button
      onClick={toggleDarkMode}
      className={`
        flex items-center justify-center
        w-9 h-9 rounded-full
        ${isDarkMode 
          ? 'bg-blue-500/10 text-blue-500' 
          : 'bg-yellow-500/10 text-yellow-500'
        }
        transition-all duration-300
      `}
      whileTap={{ scale: 0.9 }}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <FiMoon className="w-5 h-5" />
      ) : (
        <FiSun className="w-5 h-5" />
      )}
    </motion.button>
  );
};

export default PremiumThemeToggle; 