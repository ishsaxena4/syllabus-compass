import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runHybridPipeline } from './pipeline.ts'
import { extractTextFromImageWithOpenAI } from './openai.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    if (extracted_text !== null && extracted_text !== undefined && typeof extracted_text !== 'string') {
      return new Response(JSON.stringify({ error: 'extracted_text must be a string when provided' }), {
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

    let effectiveExtractedText = typeof extracted_text === 'string' ? extracted_text : ''

    if (!effectiveExtractedText.trim() && typeof upload.file_mime === 'string' && upload.file_mime.startsWith('image/')) {
      const { data: imageBlob, error: imageErr } = await supabase.storage
        .from('syllabi')
        .download(upload.file_path)
      if (imageErr || !imageBlob) {
        return new Response(JSON.stringify({ error: 'Could not download image for OCR' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const bytes = new Uint8Array(await imageBlob.arrayBuffer())
      try {
        effectiveExtractedText = await extractTextFromImageWithOpenAI({
          bytes,
          mimeType: upload.file_mime || 'image/png',
        })
      } catch (ocrError) {
        return new Response(
          JSON.stringify({ error: ocrError instanceof Error ? ocrError.message : 'Image OCR failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    if (!effectiveExtractedText.trim()) {
      return new Response(JSON.stringify({ error: 'No text could be extracted from this upload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Truncate very large texts for predictable cost/perf.
    const MAX_LEN = 200_000
    const rawText =
      effectiveExtractedText.length > MAX_LEN
        ? effectiveExtractedText.substring(0, MAX_LEN) + '\n\n[TRUNCATED]'
        : effectiveExtractedText

    await supabase
      .from('syllabus_uploads')
      .update({ raw_text: rawText, processed_at: new Date().toISOString() })
      .eq('id', syllabus_upload_id)

    const effectiveCourseId = course_id || upload.course_id

    const referenceYear = new Date(upload.created_at || Date.now()).getUTCFullYear()
    const pipelineResult = await runHybridPipeline({
      rawText,
      referenceYear,
      timezone: typeof timezone === 'string' ? timezone : 'UTC',
      supabase,
      syllabus_upload_id,
      user_id: user.id,
      course_id: effectiveCourseId,
      source_file_name: upload.file_name,
      source_file_id: upload.id,
    })

    let created_count = 0
    if (pipelineResult.insertRows.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('extracted_items')
        .insert(pipelineResult.insertRows)
        .select()

      if (insErr) {
        return new Response(
          JSON.stringify({ error: `Insert failed: ${insErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      created_count = inserted?.length || 0
    }

    const diagnostics = {
      empty_result: created_count === 0,
      openai_error_present: Boolean(pipelineResult.stats.openai_error),
      normalization_dropoff:
        pipelineResult.stats.heuristic_items > 0 && pipelineResult.stats.normalized_items === 0,
    }

    return new Response(
      JSON.stringify({
        ok: true,
        created_count,
        syllabus_upload_id,
        course_id: effectiveCourseId,
        parser_version: 'hybrid-v1',
        parser_stats: pipelineResult.stats,
        diagnostics,
        review_url_hint: `/upload?review=${syllabus_upload_id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
