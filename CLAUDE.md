# Syllabus Compass — working notes

See README.md for what the app is, the architecture, setup, and how each part deploys.

## Current state (live as of 2026-10-13)
- **Live app:** https://syllabus-compass.vercel.app (Vercel project `syllabus-compass`; every push to `main` deploys, PRs get previews). A second Vercel project, `syllabus-os`, used to deploy this repo too; it was removed. Its per-deployment URLs sat behind Vercel SSO.
- **Branches:** `main` is what's deployed. Work on `rebuild` (or a feature branch), open a PR, merge. GitHub Actions runs type-check, build, and Deno tests.
- **Supabase** project `olkriduceflppgxmeghr` is linked; migration history is in sync. Auth Site URL is the Vercel URL; redirect URLs are the Vercel URL and `http://localhost:8080`, both with `/**`.
- **Keys:** the app and `process-syllabus` use only the publishable key. Legacy anon/service_role keys are disabled. Function secrets: `ANTHROPIC_API_KEY` (plus Supabase's built-ins); the Anthropic key has a monthly spend limit. `OPENAI_API_KEY` and `LOVABLE_API_KEY` were removed.
- **Extractor** (`supabase/functions/process-syllabus/extract/`): **Claude Opus 5 at medium effort** (`DEFAULT_MODEL` in `extract/claude.ts`).
  - Benchmark: 4 real courses, 63 items, 100% recall and precision, all due times correct, about $0.30 per course.
  - Confidence means "is the date/time right", not "how many sources"; `ambiguity` is only for real doubts about the date/time. Before this rule every item got a caveat and nothing was pre-selected in review. After it (run 2026-10-13T22-27-17), only the 4 undated items are flagged.
  - Sonnet 5 and Haiku 4.5 each misdated an exam from a calendar grid, so don't switch models without re-running the benchmark.
- **Benchmark** lives in `eval/` (`cd eval && deno task eval`). Syllabi and answer keys are in gitignored `Benchmark/`. The Anthropic key for it is in gitignored `supabase/functions/.env`.
- **`process-syllabus`**: takes `syllabus_upload_ids` + `student_notes` + `timezone`, runs as the calling user, writes `extracted_items`, and stores course info/rules/warnings in `syllabus_uploads.extraction`. Row mapping is in `rows.ts`; re-running a batch replaces its pending items. `limits.ts` caps each user at 10 runs per 24 hours (429 after that).
- **Frontend behaviour worth knowing:**
  - Review pre-selects items with no `attentionReason` (`lib/pipeline/review.ts`). Already-past items are grouped and imported as done by default. `acceptItems` batches inserts.
  - Assignment views share rules in `lib/assignments.ts`: open = not done and not past due; undated items have `dueDate: null`.
  - All clock times go through `lib/time.ts` (12-hour). Exams use the dark pill from `AssignmentTypeIcon`.
  - Attention Needed reads `v_risky_items` (`risk_reason` codes: missing-date, low-confidence, unconfirmed). Resolve/dismiss write to `assignments` (`attention_dismissed_at`).
  - `lib/recoveryRedirect.ts` is imported first in `main.tsx` and moves any `type=recovery` URL to `/auth/reset-password` before the Supabase client reads it.
  - Instructor contacts become `professor_email` items (TAs are not imported). Accepted office hours fill `courses.office_hours`.
- **Paused:** Sylli (AI chat) is hidden from the nav and routes; `pages/SylliPage.tsx` and the `chat*` function stubs remain in the repo but are not deployed. `process-syllabus` is the only deployed function (the old `chat*` and Lovable `send-reminders` functions were deleted 2026-10-13).

## Open items
- **Production email:** Supabase's built-in email sender is rate-limited (a few emails per hour). Set up custom SMTP before real users sign up.
- Revoke the old OpenAI key at OpenAI (user is doing this); removing it from Supabase doesn't revoke it.
- Test Google sign-in on the live site.
- Ideas, not started: real grading weights on the course Overview (currently a hardcoded placeholder card); reminders/notifications; Sylli.

## Conventions
- Keep the extraction prompt as general rules. Never add instructions aimed at one specific syllabus, which would overfit to the benchmark.
- Re-run the benchmark after any change to the prompt, schema, or model, and check with the user before spending more than a few dollars.
- Never print secrets: no `supabase projects api-keys` output and no `.env` contents.
- Production deploys (`supabase db push`, `supabase functions deploy`) are run by the user.
- Commit with the attribution trailer the harness provides.
