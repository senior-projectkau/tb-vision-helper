import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// TODO: Uncomment when ONNX model is uploaded
// import { pipeline } from 'https://esm.sh/@huggingface/transformers@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);

    // Upload image to Supabase Storage
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('xray-uploads')
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log(`Image uploaded successfully: ${fileName}`);

    // TODO: Replace this with actual ONNX model inference
    // Once you upload your converted ONNX model, uncomment the code below:
    
    /*
    // Load your TB detection model (convert tb_model1.pt to ONNX first)
    const classifier = await pipeline('image-classification', 'path-to-your-model');
    
    // Get the uploaded image for processing
    const { data: imageData } = await supabase.storage
      .from('xray-uploads')
      .download(fileName);
    
    if (imageData) {
      // Run inference on the actual image
      const predictions = await classifier(imageData);
      const topPrediction = predictions[0];
      
      // Map your model's output to TB detection format
      const prediction = topPrediction.label.includes('tuberculosis') ? 'tuberculosis' : 'normal';
      const confidence = Math.round(topPrediction.score * 100);
    }
    */
    
    // Mock prediction (remove when real model is integrated)
    const mockPrediction = Math.random() > 0.5 ? 'tuberculosis' : 'normal';
    const mockConfidence = Math.floor(Math.random() * 30) + 70; // 70-100%

    // Store detection result in database
    const { data: detectionData, error: dbError } = await supabase
      .from('tb_detections')
      .insert({
        image_path: fileName,
        prediction: mockPrediction,
        confidence: mockConfidence,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log(`Detection completed: ${mockPrediction} with ${mockConfidence}% confidence`);

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('xray-uploads')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      prediction: mockPrediction,
      confidence: mockConfidence,
      image: urlData.publicUrl,
      detection_id: detectionData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tb-detection function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});