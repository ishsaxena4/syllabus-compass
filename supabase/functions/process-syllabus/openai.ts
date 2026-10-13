import type { CandidateBlocks, CandidateRawItem, SyllabusBlock } from './types.ts'
import OpenAI from 'npm:openai@4.104.0'

interface OpenAIExtractionResult {
  items: CandidateRawItem[]
  used: boolean
  error: string | null
}

function normalizeOpenAIError(errorMessage: string): string {
  if (/429|quota|billing|insufficient_quota|exceeded your current quota/i.test(errorMessage)) {
    return 'OPENAI_QUOTA_EXCEEDED'
  }
  if (/api key|invalid api key|incorrect api key|unauthorized|401/i.test(errorMessage)) {
    return 'OPENAI_AUTH_ERROR'
  }
  if (/timeout|temporar|overloaded|gateway|unavailable/i.test(errorMessage)) {
    return 'OPENAI_TEMPORARY_UNAVAILABLE'
  }
  return errorMessage.slice(0, 220)
}

function compactForPrompt(block: SyllabusBlock): string {
  return `[${block.id} | ${block.section}] ${block.text.slice(0, 1200)}`
}

function buildPromptPayload(candidates: CandidateBlocks): string {
  const assignmentChunks = candidates.assignmentBlocks.map(compactForPrompt)
  const meetingChunks = candidates.meetingBlocks.map(compactForPrompt)
  const professorChunks = candidates.professorBlocks.map(compactForPrompt)

  return JSON.stringify(
    {
      instructions:
        'Extract syllabus items from the provided text blocks. Only return item kinds assignment, meeting_time, professor_email. Be conservative: do not hallucinate. Parse assignment tables/schedules carefully. For each output item, include a source_snippet copied from the provided text. If no reliable snippet exists, do not emit that item. Use high/medium/low confidence only.',
      assignment_blocks: assignmentChunks,
      meeting_blocks: meetingChunks,
      professor_blocks: professorChunks,
    },
    null,
    2,
  )
}

function toRawItem(entry: Record<string, unknown>): CandidateRawItem | null {
  const kind = entry.item_kind
  if (kind !== 'assignment' && kind !== 'meeting_time' && kind !== 'professor_email') {
    return null
  }

  const source_snippet =
    typeof entry.source_snippet === 'string' ? entry.source_snippet.slice(0, 500) : null
  const confidence = typeof entry.confidence === 'string' ? entry.confidence : 'medium'
  const confidence_reasons = Array.isArray(entry.confidence_reasons)
    ? entry.confidence_reasons.filter(v => typeof v === 'string') as string[]
    : []

  if (kind === 'assignment') {
    const payload = {
      title: entry.title ?? null,
      type: entry.type ?? 'other',
      date_assigned: entry.date_assigned ?? null,
      due_date: entry.due_date ?? null,
      due_time: entry.due_time ?? null,
    }
    return {
      item_kind: 'assignment',
      title: typeof entry.title === 'string' ? entry.title : null,
      payload,
      confidence,
      source_snippet,
      confidence_reasons,
      extraction_method: 'llm',
    }
  }

  if (kind === 'meeting_time') {
    const payload = {
      days: Array.isArray(entry.days) ? entry.days : [],
      start_time: entry.start_time ?? null,
      end_time: entry.end_time ?? null,
      location: entry.location ?? null,
    }
    return {
      item_kind: 'meeting_time',
      title: typeof entry.title === 'string' ? entry.title : null,
      payload,
      confidence,
      source_snippet,
      confidence_reasons,
      extraction_method: 'llm',
    }
  }

  return {
    item_kind: 'professor_email',
    title: typeof entry.title === 'string' ? entry.title : null,
    payload: { email: entry.email ?? null },
    confidence,
    source_snippet,
    confidence_reasons,
    extraction_method: 'llm',
  }
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) return JSON.parse(fenced[1].trim())
    throw new Error('OpenAI content was not valid JSON')
  }
}

