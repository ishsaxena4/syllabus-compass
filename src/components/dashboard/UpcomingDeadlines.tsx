import { useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ChevronRight, ChevronDown, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Assignment, Course } from '@/types';
import { CoursePill } from '@/components/shared/CoursePill';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { CompleteToggle } from '@/components/shared/CompleteToggle';
import { Button } from '@/components/ui/button';
import { byDueDate, dueWithin, isOverdue } from '@/lib/assignments';
import { useSetAssignmentsCompleted } from '@/hooks/useAcademicData';

const WINDOW_DAYS = 7;

interface UpcomingDeadlinesProps {
  assignments: Assignment[];
  courses: Course[];
}

function formatDueDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function UpcomingDeadlines({ assignments, courses }: UpcomingDeadlinesProps) {
  const navigate = useNavigate();
  const { mutate: setCompleted } = useSetAssignmentsCompleted();
  const [showPast, setShowPast] = useState(false);
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const upcoming = assignments.filter((a) => dueWithin(a, WINDOW_DAYS)).sort(byDueDate);
  const past = assignments.filter(isOverdue).sort(byDueDate);

  function markAllPastDone() {
    const ids = past.map((a) => a.id);
    setCompleted(
      { ids, completed: true },
      { onError: () => toast.error('Could not save. Please try again.') },
    );
    setShowPast(false);
    toast.success(`Marked ${ids.length} past item${ids.length === 1 ? '' : 's'} done`, {
      action: { label: 'Undo', onClick: () => setCompleted({ ids, completed: false }) },
    });
  }

  function renderRow(assignment: Assignment) {
    const course = getCourse(assignment.courseId);
    if (!course || !assignment.dueDate) return null;

    return (
      <div
        key={assignment.id}
        onClick={() => navigate(`/courses/${course.id}`)}
        className="group flex items-center gap-4 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
      >
        <CompleteToggle assignment={assignment} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate mb-1">{assignment.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <CoursePill name={course.section || course.name} color={course.color} />
            <AssignmentTypeIcon type={assignment.type} />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{formatDueDate(assignment.dueDate)}</p>
            <p className="text-xs text-muted-foreground">{format(assignment.dueDate, 'h:mm a')}</p>
          </div>
          {assignment.status === 'due-soon' && <StatusBadge status="due-soon" />}
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Upcoming Deadlines</h2>
        <span className="text-xs text-muted-foreground">Next {WINDOW_DAYS} days</span>
      </div>

      {past.length > 0 && (
        <div className="mb-3 rounded-lg bg-secondary/50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPast ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {past.length} past item{past.length === 1 ? '' : 's'} not checked off
            </button>
            <button
              type="button"
              onClick={markAllPastDone}
              className="ml-auto font-medium text-foreground hover:underline"
            >
              Mark all done
            </button>
          </div>
          {showPast && <div className="mt-2 space-y-1">{past.map(renderRow)}</div>}
        </div>
      )}

      {upcoming.length > 0 ? (
        <div className="space-y-3 stagger-children">{upcoming.map(renderRow)}</div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarCheck className="w-6 h-6 text-course-sage mb-2" />
          <p className="text-sm font-medium text-foreground">Nothing due this week</p>
        </div>
      )}

      <Button variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-foreground" onClick={() => navigate('/calendar')}>
        View all assignments
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
