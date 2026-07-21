import { createContext, useContext, useState, useEffect } from 'react';

/**
 * ThemeContext
 * Provides dark | light | sunshine theme switching.
 * Persists to localStorage and applies CSS class to <html>.
 */

export const THEMES = {
  dark:      'dark',
  light:     'light',
  sunshine:  'sunshine',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nex_theme') || THEMES.dark;
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes then apply current
    root.classList.remove('dark', 'light', 'sunshine');
    root.classList.add(theme);
    localStorage.setItem('nex_theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((t) => {
      if (t === THEMES.dark)     return THEMES.light;
      if (t === THEMES.light)    return THEMES.sunshine;
      return THEMES.dark;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
