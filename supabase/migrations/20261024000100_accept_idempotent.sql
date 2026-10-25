-- Link imported rows to the extracted item they came from, so accepting is safe to
-- retry. Accepting writes several tables in turn; if a later write fails, the items
-- stay pending, and accepting again used to insert the same assignments twice. With
-- a unique link, the app upserts and skips rows that already went in.
-- Manually added rows have no extracted item; UNIQUE allows any number of NULLs.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS extracted_item_id uuid
    REFERENCES public.extracted_items(id) ON DELETE SET NULL;
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_extracted_item_id_key;
ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_extracted_item_id_key UNIQUE (extracted_item_id);

ALTER TABLE public.course_meetings
  ADD COLUMN IF NOT EXISTS extracted_item_id uuid
    REFERENCES public.extracted_items(id) ON DELETE SET NULL;
ALTER TABLE public.course_meetings
  DROP CONSTRAINT IF EXISTS course_meetings_extracted_item_id_key;
ALTER TABLE public.course_meetings
  ADD CONSTRAINT course_meetings_extracted_item_id_key UNIQUE (extracted_item_id);
