-- Enable public read access to tb-models bucket for ONNX model files
CREATE POLICY "Allow public read access to models"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tb-models');

-- Optionally, allow authenticated users to upload models
CREATE POLICY "Allow authenticated users to upload models"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tb-models' 
  AND auth.role() = 'authenticated'
);