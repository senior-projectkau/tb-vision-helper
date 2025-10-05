-- Make tb-models bucket public so the model can be accessed by the inference API
UPDATE storage.buckets 
SET public = true 
WHERE id = 'tb-models';