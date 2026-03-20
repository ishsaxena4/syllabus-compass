import type {
  SyllabusPipelinePort,
  ExtractedItem,
  ProcessResult,
} from './types';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const store = new Map<string, ExtractedItem[]>();

function mockId(): string {
  return `mock-${crypto.randomUUID()}`;
}

function seedItems(uploadId: string, courseId: string, userId: string): ExtractedItem[] {
  const now = new Date().toISOString();

  const items: ExtractedItem[] = [
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'professor_email',
      title: 'sjohnson@university.edu',
      payload: { email: 'sjohnson@university.edu' },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Email: sjohnson@university.edu',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'meeting_time',
      title: 'MWF 10:30-11:20 AM',
      payload: {
        days: ['mon', 'wed', 'fri'],
        start_time: '10:30',
        end_time: '11:20',
        location: 'Room 204, Engineering Hall',
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Class Schedule: MWF 10:30-11:20 AM\nLocation: Room 204, Engineering Hall',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Homework 1: Arrays and Linked Lists',
      payload: {
        title: 'Homework 1: Arrays and Linked Lists',
        type: 'homework',
        due_at: '2026-01-27T23:59:00',
        time_inferred: true,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Homework 1: Arrays and Linked Lists - Due January 27, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Quiz 1: Basic Data Structures',
      payload: {
        title: 'Quiz 1: Basic Data Structures',
        type: 'quiz',
        due_at: '2026-02-03T23:59:00',
        time_inferred: true,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Quiz 1: Basic Data Structures - February 3, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Homework 2: Stacks and Queues',
      payload: {
        title: 'Homework 2: Stacks and Queues',
        type: 'homework',
        due_at: '2026-02-10T23:59:00',
        time_inferred: true,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Homework 2: Stacks and Queues - Due February 10, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Midterm Exam',
      payload: {
        title: 'Midterm Exam',
        type: 'exam',
        due_at: '2026-02-24T10:30:00',
        time_inferred: false,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Midterm Exam - February 24, 2026 at 10:30 AM',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Project Proposal',
      payload: {
        title: 'Project Proposal',
        type: 'project',
        due_at: '2026-03-10T23:59:00',
        time_inferred: true,
      },
      confidence: 'medium',
      status: 'pending',
      source_snippet: 'Project Proposal - Due March 10, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Lab 1: Binary Search Trees',
      payload: {
        title: 'Lab 1: Binary Search Trees',
        type: 'lab',
        due_at: '2026-03-17T23:59:00',
        time_inferred: true,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Lab 1: Binary Search Trees - Due March 17, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Homework 3: Graph Algorithms',
      payload: {
        title: 'Homework 3: Graph Algorithms',
        type: 'homework',
        due_at: '2026-04-07T23:59:00',
        time_inferred: true,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Homework 3: Graph Algorithms - Due April 7, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Reading: Chapter 12 Dynamic Programming',
      payload: {
        title: 'Reading: Chapter 12 Dynamic Programming',
        type: 'reading',
        due_at: '2026-04-14T23:59:00',
        time_inferred: true,
      },
      confidence: 'medium',
      status: 'pending',
      source_snippet: 'Reading: Chapter 12 Dynamic Programming - Due April 14, 2026',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Final Project Presentation',
      payload: {
        title: 'Final Project Presentation',
        type: 'project',
        due_at: null,
        time_inferred: false,
      },
      confidence: 'low',
      status: 'pending',
      source_snippet: 'Final Project Presentation - TBD (Week 15)',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
    {
      id: mockId(),
      syllabus_upload_id: uploadId,
      course_id: courseId,
      user_id: userId,
      item_kind: 'assignment',
      title: 'Final Exam',
      payload: {
        title: 'Final Exam',
        type: 'exam',
        due_at: '2026-05-04T08:00:00',
        time_inferred: false,
      },
      confidence: 'high',
      status: 'pending',
      source_snippet: 'Final Exam - May 4, 2026 at 8:00 AM',
      source_location: null,
      reviewed_at: null,
      created_at: now,
    },
  ];

  store.set(uploadId, items);
  return items;
}

export const mockAdapter: SyllabusPipelinePort = {
  async processUpload({ courseId, userId, onProgress }) {
    const uploadId = `mock-${crypto.randomUUID()}`;

    onProgress('uploading', 'Uploading file…');
    await delay(600);

    onProgress('extracting', 'Extracting text from PDF…');
    await delay(800);

    onProgress('processing', 'Analyzing syllabus…');
    await delay(1000);

    const items = seedItems(uploadId, courseId, userId);

    onProgress('ready', `Found ${items.length} items. Ready for review!`);
    return { uploadId, courseId, createdCount: items.length };
  },

  async fetchExtractedItems(uploadId) {
    await delay(300);
    const items = store.get(uploadId) || [];
    return items.filter(i => i.status === 'pending');
  },

  async acceptItem(item) {
    await delay(200);
    const items = store.get(item.syllabus_upload_id);
    if (!items) return;
    const target = items.find(i => i.id === item.id);
    if (target) {
      target.status = 'accepted';
      target.reviewed_at = new Date().toISOString();
    }
  },

  async discardItem(itemId) {
    await delay(150);
    for (const items of store.values()) {
      const target = items.find(i => i.id === itemId);
      if (target) {
        target.status = 'discarded';
        target.reviewed_at = new Date().toISOString();
        return;
      }
    }
  },

  async updateItem(itemId, updates) {
    await delay(150);
    for (const items of store.values()) {
      const target = items.find(i => i.id === itemId);
      if (target) {
        target.payload = updates.payload;
        target.title = updates.title;
        return;
      }
    }
  },
} as SyllabusPipelinePort;
