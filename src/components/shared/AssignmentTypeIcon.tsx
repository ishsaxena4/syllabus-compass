import { FileText, HelpCircle, GraduationCap, FolderOpen, BookOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssignmentType = 'homework' | 'quiz' | 'exam' | 'project' | 'reading' | 'lab' | 'other';

interface AssignmentTypeIconProps {
  type: AssignmentType;
  className?: string;
}

const typeConfig: Record<AssignmentType, { icon: typeof FileText; label: string }> = {
  homework: { icon: FileText, label: 'Homework' },
  quiz: { icon: HelpCircle, label: 'Quiz' },
  exam: { icon: GraduationCap, label: 'Exam' },
  project: { icon: FolderOpen, label: 'Project' },
  reading: { icon: BookOpen, label: 'Reading' },
  lab: { icon: BookOpen, label: 'Lab' },
  other: { icon: MoreHorizontal, label: 'Other' },
};

export function AssignmentTypeIcon({ type, className }: AssignmentTypeIconProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{config.label}</span>
    </div>
  );
}
