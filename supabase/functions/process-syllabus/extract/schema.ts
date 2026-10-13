// Output contract for syllabus extraction. Claude's response is constrained to
// EXTRACTION_SCHEMA via structured outputs; the TypeScript types mirror it.

export const ITEM_TYPES = [
  'homework', 'quiz', 'exam', 'project', 'reading', 'lab', 'discussion', 'other',
] as const
export const MEETING_KINDS = ['lecture', 'recitation', 'lab', 'office_hours', 'other'] as const
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const TIME_BASES = ['explicit', 'course_policy', 'meeting', 'none'] as const
export const CONFIDENCES = ['high', 'medium', 'low'] as const
export const CONTACT_ROLES = ['instructor', 'ta', 'other'] as const

export type ItemType = (typeof ITEM_TYPES)[number]
export type MeetingKind = (typeof MEETING_KINDS)[number]
export type Weekday = (typeof WEEKDAYS)[number]
export type TimeBasis = (typeof TIME_BASES)[number]
export type Confidence = (typeof CONFIDENCES)[number]

export interface ExtractedCourse {
  code: string | null
  title: string | null
  term: string | null
  term_start_date: string | null
  term_end_date: string | null
}

export interface ExtractedContact {
  name: string | null
  email: string | null
  role: (typeof CONTACT_ROLES)[number]
}

export interface ExtractedMeeting {
  kind: MeetingKind
  days: Weekday[]
  start_time: string | null
  end_time: string | null
  location: string | null
  source_quote: string
}

export interface ExtractedItem {
  title: string
  type: ItemType
  due_date: string | null
  due_time: string | null
  end_time: string | null
  time_basis: TimeBasis
  available_from_date: string | null
  available_from_time: string | null
  confidence: Confidence
  ambiguity: string | null
  source_quote: string
  source_document: number
}

export interface ExtractedRule {
  text: string
  applies_to: ItemType
}

export interface Extraction {
  course: ExtractedCourse
  contacts: ExtractedContact[]
  meetings: ExtractedMeeting[]
  items: ExtractedItem[]
  rules: ExtractedRule[]
  warnings: string[]
}

const nullableString = { type: ['string', 'null'] }
const date = { type: ['string', 'null'], description: 'YYYY-MM-DD, or null' }
const time = { type: ['string', 'null'], description: '24-hour HH:MM in the course\'s local time, or null' }

function object(properties: Record<string, unknown>) {
  return { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) }
}

export const EXTRACTION_SCHEMA = object({
  course: object({
    code: nullableString,
    title: nullableString,
    term: nullableString,
    term_start_date: date,
    term_end_date: date,
  }),
  contacts: {
    type: 'array',
    items: object({
      name: nullableString,
      email: nullableString,
      role: { type: 'string', enum: CONTACT_ROLES },
    }),
  },
  meetings: {
    type: 'array',
    items: object({
      kind: { type: 'string', enum: MEETING_KINDS },
      days: { type: 'array', items: { type: 'string', enum: WEEKDAYS } },
      start_time: time,
      end_time: time,
      location: nullableString,
      source_quote: { type: 'string' },
    }),
  },
  items: {
    type: 'array',
    items: object({
      title: { type: 'string' },
      type: { type: 'string', enum: ITEM_TYPES },
      due_date: date,
      due_time: time,
      end_time: time,
      time_basis: { type: 'string', enum: TIME_BASES },
      available_from_date: date,
      available_from_time: time,
      confidence: { type: 'string', enum: CONFIDENCES },
      ambiguity: { type: ['string', 'null'], description: 'A specific doubt about this date or time, or null' },
      source_quote: { type: 'string' },
      source_document: { type: 'integer', description: '1-based index of the document the item came from' },
    }),
  },
  rules: {
    type: 'array',
    items: object({
      text: { type: 'string' },
      applies_to: { type: 'string', enum: ITEM_TYPES },
    }),
  },
  warnings: { type: 'array', items: { type: 'string' } },
})
