// Benchmark runner: extracts every case in Benchmark/expected with each model
// config, scores it against the answer key, and reports quality and cost.
//
//   deno task eval                         # default config, all cases
//   deno task eval --configs opus5-medium,sonnet5-medium,haiku45
//   deno task eval --cases ma261 --estimate   # count input tokens only (free)
import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0'
import { parseArgs } from 'jsr:@std/cli@1/parse-args'
import { basename, join } from 'jsr:@std/path@1'
import { extractSyllabus, type ModelConfig, type SourceDocument } from '../supabase/functions/process-syllabus/extract/claude.ts'
import { cleanExtraction } from '../supabase/functions/process-syllabus/extract/resolve.ts'
import { type AnswerKey, type CaseScore, scoreCase } from './score.ts'

const ROOT = new URL('..', import.meta.url).pathname
const BENCH = join(ROOT, 'Benchmark')

const CONFIGS: Record<string, ModelConfig> = {
  'opus5-high': { model: 'claude-opus-5', effort: 'high' },
  'opus5-medium': { model: 'claude-opus-5', effort: 'medium' },
  'opus5-low': { model: 'claude-opus-5', effort: 'low' },
  'sonnet5-medium': { model: 'claude-sonnet-5', effort: 'medium' },
  'sonnet5-low': { model: 'claude-sonnet-5', effort: 'low' },
  'haiku45': { model: 'claude-haiku-4-5', thinkingBudget: 8000 },
}

// USD per million tokens (input, output). Output includes thinking tokens.
const PRICES: Record<string, [number, number]> = {
  'claude-opus-5': [5, 25],
  'claude-sonnet-5': [2, 10],
  'claude-haiku-4-5': [1, 5],
}

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
}

const args = parseArgs(Deno.args, {
  string: ['configs', 'cases', 'reference-date', 'timezone'],
  boolean: ['estimate'],
  default: { configs: 'opus5-medium', 'reference-date': '2026-08-20', timezone: 'America/Indiana/Indianapolis' },
})

function loadDocuments(key: AnswerKey): SourceDocument[] {
  return key.sources.map(name => {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    return { name, mimeType: MIME[ext] ?? 'application/octet-stream', bytes: Deno.readFileSync(join(BENCH, 'Syllabi', name)) }
  })
}

function loadKeys(): AnswerKey[] {
  const wanted = args.cases?.split(',')
  return [...Deno.readDirSync(join(BENCH, 'expected'))]
    .filter(f => f.name.endsWith('.json'))
    .map(f => JSON.parse(Deno.readTextFileSync(join(BENCH, 'expected', f.name))) as AnswerKey)
    .filter(k => !wanted || wanted.includes(k.course_key))
    .sort((a, b) => a.course_key.localeCompare(b.course_key))
}

function cost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
  const [inPrice, outPrice] = PRICES[model] ?? [0, 0]
  return (usage.input_tokens * inPrice + usage.output_tokens * outPrice) / 1_000_000
}

const pct = (n: number, d: number) => (d === 0 ? '  —  ' : `${Math.round((100 * n) / d)}%`.padStart(5))

const keys = loadKeys()
const configNames = args.configs.split(',')
for (const name of configNames) if (!CONFIGS[name]) throw new Error(`Unknown config "${name}". Known: ${Object.keys(CONFIGS).join(', ')}`)
if (keys.length === 0) throw new Error('No answer keys found in Benchmark/expected')

const client = new Anthropic()

if (args.estimate) {
  console.log('Input tokens per case (count_tokens, free). Output is typically 3-15k incl. thinking.\n')
  for (const key of keys) {
    const docs = loadDocuments(key)
    const content = docs.map(d => ({
      type: 'document' as const,
      source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: btoa(Array.from(d.bytes, b => String.fromCharCode(b)).join('')) },
    }))
    const { input_tokens } = await client.messages.countTokens({
      model: 'claude-opus-5',
      messages: [{ role: 'user', content: [...content, { type: 'text', text: 'Extract.' }] }],
    })
    console.log(`${key.course_key.padEnd(8)} ${String(input_tokens).padStart(7)} tokens  ` +
      Object.entries(PRICES).map(([m, [p]]) => `${m.replace('claude-', '')}: $${((input_tokens * p) / 1e6).toFixed(3)}`).join('  '))
  }
  Deno.exit(0)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = join(BENCH, 'runs', stamp)

interface Result { config: string; key: AnswerKey; score?: CaseScore; usd: number; ms: number; error?: string }
const results: Result[] = []

