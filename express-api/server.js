import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

const app = express();
const port = process.env.PORT || 8000;
const upload = multer({ storage: multer.memoryStorage() });

// CORS setup
app.use(cors({
  origin: '*',
  methods: 'GET, POST, OPTIONS',
  allowedHeaders: 'authorization, x-client-info, apikey, content-type',
}));

app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TB Detection API is running' });
});

// TB detection endpoint
app.post('/tb-detection', upload.single('image'), async (req, res) => {
  try {
    console.log('Received TB detection request');

    // Get authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    console.log(`Processing request for user: ${user.id}`);

    // Get uploaded image
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`Processing image: ${imageFile.originalname}, size: ${imageFile.size} bytes`);

    // Upload image to Supabase Storage
    const fileName = `${Date.now()}-${imageFile.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('xray-uploads')
      .upload(fileName, imageFile.buffer, {
        contentType: imageFile.mimetype,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Image upload failed' });
    }

    console.log(`Image uploaded successfully: ${fileName}`);

    // Load the TB detection ONNX model
    console.log('Loading TB detection model from Supabase storage...');
    const { data: modelBlob, error: modelError } = await supabase.storage
      .from('tb-models')
      .download('tb_model1.onnx');

    if (modelError || !modelBlob) {
      console.error('Error loading model:', modelError);
      return res.status(500).json({ error: 'Model loading failed' });
    }

    console.log('Model loaded successfully');

    // Convert model blob to buffer
    const modelBuffer = await modelBlob.arrayBuffer();
    
    // Preprocess the image for the model
    console.log('Preprocessing image for model input...');
    const processedImage = await preprocessImageForModel(imageFile.buffer);
    
    // Run inference
    console.log('Running ONNX model inference...');
    const session = await ort.InferenceSession.create(Buffer.from(modelBuffer));
    
    const inputTensor = new ort.Tensor('float32', processedImage, [1, 3, 224, 224]);
    const feeds = { [session.inputNames[0]]: inputTensor };
    const results = await session.run(feeds);
    
    // Get predictions
    const outputTensor = results[session.outputNames[0]];
    const predictions = outputTensor.data;

    console.log('Raw predictions:', predictions);

    // Parse predictions (assuming binary classification: [normal, tuberculosis])
    const normalProb = predictions[0];
    const tbProb = predictions[1];

    const isTuberculosis = tbProb > normalProb;
    const prediction = isTuberculosis ? 'tuberculosis' : 'normal';
    const confidence = Math.round(Math.max(normalProb, tbProb) * 100);

    console.log(`Prediction: ${prediction} with ${confidence}% confidence (TB: ${(tbProb * 100).toFixed(1)}%, Normal: ${(normalProb * 100).toFixed(1)}%)`);

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
      return res.status(500).json({ error: 'Database error' });
    }

    // Get public URL for the image
    const { data: urlData } = supabase.storage
      .from('xray-uploads')
      .getPublicUrl(fileName);

    return res.json({
      prediction,
      confidence,
      image: urlData.publicUrl,
      detection_id: detectionData.id,
    });

  } catch (error) {
    console.error('Error in TB detection:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Image preprocessing function - resize to 224x224 and normalize
async function preprocessImageForModel(imageBuffer) {
  try {
    // Use sharp to resize and process the image
    const resizedImage = await sharp(imageBuffer)
      .resize(224, 224, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    // Convert to Float32Array and normalize to [0, 1]
    const float32Data = new Float32Array(224 * 224 * 3);
    
    for (let i = 0; i < resizedImage.length; i++) {
      float32Data[i] = resizedImage[i] / 255.0;
    }

    // Transpose to CHW format (channels, height, width)
    const chw = new Float32Array(224 * 224 * 3);
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < 224; h++) {
        for (let w = 0; w < 224; w++) {
          chw[c * 224 * 224 + h * 224 + w] = float32Data[h * 224 * 3 + w * 3 + c];
        }
      }
    }

    return chw;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log(`TB Detection API running on port ${port}`);
});
