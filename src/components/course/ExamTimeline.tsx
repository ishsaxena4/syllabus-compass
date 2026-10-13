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
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} wks`;
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
    <div className="card-elevated px-4 pt-3.5 pb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {/* Label sits beside the strip on wider screens to keep the card one row tall. */}
      <div className="flex items-center justify-between sm:block sm:w-24 sm:shrink-0">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4" />
          Exams
        </h2>
        <p className="text-[11px] text-muted-foreground">
          {remaining === 0 ? 'All done' : `${remaining} of ${exams.length} left`}
        </p>
      </div>

      <ol className="flex flex-1 min-w-0 overflow-x-auto pt-1.5 pb-0.5">
        {exams.map((exam, index) => {
          const past = isPast(exam);
          const isNext = exam.id === nextId;
          const isFirst = index === 0;
          const isLast = index === exams.length - 1;
          const when = exam.dueDate ? format(exam.dueDate, 'MMM d') : 'TBA';
          const status = past ? 'done' : exam.dueDate ? countdown(exam.dueDate) : 'not announced';

          return (
            <li
              key={exam.id}
              className="relative flex-1 min-w-[96px] px-1 flex flex-col items-center text-center"
              title={exam.dueDate ? `${exam.title} · ${format(exam.dueDate, 'EEEE, MMM d · h:mm a')}` : exam.title}
            >
              {/* Line segments to the neighbouring stops, drawn behind the dot. */}
              {!isFirst && <span className="absolute top-[8px] left-0 right-1/2 h-px bg-border" aria-hidden />}
              {!isLast && <span className="absolute top-[8px] left-1/2 right-0 h-px bg-border" aria-hidden />}

              <span
                className={cn(
                  'relative z-10 flex h-[17px] w-[17px] items-center justify-center rounded-full border',
                  past && 'border-muted-foreground/30 bg-secondary',
                  isNext && 'border-foreground bg-foreground text-background',
                  !past && !isNext && 'border-muted-foreground/40 bg-card',
                )}
              >
                {past && <Check className="w-2.5 h-2.5 text-muted-foreground" />}
              </span>

              <div className={cn('mt-1 w-full min-w-0', past && 'opacity-60')}>
                <p className={cn('text-xs font-medium text-foreground truncate', past && 'line-through')}>
                  {exam.title}
                </p>
                <p
                  className={cn(
                    'text-[11px] truncate',
                    isNext ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {when} · {status}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
