import type { SectionLabel, SyllabusBlock } from './types.ts'

function cleanupLine(line: string): string {
  return line
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function normalizeTableLikeLine(rawLine: string): string {
  if (!rawLine) return rawLine
  const tabCols = rawLine.split('\t').map(v => v.trim()).filter(Boolean)
  if (tabCols.length >= 2) {
    return tabCols.join(' | ')
  }

  const spacedCols = rawLine.split(/\s{2,}/).map(v => v.trim()).filter(Boolean)
  if (spacedCols.length >= 3) {
    const hasDateOrTime = /\b\d{1,2}[\/\-]\d{1,2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(rawLine)
    const hasScheduleSignal = /\b(due|exam|quiz|assignment|project|lab|reading|week)\b/i.test(rawLine)
    if (hasDateOrTime || hasScheduleSignal) {
      return spacedCols.join(' | ')
    }
  }

  return rawLine
}

function getRepeatedNoiseLines(lines: string[]): Set<string> {
  const counts = new Map<string, number>()

  for (const rawLine of lines) {
    const line = cleanupLine(rawLine)
    if (!line) continue

    // Common page/folio noise that appears repeatedly in PDF text.
    if (line.length <= 100) {
      const key = line.toLowerCase()
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }

  const repeated = new Set<string>()
  counts.forEach((count, line) => {
    if (count >= 3) repeated.add(line)
  })
  return repeated
}

export function normalizeSyllabusText(raw: string): string {
  const unified = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .split('\n')
    .map(normalizeTableLikeLine)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  const lines = unified.split('\n')
  const repeatedNoise = getRepeatedNoiseLines(lines)

  const cleaned = lines
    .map(cleanupLine)
    .filter(line => {
      const lower = line.toLowerCase()
      if (!line) return true
      if (/^\[page\s+\d+\]$/i.test(line)) return false
      if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(line)) return false
      if (/^\d+\s*$/.test(line)) return false
      if (repeatedNoise.has(lower)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return cleaned
}

function detectSectionForBlock(blockText: string): { section: SectionLabel; signals: string[] } {
  const lower = blockText.toLowerCase()
  const signals: string[] = []

  const patterns: Array<{ section: SectionLabel; signal: string; re: RegExp }> = [
    { section: 'course_information', signal: 'course-info-keyword', re: /\b(course\s+(?:info|information|overview|description)|syllabus)\b/i },
    { section: 'instructor_contact', signal: 'instructor-keyword', re: /\b(instructor|professor|lecturer|contact|office\s*hours|email)\b/i },
    { section: 'assignments', signal: 'assignment-keyword', re: /\b(assignments?|homework|quiz|exam|project|milestone|due|deliverable|submission)\b/i },
    { section: 'grading', signal: 'grading-keyword', re: /\b(grading|grade breakdown|evaluation|weights?)\b/i },
    { section: 'course_schedule', signal: 'schedule-keyword', re: /\b(course\s+schedule|calendar|timeline|important dates)\b/i },
    { section: 'weekly_schedule', signal: 'weekly-keyword', re: /\b(week\s+\d+|weekly schedule|mwf|tr|tuesday|thursday)\b/i },
    { section: 'policies', signal: 'policies-keyword', re: /\b(policy|attendance|late work|academic integrity|accommodations?)\b/i },
  ]

  for (const p of patterns) {
    if (p.re.test(lower)) signals.push(p.signal)
  }

  if (signals.length === 0) return { section: 'other', signals }

  if (signals.includes('instructor-keyword')) return { section: 'instructor_contact', signals }
  if (signals.includes('assignment-keyword')) return { section: 'assignments', signals }
  if (signals.includes('schedule-keyword')) return { section: 'course_schedule', signals }
  if (signals.includes('weekly-keyword')) return { section: 'weekly_schedule', signals }
  if (signals.includes('grading-keyword')) return { section: 'grading', signals }
  if (signals.includes('policies-keyword')) return { section: 'policies', signals }
  if (signals.includes('course-info-keyword')) return { section: 'course_information', signals }
  return { section: 'other', signals }
}

export function splitIntoBlocks(normalizedText: string): SyllabusBlock[] {
  const lines = normalizedText.split('\n')
  const blocks: SyllabusBlock[] = []

  let start = 0
  let current: string[] = []

  const flush = (endIndexExclusive: number) => {
    const text = current.join('\n').trim()
    if (!text) return
    const { section, signals } = detectSectionForBlock(text)
    blocks.push({
      id: `b${blocks.length + 1}`,
      startLine: start + 1,
      endLine: endIndexExclusive,
      text,
      normalizedText: text.toLowerCase(),
      section,
      signals,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const empty = line.trim() === ''
    if (empty) {
      if (current.length > 0) flush(i)
      current = []
      start = i + 1
      continue
    }
    current.push(line)
  }
  if (current.length > 0) flush(lines.length)

  return blocks
}

export function detectSections(blocks: SyllabusBlock[]): SyllabusBlock[] {
  // Section assignment currently happens in splitIntoBlocks; keep this helper
  // to preserve a readable, explicit stage in the parser pipeline.
  return blocks
}
