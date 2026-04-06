CREATE OR REPLACE FUNCTION public.delete_course_cascade(p_course_id uuid)
RETURNS void
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = p_course_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Course not found or access denied'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.assignments
  WHERE course_id = p_course_id
    AND user_id = v_user_id;

  DELETE FROM public.course_meetings
  WHERE course_id = p_course_id
    AND user_id = v_user_id;

  DELETE FROM public.extracted_items
  WHERE course_id = p_course_id
    AND user_id = v_user_id;

  DELETE FROM public.syllabus_uploads
  WHERE course_id = p_course_id
    AND user_id = v_user_id;

  DELETE FROM public.courses
  WHERE id = p_course_id
    AND user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_course_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_course_cascade(uuid) TO authenticated;
