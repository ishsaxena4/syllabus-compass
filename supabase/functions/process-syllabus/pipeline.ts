import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { detectSections, normalizeSyllabusText, splitIntoBlocks } from './preprocess.ts'
import { extractHeuristicCandidates, generateCandidateBlocks } from './heuristics.ts'
import { dedupeAndReconcile, normalizeCandidates } from './normalize.ts'
import { extractWithOpenAI } from './openai.ts'
import type { NormalizedItem, PipelineStats } from './types.ts'

function normalizeTitleForKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function existingItemKey(row: { item_kind: string; title: string | null; payload: Record<string, unknown> }): string {
  if (row.item_kind === 'assignment') {
    const title = normalizeTitleForKey(row.payload.title ?? row.title)
    const dueAt = typeof row.payload.due_at === 'string' ? row.payload.due_at : 'none'
    const type = typeof row.payload.type === 'string' ? row.payload.type.toLowerCase() : 'other'
    return `assignment|${title}|${dueAt}|${type}`
  }
  if (row.item_kind === 'meeting_time') {
    const days = Array.isArray(row.payload.days)
      ? row.payload.days.map(v => String(v).toLowerCase()).sort().join(',')
      : ''
    const start = typeof row.payload.start_time === 'string' ? row.payload.start_time : ''
    const end = typeof row.payload.end_time === 'string' ? row.payload.end_time : ''
    const loc = typeof row.payload.location === 'string'
      ? row.payload.location.toLowerCase().trim()
      : ''
    return `meeting|${days}|${start}|${end}|${loc}`
  }
  if (row.item_kind === 'professor_email') {
    const email = typeof row.payload.email === 'string'
      ? row.payload.email.toLowerCase().trim()
      : ''
    return `professor_email|${email}`
  }
  return `${row.item_kind}|${normalizeTitleForKey(row.title)}`
}

export async function runHybridPipeline(params: {
  rawText: string
  referenceYear: number
  timezone: string
  supabase: SupabaseClient
  syllabus_upload_id: string
  user_id: string
  course_id: string | null
  source_file_name?: string | null
  source_file_id?: string | null
}): Promise<{
  insertRows: Array<Record<string, unknown>>
  stats: PipelineStats
}> {
  const normalizedText = normalizeSyllabusText(params.rawText)
  if (!normalizedText.trim()) {
    return {
      insertRows: [],
      stats: {
        blocks_total: 0,
        assignment_candidate_blocks: 0,
        meeting_candidate_blocks: 0,
        professor_candidate_blocks: 0,
        heuristic_items: 0,
        llm_items: 0,
        normalized_items: 0,
        merged_items: 0,
        openai_used: false,
        openai_error: null,
      },
    }
  }

  const blocks = detectSections(splitIntoBlocks(normalizedText))
  const candidateBlocks = generateCandidateBlocks(blocks)

  const heuristicItems = extractHeuristicCandidates(candidateBlocks)
  const llmResult = await extractWithOpenAI(candidateBlocks)

  const normalized = normalizeCandidates(
    [...heuristicItems, ...llmResult.items],
    params.referenceYear,
  )
  const merged = dedupeAndReconcile(normalized)

  const { data: existingRows } = await params.supabase
    .from('extracted_items')
    .select('item_kind,title,payload')
    .eq('syllabus_upload_id', params.syllabus_upload_id)

  const existingKeys = new Set(
    (existingRows || []).map((row: { item_kind: string; title: string | null; payload: Record<string, unknown> }) =>
      existingItemKey(row),
    ),
  )

  const toInsert = merged
    .filter(item => !existingKeys.has(item.dedupe_key))
    .map(item => toInsertRow(item, params))

  return {
    insertRows: toInsert,
    stats: {
      blocks_total: blocks.length,
      assignment_candidate_blocks: candidateBlocks.assignmentBlocks.length,
      meeting_candidate_blocks: candidateBlocks.meetingBlocks.length,
      professor_candidate_blocks: candidateBlocks.professorBlocks.length,
      heuristic_items: heuristicItems.length,
      llm_items: llmResult.items.length,
      normalized_items: normalized.length,
      merged_items: merged.length,
      openai_used: llmResult.used,
      openai_error: llmResult.error,
    },
  }
}

function toInsertRow(
  item: NormalizedItem,
  params: {
    user_id: string
    syllabus_upload_id: string
    course_id: string | null
    timezone: string
    source_file_name?: string | null
    source_file_id?: string | null
  },
): Record<string, unknown> {
  return {
    user_id: params.user_id,
    syllabus_upload_id: params.syllabus_upload_id,
    course_id: params.course_id,
    item_kind: item.item_kind,
    title: item.title,
    payload: {
      ...item.payload,
      parser_context: {
        timezone: params.timezone,
        file_name: params.source_file_name || null,
        source_file_id: params.source_file_id || null,
      },
    },
    confidence: item.confidence,
    status: 'pending',
    source_snippet: item.source_snippet,
  }
}
