import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoursePill } from '@/components/shared/CoursePill';
import { mockAssignments, mockCourses } from '@/data/mockData';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'agenda';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getCourse = (courseId: string) => mockCourses.find((c) => c.id === courseId);
  
  const getAssignmentsForDay = (date: Date) => 
    mockAssignments.filter((a) => isSameDay(a.dueDate, date));

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assignment due dates and deadlines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-7 px-3"
            >
              <Grid3X3 className="w-4 h-4 mr-1.5" />
              Month
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="h-7 px-3"
            >
              <List className="w-4 h-4 mr-1.5" />
              Agenda
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="card-elevated p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="h-8 px-3 text-xs"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="bg-secondary p-3 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Padding Days */}
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="bg-card p-2 min-h-[100px]" />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const assignments = getAssignmentsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'bg-card p-2 min-h-[100px] cursor-pointer transition-colors hover:bg-secondary/50',
                    isSelected && 'ring-2 ring-primary ring-inset'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm',
                      isToday(day) && 'bg-primary text-primary-foreground font-medium',
                      !isToday(day) && !isSameMonth(day, currentDate) && 'text-muted-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {assignments.slice(0, 3).map((assignment) => {
                      const course = getCourse(assignment.courseId);
                      if (!course) return null;

                      return (
                        <div
                          key={assignment.id}
                          className="text-xs p-1 rounded truncate"
                          style={{ 
                            backgroundColor: `hsl(var(--course-${course.color}) / 0.15)`,
                            color: `hsl(var(--course-${course.color}))`
                          }}
                        >
                          {assignment.title}
                        </div>
                      );
                    })}
                    {assignments.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{assignments.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card-elevated p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Upcoming Assignments
          </h2>
          <div className="space-y-3">
            {mockAssignments
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .map((assignment) => {
                const course = getCourse(assignment.courseId);
                if (!course) return null;

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-1 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(var(--course-${course.color}))` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {assignment.title}
                      </p>
                      <CoursePill name={course.section || course.name} color={course.color} className="mt-1" />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(assignment.dueDate, 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(assignment.dueDate, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
