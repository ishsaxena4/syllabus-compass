import { ChevronRight, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockCourses, mockAssignments } from '@/data/mockData';
import { format, isFuture } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const navigate = useNavigate();

  const getNextDeadline = (courseId: string) => {
    const upcoming = mockAssignments
      .filter((a) => a.courseId === courseId && isFuture(a.dueDate))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    return upcoming;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockCourses.length} active courses this semester
          </p>
        </div>
        <Button variant="outline">
          Add Course
        </Button>
      </div>

      {/* Course Grid */}
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        {mockCourses.map((course) => {
          const nextDeadline = getNextDeadline(course.id);

          return (
            <div
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="card-elevated-hover p-5 cursor-pointer group"
            >
              {/* Course Color Accent */}
              <div className="flex items-start gap-4">
                <div
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: `hsl(var(--course-${course.color}))` }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                      {course.section && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {course.section}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="mt-4 space-y-2">
                    {/* Professor */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{course.professor}</span>
                      {course.professorEmail && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(course.professorEmail!);
                          }}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                          title="Copy email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Schedule */}
                    {course.schedule && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {course.schedule.days.join(', ')} · {course.schedule.startTime}
                        </span>
                      </div>
                    )}

                    {/* Next Deadline */}
                    {nextDeadline && (
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md mt-2',
                          'bg-secondary text-muted-foreground'
                        )}
                      >
                        <span className="font-medium">Next:</span>
                        <span className="truncate max-w-[150px]">{nextDeadline.title}</span>
                        <span>·</span>
                        <span>{format(nextDeadline.dueDate, 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
