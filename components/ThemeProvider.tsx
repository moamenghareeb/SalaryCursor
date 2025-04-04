import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  isDarkMode: boolean;
  isLightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize theme from localStorage or default to system
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);

  // Function to update theme in localStorage and DOM
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('salaryCursor-theme', newTheme);
    
    // Apply theme to DOM
    updateDOM(newTheme);
  };

  // Update the DOM based on theme
  const updateDOM = (currentTheme: Theme) => {
    // Handle server-side rendering
    if (typeof window === 'undefined') return;
  
    const root = window.document.documentElement;
    // Properly purge all previous theme classes
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark');
    
    let effectiveTheme: 'light' | 'dark';
    
    // Apply theme based on preference
    if (currentTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      // Also add for backwards compatibility
      root.classList.add(`theme-${systemTheme}`);
      effectiveTheme = systemTheme;
    } else {
      root.classList.add(currentTheme);
      // Also add for backwards compatibility
      root.classList.add(`theme-${currentTheme}`);
      effectiveTheme = currentTheme as 'light' | 'dark';
    }
    
    // Set the data-theme attribute which some components might be using
    root.setAttribute('data-theme', effectiveTheme);
    setResolvedTheme(effectiveTheme);
    
    // Also set a specific attribute for Tailwind dark mode
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-mode', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-mode', 'light');
    }
  };

  // Effect to initialize theme from localStorage and set up system preference listener
  useEffect(() => {
    if (isThemeInitialized) return;
    
    // Get stored theme or default to system
    const storedTheme = localStorage.getItem('salaryCursor-theme') as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      setThemeState('system');
    }
    
    // Set up listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        updateDOM('system');
      }
    };
    
    // Initial DOM update
    updateDOM(storedTheme || 'system');
    setIsThemeInitialized(true);
    
    // Add listener for theme changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, isThemeInitialized]);

  // Effect to handle theme changes after initialization
  useEffect(() => {
    if (isThemeInitialized) {
      updateDOM(theme);
    }
  }, [theme, isThemeInitialized]);

  const value = {
    theme,
    setTheme,
    resolvedTheme,
    isDarkMode: resolvedTheme === 'dark',
    isLightMode: resolvedTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
