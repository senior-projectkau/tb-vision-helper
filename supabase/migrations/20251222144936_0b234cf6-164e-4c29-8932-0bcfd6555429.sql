-- Add patient_name column to tb_detections table
ALTER TABLE public.tb_detections 
ADD COLUMN patient_name text;

-- Create an index for better querying by patient name
CREATE INDEX idx_tb_detections_patient_name ON public.tb_detections(patient_name);