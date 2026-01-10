import { useState, useEffect } from 'react';

export type ThemeColor = 'neutral' | 'sage' | 'ocean' | 'rose' | 'amber' | 'lavender';

const THEME_KEY = 'syllabus-os-theme';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_KEY) as ThemeColor) || 'neutral';
    }
    return 'neutral';
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

  return { theme, setTheme };
}

export const themeOptions: { id: ThemeColor; label: string; color: string }[] = [
  { id: 'neutral', label: 'Neutral', color: 'hsl(220 20% 15%)' },
  { id: 'sage', label: 'Sage', color: 'hsl(150 30% 45%)' },
  { id: 'ocean', label: 'Ocean', color: 'hsl(200 80% 45%)' },
  { id: 'rose', label: 'Rose', color: 'hsl(340 65% 55%)' },
  { id: 'amber', label: 'Amber', color: 'hsl(38 92% 50%)' },
  { id: 'lavender', label: 'Lavender', color: 'hsl(270 50% 60%)' },
];
