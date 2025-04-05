import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  applyDarkModeClass: (elementId?: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Helper function to apply class to document and specific elements
  const applyDarkModeClass = useCallback((elementId?: string) => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.classList.add('dark-theme-calendar');
        }
      }
      
      // Apply to all calendar elements
      const calendarElements = document.querySelectorAll('.fc');
      calendarElements.forEach(element => {
        element.classList.add('dark-theme-calendar');
      });
    } else {
      document.documentElement.classList.remove('dark');
      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          element.classList.remove('dark-theme-calendar');
        }
      }
      
      // Remove from all calendar elements
      const calendarElements = document.querySelectorAll('.fc');
      calendarElements.forEach(element => {
        element.classList.remove('dark-theme-calendar');
      });
    }
  }, [isDarkMode]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Check for user preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDarkMode);
    
    // Apply theme to document immediately
    const html = document.documentElement;
    if (shouldUseDarkMode) {
      html.classList.add('dark');
      // Apply to all calendar elements that might exist
      const calendarElements = document.querySelectorAll('.fc');
      calendarElements.forEach(element => {
        element.classList.add('dark-theme-calendar');
      });
    } else {
      html.classList.remove('dark');
      // Remove from all calendar elements that might exist
      const calendarElements = document.querySelectorAll('.fc');
      calendarElements.forEach(element => {
        element.classList.remove('dark-theme-calendar');
      });
    }
    
    // Listen for theme changes on the documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === 'class' &&
          mutation.target === document.documentElement
        ) {
          const hasDarkClass = document.documentElement.classList.contains('dark');
          if (hasDarkClass !== isDarkMode) {
            setIsDarkMode(hasDarkClass);
            
            // Update calendar elements when document class changes
            const calendarElements = document.querySelectorAll('.fc');
            calendarElements.forEach(element => {
              if (hasDarkClass) {
                element.classList.add('dark-theme-calendar');
              } else {
                element.classList.remove('dark-theme-calendar');
              }
            });
          }
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    setMounted(true);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme');
      // Only apply system preference if user hasn't explicitly chosen a theme
      if (!savedTheme) {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
          // Apply to all calendar elements
          const calendarElements = document.querySelectorAll('.fc');
          calendarElements.forEach(element => {
            element.classList.add('dark-theme-calendar');
          });
        } else {
          document.documentElement.classList.remove('dark');
          // Remove from all calendar elements
          const calendarElements = document.querySelectorAll('.fc');
          calendarElements.forEach(element => {
            element.classList.remove('dark-theme-calendar');
          });
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  // Observer for dynamically added calendar elements
  useEffect(() => {
    if (!mounted) return;
    
    // Create observer for new elements
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Check for calendar elements
              const calendars = node.querySelectorAll('.fc');
              if (calendars.length > 0 || node.classList.contains('fc')) {
                // Apply theme to newly added calendar elements
                if (isDarkMode) {
                  if (node.classList.contains('fc')) {
                    node.classList.add('dark-theme-calendar');
                  }
                  calendars.forEach(cal => cal.classList.add('dark-theme-calendar'));
                }
              }
            }
          });
        }
      });
    });
    
    // Start observing the document body
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      bodyObserver.disconnect();
    };
  }, [isDarkMode, mounted]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        // Apply to all calendar elements
        const calendarElements = document.querySelectorAll('.fc');
        calendarElements.forEach(element => {
          element.classList.add('dark-theme-calendar');
        });
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        // Remove from all calendar elements
        const calendarElements = document.querySelectorAll('.fc');
        calendarElements.forEach(element => {
          element.classList.remove('dark-theme-calendar');
        });
      }
      return newMode;
    });
  }, []);

  // Avoid rendering children until after theme has been set
  // This prevents flash of wrong theme during hydration
  if (!mounted) {
    return <div className="hidden" />;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, applyDarkModeClass }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 