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

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'reading' | 'lab' | 'other';
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
