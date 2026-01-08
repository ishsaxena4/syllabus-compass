import { format, isToday, isTomorrow } from 'date-fns';
import { ChevronRight, Check } from 'lucide-react';
import { Assignment, Course } from '@/types';
import { CoursePill } from '@/components/shared/CoursePill';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { Button } from '@/components/ui/button';

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
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Upcoming Deadlines</h2>
        <span className="text-xs text-muted-foreground">Next 7 days</span>
      </div>

      <div className="space-y-3 stagger-children">
        {assignments.map((assignment) => {
          const course = getCourse(assignment.courseId);
          if (!course) return null;

          return (
            <div
              key={assignment.id}
              className="group flex items-center gap-4 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <button className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-course-sage hover:bg-course-sage/10 transition-colors shrink-0">
                <Check className="w-3 h-3 text-transparent group-hover:text-muted-foreground/50" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {assignment.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CoursePill name={course.section || course.name} color={course.color} />
                  <AssignmentTypeIcon type={assignment.type} />
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatDueDate(assignment.dueDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(assignment.dueDate, 'h:mm a')}
                  </p>
                </div>
                <StatusBadge status={assignment.status} />
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-foreground">
        View all assignments
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
