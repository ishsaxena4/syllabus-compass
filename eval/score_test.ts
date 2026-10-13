import { assertEquals } from 'jsr:@std/assert@1'
import { type AnswerKey, scoreCase } from './score.ts'
import type { Extraction, ExtractedItem } from '../supabase/functions/process-syllabus/extract/schema.ts'

function actual(overrides: Partial<ExtractedItem>): ExtractedItem {
  return {
    title: 'x', type: 'homework', due_date: null, due_time: null, end_time: null, time_basis: 'none',
    available_from_date: null, available_from_time: null, confidence: 'high', ambiguity: null,
    source_quote: '', source_document: 1, ...overrides,
  }
}

const key: AnswerKey = {
  course_key: 't', sources: [],
  contacts: [{ email: 'prof@uni.edu' }],
  meetings: [{ kind: 'lecture', days: ['mon', 'wed'], start: '09:00', end: '09:50' }],
  items: [
    { title: 'Homework: Lessons 5, 6', type: 'homework', due_date: '2026-09-08', due_time: '23:59', importance: 'required' },
    { title: 'Recitation Quiz 2', type: 'quiz', due_date: '2026-09-08', due_time: '16:30', importance: 'required' },
    { title: 'Final Exam', type: 'exam', due_date: null, due_time: null, importance: 'required' },
    { title: 'Course evaluation', type: 'other', due_date: '2026-12-11', due_time: null, importance: 'optional' },
  ],
}

function extraction(items: ExtractedItem[]): Extraction {
  return {
    course: { code: null, title: null, term: null, term_start_date: null, term_end_date: null },
    contacts: [{ name: 'Prof', email: 'PROF@uni.edu', role: 'instructor' }],
    meetings: [{ kind: 'lecture', days: ['wed', 'mon'], start_time: '09:00', end_time: '09:50', location: null, source_quote: '' }],
    items, rules: [], warnings: [],
  }
}

Deno.test('same-day items pair by type, undated items pair by title', () => {
  const s = scoreCase(key, extraction([
    actual({ title: 'Quiz 2', type: 'quiz', due_date: '2026-09-08', due_time: '16:30' }),
    actual({ title: 'HW Lessons 5-6', type: 'homework', due_date: '2026-09-08', due_time: '23:59' }),
    actual({ title: 'Final exam', type: 'exam' }),
  ]))
  assertEquals(s.requiredFound, 3)
  assertEquals(s.falsePositives.length, 0)
  assertEquals(s.timeCorrect, 2)
  assertEquals(s.meetingsFound, 1)
  assertEquals(s.emailsFound, 1)
})

Deno.test('wrong dates are misses plus false positives; invented times are counted', () => {
  const s = scoreCase(key, extraction([
    actual({ title: 'Homework 5, 6', due_date: '2026-09-07', due_time: '23:59' }),
    actual({ title: 'Course evaluation', type: 'other', due_date: '2026-12-11', due_time: '23:59' }),
  ]))
  assertEquals(s.requiredFound, 0)
  assertEquals(s.missed.length, 3)
  assertEquals(s.falsePositives.length, 1)
  assertEquals(s.inventedTimes, 1)
})
