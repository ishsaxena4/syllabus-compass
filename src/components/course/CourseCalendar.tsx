import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Assignment } from "@/types";
import { format, isSameDay } from "date-fns";
import { AssignmentTypeIcon } from "@/components/shared/AssignmentTypeIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";

interface CourseCalendarProps {
  assignments: Assignment[];
  courseColor: string;
}

export function CourseCalendar({ assignments, courseColor }: CourseCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Memoize to avoid recalculating on every render
  const assignmentDates = useMemo(() => assignments.map((a) => a.dueDate), [assignments]);

  const selectedDateAssignments = useMemo(() => {
    if (!selectedDate) return [];
    return assignments.filter((a) => isSameDay(a.dueDate, selectedDate));
  }, [assignments, selectedDate]);

  const modifiers = {
    hasAssignment: assignmentDates,
  };

  const modifiersStyles = {
    hasAssignment: {
      position: "relative" as const,
    },
  };

  return (
    <motion.div 
      className="card-elevated p-6 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid gap-8 lg:grid-cols-2 w-full">
        {/* Calendar (full width) */}
        <div className="w-full">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => setSelectedDate(d ?? undefined)}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7 w-full",
              head_cell: "text-muted-foreground font-normal text-sm text-center py-2",
              row: "grid grid-cols-7 w-full mt-1",
              cell: "text-center text-sm p-1 relative",
              day: "w-full aspect-square rounded-full flex items-center justify-center font-normal hover:bg-accent/50 transition-colors",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => {
                const hasAssignment = assignmentDates.some((d) => isSameDay(d, date));
                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

                return (
                  <motion.div
                    className="relative w-full h-full flex items-center justify-center"
                    whileTap={{ scale: 0.95 }}
                    animate={{ scale: isSelected ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <span>{date.getDate()}</span>
                    {hasAssignment && (
                      <motion.span
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(var(--course-${courseColor}))` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      />
                    )}
                  </motion.div>
                );
              },
            }}
            className="w-full rounded-lg border-0 p-0"
          />
        </div>

        {/* Selected Date Assignments */}
        <div className="border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
          <div className="flex items-center justify-between mb-5">
            <motion.h2 
              className="text-lg font-semibold text-foreground"
              key={selectedDate?.toISOString()}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            </motion.h2>

            {selectedDateAssignments.length > 0 && (
              <motion.span 
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {selectedDateAssignments.length}{" "}
                {selectedDateAssignments.length === 1 ? "assignment" : "assignments"}
              </motion.span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selectedDateAssignments.length > 0 ? (
              <motion.div 
                className="space-y-3"
                key="assignments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {selectedDateAssignments.map((assignment, index) => (
                  <motion.div
                    key={assignment.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 transition-colors hover:bg-secondary/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(var(--course-${courseColor}))` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {assignment.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <AssignmentTypeIcon type={assignment.type} />
                        <span className="text-xs text-muted-foreground">
                          Due at {format(assignment.dueDate, "h:mm a")}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={assignment.status} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="flex flex-col items-center justify-center py-12 text-center"
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <span className="text-2xl">📅</span>
                </motion.div>
                <p className="text-sm text-muted-foreground">
                  {selectedDate ? "No assignments due on this date" : "Select a date to view assignments"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
