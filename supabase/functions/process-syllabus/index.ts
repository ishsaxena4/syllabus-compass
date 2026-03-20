import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Deterministic placeholder parser (will be replaced with OpenAI later)
// ---------------------------------------------------------------------------

interface ParsedItem {
  item_kind: string
  title: string | null
  payload: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
  source_snippet: string | null
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const ASSIGNMENT_KW =
  /\b(quiz|exam|midterm|final|homework|assignment|project|reading|lab|paper|essay|report|presentation|discussion|due)\b/i

const TYPE_MAP: Record<string, string> = {
  quiz: 'quiz', exam: 'exam', midterm: 'exam', final: 'exam',
  homework: 'homework', assignment: 'homework',
  project: 'project', reading: 'reading', lab: 'lab',
  paper: 'other', essay: 'other', report: 'other',
  presentation: 'other', discussion: 'other', due: 'other',
}

const DATE_RE =
  /(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/gi

const TIME_RE = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/

const AMBIGUOUS_RE =
  /\b(TBD|TBA|week\s+\d+|end of (?:week|semester|term)|to be (?:determined|announced))\b/i

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function parseDate(s: string) {
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return { year: +m[1], month: +m[2], day: +m[3] }

  m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) return { year: +m[3], month: +m[1], day: +m[2] }

  m = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/)
  if (m) {
    const mn = MONTHS[m[1].toLowerCase()]
    if (mn) return { year: +m[3], month: mn, day: +m[2] }
  }
  return null
}

// --- Email extraction ---

function extractEmails(text: string): ParsedItem[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const m = text.match(re)
  if (!m) return []
  const email = m[0]
  const idx = text.indexOf(email)
  const snippet = text
    .substring(Math.max(0, idx - 40), Math.min(text.length, idx + email.length + 40))
    .trim()
  return [{
    item_kind: 'professor_email',
    title: `Professor email: ${email}`,
    payload: { email },
    confidence: 'high',
    source_snippet: snippet,
  }]
}

// --- Assignment extraction ---

function extractAssignments(text: string): ParsedItem[] {
  const items: ParsedItem[] = []
  const lines = text.split('\n')
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.length < 5) continue

    const kw = line.match(ASSIGNMENT_KW)
    if (!kw) continue

    const type = TYPE_MAP[kw[1].toLowerCase()] || 'other'
    const title = line.substring(0, 150).trim()

    const ctx = [
      lines[i - 2] || '', lines[i - 1] || '', line,
      lines[i + 1] || '', lines[i + 2] || '',
    ].join(' ')

    const dates = ctx.match(DATE_RE)
    const ambig = line.match(AMBIGUOUS_RE)

    if (dates && dates.length > 0) {
      const d = parseDate(dates[0])
      if (d) {
        const tm = ctx.match(TIME_RE)
        let h = 23, min = 59, inferred = true
        if (tm) {
          h = +tm[1]; min = +tm[2]; inferred = false
          if (tm[3]) {
            const ap = tm[3].toLowerCase()
            if (ap === 'pm' && h < 12) h += 12
            if (ap === 'am' && h === 12) h = 0
          }
        }
        const due_at = `${d.year}-${pad2(d.month)}-${pad2(d.day)}T${pad2(h)}:${pad2(min)}:00`
        const key = `${title}|${due_at}`
        if (seen.has(key)) continue
        seen.add(key)
        items.push({
          item_kind: 'assignment', title,
          payload: { title, type, due_at, time_inferred: inferred },
          confidence: 'high', source_snippet: line,
        })
        continue
      }
    }

    const key = `${title}|null`
    if (seen.has(key)) continue
    seen.add(key)

    if (ambig) {
      items.push({
        item_kind: 'assignment', title,
        payload: { title, type, due_at: null, time_inferred: false },
        confidence: 'low', source_snippet: line,
      })
    } else {
      items.push({
        item_kind: 'assignment', title,
        payload: { title, type, due_at: null, time_inferred: false },
        confidence: 'medium', source_snippet: line,
      })
    }
  }
  return items
}

// --- Meeting time extraction ---

