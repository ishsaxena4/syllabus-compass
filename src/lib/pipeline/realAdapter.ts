import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAssignmentType } from '@/types';
import type {
  BatchProcessResult,
  ExtractionSummary,
  SyllabusPipelinePort,
  ExtractedItem,
} from './types';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const EXTENSION_MIMES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': DOCX_MIME,
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function fileExtension(file: File): string {
  const match = /\.[a-z0-9]+$/i.exec(file.name);
  return match ? match[0].toLowerCase() : '';
}

// Browsers sometimes leave File.type empty (notably for .docx); fall back to the extension.
function fileMime(file: File): string {
  return file.type || EXTENSION_MIMES[fileExtension(file)] || 'application/octet-stream';
}

async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      // Fall through to the generic message.
    }
  }
  return error instanceof Error ? error.message : 'Processing failed';
}

const DAY_LETTERS: Record<string, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'R', fri: 'F', sat: 'Sa', sun: 'Su',
};

function describeMeeting(p: Record<string, any>): string {
  const days = (p.days || []).map((d: string) => DAY_LETTERS[d] || d).join('');
  const times = p.start_time ? `${p.start_time}${p.end_time ? `–${p.end_time}` : ''}` : '';
  return [[days, times].filter(Boolean).join(' '), p.location].filter(Boolean).join(' · ');
}

export const realAdapter: SyllabusPipelinePort = {
  async processUploads({ files, courseId, userId, studentNotes, onProgress }) {
    const uploadIds: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      onProgress('uploading', `Uploading ${i + 1} of ${files.length}: ${file.name}`);

      const mime = fileMime(file);
      const filePath = `${userId}/${crypto.randomUUID()}${fileExtension(file)}`;
      const { error: storageErr } = await supabase.storage
        .from('syllabi')
        .upload(filePath, file, { contentType: mime, upsert: false });
      if (storageErr) throw new Error(`Could not upload ${file.name}: ${storageErr.message}`);

      const { data: uploadRow, error: rowErr } = await supabase
        .from('syllabus_uploads')
        .insert({
          user_id: userId,
          course_id: courseId,
          file_name: file.name,
          file_mime: mime,
          file_path: filePath,
        })
        .select('id')
        .single();
      if (rowErr || !uploadRow) {
        throw new Error(rowErr?.message || 'Failed to create upload record');
      }
      uploadIds.push(uploadRow.id);
    }

    onProgress(
      'processing',
      `Reading ${files.length === 1 ? 'your syllabus' : `${files.length} files`}. This usually takes under a minute.`,
    );

    const { data, error } = await supabase.functions.invoke('process-syllabus', {
      body: {
        syllabus_upload_ids: uploadIds,
        student_notes: studentNotes?.trim() || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    if (error) throw new Error(await functionErrorMessage(error));
    if (!data?.ok) throw new Error(data?.error || 'Processing returned an error');

    onProgress('ready', `Found ${data.created_count} items. Ready for review!`);
    return {
      uploadIds,
      courseId,
      createdCount: data.created_count as number,
      summary: (data.extraction ?? null) as ExtractionSummary | null,
    } satisfies BatchProcessResult;
  },

  async fetchExtractedItems(uploadIds) {
    const { data, error } = await supabase
      .from('extracted_items')
      .select('*')
      .in('syllabus_upload_id', uploadIds)
      .eq('status', 'pending')
      .order('created_at');
    if (error) throw new Error('Failed to load extracted items');
    return (data || []) as ExtractedItem[];
  },

  async fetchExtractionSummary(uploadIds) {
    const { data, error } = await supabase
      .from('syllabus_uploads')
      .select('extraction, processed_at')
      .in('id', uploadIds)
      .not('extraction', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(1);
    if (error) throw new Error('Failed to load extraction details');
    return (data?.[0]?.extraction ?? null) as unknown as ExtractionSummary | null;
  },

  async acceptItem(item, userId) {
    const p = item.payload as Record<string, any>;
    if (!item.course_id) throw new Error('This item is not linked to a course');

    if (item.item_kind === 'assignment') {
      const { error } = await supabase.from('assignments').insert({
        user_id: userId,
        course_id: item.course_id,
        title: p.title || item.title || 'Untitled',
        type: isAssignmentType(p.type) ? p.type : 'other',
        due_at: p.due_at || null,
        notes: p.ambiguity || null,
        status: 'upcoming',
        confirmed: true,
        confidence: item.confidence,
        source_snippet: item.source_snippet,
        syllabus_upload_id: item.syllabus_upload_id,
      });
      if (error) throw error;
    } else if (item.item_kind === 'professor_email') {
      const { error } = await supabase
        .from('courses')
        .update({ professor_email: p.email, ...(p.name ? { professor_name: p.name } : {}) })
        .eq('id', item.course_id);
      if (error) throw error;
    } else if (item.item_kind === 'meeting_time' && p.kind === 'office_hours') {
      const { error } = await supabase
        .from('courses')
        .update({ office_hours: describeMeeting(p) })
        .eq('id', item.course_id);
      if (error) throw error;
    } else if (item.item_kind === 'meeting_time') {
      if (!p.days?.length || !p.start_time || !p.end_time) {
        throw new Error('Add the days and start and end times before accepting this meeting');
      }
      const { error } = await supabase.from('course_meetings').insert({
        user_id: userId,
        course_id: item.course_id,
        days: p.days,
        start_time: p.start_time,
        end_time: p.end_time,
        location: p.location || null,
        timezone: p.parser_context?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (error) throw error;
    }

    const { error } = await supabase
      .from('extracted_items')
      .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) throw error;
  },

  async discardItem(itemId) {
    const { error } = await supabase
      .from('extracted_items')
      .update({ status: 'discarded', reviewed_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) throw error;
  },

  async updateItem(itemId, updates) {
    const { error } = await supabase
      .from('extracted_items')
      .update({ payload: updates.payload, title: updates.title })
      .eq('id', itemId);
    if (error) throw new Error('Failed to save changes');
  },
};
