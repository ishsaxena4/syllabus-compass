import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPdf } from '@/lib/pdfTextExtract';
import type {
  SyllabusPipelinePort,
  ExtractedItem,
  ProcessResult,
} from './types';

export const realAdapter: SyllabusPipelinePort = {
  async processUpload({ file, courseId, userId, textOverride, onProgress }) {
    onProgress('uploading', 'Uploading file…');

    const fileId = crypto.randomUUID();
    let filePath = `${userId}/${fileId}.pdf`;
    const uploadFileName = file?.name || 'demo-seed.txt';

    if (file) {
      const { error: storageErr } = await supabase.storage
        .from('syllabi')
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);
    } else {
      filePath = `demo/${userId}/${fileId}.txt`;
    }

    const { data: uploadRow, error: rowErr } = await supabase
      .from('syllabus_uploads')
      .insert({
        user_id: userId,
        course_id: courseId,
        file_name: uploadFileName,
        file_mime: file?.type || 'text/plain',
        file_path: filePath,
      })
      .select()
      .single();

    if (rowErr || !uploadRow) {
      throw new Error(rowErr?.message || 'Failed to create upload record');
    }

    onProgress('extracting', 'Extracting text from PDF…');

    let extractedText: string;
    if (textOverride) {
      extractedText = textOverride;
    } else if (file) {
      extractedText = await extractTextFromPdf(file);
      if (!extractedText.trim()) {
        throw new Error(
          'No text could be extracted from the PDF. The file may be image-based or empty.',
        );
      }
    } else {
      throw new Error('No file or text provided');
    }

    onProgress('processing', 'Analyzing syllabus…');

    const { data: fnData, error: fnErr } = await supabase.functions.invoke(
      'process-syllabus',
      {
        body: {
          syllabus_upload_id: uploadRow.id,
          course_id: courseId,
          extracted_text: extractedText,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    );

    if (fnErr) throw new Error(fnErr.message || 'Processing failed');
    if (!fnData?.ok) throw new Error(fnData?.error || 'Processing returned an error');

    onProgress('ready', `Found ${fnData.created_count} items. Ready for review!`);

    return {
      uploadId: uploadRow.id,
      courseId,
      createdCount: fnData.created_count as number,
    } satisfies ProcessResult;
  },

  async fetchExtractedItems(uploadId) {
    const { data, error } = await supabase
      .from('extracted_items')
      .select('*')
      .eq('syllabus_upload_id', uploadId)
      .eq('status', 'pending')
      .order('created_at');

    if (error) throw new Error('Failed to load extracted items');
    return (data || []) as ExtractedItem[];
  },

  async acceptItem(item, userId) {
    const p = item.payload as Record<string, any>;

    if (item.item_kind === 'assignment' && item.course_id) {
      const validTypes = ['homework', 'quiz', 'exam', 'project', 'reading', 'lab', 'other'];
      const { error } = await supabase.from('assignments').insert({
        user_id: userId,
        course_id: item.course_id,
        title: p.title || item.title || 'Untitled',
        type: validTypes.includes(p.type) ? p.type : 'other',
        due_at: p.due_at || null,
        status: 'upcoming',
        confirmed: true,
        confidence: item.confidence,
        source_snippet: item.source_snippet,
        syllabus_upload_id: item.syllabus_upload_id,
      });
      if (error) throw error;
    } else if (item.item_kind === 'professor_email' && item.course_id) {
      const { error } = await supabase
        .from('courses')
        .update({ professor_email: p.email })
        .eq('id', item.course_id);
      if (error) throw error;
    } else if (item.item_kind === 'meeting_time' && item.course_id) {
      const { error } = await supabase.from('course_meetings').insert({
        user_id: userId,
        course_id: item.course_id,
        days: p.days,
        start_time: p.start_time,
        end_time: p.end_time,
        location: p.location || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (error) throw error;
    }

    await supabase
      .from('extracted_items')
      .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
      .eq('id', item.id);
  },

  async discardItem(itemId) {
    await supabase
      .from('extracted_items')
      .update({ status: 'discarded', reviewed_at: new Date().toISOString() })
      .eq('id', itemId);
  },

  async updateItem(itemId, updates) {
    const { error } = await supabase
      .from('extracted_items')
      .update({ payload: updates.payload, title: updates.title })
      .eq('id', itemId);
    if (error) throw new Error('Failed to save changes');
  },
};
