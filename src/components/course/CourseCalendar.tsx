import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Assignment } from '@/types';
import { format, isSameDay } from 'date-fns';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface CourseCalendarProps {
  assignments: Assignment[];
  courseColor: string;
}

export function CourseCalendar({ assignments, courseColor }: CourseCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get all assignment due dates for highlighting
  const assignmentDates = assignments.map(a => a.dueDate);

  // Get assignments for the selected date
  const selectedDateAssignments = selectedDate
    ? assignments.filter(a => isSameDay(a.dueDate, selectedDate))
    : [];

  // Custom day content to show dots for assignments
  const modifiers = {
    hasAssignment: assignmentDates,
  };

  const modifiersStyles = {
    hasAssignment: {
      position: 'relative' as const,
    },
  };

  return (
    <div className="card-elevated p-6">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Calendar */}
        <div className="flex justify-center lg:justify-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            components={{
              DayContent: ({ date }) => {
                const hasAssignment = assignmentDates.some(d => isSameDay(d, date));
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span>{date.getDate()}</span>
                    {hasAssignment && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(var(--course-${courseColor}))` }}
                      />
                    )}
                  </div>
                );
              },
            }}
            className="rounded-lg border-0 p-0 [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:p-1 [&_.rdp-head_cell]:w-12 [&_.rdp-head_cell]:text-sm [&_.rdp-day]:w-12 [&_.rdp-day]:h-12 [&_.rdp-day]:text-sm"
          />
        </div>

        {/* Selected Date Assignments */}
        <div className="border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h2>
            {selectedDateAssignments.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedDateAssignments.length} {selectedDateAssignments.length === 1 ? 'assignment' : 'assignments'}
              </span>
            )}
          </div>

          {selectedDateAssignments.length > 0 ? (
            <div className="space-y-3">
              {selectedDateAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 transition-colors"
                >
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: `hsl(var(--course-${courseColor}))` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AssignmentTypeIcon type={assignment.type} />
                      <span className="text-xs text-muted-foreground">
                        Due at {format(assignment.dueDate, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={assignment.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedDate
                  ? 'No assignments due on this date'
                  : 'Select a date to view assignments'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
