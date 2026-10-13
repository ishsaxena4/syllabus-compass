import type { Json } from '@/integrations/supabase/types';

export type UploadStep =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

export type ItemKind = 'assignment' | 'professor_email' | 'meeting_time';
export type Confidence = 'high' | 'medium' | 'low';
export type ItemStatus = 'pending' | 'accepted' | 'discarded';
// Where an assignment's due time came from (see extract/prompt.ts).
export type TimeBasis = 'explicit' | 'course_policy' | 'meeting' | 'none';

export interface ExtractedItem {
  id: string;
  syllabus_upload_id: string;
  course_id: string | null;
  item_kind: string;
  title: string | null;
  payload: Json;
  confidence: Confidence;
  status: ItemStatus;
  source_snippet: string | null;
  source_location: Json | null;
  reviewed_at: string | null;
  created_at: string;
  user_id: string;
}

// Course-level output of one extraction, stored on syllabus_uploads.extraction.
export interface ExtractionSummary {
  course: {
    code: string | null;
    title: string | null;
    term: string | null;
    term_start_date: string | null;
    term_end_date: string | null;
  };
  rules: { text: string; applies_to: string }[];
  warnings: string[];
  upload_ids: string[];
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  duration_ms: number;
  extracted_at: string;
}

export interface BatchProcessResult {
  uploadIds: string[];
  courseId: string;
  createdCount: number;
  summary: ExtractionSummary | null;
}

export interface SyllabusPipelinePort {
  // Uploads all of one course's files, then extracts them together in one call.
  processUploads(params: {
    files: File[];
    courseId: string;
    userId: string;
    studentNotes?: string;
    onProgress: (step: UploadStep, message?: string) => void;
  }): Promise<BatchProcessResult>;

  fetchExtractedItems(uploadIds: string[]): Promise<ExtractedItem[]>;

  fetchExtractionSummary(uploadIds: string[]): Promise<ExtractionSummary | null>;

  acceptItem(item: ExtractedItem, userId: string): Promise<void>;

  discardItem(itemId: string): Promise<void>;

  updateItem(
    itemId: string,
    updates: { payload: Json; title: string | null },
  ): Promise<void>;
}
