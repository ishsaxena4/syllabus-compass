import { assertEquals } from 'jsr:@std/assert@1'
import { buildItemRows, formatClock } from './rows.ts'
import type { Extraction, ExtractedItem } from './extract/schema.ts'

const ctx = {
  userId: 'user-1',
  courseId: 'course-1',
  timezone: 'America/New_York',
  uploads: [{ id: 'up-1', file_name: 'syllabus.pdf' }, { id: 'up-2', file_name: 'schedule.pdf' }],
}

function item(overrides: Partial<ExtractedItem>): ExtractedItem {
  return {
    title: 'HW 1', type: 'homework', due_date: '2026-09-04', due_time: '23:00', end_time: null,
    time_basis: 'course_policy', available_from_date: null, available_from_time: null,
    confidence: 'medium', ambiguity: null, source_quote: 'HW 1 due', source_document: 2,
    ...overrides,
  }
}

function extraction(overrides: Partial<Extraction>): Extraction {
  return {
    course: { code: null, title: null, term: null, term_start_date: null, term_end_date: null },
    contacts: [], meetings: [], items: [], rules: [], warnings: [],
    ...overrides,
  }
}

Deno.test('assignment due_at is converted to UTC and linked to its source upload', () => {
  const [row] = buildItemRows(extraction({ items: [item({})] }), ctx)
  assertEquals(row.item_kind, 'assignment')
  assertEquals(row.syllabus_upload_id, 'up-2')
  assertEquals(row.payload.due_at, '2026-09-05T03:00:00.000Z')
  assertEquals(row.payload.time_inferred, false)
  assertEquals(row.payload.time_basis, 'course_policy')
  assertEquals(row.source_snippet, 'HW 1 due')
})

Deno.test('a date with no time defaults to 23:59 and is flagged as inferred', () => {
  const [row] = buildItemRows(extraction({ items: [item({ due_time: null, time_basis: 'none' })] }), ctx)
  assertEquals(row.payload.due_at, '2026-09-05T03:59:00.000Z')
  assertEquals(row.payload.time_inferred, true)
})

Deno.test('undated items keep a null due_at and are not marked inferred', () => {
  const [row] = buildItemRows(extraction({ items: [item({ due_date: null, due_time: null, time_basis: 'none' })] }), ctx)
  assertEquals(row.payload.due_at, null)
  assertEquals(row.payload.time_inferred, false)
})

Deno.test('exam end time becomes end_at on the same day', () => {
  const [row] = buildItemRows(
    extraction({ items: [item({ type: 'exam', due_time: '20:00', end_time: '21:30', time_basis: 'explicit' })] }),
    ctx,
  )
  assertEquals(row.payload.end_at, '2026-09-05T01:30:00.000Z')
})

Deno.test('meetings with missing times are low confidence; only instructor emails become rows', () => {
  const rows = buildItemRows(extraction({
    meetings: [
      { kind: 'lecture', days: ['mon', 'wed', 'fri'], start_time: '10:30', end_time: '11:20', location: 'WTHR 104', source_quote: 'MWF' },
      { kind: 'recitation', days: ['thu'], start_time: null, end_time: null, location: null, source_quote: 'Rec' },
    ],
    contacts: [
      { name: 'Dr. A', email: 'a@uni.edu', role: 'instructor' },
      { name: 'TA B', email: 'b@uni.edu', role: 'ta' },
      { name: 'Dr. C', email: null, role: 'instructor' },
    ],
  }), ctx)
  const meetings = rows.filter(r => r.item_kind === 'meeting_time')
  assertEquals(meetings.map(m => [m.title, m.confidence]), [
    ['Lecture · MWF 10:30 AM – 11:20 AM', 'high'],
    ['Recitation · R', 'low'],
  ])
  const emails = rows.filter(r => r.item_kind === 'professor_email')
  assertEquals(emails.map(e => e.payload.email), ['a@uni.edu'])
  assertEquals(emails[0].syllabus_upload_id, 'up-1')
})

Deno.test('formatClock uses 12-hour time', () => {
  assertEquals(['00:05', '09:00', '12:00', '16:30', '23:59'].map(formatClock), ['12:05 AM', '9:00 AM', '12:00 PM', '4:30 PM', '11:59 PM'])
})
