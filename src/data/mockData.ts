import { Course, Assignment, AttentionItem } from '@/types';

export const mockCourses: Course[] = [
  {
    id: '1',
    name: 'Introduction to Psychology',
    section: 'PSY 101',
    professor: 'Dr. Sarah Chen',
    professorEmail: 'schen@university.edu',
    color: 'sage',
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      startTime: '10:00 AM',
      endTime: '10:50 AM',
      location: 'Science Hall 201',
    },
  },
  {
    id: '2',
    name: 'Calculus II',
    section: 'MATH 152',
    professor: 'Prof. Michael Torres',
    professorEmail: 'mtorres@university.edu',
    color: 'coral',
    schedule: {
      days: ['Tuesday', 'Thursday'],
      startTime: '2:00 PM',
      endTime: '3:15 PM',
      location: 'Math Building 105',
    },
  },
  {
    id: '3',
    name: 'Modern American Literature',
    section: 'ENG 245',
    professor: 'Dr. Emily Watson',
    professorEmail: 'ewatson@university.edu',
    color: 'sky',
    schedule: {
      days: ['Monday', 'Wednesday'],
      startTime: '1:00 PM',
      endTime: '2:15 PM',
      location: 'Humanities 302',
    },
  },
  {
    id: '4',
    name: 'Organic Chemistry',
    section: 'CHEM 201',
    professor: 'Dr. James Park',
    professorEmail: 'jpark@university.edu',
    color: 'amber',
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      startTime: '9:00 AM',
      endTime: '9:50 AM',
      location: 'Chemistry Lab 110',
    },
  },
];

const today = new Date();
const addDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
};

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Chapter 5 Reading Response',
    courseId: '1',
    type: 'reading',
    dueDate: addDays(1),
    status: 'due-soon',
    notes: 'Focus on cognitive development theories',
  },
  {
    id: '2',
    title: 'Problem Set 7',
    courseId: '2',
    type: 'homework',
    dueDate: addDays(2),
    status: 'upcoming',
    notes: 'Integration techniques',
  },
  {
    id: '3',
    title: 'Essay: The Great Gatsby Analysis',
    courseId: '3',
    type: 'project',
    dueDate: addDays(5),
    status: 'upcoming',
    notes: '1500-2000 words',
  },
  {
    id: '4',
    title: 'Midterm Exam',
    courseId: '2',
    type: 'exam',
    dueDate: addDays(7),
    status: 'upcoming',
  },
  {
    id: '5',
    title: 'Lab Report 3',
    courseId: '4',
    type: 'project',
    dueDate: addDays(3),
    status: 'upcoming',
    notes: 'Synthesis reactions',
  },
  {
    id: '6',
    title: 'Quiz 4: Memory & Learning',
    courseId: '1',
    type: 'quiz',
    dueDate: addDays(0),
    status: 'due-soon',
  },
  {
    id: '7',
    title: 'Discussion Post',
    courseId: '3',
    type: 'other',
    dueDate: addDays(4),
    status: 'upcoming',
  },
];

export const mockAttentionItems: AttentionItem[] = [
  {
    id: '1',
    type: 'ambiguous-date',
    title: 'Final Project Due Date',
    courseId: '3',
    description: 'Syllabus mentions "last week of classes" - please confirm exact date',
  },
  {
    id: '2',
    type: 'low-confidence',
    title: 'Lab Schedule Change',
    courseId: '4',
    description: 'Possible schedule change detected - verify with syllabus',
  },
];
