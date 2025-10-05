import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing request for user: ${user.id}`);

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

    // Initialize Hugging Face client with your trained model
    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!hfToken) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN not configured');
    }

    const hf = new HfInference(hfToken);
    
    // Initialize prediction variables
    let prediction: string = 'normal';
    let confidence: number = 0;

    console.log('Using your trained TB detection model from Hugging Face...');
    
    try {
      // Get the uploaded image for processing
      const { data: imageData, error: imageError } = await supabase.storage
        .from('xray-uploads')
        .download(fileName);
      
      if (imageError) {
        console.error('Error downloading uploaded image:', imageError);
        throw imageError;
      }

      console.log('Sending X-ray to your trained model for analysis...');
      
      // Convert image blob to ArrayBuffer for Hugging Face API
      const imageBuffer = await imageData.arrayBuffer();
      const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
      
      // Call your trained model on Hugging Face
      // Using the custom ONNX model at: yazeedfahaddd22/tb-detection-onnx
      const result = await hf.imageClassification({
        data: imageBlob,
        model: 'yazeedfahaddd22/tb-detection-onnx',
      });
      
      console.log('Model inference completed:', JSON.stringify(result));
      
      // Parse the results from your trained model
      // The model returns classification scores
      if (result && result.length > 0) {
        // Find tuberculosis and normal predictions
        const tbResult = result.find(r => 
          r.label.toLowerCase().includes('tuberculosis') || 
          r.label.toLowerCase().includes('tb') ||
          r.label === '1' || 
          r.label === 'positive'
        );
        
        const normalResult = result.find(r => 
          r.label.toLowerCase().includes('normal') || 
          r.label === '0' || 
          r.label === 'negative'
        );
        
        const tbScore = tbResult?.score || 0;
        const normalScore = normalResult?.score || 0;
        
        // Determine prediction based on scores
        const isTuberculosis = tbScore > normalScore;
        prediction = isTuberculosis ? 'tuberculosis' : 'normal';
        confidence = Math.round(Math.max(tbScore, normalScore) * 100);
        
        console.log(`Your Model Prediction: ${prediction} (TB: ${(tbScore * 100).toFixed(1)}%, Normal: ${(normalScore * 100).toFixed(1)}%)`);
      } else {
        throw new Error('No classification results returned from model');
      }
      
      console.log(`TB detection complete using your trained model: ${prediction} with ${confidence}% confidence`);

    } catch (modelError) {
      console.error('Error in TB detection analysis:', modelError);
      const errorMessage = modelError instanceof Error ? modelError.message : 'Unknown model error';
      throw new Error(`Model inference failed: ${errorMessage}`);
    }

    // Store detection result in database
    const { data: detectionData, error: dbError } = await supabase
      .from('tb_detections')
      .insert({
        user_id: user.id,
        image_path: fileName,
        prediction: prediction,
        confidence: confidence,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log(`Detection completed: ${prediction} with ${confidence}% confidence`);

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('xray-uploads')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      prediction: prediction,
      confidence: confidence,
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
