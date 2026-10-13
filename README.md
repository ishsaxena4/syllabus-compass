# Syllabus Compass

Turn a semester's worth of syllabi into one planner.

Upload a course's syllabus and schedule (PDF, Word, or a photo). Syllabus Compass reads them, pulls out every homework, quiz, exam, discussion post and project with its due date and time, finds the class meeting times and instructor contacts, and puts everything on a dashboard and calendar. Nothing is added blindly: you review each extracted item, edit what's off, and accept what's right.

## What it does

- **Upload & extract**: drop in one or more files per course. A syllabus and a separate schedule are read together, so a date from the calendar and a time from the syllabus policy end up on the same item.
- **Review before import**: every item shows where it came from and how confident the extractor is. Anything ambiguous (TBA finals, rules without dates) is flagged rather than guessed.
- **Dashboard**: today's work, what's due in the next week, and items that need attention.
- **Calendar & course pages**: deadlines by month and by course, with meeting times and the professor's email.
- **Manual entry**: add or edit assignments and courses yourself.

## How extraction works

```
browser ──upload──▶ Supabase Storage (syllabi/<user>/...)
   │
   └─invoke──▶ Edge Function: process-syllabus
                 1. download the course's files
                 2. send them to Claude as-is (PDFs/images natively, DOCX as HTML)
                    with a strict JSON schema for the output
                 3. validate dates/times, drop duplicates, convert local times
                    to UTC using the student's timezone
                 4. write extracted_items (status: pending)
   ◀── review screen: accept → assignments / course_meetings / courses
```

Claude reads the whole document, including tables and calendar grids, in one call. Code handles everything that must be exact: date validity, timezones and deduplication. The prompt (`supabase/functions/process-syllabus/extract/prompt.ts`) is written as general rules for any syllabus, and accuracy is measured against real syllabi (see [Extraction benchmark](#extraction-benchmark)).

## Status

| Area | State |
|---|---|
| Auth (email + Google), onboarding, dashboard, calendar, courses | Working |
| Claude extractor (`extract/`) + benchmark | Built; being tuned on real syllabi |
| `process-syllabus` edge function | Still runs the previous regex + OpenAI parser; switching to the Claude extractor next |
| Sylli (AI assistant chat) | Paused; edge functions are stubs |
| Reminders / notifications | Tables exist; nothing schedules reminders yet |

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router
- **Backend:** Supabase (Postgres with row-level security, Auth, Storage, Edge Functions on Deno)
- **Extraction:** Claude API via `@anthropic-ai/sdk` with structured outputs
- **Hosting:** Vercel (frontend), Supabase cloud (everything else)

## Project layout

```
src/
  pages/                 route screens (Dashboard, Calendar, Courses, Upload, Settings, ...)
  components/            UI; upload/ReviewExtractedItems.tsx is the review screen
  hooks/useAcademicData  data fetching for courses, assignments, attention items
  lib/pipeline/          upload → process → review client (real + mock adapters)
  integrations/supabase/ client and generated database types
  types/                 shared app types, including ASSIGNMENT_TYPES
supabase/
  migrations/            database schema, applied with `supabase db push`
  functions/process-syllabus/
    extract/             Claude extractor: schema, prompt, API call, post-processing
eval/                    benchmark runner and scorer for the extractor
Benchmark/               (gitignored) your syllabi, answer keys, and run outputs
```

## Getting started

Requirements: Node 20+ (`.nvmrc` pins 22), the [Supabase CLI](https://supabase.com/docs/guides/cli), and [Deno](https://deno.com) for edge functions and the benchmark.

```sh
npm install
cp .env.example .env     # add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev              # http://localhost:8080
```

The frontend talks to the hosted Supabase project; no local database or Docker is needed.

### Supabase

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push                                   # apply migrations
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  # used by the edge function
supabase functions deploy process-syllabus
npm run supabase:types                             # regenerate src/integrations/supabase/types.ts
```

In the dashboard, set **Authentication → URL Configuration** to include your local URL and your Vercel domain so sign-up and password-reset links work.

## Extraction benchmark

The extractor is scored against hand-checked answer keys for real syllabi. Syllabi and keys live in `Benchmark/` and are never committed.

```
Benchmark/
  Syllabi/      the PDFs/DOCX files
  expected/     one <course>.json answer key per course (format in expected/README.md)
  runs/         outputs and summary.txt from each run
```

Put your Anthropic key in `supabase/functions/.env` (gitignored; also used by `supabase functions serve`):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```sh
cd eval
deno task eval --estimate                                # input token counts, free
deno task eval                                           # default model config, all courses
deno task eval --configs opus5-medium,sonnet5-medium,haiku45 --cases ma261
deno test ../supabase/functions/process-syllabus/extract/ .   # unit tests
```

Each run reports recall (required items found), precision, type and time accuracy, invented times, meetings, contacts, and actual cost, then lists every miss, extra item and wrong time.

## Deploying

The frontend deploys to Vercel as a static Vite app. `vercel.json` rewrites all routes to `index.html` so deep links work. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project's environment variables.
