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
}

export interface SyllabusPipelinePort {
  processUpload(params: {
    file: File | null;
    courseId: string;
    userId: string;
    textOverride?: string;
    onProgress: (step: UploadStep, message?: string) => void;
  }): Promise<ProcessResult>;

  fetchExtractedItems(uploadId: string): Promise<ExtractedItem[]>;

  acceptItem(item: ExtractedItem, userId: string): Promise<void>;

  discardItem(itemId: string): Promise<void>;

  updateItem(
    itemId: string,
    updates: { payload: Record<string, unknown>; title: string | null },
  ): Promise<void>;
}
