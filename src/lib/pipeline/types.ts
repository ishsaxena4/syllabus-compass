import type { Json } from '@/integrations/supabase/types';

export type UploadStep =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'processing'
  | 'ready'
  | 'error';

export type ItemKind = 'assignment' | 'professor_email' | 'meeting_time';
export type Confidence = 'high' | 'medium' | 'low';
export type ItemStatus = 'pending' | 'accepted' | 'discarded';

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

export interface ProcessResult {
  uploadId: string;
  courseId: string;
  createdCount: number;
  parserStats: ParserStats | null;
  diagnostics: ProcessDiagnostics;
}

export interface BatchProcessResult {
  uploadIds: string[];
  courseId: string;
  createdCount: number;
  results: ProcessResult[];
}

export interface ParserStats {
  blocks_total: number;
  assignment_candidate_blocks: number;
  meeting_candidate_blocks: number;
  professor_candidate_blocks: number;
  heuristic_items: number;
  llm_items: number;
  normalized_items: number;
  merged_items: number;
  openai_used: boolean;
  openai_error: string | null;
}

export interface ProcessDiagnostics {
  warnings: string[];
  openaiError: string | null;
  quality: 'good' | 'degraded' | 'empty';
}

export interface SyllabusPipelinePort {
  processUpload(params: {
    file: File | null;
    courseId: string;
    userId: string;
    textOverride?: string;
    onProgress: (step: UploadStep, message?: string) => void;
  }): Promise<ProcessResult>;

  processUploads(params: {
    files: File[];
    courseId: string;
    userId: string;
    onProgress: (step: UploadStep, message?: string) => void;
  }): Promise<BatchProcessResult>;

  fetchExtractedItems(uploadId: string | string[]): Promise<ExtractedItem[]>;

  acceptItem(item: ExtractedItem, userId: string): Promise<void>;

  discardItem(itemId: string): Promise<void>;

  updateItem(
    itemId: string,
    updates: { payload: Json; title: string | null },
  ): Promise<void>;
}
