import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get request body - can be either FormData (image upload) or JSON (prediction results)
    const contentType = req.headers.get('content-type') || '';
    
    let imageFile: File | null = null;
    let prediction: string;
    let confidence: number;
    let fileName: string;
    
    if (contentType.includes('multipart/form-data')) {
      // Legacy: Image upload with prediction
      const formData = await req.formData();
      imageFile = formData.get('image') as File;
      prediction = formData.get('prediction') as string || 'unknown';
      confidence = parseInt(formData.get('confidence') as string || '0');
      
      if (!imageFile) {
        return new Response(JSON.stringify({ error: 'No image file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      fileName = `${Date.now()}-${imageFile.name}`;
      console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size} bytes`);
    } else {
      // New: JSON with image data and prediction results
      const body = await req.json();
      
      if (!body.imageData || !body.prediction || body.confidence === undefined) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: imageData, prediction, confidence' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Convert base64 to blob
      const base64Data = body.imageData.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      imageFile = new File([binaryData], body.fileName || 'xray.png', { 
        type: body.imageData.split(';')[0].split(':')[1] 
      });
      
      prediction = body.prediction;
      confidence = body.confidence;
      fileName = `${Date.now()}-${body.fileName || 'xray.png'}`;
      
      console.log(`Saving detection result: ${prediction} with ${confidence}% confidence`);
    }

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('xray-uploads')
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log(`Image uploaded successfully: ${fileName}`);

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