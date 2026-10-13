export type ItemKind = 'assignment' | 'meeting_time' | 'professor_email'
export type Confidence = 'high' | 'medium' | 'low'

export type SectionLabel =
  | 'course_information'
  | 'instructor_contact'
  | 'assignments'
  | 'grading'
  | 'course_schedule'
  | 'weekly_schedule'
  | 'policies'
  | 'other'

export interface SyllabusBlock {
  id: string
  startLine: number
  endLine: number
  text: string
  normalizedText: string
  section: SectionLabel
  signals: string[]
}

export interface CandidateBlocks {
  assignmentBlocks: SyllabusBlock[]
  meetingBlocks: SyllabusBlock[]
  professorBlocks: SyllabusBlock[]
}

export interface CandidateRawItem {
  item_kind: ItemKind
  title?: string | null
  payload: Record<string, unknown>
  confidence?: Confidence | string | null
  source_snippet?: string | null
  confidence_reasons?: string[]
  extraction_method: 'heuristic' | 'llm'
}

export interface NormalizedItem {
  item_kind: ItemKind
  title: string | null
  payload: Record<string, unknown>
  confidence: Confidence
  source_snippet: string | null
  confidence_reasons: string[]
  extraction_methods: Array<'heuristic' | 'llm'>
  dedupe_key: string
}

export interface PipelineStats {
  blocks_total: number
  assignment_candidate_blocks: number
  meeting_candidate_blocks: number
  professor_candidate_blocks: number
  heuristic_items: number
  llm_items: number
  normalized_items: number
  merged_items: number
  openai_used: boolean
  openai_error: string | null
}
