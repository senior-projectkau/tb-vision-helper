import { useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

interface DetectionResult {
  prediction: 'normal' | 'tuberculosis';
  confidence: number;
}

export const useTBDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ort.InferenceSession | null>(null);

  // Load the ONNX model (call this once when component mounts)
  const loadModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading TB detection model from storage...');
      
      // Configure ONNX Runtime to use CDN for WASM files
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
      
      // Get the public URL of the model
      const modelUrl = 'https://fxndgbdmgvfheucntkbi.supabase.co/storage/v1/object/public/tb-models/tb_model1.onnx';
      
      console.log('Fetching model from:', modelUrl);
      
      // Fetch the model
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
      }
      
      const modelBuffer = await response.arrayBuffer();
      console.log(`Model downloaded: ${modelBuffer.byteLength} bytes`);
      
      // Log first few bytes for debugging (PyTorch ONNX models have different headers)
      const view = new Uint8Array(modelBuffer, 0, 16);
      const header = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('Model file header:', header);
      
      // Create ONNX Runtime session (it will validate the format)
      console.log('Creating ONNX inference session...');
      const ortSession = await ort.InferenceSession.create(modelBuffer);
      
      console.log('Model loaded successfully!');
      console.log('Input names:', ortSession.inputNames);
      console.log('Output names:', ortSession.outputNames);
      
      setSession(ortSession);
      setIsLoading(false);
      
      return ortSession;
    } catch (err) {
      console.error('Error loading model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Preprocess image for model inference
  const preprocessImage = async (imageFile: File): Promise<ort.Tensor> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          canvas.width = 224;
          canvas.height = 224;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw and resize image
          ctx.drawImage(img, 0, 0, 224, 224);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, 224, 224);
          const { data } = imageData;
          
          // Convert to tensor format [1, 3, 224, 224]
          // Normalize RGB values: (pixel / 255 - mean) / std
          const tensorData = new Float32Array(1 * 3 * 224 * 224);
          
          // ImageNet normalization values
          const mean = [0.485, 0.456, 0.406];
          const std = [0.229, 0.224, 0.225];
          
          for (let i = 0; i < 224 * 224; i++) {
            const r = data[i * 4] / 255;
            const g = data[i * 4 + 1] / 255;
            const b = data[i * 4 + 2] / 255;
            
            tensorData[i] = (r - mean[0]) / std[0];
            tensorData[224 * 224 + i] = (g - mean[1]) / std[1];
            tensorData[224 * 224 * 2 + i] = (b - mean[2]) / std[2];
          }
          
          const tensor = new ort.Tensor('float32', tensorData, [1, 3, 224, 224]);
          resolve(tensor);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  };

  // Run TB detection on an image
  const detectTB = useCallback(async (imageFile: File): Promise<DetectionResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure model is loaded
      let activeSession = session;
      if (!activeSession) {
        console.log('Model not loaded, loading now...');
        activeSession = await loadModel();
      }
      
      if (!activeSession) {
        throw new Error('Failed to load model');
      }
      
      console.log('Preprocessing image...');
      const inputTensor = await preprocessImage(imageFile);
      
      console.log('Running inference...');
      const feeds = { [activeSession.inputNames[0]]: inputTensor };
      const results = await activeSession.run(feeds);
      
      // Get output tensor
      const outputTensor = results[activeSession.outputNames[0]];
      const outputData = outputTensor.data as Float32Array;
      
      console.log('Raw model output:', outputData);
      
      // Apply softmax to get probabilities
      const expScores = Array.from(outputData).map(x => Math.exp(x));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      const probabilities = expScores.map(x => x / sumExp);
      
      console.log('Probabilities:', probabilities);
      
      // Assuming binary classification: [normal, tuberculosis]
      const normalProb = probabilities[0];
      const tbProb = probabilities[1];
      
      const prediction = tbProb > normalProb ? 'tuberculosis' : 'normal';
      const confidence = Math.round(Math.max(normalProb, tbProb) * 100);
      
      console.log(`Prediction: ${prediction} with ${confidence}% confidence`);
      
      setIsLoading(false);
      
      return { prediction, confidence };
    } catch (err) {
      console.error('Error during TB detection:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      setIsLoading(false);
      throw err;
    }
  }, [session, loadModel]);

  return {
    detectTB,
    loadModel,
    isLoading,
    error,
    modelLoaded: !!session
  };
};
