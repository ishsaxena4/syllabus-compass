import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPdf } from '@/lib/pdfTextExtract';
import { extractTextFromDocx } from '@/lib/docxTextExtract';
import type {
  BatchProcessResult,
  SyllabusPipelinePort,
  ExtractedItem,
  ParserStats,
  ProcessResult,
} from './types';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGE_MIME_PREFIX = 'image/';

function isDocxFile(file: File): boolean {
  return file.type === DOCX_MIME || file.name.toLowerCase().endsWith('.docx');
}

function isImageFile(file: File): boolean {
  return file.type.startsWith(IMAGE_MIME_PREFIX);
}

function getStorageExtension(file: File, isDocx: boolean, isImage: boolean): string {
  if (isDocx) return '.docx';
  if (isImage) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.png')) return '.png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return '.jpg';
    if (lower.endsWith('.webp')) return '.webp';
    return '.img';
  }
  return '.pdf';
}

function isUnsupportedMimeError(message: string): boolean {
  return /mime type .* is not supported/i.test(message);
}

function friendlyOpenAIError(errorCode: string): string {
  if (errorCode === 'OPENAI_QUOTA_EXCEEDED') {
    return 'OpenAI quota exceeded. Extraction is running in heuristic-only mode.';
  }
  if (errorCode === 'OPENAI_AUTH_ERROR') {
    return 'OpenAI authentication failed. Check OPENAI_API_KEY.';
  }
  if (errorCode === 'OPENAI_TEMPORARY_UNAVAILABLE') {
    return 'OpenAI is temporarily unavailable. Please retry.';
  }
  if (errorCode.startsWith('OPENAI_DROPPED_UNGROUNDED_ITEMS:')) {
    const count = errorCode.split(':')[1] || '?';
    return `Dropped ${count} low-grounding LLM item(s).`;
  }
  return errorCode;
}

function buildItemDedupeKey(item: ExtractedItem): string {
  const payload = (item.payload || {}) as Record<string, unknown>;
  if (item.item_kind === 'assignment') {
    const title = String(payload.title || item.title || '').toLowerCase().trim();
    const dueAt = String(payload.due_at || '');
    const type = String(payload.type || 'other').toLowerCase();
    return `assignment|${title}|${dueAt}|${type}`;
  }
  if (item.item_kind === 'meeting_time') {
    const days = Array.isArray(payload.days)
      ? payload.days.map(v => String(v).toLowerCase()).sort().join(',')
      : '';
    return `meeting|${days}|${String(payload.start_time || '')}|${String(payload.end_time || '')}|${String(payload.location || '').toLowerCase()}`;
  }
  if (item.item_kind === 'professor_email') {
    return `professor_email|${String(payload.email || '').toLowerCase().trim()}`;
  }
  return `${item.item_kind}|${String(item.title || '').toLowerCase().trim()}`;
}

export const realAdapter: SyllabusPipelinePort = {
  async processUpload({ file, courseId, userId, textOverride, onProgress }) {
    onProgress('uploading', 'Uploading file…');

    const fileId = crypto.randomUUID();
    const isDocx = Boolean(file && isDocxFile(file));
    const isImage = Boolean(file && isImageFile(file));
    let filePath = `${userId}/${fileId}${file ? getStorageExtension(file, isDocx, isImage) : '.txt'}`;
    const uploadFileName = file?.name || 'demo-seed.txt';
    let storedInBucket = false;

    if (file) {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const { error: storageErr } = await supabase.storage
        .from('syllabi')
        .upload(filePath, fileBytes, { contentType: file.type || undefined, upsert: false });
      if (storageErr) {
        if (!isImage && isUnsupportedMimeError(storageErr.message || '')) {
          // Parsing for PDF/DOCX does not require storage; continue with a virtual path.
          filePath = `inline/${userId}/${fileId}${getStorageExtension(file, isDocx, isImage)}`;
        } else {
          throw new Error(`Storage upload failed: ${storageErr.message}`);
        }
      } else {
        storedInBucket = true;
      }
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

    onProgress('extracting', 'Extracting text from file…');

    let extractedText: string;
    if (textOverride) {
      extractedText = textOverride;
    } else if (file) {
      if (isImage) {
        extractedText = '';
      } else {
        extractedText = isDocx ? await extractTextFromDocx(file) : await extractTextFromPdf(file);
      }
      if (!isImage && !extractedText.trim()) {
        throw new Error(
          `No text could be extracted from the ${isDocx ? 'DOCX' : 'PDF'}. The file may be empty.`,
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
          extracted_text: extractedText || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    );

    if (fnErr) throw new Error(fnErr.message || 'Processing failed');
    if (!fnData?.ok) throw new Error(fnData?.error || 'Processing returned an error');

    const parserStats = (fnData?.parser_stats || null) as ParserStats | null;
    const warnings: string[] = [];
    const openaiError = parserStats?.openai_error || null;

    if (file && !storedInBucket && !isImage) {
      warnings.push('File was processed without saving source file to storage (bucket MIME restriction).');
    }

    if (openaiError) warnings.push(friendlyOpenAIError(openaiError));
    if ((fnData.created_count as number) === 0) {
      warnings.push('No items were extracted from this document.');
    }
    if (parserStats && parserStats.heuristic_items > 0 && parserStats.normalized_items === 0) {
      warnings.push('Candidates were found but none normalized into usable items.');
    }
    if (parserStats && parserStats.llm_items === 0 && parserStats.openai_used) {
      warnings.push('OpenAI returned no usable structured items.');
    }

    const quality =
      (fnData.created_count as number) === 0
        ? 'empty'
        : warnings.length > 0
          ? 'degraded'
          : 'good';

    onProgress('ready', `Found ${fnData.created_count} items. Ready for review!`);

    return {
      uploadId: uploadRow.id,
      courseId,
      createdCount: fnData.created_count as number,
      parserStats,
      diagnostics: {
        warnings,
        openaiError,
        quality,
      },
    } satisfies ProcessResult;
  },

  async processUploads({ files, courseId, userId, onProgress }) {
    const results: ProcessResult[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      onProgress('uploading', `Uploading ${i + 1}/${files.length}: ${file.name}`);
      const result = await realAdapter.processUpload({
        file,
        courseId,
        userId,
        onProgress: (step, message) => {
          onProgress(step, `${i + 1}/${files.length} ${message || ''}`.trim());
        },
      });
      results.push(result);
    }

    const createdCount = results.reduce((sum, r) => sum + r.createdCount, 0);
    return {
      uploadIds: results.map(r => r.uploadId),
      courseId,
      createdCount,
      results,
    } satisfies BatchProcessResult;
  },

  async fetchExtractedItems(uploadId) {
    const ids = Array.isArray(uploadId) ? uploadId : [uploadId];
    const query = supabase
      .from('extracted_items')
      .select('*')
      .eq('status', 'pending')
      .order('created_at');

    const { data, error } = ids.length === 1
      ? await query.eq('syllabus_upload_id', ids[0])
      : await query.in('syllabus_upload_id', ids);

    if (error) throw new Error('Failed to load extracted items');
    const items = (data || []) as ExtractedItem[];

    if (ids.length <= 1) return items;

    const deduped = new Map<string, ExtractedItem>();
    for (const item of items) {
      const key = buildItemDedupeKey(item);
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, item);
        continue;
      }
      const rank = { high: 3, medium: 2, low: 1 } as const;
      if (rank[item.confidence] > rank[existing.confidence]) {
        deduped.set(key, item);
      }
    }

    return Array.from(deduped.values());
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
