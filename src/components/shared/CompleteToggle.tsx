import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSetAssignmentsCompleted } from '@/hooks/useAcademicData';
import type { Assignment } from '@/types';

interface CompleteToggleProps {
  assignment: Assignment;
  className?: string;
}

export function CompleteToggle({ assignment, className }: CompleteToggleProps) {
  const { mutate } = useSetAssignmentsCompleted();
  const done = assignment.status === 'completed';

  function toggle(e: React.MouseEvent) {
    // Rows are clickable; checking an item off should not also open it.
    e.stopPropagation();
    const completed = !done;
    mutate(
      { ids: [assignment.id], completed },
      { onError: () => toast.error('Could not save. Please try again.') },
    );
    if (completed) {
      toast.success(`Done: ${assignment.title}`, {
        action: { label: 'Undo', onClick: () => mutate({ ids: [assignment.id], completed: false }) },
      });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={done ? `Mark ${assignment.title} as not done` : `Mark ${assignment.title} as done`}
      aria-pressed={done}
      className={cn(
        'group/check w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
        done
          ? 'border-course-sage bg-course-sage'
          : 'border-muted-foreground/30 hover:border-course-sage hover:bg-course-sage/10',
        className,
      )}
    >
      <Check
        className={cn(
          'w-3 h-3 transition-colors',
          done ? 'text-white' : 'text-transparent group-hover/check:text-course-sage',
        )}
      />
    </button>
  );
}
