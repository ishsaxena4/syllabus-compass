// Maps a cleaned extraction onto extracted_items rows and the course-level summary
// stored on syllabus_uploads.extraction. Kept free of I/O so it can be unit tested.
import { DEFAULT_DUE_TIME, localToUtcIso } from './extract/resolve.ts'
import type { Extraction, ExtractedMeeting, Weekday } from './extract/schema.ts'

export interface UploadRef {
  id: string
  file_name: string
}

export interface RowContext {
  userId: string
  courseId: string
  timezone: string
  // In the order the documents were sent to Claude; source_document is a 1-based index into it.
  uploads: UploadRef[]
}

export interface ExtractedItemRow {
  user_id: string
  syllabus_upload_id: string
  course_id: string
  item_kind: 'assignment' | 'meeting_time' | 'professor_email'
  title: string
  payload: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
  status: 'pending'
  source_snippet: string | null
}

const DAY_LETTERS: Record<Weekday, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'R', fri: 'F', sat: 'Sa', sun: 'Su',
}
const MEETING_LABELS: Record<ExtractedMeeting['kind'], string> = {
  lecture: 'Lecture', recitation: 'Recitation', lab: 'Lab', office_hours: 'Office hours', other: 'Meeting',
}

// "16:30" -> "4:30 PM"; the app never shows 24-hour times.
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function meetingTitle(m: ExtractedMeeting): string {
  const days = m.days.map(d => DAY_LETTERS[d]).join('')
  const times = m.start_time ? `${formatClock(m.start_time)}${m.end_time ? ` – ${formatClock(m.end_time)}` : ''}` : ''
  return [MEETING_LABELS[m.kind], [days, times].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
}

export function buildItemRows(extraction: Extraction, ctx: RowContext): ExtractedItemRow[] {
  const base = { user_id: ctx.userId, course_id: ctx.courseId, status: 'pending' as const }
  const firstUpload = ctx.uploads[0]
  const parserContext = (upload: UploadRef) => ({
    timezone: ctx.timezone, file_name: upload.file_name, source_file_id: upload.id,
  })
  const rows: ExtractedItemRow[] = []

  for (const item of extraction.items) {
    const upload = ctx.uploads[item.source_document - 1] ?? firstUpload
    // A date with no time anywhere in the documents defaults to end of day, flagged so the student checks it.
    const timeInferred = item.due_date !== null && item.due_time === null
    const dueTime = item.due_time ?? DEFAULT_DUE_TIME
    const dueAt = item.due_date ? localToUtcIso(item.due_date, dueTime, ctx.timezone) : null
    const endAt = item.due_date && item.due_time && item.end_time
      ? localToUtcIso(item.due_date, item.end_time, ctx.timezone)
      : null
    const availableFrom = item.available_from_date
      ? localToUtcIso(item.available_from_date, item.available_from_time ?? '00:00', ctx.timezone)
      : null

    rows.push({
      ...base,
      syllabus_upload_id: upload.id,
      item_kind: 'assignment',
      title: item.title,
      payload: {
        title: item.title,
        type: item.type,
        due_at: dueAt,
        end_at: endAt,
        available_from: availableFrom,
        time_basis: item.time_basis,
        time_inferred: timeInferred,
        ambiguity: item.ambiguity,
        parser_context: parserContext(upload),
      },
      confidence: item.confidence,
      source_snippet: item.source_quote || null,
    })
  }

  for (const meeting of extraction.meetings) {
    const complete = meeting.days.length > 0 && meeting.start_time !== null && meeting.end_time !== null
    rows.push({
      ...base,
      syllabus_upload_id: firstUpload.id,
      item_kind: 'meeting_time',
      title: meetingTitle(meeting),
      payload: {
        kind: meeting.kind,
        days: meeting.days,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        location: meeting.location,
        parser_context: parserContext(firstUpload),
      },
      confidence: complete ? 'high' : 'low',
      source_snippet: meeting.source_quote || null,
    })
  }

  // Only instructors: accepting one sets the course's professor email.
  for (const contact of extraction.contacts) {
    if (contact.role !== 'instructor' || !contact.email) continue
    rows.push({
      ...base,
      syllabus_upload_id: firstUpload.id,
      item_kind: 'professor_email',
      title: contact.email,
      payload: { email: contact.email, name: contact.name, parser_context: parserContext(firstUpload) },
      confidence: 'high',
      source_snippet: null,
    })
  }

  return rows
}

export interface ExtractionSummary {
  course: Extraction['course']
  rules: Extraction['rules']
  warnings: string[]
  upload_ids: string[]
  model: string
  usage: { input_tokens: number; output_tokens: number }
  duration_ms: number
  extracted_at: string
}

export function buildSummary(
  extraction: Extraction,
  run: { model: string; usage: { input_tokens: number; output_tokens: number }; durationMs: number },
  uploadIds: string[],
): ExtractionSummary {
  return {
    course: extraction.course,
    rules: extraction.rules,
    warnings: extraction.warnings,
    upload_ids: uploadIds,
    model: run.model,
    usage: { input_tokens: run.usage.input_tokens, output_tokens: run.usage.output_tokens },
    duration_ms: run.durationMs,
    extracted_at: new Date().toISOString(),
  }
}