const jobs = configNames.flatMap(config => keys.map(key => ({ config, key })))
let next = 0
async function worker() {
  while (next < jobs.length) {
    const { config, key } = jobs[next++]
    const label = `${config} / ${key.course_key}`
    try {
      const run = await extractSyllabus({
        documents: loadDocuments(key),
        context: {
          courseName: key.course_key,
          studentNotes: key.context?.student_notes ?? null,
          referenceDate: args['reference-date'],
          timezone: args.timezone,
        },
        config: CONFIGS[config],
        client,
      })
      const extraction = cleanExtraction(run.extraction, key.sources.length)
      const score = scoreCase(key, extraction)
      const usd = cost(CONFIGS[config].model, run.usage)
      await Deno.mkdir(join(outDir, config), { recursive: true })
      await Deno.writeTextFile(join(outDir, config, `${key.course_key}.json`),
        JSON.stringify({ model: run.model, usage: run.usage, durationMs: run.durationMs, usd, extraction }, null, 2))
      results.push({ config, key, score, usd, ms: run.durationMs })
      console.log(`done  ${label}  recall ${score.requiredFound}/${score.required}  $${usd.toFixed(3)}  ${(run.durationMs / 1000).toFixed(0)}s`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ config, key, usd: 0, ms: 0, error: message })
      console.log(`FAIL  ${label}  ${message}`)
    }
  }
}
console.log(`Running ${jobs.length} extraction(s) -> ${outDir}\n`)
await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, worker))

// Report
const lines: string[] = []
const header = 'config           case      recall  precis  type   time   inv.t  meet   email  cost     secs'
lines.push(header, '-'.repeat(header.length))
for (const config of configNames) {
  const rows = results.filter(r => r.config === config).sort((a, b) => a.key.course_key.localeCompare(b.key.course_key))
  const t = { req: 0, found: 0, ext: 0, fp: 0, matched: 0, typeOk: 0, timeChk: 0, timeOk: 0, inv: 0, meet: 0, meetT: 0, em: 0, emT: 0, usd: 0, ms: 0 }
  for (const r of rows) {
    if (!r.score) { lines.push(`${config.padEnd(16)} ${r.key.course_key.padEnd(9)} ERROR: ${r.error}`); continue }
    const s = r.score
    lines.push(`${config.padEnd(16)} ${r.key.course_key.padEnd(9)} ${pct(s.requiredFound, s.required)}   ${pct(s.extracted - s.falsePositives.length, s.extracted)}  ${pct(s.typeCorrect, s.matches.length)}  ${pct(s.timeCorrect, s.timeChecked)}  ${String(s.inventedTimes).padStart(5)}  ${s.meetingsFound}/${s.meetingsTotal}    ${s.emailsFound}/${s.emailsTotal}    $${r.usd.toFixed(3)}  ${(r.ms / 1000).toFixed(0).padStart(4)}`)
    t.req += s.required; t.found += s.requiredFound; t.ext += s.extracted; t.fp += s.falsePositives.length
    t.matched += s.matches.length; t.typeOk += s.typeCorrect; t.timeChk += s.timeChecked; t.timeOk += s.timeCorrect
    t.inv += s.inventedTimes; t.meet += s.meetingsFound; t.meetT += s.meetingsTotal; t.em += s.emailsFound; t.emT += s.emailsTotal
    t.usd += r.usd; t.ms = Math.max(t.ms, r.ms)
  }
  lines.push(`${config.padEnd(16)} ${'TOTAL'.padEnd(9)} ${pct(t.found, t.req)}   ${pct(t.ext - t.fp, t.ext)}  ${pct(t.typeOk, t.matched)}  ${pct(t.timeOk, t.timeChk)}  ${String(t.inv).padStart(5)}  ${t.meet}/${t.meetT}    ${t.em}/${t.emT}    $${t.usd.toFixed(3)}  ${(t.ms / 1000).toFixed(0).padStart(4)}`, '')
}

lines.push('Details (misses, false positives, wrong times):')
for (const r of results) {
  if (!r.score) continue
  const s = r.score
  const issues = [
    ...s.missed.map(i => `  missed      ${i.due_date ?? 'undated'}  ${i.title}`),
    ...s.falsePositives.map(i => `  extra       ${i.due_date ?? 'undated'}  ${i.title} (${i.type})`),
    ...s.timeWrong.map(m => `  wrong time  ${m.expected.due_date}  ${m.expected.title}: got ${m.actual.due_time ?? 'none'}, expected ${m.expected.due_time}`),
    ...s.matches.filter(m => m.actual.type !== m.expected.type && !(m.expected.alt_types ?? []).includes(m.actual.type)).map(m => `  wrong type  ${m.expected.due_date}  ${m.expected.title}: got ${m.actual.type}, expected ${m.expected.type}`),
  ]
  if (issues.length) lines.push(`${r.config} / ${r.key.course_key}`, ...issues)
}

const report = lines.join('\n')
console.log('\n' + report)
await Deno.mkdir(outDir, { recursive: true })
await Deno.writeTextFile(join(outDir, 'summary.txt'), report + '\n')
console.log(`\nSaved to ${basename(BENCH)}/runs/${stamp}/`)
