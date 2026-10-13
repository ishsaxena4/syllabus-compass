-- Initial core schema required for local bootstrap.
-- Later migrations in this repo assume these enums/tables/functions already exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE public.assignment_status AS ENUM ('upcoming', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
    CREATE TYPE public.assignment_type AS ENUM (
      'homework', 'quiz', 'exam', 'project', 'reading', 'lab', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_confidence') THEN
    CREATE TYPE public.extraction_confidence AS ENUM ('high', 'medium', 'low');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_item_status') THEN
    CREATE TYPE public.extraction_item_status AS ENUM ('pending', 'accepted', 'discarded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekday') THEN
    CREATE TYPE public.weekday AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  section text,
  professor_name text,
  professor_email text,
  office_hours text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.syllabus_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_mime text,
  file_path text NOT NULL,
  raw_text text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extracted_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  syllabus_upload_id uuid NOT NULL REFERENCES public.syllabus_uploads(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  item_kind text NOT NULL,
  title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence public.extraction_confidence NOT NULL DEFAULT 'medium',
  status public.extraction_item_status NOT NULL DEFAULT 'pending',
  source_snippet text,
  source_location jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type public.assignment_type NOT NULL DEFAULT 'other',
  status public.assignment_status NOT NULL DEFAULT 'upcoming',
  due_at timestamptz,
  notes text,
  confidence public.extraction_confidence NOT NULL DEFAULT 'medium',
  confirmed boolean NOT NULL DEFAULT false,
  source_snippet text,
  syllabus_upload_id uuid REFERENCES public.syllabus_uploads(id) ON DELETE SET NULL,
  external_calendar_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  days public.weekday[] NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  timezone text NOT NULL DEFAULT 'UTC',
  external_calendar_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminder_prefs (
  user_id uuid PRIMARY KEY,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_lead_minutes integer NOT NULL DEFAULT 1440,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_start time,
  quiet_end time,
  email_enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminder_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reminder_jobs_assignment_id_scheduled_for_idx
  ON public.reminder_jobs(assignment_id, scheduled_for);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_course_meetings_updated_at ON public.course_meetings;
CREATE TRIGGER update_course_meetings_updated_at
BEFORE UPDATE ON public.course_meetings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_reminder_prefs_updated_at ON public.reminder_prefs;
CREATE TRIGGER update_reminder_prefs_updated_at
BEFORE UPDATE ON public.reminder_prefs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_select_own ON public.courses;
CREATE POLICY courses_select_own ON public.courses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS courses_insert_own ON public.courses;
CREATE POLICY courses_insert_own ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS courses_update_own ON public.courses;
CREATE POLICY courses_update_own ON public.courses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS courses_delete_own ON public.courses;
CREATE POLICY courses_delete_own ON public.courses FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS syllabus_uploads_select_own ON public.syllabus_uploads;
CREATE POLICY syllabus_uploads_select_own ON public.syllabus_uploads FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS syllabus_uploads_insert_own ON public.syllabus_uploads;
CREATE POLICY syllabus_uploads_insert_own ON public.syllabus_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS syllabus_uploads_update_own ON public.syllabus_uploads;
CREATE POLICY syllabus_uploads_update_own ON public.syllabus_uploads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS syllabus_uploads_delete_own ON public.syllabus_uploads;
CREATE POLICY syllabus_uploads_delete_own ON public.syllabus_uploads FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS extracted_items_select_own ON public.extracted_items;
CREATE POLICY extracted_items_select_own ON public.extracted_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS extracted_items_insert_own ON public.extracted_items;
CREATE POLICY extracted_items_insert_own ON public.extracted_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS extracted_items_update_own ON public.extracted_items;
CREATE POLICY extracted_items_update_own ON public.extracted_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS extracted_items_delete_own ON public.extracted_items;
CREATE POLICY extracted_items_delete_own ON public.extracted_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS assignments_select_own ON public.assignments;
CREATE POLICY assignments_select_own ON public.assignments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS assignments_insert_own ON public.assignments;
CREATE POLICY assignments_insert_own ON public.assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS assignments_update_own ON public.assignments;
CREATE POLICY assignments_update_own ON public.assignments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS assignments_delete_own ON public.assignments;
CREATE POLICY assignments_delete_own ON public.assignments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS course_meetings_select_own ON public.course_meetings;
CREATE POLICY course_meetings_select_own ON public.course_meetings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS course_meetings_insert_own ON public.course_meetings;
CREATE POLICY course_meetings_insert_own ON public.course_meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS course_meetings_update_own ON public.course_meetings;
CREATE POLICY course_meetings_update_own ON public.course_meetings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS course_meetings_delete_own ON public.course_meetings;
CREATE POLICY course_meetings_delete_own ON public.course_meetings FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_prefs_select_own ON public.reminder_prefs;
CREATE POLICY reminder_prefs_select_own ON public.reminder_prefs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS reminder_prefs_insert_own ON public.reminder_prefs;
CREATE POLICY reminder_prefs_insert_own ON public.reminder_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS reminder_prefs_update_own ON public.reminder_prefs;
CREATE POLICY reminder_prefs_update_own ON public.reminder_prefs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_jobs_select_own ON public.reminder_jobs;
CREATE POLICY reminder_jobs_select_own ON public.reminder_jobs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS reminder_jobs_insert_own ON public.reminder_jobs;
CREATE POLICY reminder_jobs_insert_own ON public.reminder_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS reminder_jobs_update_own ON public.reminder_jobs;
CREATE POLICY reminder_jobs_update_own ON public.reminder_jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS reminder_jobs_delete_own ON public.reminder_jobs;
CREATE POLICY reminder_jobs_delete_own ON public.reminder_jobs FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_sessions_select_own ON public.chat_sessions;
CREATE POLICY chat_sessions_select_own ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_sessions_insert_own ON public.chat_sessions;
CREATE POLICY chat_sessions_insert_own ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_sessions_update_own ON public.chat_sessions;
CREATE POLICY chat_sessions_update_own ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_sessions_delete_own ON public.chat_sessions;
CREATE POLICY chat_sessions_delete_own ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_messages_select_own ON public.chat_messages;
CREATE POLICY chat_messages_select_own ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_messages_insert_own ON public.chat_messages;
CREATE POLICY chat_messages_insert_own ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_messages_update_own ON public.chat_messages;
CREATE POLICY chat_messages_update_own ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
CREATE POLICY chat_messages_delete_own ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_actions_select_own ON public.chat_actions;
CREATE POLICY chat_actions_select_own ON public.chat_actions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_actions_insert_own ON public.chat_actions;
CREATE POLICY chat_actions_insert_own ON public.chat_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_actions_update_own ON public.chat_actions;
CREATE POLICY chat_actions_update_own ON public.chat_actions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_actions_delete_own ON public.chat_actions;
CREATE POLICY chat_actions_delete_own ON public.chat_actions FOR DELETE USING (auth.uid() = user_id);
