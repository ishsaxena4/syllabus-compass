import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Clock, MapPin, ChevronRight, Check, FileText } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockCourses, mockAssignments } from '@/data/mockData';
import { CoursePill } from '@/components/shared/CoursePill';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const course = mockCourses.find((c) => c.id === id);
  const assignments = mockAssignments.filter((a) => a.courseId === id);

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

  const upcomingAssignments = assignments
    .filter((a) => isFuture(a.dueDate))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3);

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
            <h1 className="text-2xl font-semibold text-foreground">{course.name}</h1>
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
                    <span>{course.schedule.days.join(', ')} · {course.schedule.startTime} - {course.schedule.endTime}</span>
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
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Upcoming Deadlines */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Upcoming Deadlines</h2>
              <span className="text-xs text-muted-foreground">{upcomingAssignments.length} items</span>
            </div>
            
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-4 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <button className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-course-sage hover:bg-course-sage/10 transition-colors shrink-0">
                      <Check className="w-3 h-3 text-transparent" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                      <AssignmentTypeIcon type={assignment.type} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">{format(assignment.dueDate, 'MMM d')}</p>
                      <p className="text-xs text-muted-foreground">{format(assignment.dueDate, 'h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
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

        <TabsContent value="assignments" className="mt-6">
          <div className="card-elevated p-5">
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                >
                  <button className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-course-sage hover:bg-course-sage/10 transition-colors shrink-0">
                    <Check className="w-3 h-3 text-transparent group-hover:text-muted-foreground/50" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                    <AssignmentTypeIcon type={assignment.type} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">{format(assignment.dueDate, 'MMM d')}</p>
                    <p className="text-xs text-muted-foreground">{format(assignment.dueDate, 'h:mm a')}</p>
                  </div>
                  <StatusBadge status={assignment.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
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
            <Button className="mt-6">
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
                      {course.schedule.days.join(', ')} · {course.schedule.startTime} - {course.schedule.endTime}
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
