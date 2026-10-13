import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0'
import mammoth from 'npm:mammoth@1.12.0'
import { Buffer } from 'node:buffer'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import { EXTRACTION_SCHEMA, type Extraction } from './schema.ts'
import { buildUserPrompt, type ExtractionContext, SYSTEM_PROMPT } from './prompt.ts'

export interface SourceDocument {
  name: string
  mimeType: string
  bytes: Uint8Array
}

export interface ModelConfig {
  model: string
  // Thinking depth for models that take `effort`; Haiku 4.5 uses thinkingBudget instead.
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  thinkingBudget?: number
}

export const DEFAULT_MODEL: ModelConfig = { model: 'claude-opus-5', effort: 'medium' }

export interface ExtractionRun {
  extraction: Extraction
  model: string
  usage: Anthropic.Beta.BetaUsage
  durationMs: number
}

export class ExtractionError extends Error {}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

async function toContentBlock(doc: SourceDocument): Promise<Anthropic.Beta.BetaContentBlockParam> {
  if (doc.mimeType === 'application/pdf') {
    return {
      type: 'document',
      title: doc.name,
      source: { type: 'base64', media_type: 'application/pdf', data: encodeBase64(doc.bytes) },
    }
  }
  if (IMAGE_MIMES.has(doc.mimeType)) {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: doc.mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
        data: encodeBase64(doc.bytes),
      },
    }
  }
  if (doc.mimeType === DOCX_MIME || doc.name.toLowerCase().endsWith('.docx')) {
    // HTML keeps table rows and cells together, which plain-text extraction loses.
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(doc.bytes) })
    return { type: 'document', title: doc.name, source: { type: 'text', media_type: 'text/plain', data: html } }
  }
  if (doc.mimeType.startsWith('text/')) {
    const text = new TextDecoder().decode(doc.bytes)
    return { type: 'document', title: doc.name, source: { type: 'text', media_type: 'text/plain', data: text } }
  }
  throw new ExtractionError(`Unsupported file type: ${doc.mimeType || doc.name}`)
}

function thinkingParams(config: ModelConfig): Partial<Anthropic.Beta.MessageCreateParams> {
  if (config.thinkingBudget) {
    return { thinking: { type: 'enabled', budget_tokens: config.thinkingBudget } }
  }
  return {
    thinking: { type: 'adaptive' },
    ...(config.effort ? { output_config: { effort: config.effort } } : {}),
  }
}

export async function extractSyllabus(params: {
  documents: SourceDocument[]
  context: ExtractionContext
  config?: ModelConfig
  client?: Anthropic
}): Promise<ExtractionRun> {
  const config = params.config ?? DEFAULT_MODEL
  const client = params.client ?? new Anthropic()
  if (params.documents.length === 0) throw new ExtractionError('No documents to extract from')

  const blocks = await Promise.all(params.documents.map(toContentBlock))
  const userPrompt = buildUserPrompt(params.context, params.documents.map(d => d.name))
  const thinking = thinkingParams(config)
  // Opus 5 can decline a request on a safety classifier false positive; let the API
  // retry it on a fallback model instead of failing the upload.
  const fallback = config.model === 'claude-opus-5'
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
    : {}

  const started = Date.now()
  const stream = client.beta.messages.stream({
    model: config.model,
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [...blocks, { type: 'text', text: userPrompt }] }],
    ...thinking,
    output_config: {
      ...(thinking.output_config ?? {}),
      format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
    },
    ...fallback,
  } as Anthropic.Beta.MessageCreateParamsStreaming)
  const message = await stream.finalMessage()
  const durationMs = Date.now() - started

  if (message.stop_reason === 'refusal') {
    throw new ExtractionError('The model declined to process this document.')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ExtractionError('The extraction was cut off before it finished (max_tokens).')
  }
  const text = message.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text
  if (!text) throw new ExtractionError('The model returned no structured output.')

  let extraction: Extraction
  try {
    extraction = JSON.parse(text) as Extraction
  } catch {
    throw new ExtractionError('The model output was not valid JSON.')
  }
  return { extraction, model: message.model, usage: message.usage, durationMs }
}
