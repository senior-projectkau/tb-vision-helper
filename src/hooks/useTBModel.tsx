import { useState, useEffect, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { supabase } from '@/integrations/supabase/client';

// Configure ONNX Runtime for better performance
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.logLevel = 'verbose';

export const useTBModel = () => {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Loading TB detection model from storage...');
        
        // Get the public URL for the model
        const { data: urlData } = supabase.storage
          .from('tb-models')
          .getPublicUrl('tb_model1.onnx');

        console.log('Model URL:', urlData.publicUrl);

        // Fetch the model file
        const response = await fetch(urlData.publicUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`Model downloaded: ${arrayBuffer.byteLength} bytes`);

        // Create inference session
        console.log('Creating ONNX inference session...');
        const modelSession = await ort.InferenceSession.create(arrayBuffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });

        console.log('✓ Model loaded successfully!');
        console.log('Input names:', modelSession.inputNames);
        console.log('Output names:', modelSession.outputNames);
        
        setSession(modelSession);
        setIsModelLoading(false);
        setModelError(null);
      } catch (error) {
        console.error('Failed to load model:', error);
        setModelError(error instanceof Error ? error.message : 'Failed to load model');
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  const predict = useCallback(async (imageFile: File): Promise<{ prediction: string; confidence: number }> => {
    if (!session) {
      throw new Error('Model not loaded');
    }

    try {
      console.log('Starting prediction for image:', imageFile.name);

      // Load and preprocess image
      const imageBitmap = await createImageBitmap(imageFile);
      console.log(`Image loaded: ${imageBitmap.width}x${imageBitmap.height}`);

      // Create canvas and resize to 224x224
      const canvas = document.createElement('canvas');
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw and resize image
      ctx.drawImage(imageBitmap, 0, 0, 224, 224);
      const imageData = ctx.getImageData(0, 0, 224, 224);
      
      console.log('Image preprocessed to 224x224');

      // Convert to model input format (CHW format, normalized)
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];
      const inputData = new Float32Array(1 * 3 * 224 * 224);

      // Convert RGBA to RGB and normalize (CHW format: channels first)
      for (let c = 0; c < 3; c++) {
        for (let h = 0; h < 224; h++) {
          for (let w = 0; w < 224; w++) {
            const pixelIndex = (h * 224 + w) * 4; // RGBA
            const tensorIndex = c * (224 * 224) + h * 224 + w;
            const pixelValue = imageData.data[pixelIndex + c] / 255.0;
            inputData[tensorIndex] = (pixelValue - mean[c]) / std[c];
          }
        }
      }

      console.log('Image tensor created, running inference...');
      const startTime = performance.now();

      // Create input tensor
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);
      
      // Run inference
      const feeds = { [session.inputNames[0]]: inputTensor };
      const results = await session.run(feeds);
      
      const inferenceTime = (performance.now() - startTime).toFixed(2);
      console.log(`Inference completed in ${inferenceTime}ms`);

      // Get output
      const outputTensor = results[session.outputNames[0]];
      const outputData = outputTensor.data as Float32Array;
      
      console.log('Raw model output:', Array.from(outputData));

      // Apply softmax
      const exp = Array.from(outputData).map(x => Math.exp(x));
      const sumExp = exp.reduce((a, b) => a + b, 0);
      const probabilities = exp.map(x => x / sumExp);
      
      console.log('Probabilities:', probabilities);

      // Get prediction (assuming class 0: normal, class 1: tuberculosis)
      const normalProb = probabilities[0];
      const tbProb = probabilities[1];
      
      const prediction = tbProb > normalProb ? 'tuberculosis' : 'normal';
      const confidence = Math.round(Math.max(normalProb, tbProb) * 100);

      console.log(`✓ Prediction: ${prediction}`);
      console.log(`✓ Confidence: ${confidence}%`);
      console.log(`  Normal: ${(normalProb * 100).toFixed(2)}%`);
      console.log(`  TB: ${(tbProb * 100).toFixed(2)}%`);

      return { prediction, confidence };
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }, [session]);

  return {
    session,
    isModelLoading,
    modelError,
    predict,
  };
};
