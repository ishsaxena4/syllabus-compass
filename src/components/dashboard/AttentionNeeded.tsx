import { AlertTriangle, ChevronRight } from 'lucide-react';
import { AttentionItem, Course } from '@/types';
import { CoursePill } from '@/components/shared/CoursePill';
import { Button } from '@/components/ui/button';

interface AttentionNeededProps {
  items: AttentionItem[];
  courses: Course[];
}

export function AttentionNeeded({ items, courses }: AttentionNeededProps) {
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated p-5 border-course-coral/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-course-coral/10 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-course-coral" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Attention Needed</h2>
        <span className="status-attention ml-auto">{items.length}</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const course = item.courseId ? getCourse(item.courseId) : null;

          return (
            <div
              key={item.id}
              className="group flex items-start gap-3 p-3 -mx-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-course-coral mt-2 shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {course && (
                    <CoursePill name={course.section || course.name} color={course.color} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              </div>

              <Button variant="outline" size="sm" className="shrink-0 text-xs h-7">
                Review
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
