# Syllabus Compass — working notes

See README.md for what the app is, the architecture, and setup.

## Current state (branch `rebuild`)
- Supabase project `olkriduceflppgxmeghr` is live and linked (`supabase db push` works from the repo). The migration history is in sync.
- The Claude extractor in `supabase/functions/process-syllabus/extract/` is done and benchmarked. The chosen model is **Claude Opus 5 at medium effort** (`DEFAULT_MODEL` in `extract/claude.ts`).
  - Benchmark: 4 real courses, 61 required items, 100% recall and precision, all due times correct, about $0.30 per course.
  - Confidence means "is the date/time right", not "how many sources"; `ambiguity` is only for real doubts about the date/time. Before this rule, every item got a caveat and nothing was pre-selected in review. After it (run 2026-10-13T22-27-17), only the 4 undated items of 63 are flagged.
  - Sonnet 5 and Haiku 4.5 each misdated an exam from a calendar grid, so don't switch models without re-running the benchmark.
- The benchmark lives in `eval/` (`cd eval && deno task eval`). Syllabi and answer keys are in gitignored `Benchmark/`. The Anthropic key is in gitignored `supabase/functions/.env`.
- `process-syllabus` (code on this branch) runs the Claude extractor: `index.ts` takes `syllabus_upload_ids` + `student_notes` + `timezone`, runs as the calling user with the publishable key (`SUPABASE_PUBLISHABLE_KEYS`), writes `extracted_items`, and stores course info/rules/warnings in `syllabus_uploads.extraction` (migration `20261014000000`). Row mapping is in `rows.ts`. Re-running a batch replaces its pending items.
- Frontend: the upload page stages files plus an optional notes box, uploads them all, then calls the function once. The review screen shows time basis, ambiguity, source quote, course rules/warnings, and an undated section. pdfjs/mammoth are gone from the client.
- Instructor contacts become `professor_email` items (TAs are not imported). Office-hours meetings, when accepted, fill `courses.office_hours` instead of `course_meetings`.
- Deployed and tested end to end on 2026-10-13 with MA 261 (syllabus + schedule): all homeworks, quizzes, midterms, recitation, office hours and email extracted; review pre-selects everything except the undated final and the lecture with no end time.

## Next tasks
- Done 2026-10-13: legacy anon/service_role keys disabled; `OPENAI_API_KEY` and `LOVABLE_API_KEY` secrets removed.
- Done 2026-10-13: Attention Needed fixed (migration `20261015000000`: `risk_reason` codes, saved resolve/dismiss via `assignments.attention_dismissed_at`); unused UTC views `v_today`/`v_due_soon` dropped. Pending reviews are reachable from the Upload page and course Overview.
1. Remaining:
   - Deploy the frontend to Vercel.
   - Configure Supabase auth redirect URLs.

## Conventions
- Keep the extraction prompt as general rules. Never add instructions aimed at one specific syllabus, which would overfit to the benchmark.
- Re-run the benchmark after any change to the prompt, schema, or model, and check with the user before spending more than a few dollars.
- Never print secrets: no `supabase projects api-keys` output and no `.env` contents.
- Commit with the attribution trailer the harness provides.