function compactTextForGrounding(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isGroundedSnippet(snippet: unknown, blocks: SyllabusBlock[]): boolean {
  if (typeof snippet !== 'string') return false
  const normalized = compactTextForGrounding(snippet)
  if (normalized.length < 8) return false
  return blocks.some(block => compactTextForGrounding(block.text).includes(normalized))
}

function allCandidateBlocks(candidates: CandidateBlocks): SyllabusBlock[] {
  return [
    ...candidates.assignmentBlocks,
    ...candidates.meetingBlocks,
    ...candidates.professorBlocks,
  ]
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export async function extractTextFromImageWithOpenAI(
  params: { bytes: Uint8Array; mimeType: string },
): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const model = Deno.env.get('OPENAI_OCR_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'
  const client = new OpenAI({ apiKey })
  const imageDataUrl = `data:${params.mimeType};base64,${bytesToBase64(params.bytes)}`

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are an OCR extractor for syllabi and schedules. Return plain UTF-8 text only. Preserve line breaks and table-like rows.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all readable text from this document image.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  })

  const content = response.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI OCR response had no text content')
  }
  return content.trim()
}

export async function extractWithOpenAI(
  candidates: CandidateBlocks,
): Promise<OpenAIExtractionResult> {
  const candidateCount =
    candidates.assignmentBlocks.length
    + candidates.meetingBlocks.length
    + candidates.professorBlocks.length
  if (candidateCount === 0) {
    return { items: [], used: false, error: null }
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return { items: [], used: false, error: 'OPENAI_API_KEY not set' }

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1'
  const promptPayload = buildPromptPayload(candidates)
  const client = new OpenAI({ apiKey })
  const blocks = allCandidateBlocks(candidates)
  let lastError: string | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'syllabus_extraction',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      item_kind: {
                        type: 'string',
                        enum: ['assignment', 'meeting_time', 'professor_email'],
                      },
                      title: { type: ['string', 'null'] },
                      type: { type: ['string', 'null'] },
                      date_assigned: { type: ['string', 'null'] },
                      due_date: { type: ['string', 'null'] },
                      due_time: { type: ['string', 'null'] },
                      days: {
                        type: ['array', 'null'],
                        items: {
                          type: 'string',
                          enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                        },
                      },
                      start_time: { type: ['string', 'null'] },
                      end_time: { type: ['string', 'null'] },
                      location: { type: ['string', 'null'] },
                      email: { type: ['string', 'null'] },
                      source_snippet: { type: ['string', 'null'] },
                      confidence: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
                      confidence_reasons: {
                        type: ['array', 'null'],
                        items: { type: 'string' },
                      },
                    },
                    required: [
                      'item_kind',
                      'title',
                      'type',
                      'date_assigned',
                      'due_date',
                      'due_time',
                      'days',
                      'start_time',
                      'end_time',
                      'location',
                      'email',
                      'source_snippet',
                      'confidence',
                      'confidence_reasons',
                    ],
                  },
                },
              },
              required: ['items'],
            },
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'You extract structured syllabus data. Return only valid schema data. Prefer precision over recall. Never hallucinate. Each returned item must include a source_snippet copied verbatim from the provided blocks.',
          },
          {
            role: 'user',
            content: promptPayload,
          },
        ],
      })

      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        lastError = 'OpenAI response had no content'
        continue
      }

      let parsed: unknown
      try {
        parsed = parseJsonContent(content)
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'OpenAI content was not valid JSON'
        continue
      }

      const rawItems = (parsed as { items?: unknown[] })?.items
      if (!Array.isArray(rawItems)) {
        lastError = 'OpenAI JSON missing items array'
        continue
      }

      const normalizedRawItems = rawItems
        .map(item => toRawItem(item as Record<string, unknown>))
        .filter((item): item is CandidateRawItem => Boolean(item))

      const groundedItems = normalizedRawItems.filter(item =>
        isGroundedSnippet(item.source_snippet, blocks)
      )

      if (normalizedRawItems.length > 0 && groundedItems.length === 0) {
        lastError = 'OpenAI items were rejected due to missing grounded snippets'
        continue
      }

      const droppedCount = normalizedRawItems.length - groundedItems.length
      const warning = droppedCount > 0
        ? `OPENAI_DROPPED_UNGROUNDED_ITEMS:${droppedCount}`
        : null

      return {
        items: groundedItems,
        used: true,
        error: warning,
      }
    } catch (error) {
      lastError = normalizeOpenAIError(error instanceof Error ? error.message : 'OpenAI request failed')
      const transient = /timeout|429|rate limit|temporar|overloaded|gateway|unavailable/i.test(
        lastError,
      )
      if (!transient) break
      await new Promise(resolve => setTimeout(resolve, 250 * attempt))
    }
  }

  return {
    items: [],
    used: true,
    error: normalizeOpenAIError(lastError || 'OpenAI request failed'),
  }
}
