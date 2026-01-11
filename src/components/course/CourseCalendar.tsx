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
    <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
      {/* Calendar */}
      <div className="card-elevated p-4">
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
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: `hsl(var(--course-${courseColor}))` }}
                    />
                  )}
                </div>
              );
            },
          }}
          className="rounded-md"
        />
      </div>

      {/* Selected Date Assignments */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </h2>
          {selectedDateAssignments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedDateAssignments.length} {selectedDateAssignments.length === 1 ? 'assignment' : 'assignments'}
            </span>
          )}
        </div>

        {selectedDateAssignments.length > 0 ? (
          <div className="space-y-3">
            {selectedDateAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-4 p-3 -mx-2 rounded-lg bg-secondary/30 transition-colors"
              >
                <div
                  className="w-2 h-8 rounded-full shrink-0"
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? 'No assignments due on this date'
                : 'Select a date to view assignments'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
