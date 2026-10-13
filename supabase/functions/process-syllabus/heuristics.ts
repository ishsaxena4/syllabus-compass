import type { CandidateBlocks, CandidateRawItem, SyllabusBlock } from './types.ts'

const ASSIGNMENT_SIGNAL_RE =
  /\b(due|assigned|submit|submission|presentation|quiz|homework|exam|midterm|final|paper|essay|lab|project|reading|milestone|deliverable)\b/i
const DATE_SIGNAL_RE =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{1,2}(?:st|nd|rd|th)?)(?:,\s*\d{4})?\b|\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/i
const TIME_RANGE_RE =
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i
const DAYS_RE =
  /\b(?:mwf|tr|tth|m\/w\/f|t\/r|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i

function dedupeBlocks(blocks: SyllabusBlock[]): SyllabusBlock[] {
  const seen = new Set<string>()
  return blocks.filter(block => {
    if (seen.has(block.id)) return false
    seen.add(block.id)
    return true
  })
}

export function generateCandidateBlocks(blocks: SyllabusBlock[]): CandidateBlocks {
  const assignmentBlocks = blocks.filter(block =>
    block.section === 'assignments'
    || block.section === 'course_schedule'
    || block.section === 'weekly_schedule'
    || ASSIGNMENT_SIGNAL_RE.test(block.text)
    || (DATE_SIGNAL_RE.test(block.text) && /due|assigned|quiz|exam|project|paper|milestone/i.test(block.text))
  )

  const meetingBlocks = blocks.filter(block =>
    block.section === 'course_schedule'
    || block.section === 'weekly_schedule'
    || (DAYS_RE.test(block.text) && TIME_RANGE_RE.test(block.text))
  )

  const professorBlocks = blocks.filter(block =>
    block.section === 'instructor_contact'
    || EMAIL_RE.test(block.text)
    || /\b(instructor|professor|lecturer|email|contact)\b/i.test(block.text)
  )

  return {
    assignmentBlocks: dedupeBlocks(assignmentBlocks),
    meetingBlocks: dedupeBlocks(meetingBlocks),
    professorBlocks: dedupeBlocks(professorBlocks),
  }
}

function inferAssignmentType(title: string): string {
  const t = title.toLowerCase()
  if (/\b(hw|homework|assignment)\b/.test(t)) return 'homework'
  if (/\bquiz\b/.test(t)) return 'quiz'
  if (/\bmidterm|final|exam|test\b/.test(t)) return 'exam'
  if (/\bproject|capstone\b/.test(t)) return 'project'
  if (/\breading|chapter\b/.test(t)) return 'reading'
  if (/\blab\b/.test(t)) return 'lab'
  return 'other'
}

function compactSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 280)
}

function extractAssignmentCandidatesFromBlock(block: SyllabusBlock): CandidateRawItem[] {
  const items: CandidateRawItem[] = []
  const lines = block.text.split('\n')
  let previousKeywordLine: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line || line.length < 4) continue

    const nextLine = (lines[i + 1] || '').trim()
    const hasAssignmentSignal = ASSIGNMENT_SIGNAL_RE.test(line)
    const hasDateSignal = DATE_SIGNAL_RE.test(line)
    const nextLooksLikeDueLine = Boolean(nextLine)
      && DATE_SIGNAL_RE.test(nextLine)
      && (
        !ASSIGNMENT_SIGNAL_RE.test(nextLine)
        || /^\s*(due|assigned|submission|submit|on)\b/i.test(nextLine)
      )

    if (!hasAssignmentSignal) {
      if (previousKeywordLine && hasDateSignal) {
        const merged = `${previousKeywordLine} ${line}`.slice(0, 220)
        const dueHint = line.match(DATE_SIGNAL_RE)?.[0] ?? null
        items.push({
          item_kind: 'assignment',
          title: previousKeywordLine.slice(0, 160),
          payload: {
            title: previousKeywordLine.slice(0, 160),
            type: inferAssignmentType(previousKeywordLine),
            due_hint: dueHint,
            due_date: dueHint,
          },
          confidence: 'medium',
          source_snippet: compactSnippet(merged),
          confidence_reasons: [
            'heuristic-multiline-assignment-merge',
            'heuristic-date-present',
          ],
          extraction_method: 'heuristic',
        })
      }
      if (!hasDateSignal) previousKeywordLine = null
      continue
    }

    previousKeywordLine = line
    const mergedLine = nextLooksLikeDueLine ? `${line} ${nextLine}` : line
    const itemConfidence = DATE_SIGNAL_RE.test(mergedLine) ? 'medium' : 'low'
    const dueHint = DATE_SIGNAL_RE.test(mergedLine) ? mergedLine.match(DATE_SIGNAL_RE)?.[0] ?? null : null
    items.push({
      item_kind: 'assignment',
      title: line.slice(0, 160),
      payload: {
        title: line.slice(0, 160),
        type: inferAssignmentType(line),
        due_hint: dueHint,
        due_date: dueHint,
      },
      confidence: itemConfidence,
      source_snippet: compactSnippet(mergedLine),
      confidence_reasons: [
        'heuristic-assignment-keyword',
        DATE_SIGNAL_RE.test(mergedLine) ? 'heuristic-date-present' : 'heuristic-date-missing',
        ...(nextLooksLikeDueLine ? ['heuristic-next-line-date-merge'] : []),
      ],
      extraction_method: 'heuristic',
    })
  }

  return items
}

