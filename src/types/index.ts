export type CourseColor = 'sage' | 'coral' | 'sky' | 'amber' | 'lavender' | 'rose';

export interface Course {
  id: string;
  name: string;
  section?: string;
  professor: string;
  professorEmail?: string;
  color: CourseColor;
  schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
    location?: string;
  };
}

// Mirrors the `assignment_type` enum in Postgres. Order is the order shown in pickers.
export const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'lab', label: 'Lab' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'other', label: 'Other' },
] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number]['value'];

export function isAssignmentType(value: unknown): value is AssignmentType {
  return ASSIGNMENT_TYPES.some(t => t.value === value);
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  type: AssignmentType;
  dueDate: Date;
  status: 'upcoming' | 'due-soon' | 'completed';
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface AttentionItem {
  id: string;
  type: 'ambiguous-date' | 'missing-date' | 'conflict' | 'low-confidence';
  title: string;
  courseId?: string;
  description: string;
}
