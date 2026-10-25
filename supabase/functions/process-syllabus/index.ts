// process-syllabus: reads all of one course's uploaded files with Claude and writes
// the results to extracted_items (status pending) for the student to review.
//
// POST { syllabus_upload_ids: string[], student_notes?: string, timezone?: string }
//
// Runs entirely as the calling user (publishable key + their JWT), so row-level
// security covers every read and write, including the storage downloads.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ExtractionError, extractSyllabus, type SourceDocument } from './extract/claude.ts'
import { cleanExtraction, isValidTimeZone } from './extract/resolve.ts'
import { buildItemRows, buildSummary } from './rows.ts'
import { MAX_RUNS_PER_DAY, sizeProblem } from './limits.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILES = 10
const MAX_NOTES_LENGTH = 2000


function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Prefer the platform-injected key; fall back to the publishable key the client sent
// (it is public by design). Legacy anon/service_role JWTs are never used.
function publishableKey(req: Request): string {
  const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
  const key = keys.default ?? Object.values(keys)[0]
  if (key) return key
  const sent = req.headers.get('apikey')
  if (sent?.startsWith('sb_publishable_')) return sent
  throw new Error('No publishable key available (SUPABASE_PUBLISHABLE_KEYS is not set)')
}

// Today's date in the student's timezone, so the year and "next week" use their calendar.
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey(req), {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const ids: unknown = body?.syllabus_upload_ids
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_FILES || !ids.every(id => typeof id === 'string')) {
      return json({ error: `syllabus_upload_ids must be a list of 1 to ${MAX_FILES} upload ids` }, 400)
    }
    const uploadIds = [...new Set(ids as string[])]
    const notes = typeof body.student_notes === 'string' ? body.student_notes.trim().slice(0, MAX_NOTES_LENGTH) : ''
    const timezone = typeof body.timezone === 'string' && isValidTimeZone(body.timezone) ? body.timezone : 'UTC'

    const { data: uploadRows, error: upErr } = await supabase
      .from('syllabus_uploads')
      .select('id, user_id, course_id, file_name, file_mime, file_path')
      .in('id', uploadIds)
    if (upErr) return json({ error: `Could not load uploads: ${upErr.message}` }, 500)
    if (!uploadRows || uploadRows.length !== uploadIds.length || uploadRows.some(u => u.user_id !== user.id)) {
      return json({ error: 'One or more uploads were not found' }, 404)
    }
    const courseId = uploadRows[0].course_id
    if (!courseId || uploadRows.some(u => u.course_id !== courseId)) {
      return json({ error: 'All uploads must belong to the same course' }, 400)
    }
    // Keep the order the client uploaded them in, so document numbers are stable.
    const uploads = uploadIds.map(id => uploadRows.find(u => u.id === id)!)

    const { data: course } = await supabase.from('courses').select('name, section').eq('id', courseId).single()

    const documents: SourceDocument[] = []
    for (const upload of uploads) {
      const { data: blob, error: dlErr } = await supabase.storage.from('syllabi').download(upload.file_path)
      if (dlErr || !blob) return json({ error: `Could not download ${upload.file_name}` }, 400)
      documents.push({
        name: upload.file_name,
        mimeType: upload.file_mime || blob.type,
        bytes: new Uint8Array(await blob.arrayBuffer()),
      })
      // Checked as each file arrives so an oversized batch stops before it's all in memory.
      const tooBig = sizeProblem(documents.map(d => ({ name: d.name, mimeType: d.mimeType, size: d.bytes.length })))
      if (tooBig) return json({ error: tooBig }, 413)
    }

    // Claimed just before calling Claude, so failed runs count too: they are billed.
    const { data: allowed, error: limitErr } = await supabase.rpc('claim_extraction_run')
    if (limitErr) return json({ error: `Could not check usage: ${limitErr.message}` }, 500)
    if (!allowed) {
      return json({
        error: `You've reached the limit of ${MAX_RUNS_PER_DAY} syllabus extractions in 24 hours. Please try again tomorrow.`,
      }, 429)
    }

    const run = await extractSyllabus({
      documents,
      context: {
        courseName: course ? [course.name, course.section].filter(Boolean).join(' ') : null,
        studentNotes: notes || null,
        referenceDate: todayIn(timezone),
        timezone,
      },
    })
    const extraction = cleanExtraction(run.extraction, documents.length)
    const rows = buildItemRows(extraction, { userId: user.id, courseId, timezone, uploads })
    const summary = buildSummary(extraction, run, uploadIds)

    // Re-running a batch replaces its unreviewed items instead of duplicating them.
    const { error: delErr } = await supabase
      .from('extracted_items')
      .delete()
      .in('syllabus_upload_id', uploadIds)
      .eq('status', 'pending')
    if (delErr) return json({ error: `Could not clear previous items: ${delErr.message}` }, 500)

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('extracted_items').insert(rows)
      if (insErr) return json({ error: `Insert failed: ${insErr.message}` }, 500)
    }

    const { error: sumErr } = await supabase
      .from('syllabus_uploads')
      .update({ extraction: summary, processed_at: summary.extracted_at })
      .in('id', uploadIds)
    if (sumErr) return json({ error: `Could not save extraction summary: ${sumErr.message}` }, 500)

    return json({
      ok: true,
      created_count: rows.length,
      syllabus_upload_ids: uploadIds,
      course_id: courseId,
      extraction: summary,
    })
  } catch (err) {
    if (err instanceof ExtractionError) return json({ error: err.message }, 422)
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
