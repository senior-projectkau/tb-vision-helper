import { useState, useEffect, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { supabase } from '@/integrations/supabase/client';

interface ModelResult {
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
}

export const useTBModel = () => {
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    try {
      console.log('Loading ONNX model from Supabase storage...');
      
      // Get the public URL for the model
      const { data } = supabase.storage
        .from('tb-models')
        .getPublicUrl('tb_model1.onnx');

      console.log('Model URL:', data.publicUrl);

      // Load the ONNX model
      const session = await ort.InferenceSession.create(data.publicUrl, {
        executionProviders: ['wasm'],
      });

      console.log('ONNX model loaded successfully');
      console.log('Input names:', session.inputNames);
      console.log('Output names:', session.outputNames);

      setModel(session);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading ONNX model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load model');
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
      throw new Error('Model not loaded yet');
    }

    try {
      console.log('Preprocessing image...');
      const inputTensor = await preprocessImage(file);

      console.log('Running inference...');
      const feeds = { [model.inputNames[0]]: inputTensor };
      const results = await model.run(feeds);

      console.log('Inference complete');
      const output = results[model.outputNames[0]];
      const predictions = output.data as Float32Array;

      console.log('Model output:', predictions);

      // Interpret results based on model output format
      let tbProbability = 0;

      if (predictions.length === 2) {
        // Binary classification: [normal_prob, tb_prob]
        tbProbability = predictions[1];
      } else if (predictions.length === 1) {
        // Single sigmoid output: value close to 1 = TB
        tbProbability = predictions[0];
      } else {
        console.warn(`Unexpected output shape: ${predictions.length} values`);
        // Take the last value as TB probability
        tbProbability = predictions[predictions.length - 1];
      }

      // Apply softmax if values are logits (not probabilities)
      if (predictions.length === 2 && (predictions[0] + predictions[1]) > 2) {
        const exp0 = Math.exp(predictions[0]);
        const exp1 = Math.exp(predictions[1]);
        const sum = exp0 + exp1;
        tbProbability = exp1 / sum;
      }

      const prediction = tbProbability > 0.5 ? 'tuberculosis' : 'normal';
      const confidence = Math.round(
        (prediction === 'tuberculosis' ? tbProbability : (1 - tbProbability)) * 100
      );

      console.log(`Prediction: ${prediction} with ${confidence}% confidence`);

      return { prediction, confidence };
    } catch (err) {
      console.error('Prediction error:', err);
      throw err;
    }
  }, [model]);

  return {
    predict,
    isModelLoading: isLoading,
    modelError: error,
  };
};
