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

// Every exam in the course on one vertical line, so the semester's big dates read at a
// glance: finished ones fade, the next one is highlighted, undated ones sit at the end.
export function ExamTimeline({ assignments }: ExamTimelineProps) {
  const exams = assignments.filter((a) => a.type === 'exam').sort(byDueDate);
  if (exams.length === 0) return null;

  const isPast = (a: Assignment) =>
    a.status === 'completed' || a.status === 'overdue';
  const nextId = exams.find((a) => a.dueDate && !isPast(a))?.id;
  const remaining = exams.filter((a) => !isPast(a)).length;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Exams
        </h2>
        <span className="text-xs text-muted-foreground">
          {remaining === 0 ? 'All done' : `${remaining} of ${exams.length} remaining`}
        </span>
      </div>

      <ol className="relative">
        {exams.map((exam, index) => {
          const past = isPast(exam);
          const isNext = exam.id === nextId;
          const isLast = index === exams.length - 1;

          return (
            <li key={exam.id} className="relative flex gap-4 pb-4 last:pb-0">
              {/* Rail */}
              {!isLast && (
                <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
              )}
              <span
                className={cn(
                  'relative z-10 mt-1 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border-2',
                  past && 'border-muted-foreground/30 bg-secondary',
                  isNext && 'border-foreground bg-foreground text-background',
                  !past && !isNext && 'border-border bg-card',
                )}
              >
                {past ? (
                  <Check className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <GraduationCap className={cn('w-3.5 h-3.5', !isNext && 'text-muted-foreground')} />
                )}
              </span>

              <div
                className={cn(
                  'flex flex-1 min-w-0 items-center gap-3 rounded-lg px-3 py-2',
                  isNext && 'bg-secondary/60',
                  past && 'opacity-60',
                )}
              >
                <div className="w-11 shrink-0 text-center">
                  {exam.dueDate ? (
                    <>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {format(exam.dueDate, 'MMM')}
                      </p>
                      <p className="text-lg font-semibold leading-tight text-foreground">
                        {format(exam.dueDate, 'd')}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-medium text-muted-foreground">TBA</p>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium text-foreground truncate', past && 'line-through')}>
                    {exam.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exam.dueDate ? format(exam.dueDate, 'EEEE · h:mm a') : 'Date not announced yet'}
                  </p>
                </div>

                <span
                  className={cn(
                    'shrink-0 text-xs',
                    isNext ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {past ? 'Done' : exam.dueDate ? countdown(exam.dueDate) : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
