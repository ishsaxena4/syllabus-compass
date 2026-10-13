-- Course-level extraction output (course info, recurring deadline rules, warnings,
-- model and usage) that has no extracted_items row of its own. Written by the
-- process-syllabus function to every upload in the batch it processed.
ALTER TABLE public.syllabus_uploads ADD COLUMN IF NOT EXISTS extraction jsonb;
