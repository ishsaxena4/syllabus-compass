import { Check } from 'lucide-react';
import { useTheme, themeOptions, ThemeColor } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {themeOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => setTheme(option.id)}
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200',
            'ring-offset-2 ring-offset-background',
            theme === option.id ? 'ring-2 ring-foreground/20 scale-110' : 'hover:scale-105'
          )}
          style={{ backgroundColor: option.color }}
          title={option.label}
        >
          {theme === option.id && (
            <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}
