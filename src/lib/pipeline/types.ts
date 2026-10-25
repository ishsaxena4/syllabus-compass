import type { Database, Json } from '@/integrations/supabase/types';

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

// extracted_items.payload, as written by process-syllabus/rows.ts. One shape covers all
// three item kinds; each kind uses its own fields. A type alias (not an interface) so
// it can be saved back as Json.
export type ItemPayload = {
  // assignment
  title?: string;
  type?: string;
  due_at?: string | null;
  end_at?: string | null;
  available_from?: string | null;
  time_basis?: TimeBasis;
  time_inferred?: boolean;
  ambiguity?: string | null;
  edited?: boolean;
  // meeting_time
  kind?: string;
  days?: Database['public']['Enums']['weekday'][];
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  // professor_email
  email?: string;
  name?: string | null;
  parser_context?: { timezone?: string; file_name?: string; source_file_id?: string };
};

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

  // Accepts several items together. Safe to retry: rows already imported are skipped.
  // markPastDone imports assignments that are already past due as completed.
  acceptItems(items: ExtractedItem[], userId: string, options?: { markPastDone?: boolean }): Promise<void>;

  discardItem(itemId: string): Promise<void>;

  updateItem(
    itemId: string,
    updates: { payload: Json; title: string | null },
  ): Promise<void>;
}
