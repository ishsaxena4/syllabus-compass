import { Palette, Check } from 'lucide-react';
import { useTheme, themeOptions } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-secondary"
        >
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Choose theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">Theme</p>
          <div className="flex items-center gap-1.5">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200',
                  'ring-offset-1 ring-offset-background',
                  theme === option.id ? 'ring-2 ring-foreground/30 scale-110' : 'hover:scale-110'
                )}
                style={{ backgroundColor: option.color }}
                title={option.label}
              >
                {theme === option.id && (
                  <Check className="w-3 h-3 text-white drop-shadow-sm" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
