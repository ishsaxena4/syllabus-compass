# Syllabus Compass — working notes

See README.md for what the app is, the architecture, and setup.

## Current state (branch `rebuild`)
- Supabase project `olkriduceflppgxmeghr` is live and linked (`supabase db push` works from the repo). The migration history is in sync.
- The Claude extractor in `supabase/functions/process-syllabus/extract/` is done and benchmarked. The chosen model is **Claude Opus 5 at medium effort** (`DEFAULT_MODEL` in `extract/claude.ts`).
  - Benchmark: 4 real courses, 61 required items, 100% recall and precision, all due times correct, about $0.30 per course.
  - Sonnet 5 and Haiku 4.5 each misdated an exam from a calendar grid, so don't switch models without re-running the benchmark.
- The benchmark lives in `eval/` (`cd eval && deno task eval`). Syllabi and answer keys are in gitignored `Benchmark/`. The Anthropic key is in gitignored `supabase/functions/.env`.
- **The live `process-syllabus` edge function still runs the OLD regex + OpenAI parser** (`index.ts`, `pipeline.ts`, `heuristics.ts`, `normalize.ts`, `preprocess.ts`, `openai.ts`).

## Next task: wire the new extractor into the app
1. Rewrite `process-syllabus/index.ts` to use `extract/`:
   - Accept several `syllabus_upload_id`s for one course, plus `student_notes` and `timezone`.
   - Download the files from the `syllabi` bucket, then run `extractSyllabus` → `cleanExtraction`.
   - Write `extracted_items` rows (assignment / meeting_time / professor_email). Compute `due_at` as UTC with `localToUtcIso`. When an item has a date but no time, default to 23:59 and set `time_inferred: true`.
   - Use only the new Supabase API keys (publishable/secret), not the legacy anon/service_role JWTs. After deploy, the user disables the legacy keys; one was exposed in an earlier session.
   - Delete the old parser files and their tests, and the `openai` dependency.
2. Frontend (`src/lib/pipeline/realAdapter.ts`, `src/pages/UploadPage.tsx`):
   - Upload all of a course's files first, then make one function call for the batch.
   - Drop client-side PDF/DOCX text extraction (pdfjs, mammoth), which also shrinks the bundle.
   - Add an optional "anything we should know?" notes box (e.g. recitation time).
3. Review screen (`src/components/upload/ReviewExtractedItems.tsx`): show the time basis (stated, policy, or meeting), the ambiguity notes, the source quote, the course rules and warnings, and undated items.
4. Set the secret with `supabase secrets set ANTHROPIC_API_KEY=...`; the user runs this so the key never enters the chat. Then deploy and test end to end in the running app with a real syllabus from `Benchmark/Syllabi/`.
5. Later:
   - Deploy the frontend to Vercel.
   - Configure Supabase auth redirect URLs.
   - Fix `v_today`, which uses UTC `CURRENT_DATE`.
   - Fix the attention-items `risk_reason` mapping.

## Conventions
- Keep the extraction prompt as general rules. Never add instructions aimed at one specific syllabus, which would overfit to the benchmark.
- Re-run the benchmark after any change to the prompt, schema, or model, and check with the user before spending more than a few dollars.
- Never print secrets: no `supabase projects api-keys` output and no `.env` contents.
- Commit with the attribution trailer the harness provides.