function normalizeDayToken(token: string): string[] {
  const t = token.toLowerCase().replace(/[^a-z/]/g, '')
  const map: Record<string, string[]> = {
    m: ['mon'],
    mon: ['mon'],
    monday: ['mon'],
    t: ['tue'],
    tu: ['tue'],
    tue: ['tue'],
    tues: ['tue'],
    tuesday: ['tue'],
    w: ['wed'],
    wed: ['wed'],
    wednesday: ['wed'],
    r: ['thu'],
    th: ['thu'],
    thu: ['thu'],
    thur: ['thu'],
    thurs: ['thu'],
    thursday: ['thu'],
    f: ['fri'],
    fri: ['fri'],
    friday: ['fri'],
    sat: ['sat'],
    saturday: ['sat'],
    su: ['sun'],
    sun: ['sun'],
    sunday: ['sun'],
    mwf: ['mon', 'wed', 'fri'],
    tr: ['tue', 'thu'],
    tth: ['tue', 'thu'],
    'm/w/f': ['mon', 'wed', 'fri'],
    't/r': ['tue', 'thu'],
  }
  if (map[t]) return map[t]
  if (/^[mtwrf]{2,4}$/.test(t)) {
    return t
      .split('')
      .flatMap(ch => normalizeDayToken(ch))
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
  }
  return []
}

function extractMeetingCandidatesFromBlock(block: SyllabusBlock): CandidateRawItem[] {
  const items: CandidateRawItem[] = []
  const lines = block.text.split('\n')
  const lineRe =
    /(?<days>(?:m\/w\/f|t\/r|mwf|tr|tth|[MTWRFSU]{2,4}|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?))\s+(?<start>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(?<end>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?:[, ]+(?<location>[A-Za-z][\w\s.-]{2,80}))?/i

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const match = line.match(lineRe)
    if (!match?.groups) continue

    const days = normalizeDayToken(match.groups.days)
    if (days.length === 0) continue

    items.push({
      item_kind: 'meeting_time',
      title: `Meeting ${days.join('/').toUpperCase()} ${match.groups.start}-${match.groups.end}`,
      payload: {
        days,
        start_time: match.groups.start,
        end_time: match.groups.end,
        location: match.groups.location?.trim() || null,
      },
      confidence: 'medium',
      source_snippet: compactSnippet(line),
      confidence_reasons: ['heuristic-day-time-pattern'],
      extraction_method: 'heuristic',
    })
  }

  return items
}

function extractProfessorEmailCandidatesFromBlock(block: SyllabusBlock): CandidateRawItem[] {
  const m = block.text.match(new RegExp(EMAIL_RE.source, 'ig')) || []
  const unique = Array.from(new Set(m.map(email => email.toLowerCase())))
  return unique.map(email => {
    const confidence =
      /\b(instructor|professor|lecturer|email)\b/i.test(block.text) ? 'high' : 'medium'
    return {
      item_kind: 'professor_email',
      title: `Professor email: ${email}`,
      payload: { email },
      confidence,
      source_snippet: compactSnippet(block.text),
      confidence_reasons: [
        'heuristic-email-pattern',
        confidence === 'high' ? 'heuristic-instructor-context' : 'heuristic-generic-context',
      ],
      extraction_method: 'heuristic' as const,
    }
  })
}

export function extractHeuristicCandidates(candidates: CandidateBlocks): CandidateRawItem[] {
  const items: CandidateRawItem[] = []
  for (const block of candidates.assignmentBlocks) {
    items.push(...extractAssignmentCandidatesFromBlock(block))
  }
  for (const block of candidates.meetingBlocks) {
    items.push(...extractMeetingCandidatesFromBlock(block))
  }
  for (const block of candidates.professorBlocks) {
    items.push(...extractProfessorEmailCandidatesFromBlock(block))
  }
  return items
}
