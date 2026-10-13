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

  return (
    <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
  );
}
