import {
  FileText, HelpCircle, GraduationCap, FolderOpen, BookOpen, FlaskConical, MessagesSquare, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSIGNMENT_TYPES, type AssignmentType } from '@/types';

interface AssignmentTypeIconProps {
  type: AssignmentType;
  className?: string;
}

const typeIcons: Record<AssignmentType, typeof FileText> = {
  homework: FileText,
  quiz: HelpCircle,
  exam: GraduationCap,
  project: FolderOpen,
  reading: BookOpen,
  lab: FlaskConical,
  discussion: MessagesSquare,
  other: MoreHorizontal,
};

export function AssignmentTypeIcon({ type, className }: AssignmentTypeIconProps) {
  const Icon = typeIcons[type] ?? MoreHorizontal;
  const label = ASSIGNMENT_TYPES.find(t => t.value === type)?.label ?? 'Other';

  // Exams carry the most weight, so they get a high-contrast pill that no course
  // color can blend into; every other type stays a quiet label.
  if (type === 'exam') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-foreground text-background px-2 py-0.5',
          className,
        )}
      >
        <Icon className="w-3 h-3" />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
  );
}
