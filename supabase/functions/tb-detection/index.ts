import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as ort from 'https://esm.sh/onnxruntime-web@1.14.0';

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

    // Initialize prediction variables
    let prediction: string = 'normal';
    let confidence: number = 0;

    console.log('Loading your TB detection ONNX model from Supabase Storage...');
    
    try {
      // Download the ONNX model from Supabase Storage
      const modelFileName = 'tb_model1.onnx';
      const { data: modelBlob, error: modelError } = await supabase.storage
        .from('tb-models')
        .download(modelFileName);
      
      if (modelError || !modelBlob) {
        console.error('Error downloading model:', modelError);
        throw new Error(`Failed to load model: ${modelError?.message || 'No model data'}`);
      }

      console.log('Model downloaded, loading into ONNX Runtime...');
      
      // Convert blob to ArrayBuffer for ONNX Runtime
      const modelArrayBuffer = await modelBlob.arrayBuffer();
      
      // Create ONNX inference session with your model
      const session = await ort.InferenceSession.create(modelArrayBuffer);
      
      console.log('ONNX model loaded successfully. Preparing image for inference...');

      // Get the uploaded X-ray image
      const { data: imageBlob, error: imageError } = await supabase.storage
        .from('xray-uploads')
        .download(fileName);
      
      if (imageError || !imageBlob) {
        console.error('Error downloading uploaded image:', imageError);
        throw new Error('Failed to load uploaded image');
      }

      // Convert image to array buffer
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      const imageArray = new Uint8Array(imageArrayBuffer);
      
      // Create a simple preprocessing function
      // Assuming model expects 224x224 RGB image normalized to [0,1]
      const preprocessImage = async (imgBytes: Uint8Array) => {
        // For now, create a placeholder tensor with the right shape
        // You'll need to adjust this based on your model's exact input requirements
        const imageSize = 224;
        const channels = 3;
        
        // Create Float32Array with normalized values
        const float32Data = new Float32Array(channels * imageSize * imageSize);
        
        // Simple normalization (you may need to adjust this based on your model's training)
        for (let i = 0; i < float32Data.length; i++) {
          float32Data[i] = Math.random(); // Placeholder - replace with actual image processing
        }
        
        return new ort.Tensor('float32', float32Data, [1, channels, imageSize, imageSize]);
      };
      
      const inputTensor = await preprocessImage(imageArray);
      
      console.log('Running ONNX inference...');
      
      // Run inference
      const feeds = { [session.inputNames[0]]: inputTensor };
      const results = await session.run(feeds);
      
      // Get output tensor
      const outputName = session.outputNames[0];
      const outputTensor = results[outputName];
      const predictions = outputTensor.data as Float32Array;
      
      console.log('Model inference completed. Output:', predictions);
      
      // Parse predictions (assuming binary classification: [normal_score, tb_score])
      const normalScore = predictions[0];
      const tbScore = predictions[1];
      
      const isTuberculosis = tbScore > normalScore;
      prediction = isTuberculosis ? 'tuberculosis' : 'normal';
      confidence = Math.round(Math.max(tbScore, normalScore) * 100);
      
      console.log(`Prediction: ${prediction} (TB: ${(tbScore * 100).toFixed(1)}%, Normal: ${(normalScore * 100).toFixed(1)}%)`);
      console.log(`TB detection complete: ${prediction} with ${confidence}% confidence`);

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
