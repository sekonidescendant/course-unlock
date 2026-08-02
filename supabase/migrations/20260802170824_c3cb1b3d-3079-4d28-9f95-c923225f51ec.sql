CREATE POLICY "students upload assignment files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "students read own assignment files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "students delete own assignment files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);