function extractMeetings(text: string): ParsedItem[] {
  const items: ParsedItem[] = []

  const dayMap: Record<string, string> = {
    m: 'mon', mo: 'mon', mon: 'mon', monday: 'mon',
    t: 'tue', tu: 'tue', tue: 'tue', tuesday: 'tue',
    w: 'wed', we: 'wed', wed: 'wed', wednesday: 'wed',
    r: 'thu', th: 'thu', thu: 'thu', thursday: 'thu',
    f: 'fri', fr: 'fri', fri: 'fri', friday: 'fri',
    s: 'sat', sa: 'sat', sat: 'sat', saturday: 'sat',
    u: 'sun', su: 'sun', sun: 'sun', sunday: 'sun',
  }

  const re =
    /([MTWRFSU][A-Za-z\/]*(?:\s*[\/,]\s*[MTWRFSU][A-Za-z\/]*)*)\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g

  let match
  while ((match = re.exec(text)) !== null) {
    const dayStr = match[1]
    let sH = +match[2], sM = +match[3]
    const sAP = match[4]
    let eH = +match[5], eM = +match[6]
    const eAP = match[7] || match[4]

    if (sAP) {
      if (sAP.toLowerCase() === 'pm' && sH < 12) sH += 12
      if (sAP.toLowerCase() === 'am' && sH === 12) sH = 0
    }
    if (eAP) {
      if (eAP.toLowerCase() === 'pm' && eH < 12) eH += 12
      if (eAP.toLowerCase() === 'am' && eH === 12) eH = 0
    }

    const days: string[] = []
    const parts = dayStr.split(/[\/,]/).map((d: string) => d.trim().toLowerCase())
    for (const part of parts) {
      let rem = part
      while (rem.length > 0) {
        let found = false
        for (let l = Math.min(rem.length, 9); l >= 1; l--) {
          const sub = rem.substring(0, l)
          if (dayMap[sub]) {
            days.push(dayMap[sub])
            rem = rem.substring(l)
            found = true
            break
          }
        }
        if (!found) rem = rem.substring(1)
      }
    }
    if (days.length === 0) continue

    const start_time = `${pad2(sH)}:${pad2(sM)}`
    const end_time = `${pad2(eH)}:${pad2(eM)}`

    const nearBy = text.substring(match.index, Math.min(text.length, match.index + 200))
    const locM = nearBy.match(
      /(?:Room|Rm|Building|Bldg|Hall|Location|@)\s*[:\s]*([A-Za-z0-9\s.,-]+?)(?:\n|$)/i,
    )
    const location = locM ? locM[1].trim().substring(0, 100) : null

    const snippet = text
      .substring(Math.max(0, match.index - 10), Math.min(text.length, match.index + match[0].length + 50))
      .trim()

    items.push({
      item_kind: 'meeting_time',
      title: `Meeting: ${days.map(d => d.toUpperCase()).join('/')} ${start_time}–${end_time}`,
      payload: { days, start_time, end_time, location },
      confidence: 'high',
      source_snippet: snippet,
    })
  }
  return items
}

function parse(text: string): ParsedItem[] {
  return [...extractEmails(text), ...extractAssignments(text), ...extractMeetings(text)]
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { syllabus_upload_id, course_id, extracted_text, timezone } = body

    if (!syllabus_upload_id || typeof syllabus_upload_id !== 'string') {
      return new Response(JSON.stringify({ error: 'syllabus_upload_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!extracted_text || typeof extracted_text !== 'string') {
      return new Response(JSON.stringify({ error: 'extracted_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify upload ownership
    const { data: upload, error: upErr } = await supabase
      .from('syllabus_uploads')
      .select('*')
      .eq('id', syllabus_upload_id)
      .single()

    if (upErr || !upload) {
      return new Response(JSON.stringify({ error: 'Syllabus upload not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (upload.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Truncate very large texts
    const MAX_LEN = 200_000
    const rawText =
      extracted_text.length > MAX_LEN
        ? extracted_text.substring(0, MAX_LEN) + '\n\n[TRUNCATED]'
        : extracted_text

    await supabase
      .from('syllabus_uploads')
      .update({ raw_text: rawText, processed_at: new Date().toISOString() })
      .eq('id', syllabus_upload_id)

    const parsed = parse(rawText)
    const effectiveCourseId = course_id || upload.course_id

    // Basic dedupe against already-existing items for this upload
    const { data: existing } = await supabase
      .from('extracted_items')
      .select('title, item_kind')
      .eq('syllabus_upload_id', syllabus_upload_id)

    const existingKeys = new Set(
      (existing || []).map((e: { item_kind: string; title: string | null }) => `${e.item_kind}|${e.title}`),
    )

    const toInsert = parsed
      .filter(p => !existingKeys.has(`${p.item_kind}|${p.title}`))
      .map(p => ({
        user_id: user.id,
        syllabus_upload_id,
        course_id: effectiveCourseId,
        item_kind: p.item_kind,
        title: p.title,
        payload: p.payload,
        confidence: p.confidence,
        status: 'pending' as const,
        source_snippet: p.source_snippet,
      }))

    let created_count = 0
    if (toInsert.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('extracted_items')
        .insert(toInsert)
        .select()

      if (insErr) {
        return new Response(
          JSON.stringify({ error: `Insert failed: ${insErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      created_count = inserted?.length || 0
    }

    return new Response(
      JSON.stringify({
        ok: true,
        created_count,
        syllabus_upload_id,
        course_id: effectiveCourseId,
        review_url_hint: `/upload?review=${syllabus_upload_id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
