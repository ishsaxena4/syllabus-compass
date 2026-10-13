import { addDays, format, isSameDay, isToday, isTomorrow, isYesterday } from 'date-fns';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CoursePill } from '@/components/shared/CoursePill';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { CompleteToggle } from '@/components/shared/CompleteToggle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { byDueDate } from '@/lib/assignments';
import { cn } from '@/lib/utils';
import type { Assignment, Course } from '@/types';

interface DayDetailSheetProps {
  date: Date | null;
  assignments: Assignment[];
  courses: Course[];
  onDateChange: (date: Date | null) => void;
}

function relativeDay(date: Date): string | null {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return null;
}

// Everything due on one day, opened by clicking a date on the calendar. A side panel
// on desktop and a bottom sheet on phones, so the month stays in view behind it.
export function DayDetailSheet({ date, assignments, courses, onDateChange }: DayDetailSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const dayAssignments = date
    ? assignments.filter((a) => a.dueDate && isSameDay(a.dueDate, date)).sort(byDueDate)
    : [];
  const openCount = dayAssignments.filter((a) => a.status !== 'completed').length;
  const relative = date ? relativeDay(date) : null;

  return (
    <Sheet open={date !== null} onOpenChange={(open) => !open && onDateChange(null)}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col gap-0 p-0', isMobile ? 'max-h-[85vh] rounded-t-2xl' : 'w-full sm:max-w-md')}
      >
        {date && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
              <div className="flex items-center gap-2 pr-8">
                <div className="flex-1 min-w-0">
                  {relative && (
                    <p className="text-xs font-medium text-primary">{relative}</p>
                  )}
                  <SheetTitle className="text-lg">{format(date, 'EEEE, MMMM d')}</SheetTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDateChange(addDays(date, -1))}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDateChange(addDays(date, 1))}
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <SheetDescription>
                {dayAssignments.length === 0
                  ? 'Nothing due'
                  : openCount === 0
                    ? `${dayAssignments.length} item${dayAssignments.length === 1 ? '' : 's'}, all done`
                    : `${openCount} of ${dayAssignments.length} item${dayAssignments.length === 1 ? '' : 's'} left`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {dayAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarCheck className="w-8 h-8 text-course-sage mb-3" />
                  <p className="text-sm font-medium text-foreground">A free day</p>
                  <p className="text-xs text-muted-foreground mt-1">No assignments are due on this date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayAssignments.map((assignment) => {
                    const course = getCourse(assignment.courseId);
                    const done = assignment.status === 'completed';
                    const showBadge = assignment.status === 'due-soon' || assignment.status === 'overdue';
                    return (
                      <div
                        key={assignment.id}
                        className={cn(
                          'rounded-xl border border-border p-4 transition-opacity',
                          done && 'opacity-60',
                        )}
                        style={course ? { borderLeft: `3px solid hsl(var(--course-${course.color}))` } : undefined}
                      >
                        <div className="flex items-start gap-3">
                          <CompleteToggle assignment={assignment} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn('text-sm font-medium text-foreground', done && 'line-through')}>
                                {assignment.title}
                              </p>
                              {showBadge && <StatusBadge status={assignment.status} className="shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Due {assignment.dueDate && format(assignment.dueDate, 'h:mm a')}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              {course && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/courses/${course.id}`)}
                                  className="hover:opacity-80 transition-opacity"
                                  aria-label={`Open ${course.name}`}
                                >
                                  <CoursePill name={course.section || course.name} color={course.color} />
                                </button>
                              )}
                              <AssignmentTypeIcon type={assignment.type} />
                            </div>
                            {assignment.notes && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                                {assignment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
