import { differenceInCalendarDays, format } from 'date-fns';
import { Check, GraduationCap } from 'lucide-react';
import { byDueDate } from '@/lib/assignments';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/types';

interface ExamTimelineProps {
  assignments: Assignment[];
}

function countdown(date: Date): string {
  const days = differenceInCalendarDays(date, new Date());
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

// The course's exams as stops on one horizontal line, so the semester's big dates read
// at a glance in a short card: finished ones fade, the next one is filled in, and
// undated ones sit at the end as TBA. Scrolls sideways only if there are many.
export function ExamTimeline({ assignments }: ExamTimelineProps) {
  const exams = assignments.filter((a) => a.type === 'exam').sort(byDueDate);
  if (exams.length === 0) return null;

  const isPast = (a: Assignment) => a.status === 'completed' || a.status === 'overdue';
  const nextId = exams.find((a) => a.dueDate && !isPast(a))?.id;
  const remaining = exams.filter((a) => !isPast(a)).length;

  return (
    <div className="card-elevated px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Exams
        </h2>
        <span className="text-xs text-muted-foreground">
          {remaining === 0 ? 'All done' : `${remaining} of ${exams.length} remaining`}
        </span>
      </div>

      <ol className="flex overflow-x-auto -mx-1 pb-1">
        {exams.map((exam, index) => {
          const past = isPast(exam);
          const isNext = exam.id === nextId;
          const isFirst = index === 0;
          const isLast = index === exams.length - 1;

          return (
            <li
              key={exam.id}
              className="relative flex-1 min-w-[96px] px-1 flex flex-col items-center text-center"
              title={exam.dueDate ? `${exam.title} · ${format(exam.dueDate, 'EEEE, MMM d · h:mm a')}` : exam.title}
            >
              {/* Line segments to the neighbouring stops, drawn behind the dot. */}
              {!isFirst && <span className="absolute top-[11px] left-0 right-1/2 h-px bg-border" aria-hidden />}
              {!isLast && <span className="absolute top-[11px] left-1/2 right-0 h-px bg-border" aria-hidden />}

              <span
                className={cn(
                  'relative z-10 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2',
                  past && 'border-muted-foreground/30 bg-secondary',
                  isNext && 'border-foreground bg-foreground text-background',
                  !past && !isNext && 'border-border bg-card',
                )}
              >
                {past ? (
                  <Check className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <GraduationCap className={cn('w-3 h-3', !isNext && 'text-muted-foreground')} />
                )}
              </span>

              <div className={cn('mt-2 w-full min-w-0', past && 'opacity-60')}>
                <p className="text-xs font-semibold text-foreground">
                  {exam.dueDate ? format(exam.dueDate, 'MMM d') : 'TBA'}
                </p>
                <p className={cn('text-xs text-foreground truncate', past && 'line-through')}>
                  {exam.title}
                </p>
                <p
                  className={cn(
                    'text-[11px]',
                    isNext ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {past
                    ? 'Done'
                    : exam.dueDate
                      ? countdown(exam.dueDate)
                      : 'Not announced'}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
