import { format, isToday, isTomorrow } from 'date-fns';
import { Clock, Check } from 'lucide-react';
import { Assignment, Course } from '@/types';
import { CoursePill } from '@/components/shared/CoursePill';

interface TodaySectionProps {
  assignments: Assignment[];
  courses: Course[];
}

export function TodaySection({ assignments, courses }: TodaySectionProps) {
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const todayAssignments = assignments.filter(
    (a) => isToday(a.dueDate) || isTomorrow(a.dueDate)
  );

  if (todayAssignments.length === 0) {
    return (
      <div className="card-elevated p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Today</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-course-sage/10 flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-course-sage" />
          </div>
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nothing due today or tomorrow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Today</h2>
        <span className="text-xs text-muted-foreground">
          {todayAssignments.length} item{todayAssignments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {todayAssignments.map((assignment) => {
          const course = getCourse(assignment.courseId);
          if (!course) return null;

          return (
            <div
              key={assignment.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
            >
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: `hsl(var(--course-${course.color}))` }} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {assignment.title}
                </p>
                <CoursePill name={course.section || course.name} color={course.color} className="mt-1" />
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {isToday(assignment.dueDate) ? 'Today' : 'Tomorrow'}, {format(assignment.dueDate, 'h:mm a')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
