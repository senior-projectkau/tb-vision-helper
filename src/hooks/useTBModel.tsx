import { useState, useEffect, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { supabase } from '@/integrations/supabase/client';

interface ModelResult {
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
}

// Configure ONNX Runtime with multiple fallback options
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = false;
ort.env.logLevel = 'verbose';

export const useTBModel = () => {
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    try {
      console.log('=== Starting ONNX Model Load ===');
      console.log('ONNX Runtime version:', ort.env.versions);
      
      // Download the model file with authentication
      console.log('Downloading model from tb-models bucket...');
      const { data: modelBlob, error: downloadError } = await supabase.storage
        .from('tb-models')
        .download('tb_model1.onnx');

      if (downloadError) {
        console.error('❌ Download error:', downloadError);
        throw new Error(`Failed to download model: ${downloadError.message}`);
      }

      if (!modelBlob || modelBlob.size === 0) {
        throw new Error('Model file is empty or not found');
      }

      console.log('✅ Model downloaded:', modelBlob.size, 'bytes (', (modelBlob.size / 1024 / 1024).toFixed(2), 'MB)');

      // Convert blob to ArrayBuffer
      const arrayBuffer = await modelBlob.arrayBuffer();
      console.log('✅ Model converted to ArrayBuffer');

      // Create ONNX session with proper configuration
      console.log('Creating ONNX inference session...');
      const session = await ort.InferenceSession.create(arrayBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
        executionMode: 'sequential',
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      console.log('✅ ONNX model loaded successfully!');
      console.log('Model inputs:', session.inputNames);
      console.log('Model outputs:', session.outputNames);
      
      // Get input shape info
      const inputMetadata = session.inputNames.map(name => {
        const input = session.inputMetadata[name];
        return { name, shape: input.dims };
      });
      console.log('Input metadata:', inputMetadata);

      setModel(session);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('❌ FATAL: Error loading ONNX model:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading model';
      console.error('Error details:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const preprocessImage = async (file: File): Promise<ort.Tensor> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Resize to model input size (typically 224x224 for medical imaging models)
        canvas.width = 224;
        canvas.height = 224;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, 224, 224);
        const imageData = ctx.getImageData(0, 0, 224, 224);
        const { data } = imageData;

        // Convert to float32 and normalize
        // Format: [batch, channels, height, width] = [1, 3, 224, 224]
        const float32Data = new Float32Array(3 * 224 * 224);
        
        for (let i = 0; i < 224 * 224; i++) {
          // Normalize to [0, 1] and separate RGB channels
          float32Data[i] = data[i * 4] / 255.0; // R
          float32Data[224 * 224 + i] = data[i * 4 + 1] / 255.0; // G
          float32Data[224 * 224 * 2 + i] = data[i * 4 + 2] / 255.0; // B
        }

        const tensor = new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
        resolve(tensor);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const predict = useCallback(async (file: File): Promise<ModelResult> => {
    if (!model) {
      throw new Error('Model not loaded. Please wait for initialization.');
    }

    try {
      console.log('=== Starting Prediction ===');
      console.log('File:', file.name, 'Size:', file.size, 'bytes');
      
      // Preprocess image
      console.log('Preprocessing image to 224x224...');
      const inputTensor = await preprocessImage(file);
      console.log('✅ Image preprocessed, tensor shape:', inputTensor.dims);

      // Run inference
      console.log('Running ONNX model inference...');
      const startTime = performance.now();
      
      const feeds = { [model.inputNames[0]]: inputTensor };
      const results = await model.run(feeds);
      
      const endTime = performance.now();
      console.log(`✅ Inference completed in ${(endTime - startTime).toFixed(2)}ms`);

      // Get output
      const output = results[model.outputNames[0]];
      const predictions = output.data as Float32Array;

      console.log('Raw model output:', Array.from(predictions));
      console.log('Output shape:', output.dims);

      // Interpret results based on model output format
      let tbProbability = 0;

      if (predictions.length === 2) {
        // Binary classification: check if logits or probabilities
        const sum = predictions[0] + predictions[1];
        
        if (Math.abs(sum - 1.0) < 0.01) {
          // Already probabilities (softmax applied)
          tbProbability = predictions[1];
          console.log('Output is probabilities: [normal, tb] =', predictions);
        } else {
          // Logits - apply softmax
          const exp0 = Math.exp(predictions[0]);
          const exp1 = Math.exp(predictions[1]);
          const sumExp = exp0 + exp1;
          tbProbability = exp1 / sumExp;
          console.log('Applied softmax to logits:', tbProbability);
        }
      } else if (predictions.length === 1) {
        // Single sigmoid output
        tbProbability = predictions[0];
        console.log('Single sigmoid output:', tbProbability);
      } else {
        console.warn(`⚠️ Unexpected output length: ${predictions.length}`);
        tbProbability = predictions[predictions.length - 1];
      }

      // Make prediction
      const prediction = tbProbability > 0.5 ? 'tuberculosis' : 'normal';
      const confidence = Math.round(
        (prediction === 'tuberculosis' ? tbProbability : (1 - tbProbability)) * 100
      );

      console.log(`🎯 FINAL PREDICTION: ${prediction.toUpperCase()} (${confidence}% confidence)`);
      console.log('TB probability:', tbProbability.toFixed(4));
      console.log('=== Prediction Complete ===');

      return { prediction, confidence };
    } catch (err) {
      console.error('❌ Prediction error:', err);
      throw new Error(err instanceof Error ? err.message : 'Prediction failed');
    }
  }, [model]);

  return {
    predict,
    isModelLoading: isLoading,
    modelError: error,
  };
};
