import { useState, useEffect } from 'react';

export type ThemeColor = 'neutral' | 'sage' | 'ocean' | 'rose' | 'amber' | 'lavender';
export type DarkMode = 'light' | 'dark';

const THEME_KEY = 'syllabus-os-theme';
const DARK_MODE_KEY = 'syllabus-os-dark-mode';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_KEY) as ThemeColor) || 'neutral';
    }
    return 'neutral';
  });

  const [darkMode, setDarkMode] = useState<DarkMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DARK_MODE_KEY) as DarkMode;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-neutral', 'theme-sage', 'theme-ocean', 'theme-rose', 'theme-amber', 'theme-lavender');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
    
    // Save to localStorage
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (darkMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem(DARK_MODE_KEY, darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, setTheme, darkMode, toggleDarkMode };
}

export const themeOptions: { id: ThemeColor; label: string; color: string }[] = [
  { id: 'neutral', label: 'Neutral', color: 'hsl(220 20% 15%)' },
  { id: 'sage', label: 'Sage', color: 'hsl(150 30% 45%)' },
  { id: 'ocean', label: 'Ocean', color: 'hsl(200 80% 45%)' },
  { id: 'rose', label: 'Rose', color: 'hsl(340 65% 55%)' },
  { id: 'amber', label: 'Amber', color: 'hsl(38 92% 50%)' },
  { id: 'lavender', label: 'Lavender', color: 'hsl(270 50% 60%)' },
];
