import { CourseColor } from '@/types';
import { cn } from '@/lib/utils';

interface CoursePillProps {
  name: string;
  color: CourseColor;
  className?: string;
}

const colorClasses: Record<CourseColor, string> = {
  sage: 'course-pill-sage',
  coral: 'course-pill-coral',
  sky: 'course-pill-sky',
  amber: 'course-pill-amber',
  lavender: 'course-pill-lavender',
  rose: 'course-pill-rose',
};

export function CoursePill({ name, color, className }: CoursePillProps) {
  return (
    <span className={cn(colorClasses[color], className)}>
      {name}
    </span>
  );
}
