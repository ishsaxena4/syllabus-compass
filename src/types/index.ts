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

export type AssignmentStatus = 'upcoming' | 'due-soon' | 'overdue' | 'completed';

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  type: AssignmentType;
  // null when the syllabus gives no date (e.g. a final exam set by the registrar).
  dueDate: Date | null;
  status: AssignmentStatus;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface AttentionItem {
  id: string;
  // Mirrors v_risky_items.risk_reason.
  type: 'missing-date' | 'low-confidence' | 'unconfirmed';
  title: string;
  courseId?: string;
  description: string;
  dueDate: Date | null;
  assignmentType: AssignmentType;
}
