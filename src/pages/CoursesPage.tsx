import { useState } from 'react';
import { ChevronRight, Mail, Clock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { AddCourseDialog } from '@/components/shared/AddCourseDialog';
import { useDeleteCourse, useLiveAssignments, useLiveCourses } from '@/hooks/useAcademicData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function CoursesPage() {
  const navigate = useNavigate();
  const { data: courses = [], isLoading: coursesLoading, refetch: refetchCourses } = useLiveCourses();
  const { data: assignments = [], isLoading: assignmentsLoading } = useLiveAssignments();
  const { mutateAsync: deleteCourse, isPending: isDeletingCourse } = useDeleteCourse();
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const getNextDeadline = (courseId: string) => {
    const upcoming = assignments
      .filter((a) => a.courseId === courseId && isFuture(a.dueDate))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    return upcoming;
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      await deleteCourse(courseId);
      toast.success('Course deleted');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete course');
    } finally {
      setDeletingCourseId((prev) => (prev === courseId ? null : prev));
    }
  };

  if (coursesLoading || assignmentsLoading) {
    return <div className="py-12 text-sm text-muted-foreground">Loading courses...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {courses.length} active courses this semester
          </p>
        </div>
        <AddCourseDialog onCourseAdded={() => void refetchCourses()} />
      </div>

      {/* Course Grid */}
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        {courses.map((course) => {
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
                    <div className="flex items-center gap-1 shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            disabled={isDeletingCourse}
                            title="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {course.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the course and all related assignments, meetings, uploads,
                              and extracted items.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void handleDeleteCourse(course.id);
                              }}
                              disabled={isDeletingCourse && deletingCourseId === course.id}
                            >
                              {isDeletingCourse && deletingCourseId === course.id ? 'Deleting...' : 'Delete course'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
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
