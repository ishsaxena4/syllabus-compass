-- Private bucket for uploaded syllabus files. Objects live under "<user_id>/<file>".
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'syllabi',
  'syllabi',
  false,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS syllabi_select_own ON storage.objects;
CREATE POLICY syllabi_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'syllabi' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS syllabi_insert_own ON storage.objects;
CREATE POLICY syllabi_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'syllabi' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS syllabi_delete_own ON storage.objects;
CREATE POLICY syllabi_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'syllabi' AND (storage.foldername(name))[1] = auth.uid()::text);
