-- Create storage buckets for TB detection
INSERT INTO storage.buckets (id, name, public) VALUES ('tb-models', 'tb-models', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('xray-uploads', 'xray-uploads', false);

-- Create RLS policies for model bucket (admin access only)
CREATE POLICY "Admin can access TB models" ON storage.objects
FOR ALL USING (bucket_id = 'tb-models' AND auth.role() = 'service_role');

-- Create RLS policies for X-ray uploads (temporary access)
CREATE POLICY "Users can upload X-ray images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'xray-uploads');

CREATE POLICY "Users can view their uploaded X-rays" ON storage.objects
FOR SELECT USING (bucket_id = 'xray-uploads');

-- Create table to track detection results
CREATE TABLE public.tb_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_path TEXT NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('normal', 'tuberculosis')),
  confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on detections table
ALTER TABLE public.tb_detections ENABLE ROW LEVEL SECURITY;

-- Create policy for detections (public read for now since no auth)
CREATE POLICY "Anyone can view detections" ON public.tb_detections
FOR SELECT USING (true);

CREATE POLICY "System can insert detections" ON public.tb_detections
FOR INSERT WITH CHECK (true);