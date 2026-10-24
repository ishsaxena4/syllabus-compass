-- Per-user daily limit on syllabus extractions.
--
-- The old limit counted processed_at on syllabus_uploads, which users can update
-- themselves and which a re-run of the same batch overwrites, so it could be
-- bypassed. Runs are now recorded here before Claude is called. Users can read
-- their own runs but only claim_extraction_run() writes them.

CREATE TABLE IF NOT EXISTS public.extraction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS extraction_runs_user_started_idx
  ON public.extraction_runs (user_id, started_at DESC);

ALTER TABLE public.extraction_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extraction_runs_select_own ON public.extraction_runs;
CREATE POLICY extraction_runs_select_own ON public.extraction_runs
  FOR SELECT USING (auth.uid() = user_id);

-- Records a run for the calling user and returns true, or returns false when they
-- have already used today's runs. The limit is fixed here rather than passed in,
-- since any parameter could be set by the user through rpc().
-- Keep in sync with MAX_RUNS_PER_DAY in supabase/functions/process-syllabus/limits.ts.
CREATE OR REPLACE FUNCTION public.claim_extraction_run()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize a user's concurrent requests so parallel calls can't all pass the check.
  PERFORM pg_advisory_xact_lock(hashtext('extraction_runs:' || v_user_id::text));

  IF (
    SELECT count(*)
    FROM public.extraction_runs
    WHERE user_id = v_user_id
      AND started_at > now() - interval '24 hours'
  ) >= 10 THEN
    RETURN false;
  END IF;

  INSERT INTO public.extraction_runs (user_id) VALUES (v_user_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_extraction_run() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_extraction_run() TO authenticated;
