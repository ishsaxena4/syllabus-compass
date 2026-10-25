-- Remove schema left over from the Lovable prototype that nothing uses.
--
-- Reminders: a trigger on assignments (trg_assignments_sync_reminder in production)
-- has been writing reminder_jobs rows, but nothing ever sent them, and the Settings
-- toggles were never connected to reminder_prefs. Dropping the function with CASCADE
-- removes that trigger whatever it is named. reminder_jobs only holds rows derived
-- from assignments. Rebuild reminders from scratch when that feature is built.
--
-- Sylli (AI chat) is paused and its functions are removed from the repo. Its tables
-- held only a few test messages (6 in chat_messages as of 2026-10-24).
--
-- raw_text and source_location were used by the pre-Claude parser (raw_text was
-- set on 2 old uploads; source_location on none).

DROP FUNCTION IF EXISTS public.sync_reminder_job() CASCADE;

DROP TABLE IF EXISTS public.reminder_jobs;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.reminder_prefs;
DROP TYPE IF EXISTS public.notification_channel;

DROP TABLE IF EXISTS public.chat_actions;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.chat_sessions;

ALTER TABLE public.syllabus_uploads DROP COLUMN IF EXISTS raw_text;
ALTER TABLE public.extracted_items DROP COLUMN IF EXISTS source_location;
