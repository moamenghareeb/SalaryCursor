import React from 'react';
import { useTheme } from '../lib/themeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface focus:outline-none"
    >
      {isDarkMode ? (
        <FiSun className="h-5 w-5 text-yellow-400" />
      ) : (
        <FiMoon className="h-5 w-5 text-gray-600" />
      )}
    </button>
  );
};

export default DarkModeToggle; 