-- Fix the dashboard's "Attention Needed" list.
--
-- risk_reason is now a stable code the app maps to a label, instead of display text
-- the app never matched. The list covers open assignments that still need the
-- student: no date yet (e.g. a final set by the registrar), or not confirmed.
-- Past-due work is excluded; the dashboard handles that separately.
-- Dismissing an item is remembered in attention_dismissed_at.

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS attention_dismissed_at timestamptz;

DROP VIEW IF EXISTS public.v_risky_items;
CREATE VIEW public.v_risky_items
WITH (security_invoker=on) AS
SELECT
  a.id AS entity_id,
  'assignment' AS entity_type,
  a.title AS label,
  a.type,
  a.confidence,
  a.confirmed,
  a.due_at,
  a.notes,
  a.source_snippet,
  a.updated_at AS last_updated_at,
  a.user_id,
  a.course_id,
  c.name AS course_name,
  c.color AS course_color,
  CASE
    WHEN a.due_at IS NULL THEN 'missing-date'
    WHEN a.confidence = 'low' THEN 'low-confidence'
    ELSE 'unconfirmed'
  END AS risk_reason
FROM public.assignments a
LEFT JOIN public.courses c ON c.id = a.course_id
WHERE a.status = 'upcoming'
  AND a.attention_dismissed_at IS NULL
  AND (
    a.due_at IS NULL
    OR (a.confirmed = false AND a.due_at >= now())
  )
ORDER BY a.due_at ASC NULLS FIRST;

-- Unused by the app, and both compared dates in UTC. The dashboard computes
-- "today" and "next 7 days" in the browser, in the student's own timezone.
DROP VIEW IF EXISTS public.v_today;
DROP VIEW IF EXISTS public.v_due_soon;
