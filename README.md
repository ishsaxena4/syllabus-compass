# Syllabus Compass

Turn a semester's worth of syllabi into one planner.

**Live:** https://syllabus-compass.vercel.app

Upload a course's syllabus and schedule (PDF, Word, or a photo). Syllabus Compass reads them, pulls out every homework, quiz, exam, discussion post and project with its due date and time, finds the class meeting times and instructor contacts, and puts everything on a dashboard and calendar. Nothing is added blindly: you review each extracted item, edit what's off, and accept what's right.

## What it does

- **Upload & extract**: drop in one or more files per course. A syllabus and a separate schedule are read together, so a date from the calendar and a time from the syllabus policy end up on the same item.
- **Review before import**: every item shows where it came from and where its time came from. Items that can go in as-is are pre-selected; anything doubtful (no date, no time, a real ambiguity) is flagged rather than guessed. Starting mid-semester, already-past work can be imported as done in the same click. Unfinished reviews can be reopened from the Upload page or the course page.
- **Dashboard**: what's due today and in the next 7 days, a one-click way to clear past work, and items that need attention (such as an exam with no date yet).
- **Calendar & course pages**: deadlines by month with a panel for each day, and per course with an exam timeline, meeting times and the professor's email. Exams are marked wherever they appear.
- **Manual entry**: add or edit assignments and courses yourself, and check work off anywhere.

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
                 4. write extracted_items (status: pending) and the course-level
                    summary (rules, warnings) to syllabus_uploads.extraction
   ◀── review screen: accept → assignments / course_meetings / courses
```

Claude reads the whole document, including tables and calendar grids, in one call. Code handles everything that must be exact: date validity, timezones and deduplication. The prompt (`supabase/functions/process-syllabus/extract/prompt.ts`) is written as general rules for any syllabus, and accuracy is measured against real syllabi (see [Extraction benchmark](#extraction-benchmark)).

## Status

| Area | State |
|---|---|
| Auth (email + Google, password reset), onboarding, dashboard, calendar, courses | Live |
| Claude extractor (`extract/`) + benchmark | Live; 100% recall/precision on the 4-course benchmark |
| `process-syllabus` edge function | Live; one call per course, limited to 10 runs per user per day |
| Sylli (AI assistant chat) | Paused and hidden from the app; page and function stubs remain in the repo |
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
  hooks/useAcademicData  data fetching and mutations for courses, assignments, attention items
  lib/pipeline/          upload → process → review client (real + mock adapters)
  lib/assignments.ts     shared rules for open / past-due / due-within views
  lib/recoveryRedirect   routes password-reset links to the reset form (loaded first)
  integrations/supabase/ client and generated database types
  types/                 shared app types, including ASSIGNMENT_TYPES
supabase/
  migrations/            database schema, applied with `supabase db push`
  functions/process-syllabus/
    index.ts             HTTP handler: auth, download, extract, write rows
    rows.ts              maps the extraction to extracted_items rows
    limits.ts            per-user daily run limit
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

In the dashboard, under **Authentication → URL Configuration**:

- **Site URL:** `https://syllabus-compass.vercel.app`
- **Redirect URLs:** `https://syllabus-compass.vercel.app/**` and `http://localhost:8080/**`

The app builds every auth link from the page's own origin, so these are the only places the domain is configured.

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
deno test --allow-env ../supabase/functions/process-syllabus/ .   # unit tests
```

Each run reports recall (required items found), precision, type and time accuracy, invented times, meetings, contacts, and actual cost, then lists every miss, extra item and wrong time.

## Deploying

| Part | How it ships |
|---|---|
| Frontend | Vercel project `syllabus-compass`, connected to GitHub. Every push to `main` deploys to https://syllabus-compass.vercel.app; pull requests get preview URLs. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| Database | `supabase db push` after adding a migration, then `npm run supabase:types`. |
| Edge function | `supabase functions deploy process-syllabus` (not automatic). |
| Secrets | `ANTHROPIC_API_KEY` in Supabase function secrets. The app uses only the publishable key; legacy anon/service_role keys are disabled. |

`vercel.json` rewrites all routes to `index.html` so deep links work. GitHub Actions (`.github/workflows/ci.yml`) type-checks and builds the frontend and runs the Deno tests on every push and pull request.
