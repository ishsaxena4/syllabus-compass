import { normalizeSyllabusText, splitIntoBlocks, detectSections } from './preprocess.ts'
import { extractHeuristicCandidates, generateCandidateBlocks } from './heuristics.ts'
import { normalizeCandidates } from './normalize.ts'
import {
  SAMPLE_COMPACT_ROWS,
  SAMPLE_INSTRUCTOR,
  SAMPLE_MEETINGS,
  SAMPLE_PROSE_MILESTONES,
} from './fixtures/sampleSyllabusText.ts'

function runHeuristicPipeline(rawText: string, referenceYear = 2026) {
  const normalized = normalizeSyllabusText(rawText)
  const blocks = detectSections(splitIntoBlocks(normalized))
  const candidateBlocks = generateCandidateBlocks(blocks)
  const heuristicItems = extractHeuristicCandidates(candidateBlocks)
  const normalizedItems = normalizeCandidates(heuristicItems, referenceYear)
  return { normalized, heuristicItems, normalizedItems }
}

Deno.test('multiline assignment merges date from following line', () => {
  const raw = `
Assignments
Homework 1: Linked Lists
Due April 6th, 2026
`
  const { normalizedItems } = runHeuristicPipeline(raw, 2026)
  const assignment = normalizedItems.find(i => i.item_kind === 'assignment')
  if (!assignment) throw new Error('expected assignment item')

  const dueAt = assignment.payload.due_at as string | null
  if (!dueAt?.startsWith('2026-04-06')) {
    throw new Error(`expected 2026-04-06 due date, got ${String(dueAt)}`)
  }
})

Deno.test('meeting extraction supports weekend day tokens', () => {
  const raw = `
Office Hours
Sat 10:00 am - 11:00 am, Zoom
`
  const { normalizedItems } = runHeuristicPipeline(raw)
  const meeting = normalizedItems.find(i => i.item_kind === 'meeting_time')
  if (!meeting) throw new Error('expected meeting_time item')
  const days = meeting.payload.days as string[]
  if (!Array.isArray(days) || !days.includes('sat')) {
    throw new Error(`expected sat day token, got ${JSON.stringify(days)}`)
  }
})

Deno.test('table-like spacing is normalized into parseable rows', () => {
  const raw = 'Week 3    Homework 2    Due 4/12'
  const { normalized } = runHeuristicPipeline(raw)
  if (!normalized.includes(' | ')) {
    throw new Error(`expected table-like row normalization, got: ${normalized}`)
  }
})

Deno.test('fixture text quality gate catches assignments meetings and instructor', () => {
  const raw = [
    SAMPLE_PROSE_MILESTONES,
    SAMPLE_COMPACT_ROWS,
    SAMPLE_MEETINGS,
    SAMPLE_INSTRUCTOR,
  ].join('\n')

  const { normalizedItems } = runHeuristicPipeline(raw, 2026)
  const assignments = normalizedItems.filter(i => i.item_kind === 'assignment')
  const meetings = normalizedItems.filter(i => i.item_kind === 'meeting_time')
  const emails = normalizedItems.filter(i => i.item_kind === 'professor_email')

  if (assignments.length < 4) {
    throw new Error(`expected >=4 assignments, got ${assignments.length}`)
  }
  if (meetings.length < 1) {
    throw new Error(`expected >=1 meeting item, got ${meetings.length}`)
  }
  if (emails.length < 1) {
    throw new Error(`expected >=1 professor email item, got ${emails.length}`)
  }

  const assignmentsWithDueAt = assignments.filter(i => Boolean(i.payload.due_at)).length
  if (assignmentsWithDueAt < Math.ceil(assignments.length * 0.4)) {
    throw new Error(
      `expected at least 40% assignments to have due_at, got ${assignmentsWithDueAt}/${assignments.length}`,
    )
  }
})
