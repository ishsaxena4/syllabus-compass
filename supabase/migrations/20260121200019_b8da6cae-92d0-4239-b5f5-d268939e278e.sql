-- Recreate v_due_soon with security invoker enabled
DROP VIEW IF EXISTS public.v_due_soon;
CREATE VIEW public.v_due_soon
WITH (security_invoker=on) AS
SELECT
  a.id,
  a.title,
  a.type,
  a.status,
  a.confirmed,
  a.confidence,
  a.due_at,
  a.notes,
  a.user_id,
  a.course_id,
  c.name AS course_name,
  c.color AS course_color
FROM public.assignments a
LEFT JOIN public.courses c ON c.id = a.course_id
WHERE a.status = 'upcoming'
  AND a.due_at IS NOT NULL
  AND a.due_at <= (now() + interval '7 days')
ORDER BY a.due_at ASC;

-- Recreate v_today with security invoker enabled
DROP VIEW IF EXISTS public.v_today;
CREATE VIEW public.v_today
WITH (security_invoker=on) AS
SELECT
  a.id,
  a.title,
  a.type,
  a.status,
  a.confirmed,
  a.confidence,
  a.due_at,
  a.notes,
  a.user_id,
  a.course_id,
  c.name AS course_name,
  c.color AS course_color
FROM public.assignments a
LEFT JOIN public.courses c ON c.id = a.course_id
WHERE a.status = 'upcoming'
  AND a.due_at IS NOT NULL
  AND a.due_at::date = CURRENT_DATE
ORDER BY a.due_at ASC;

-- Recreate v_risky_items with security invoker enabled
DROP VIEW IF EXISTS public.v_risky_items;
CREATE VIEW public.v_risky_items
WITH (security_invoker=on) AS
SELECT
  a.id AS entity_id,
  'assignment' AS entity_type,
  a.title AS label,
  a.confidence,
  a.confirmed,
  a.due_at,
  a.source_snippet,
  a.updated_at AS last_updated_at,
  a.user_id,
  a.course_id,
  c.name AS course_name,
  c.color AS course_color,
  CASE
    WHEN a.confidence = 'low' AND a.confirmed = false THEN 'Low confidence, unconfirmed'
    WHEN a.confirmed = false THEN 'Unconfirmed'
    WHEN a.confidence = 'low' THEN 'Low confidence'
    ELSE 'Needs review'
  END AS risk_reason
FROM public.assignments a
LEFT JOIN public.courses c ON c.id = a.course_id
WHERE (a.confidence = 'low' OR a.confirmed = false)
  AND a.status = 'upcoming'
ORDER BY a.due_at ASC NULLS LAST;