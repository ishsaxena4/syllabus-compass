import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Clock, MapPin, ChevronRight, ChevronDown, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { CourseCalendar } from '@/components/course/CourseCalendar';
import { AddAssignmentCard } from '@/components/shared/AddAssignmentCard';
import { CompleteToggle } from '@/components/shared/CompleteToggle';
import { byDueDate, isOpen } from '@/lib/assignments';
import { formatClockRange } from '@/lib/time';
import type { Assignment } from '@/types';
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
import { cn } from '@/lib/utils';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: courses = [], isLoading: coursesLoading } = useLiveCourses();
  const {
    data: allAssignments = [],
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useLiveAssignments();
  const { mutateAsync: deleteCourse, isPending: isDeletingCourse } = useDeleteCourse();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const course = courses.find((c) => c.id === id);
  const assignments = allAssignments.filter((a) => a.courseId === id);

  if (coursesLoading || assignmentsLoading) {
    return <div className="py-12 text-sm text-muted-foreground">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Course not found</p>
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    );
  }

  const openAssignments = assignments.filter(isOpen).sort(byDueDate);
  // Past due or done, most recent first.
  const closedAssignments = assignments.filter((a) => !isOpen(a)).sort(byDueDate).reverse();
  const upcomingAssignments = openAssignments.slice(0, 3);

  function renderRow(assignment: Assignment) {
    const showBadge = assignment.status === 'due-soon' || assignment.status === 'overdue';
    return (
      <div
        key={assignment.id}
        className={cn(
          'flex items-center gap-4 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors',
          assignment.status === 'completed' && 'opacity-60',
        )}
      >
        <CompleteToggle assignment={assignment} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium text-foreground truncate',
            assignment.status === 'completed' && 'line-through',
          )}>
            {assignment.title}
          </p>
          <AssignmentTypeIcon type={assignment.type} />
        </div>
        <div className="text-right shrink-0">
          {assignment.dueDate ? (
            <>
              <p className="text-sm font-medium text-foreground">{format(assignment.dueDate, 'MMM d')}</p>
              <p className="text-xs text-muted-foreground">{format(assignment.dueDate, 'h:mm a')}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Date TBA</p>
          )}
        </div>
        {showBadge && <StatusBadge status={assignment.status} />}
      </div>
    );
  }

  const handleDeleteCourse = async () => {
    if (!course) return;

    try {
      await deleteCourse(course.id);
      toast.success('Course deleted');
      setIsDeleteDialogOpen(false);
      navigate('/courses', { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete course');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/courses')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </button>

      {/* Course Header */}
      <div className="card-elevated p-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="flex items-start gap-4">
          <div
            className="w-4 h-4 rounded-full mt-1 shrink-0"
            style={{ backgroundColor: `hsl(var(--course-${course.color}))` }}
          />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold text-foreground">{course.name}</h1>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete course
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {course.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the course and all related assignments, meetings, uploads, and
                      extracted items.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingCourse}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDeleteCourse();
                      }}
                      disabled={isDeletingCourse}
                    >
                      {isDeletingCourse ? 'Deleting...' : 'Delete course'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {course.section && (
              <p className="text-muted-foreground mt-1">{course.section}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{course.professor}</span>
                {course.professorEmail && (
                  <button
                    onClick={() => navigator.clipboard.writeText(course.professorEmail!)}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    title="Copy email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {course.schedule && (
                <>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{course.schedule.days.join(', ')} · {formatClockRange(course.schedule.startTime, course.schedule.endTime)}</span>
                  </div>
                  {course.schedule.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{course.schedule.location}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Upcoming Deadlines */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Upcoming Deadlines</h2>
              <span className="text-xs text-muted-foreground">{openAssignments.length} open</span>
            </div>
            
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">{upcomingAssignments.map(renderRow)}</div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
            )}
          </div>

          {/* Grading Breakdown Placeholder */}
          <div className="card-elevated p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">Grading Breakdown</h2>
            <div className="space-y-3">
              {[
                { category: 'Homework', weight: '30%' },
                { category: 'Quizzes', weight: '20%' },
                { category: 'Midterm', weight: '20%' },
                { category: 'Final Exam', weight: '30%' },
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.category}</span>
                  <span className="font-medium text-foreground">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6 space-y-4">
          <div className="card-elevated p-5">
            {openAssignments.length > 0 ? (
              <div className="space-y-3">{openAssignments.map(renderRow)}</div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing left to do</p>
            )}
            {closedAssignments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowClosed((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showClosed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Past and done ({closedAssignments.length})
                </button>
                {showClosed && <div className="space-y-3 mt-3">{closedAssignments.map(renderRow)}</div>}
              </div>
            )}
          </div>
          <AddAssignmentCard
            fixedCourseId={course.id}
            onAssignmentAdded={() => void refetchAssignments()}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CourseCalendar assignments={assignments} courseColor={course.color} />
        </TabsContent>

        <TabsContent value="syllabus" className="mt-6">
          <div className="card-elevated p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Syllabus Uploaded</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Upload a syllabus to automatically extract assignments, due dates, and course policies.
            </p>
            <Button className="mt-6" onClick={() => navigate('/upload')}>
              Upload Syllabus
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <div className="card-elevated p-5 space-y-6">
            {/* Professor Contact */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Professor</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                  {course.professor.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{course.professor}</p>
                  {course.professorEmail && (
                    <p className="text-xs text-muted-foreground">{course.professorEmail}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule */}
            {course.schedule && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Schedule</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {course.schedule.days.join(', ')} · {formatClockRange(course.schedule.startTime, course.schedule.endTime)}
                    </span>
                  </div>
                  {course.schedule.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{course.schedule.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
