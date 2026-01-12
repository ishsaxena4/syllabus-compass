-- Fix 1: Drop and recreate views with SECURITY INVOKER (not SECURITY DEFINER)
-- This ensures RLS policies are checked using the querying user's permissions

-- Drop existing views
DROP VIEW IF EXISTS public.v_due_soon;
DROP VIEW IF EXISTS public.v_today;
DROP VIEW IF EXISTS public.v_risky_items;

-- Recreate v_due_soon with SECURITY INVOKER
CREATE VIEW public.v_due_soon
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.user_id,
  a.course_id,
  a.title,
  a.type,
  a.status,
  a.due_at,
  a.notes,
  a.confidence,
  a.confirmed,
  c.name as course_name,
  c.color as course_color
FROM public.assignments a
JOIN public.courses c ON a.course_id = c.id
WHERE a.status = 'upcoming'
  AND a.due_at IS NOT NULL
  AND a.due_at > now()
  AND a.due_at <= now() + interval '7 days'
ORDER BY a.due_at ASC;

-- Recreate v_today with SECURITY INVOKER
CREATE VIEW public.v_today
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.user_id,
  a.course_id,
  a.title,
  a.type,
  a.status,
  a.due_at,
  a.notes,
  a.confidence,
  a.confirmed,
  c.name as course_name,
  c.color as course_color
FROM public.assignments a
JOIN public.courses c ON a.course_id = c.id
WHERE a.due_at IS NOT NULL
  AND a.due_at::date = CURRENT_DATE
ORDER BY a.due_at ASC;

-- Recreate v_risky_items with SECURITY INVOKER
CREATE VIEW public.v_risky_items
WITH (security_invoker = true)
AS
SELECT 
  a.id as entity_id,
  'assignment' as entity_type,
  a.user_id,
  a.course_id,
  a.title as label,
  a.due_at,
  a.confidence,
  a.confirmed,
  a.source_snippet,
  a.updated_at as last_updated_at,
  c.name as course_name,
  c.color as course_color,
  CASE 
    WHEN a.confidence = 'low' THEN 'Low confidence extraction'
    WHEN a.confirmed = false THEN 'Unconfirmed item'
    ELSE 'Unknown'
  END as risk_reason
FROM public.assignments a
JOIN public.courses c ON a.course_id = c.id
WHERE a.confidence = 'low' OR a.confirmed = false
ORDER BY a.due_at ASC NULLS LAST;

-- Fix 2: Update the set_updated_at function to have immutable search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

-- Fix 3: Update sync_reminder_job function to have immutable search_path
CREATE OR REPLACE FUNCTION public.sync_reminder_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
declare
  lead_minutes int;
  scheduled timestamptz;
begin
  -- Only schedule reminders for confirmed + upcoming assignments with a due date
  if (new.confirmed is true)
     and (new.status = 'upcoming')
     and (new.due_at is not null) then

    select rp.reminder_lead_minutes into lead_minutes
    from public.reminder_prefs rp
    where rp.user_id = new.user_id;

    if lead_minutes is null then
      lead_minutes := 1440; -- default 24h
    end if;

    scheduled := new.due_at - make_interval(mins => lead_minutes);

    -- Upsert reminder job
    insert into public.reminder_jobs(user_id, assignment_id, scheduled_for)
    values (new.user_id, new.id, scheduled)
    on conflict (assignment_id, scheduled_for) do nothing;

  else
    -- If assignment no longer qualifies, delete unsent jobs
    delete from public.reminder_jobs
    where assignment_id = new.id and sent_at is null;
  end if;

  return new;
end $function$;