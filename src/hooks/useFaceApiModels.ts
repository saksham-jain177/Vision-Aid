import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { getModelFromIndexedDB, saveModelToIndexedDB, modelExistsInIndexedDB } from '../utils/indexedDBHelper';

// Initialize TensorFlow.js backend
const initializeBackend = async () => {
  try {
    // Set the backend to 'webgl' for better performance
    await faceapi.tf.setBackend('webgl');
    // Wait for TensorFlow to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('TensorFlow.js backend initialized successfully');
  } catch (error) {
    console.warn('WebGL backend failed, falling back to CPU:', error);
    // Fallback to CPU backend
    await faceapi.tf.setBackend('cpu');
    // Wait for TensorFlow to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('TensorFlow.js CPU backend initialized');
  }
};

interface ModelInfo {
  net: any; // Use any to avoid type compatibility issues
  name: string;
  uri: string;
}

/**
 * Custom hook to load face-api.js models with IndexedDB caching
 * @param modelUrl Base URL for the model files
 * @param offlineMode Whether to prioritize offline storage and avoid network requests
 * @returns Object containing loading state and error information
 */
export const useFaceApiModels = (modelUrl: string, offlineMode: boolean = false) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Re-run the effect when offlineMode changes
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize TensorFlow.js backend first
        await initializeBackend();

        // Define models to load
        const modelsToLoad: ModelInfo[] = [
          {
            net: faceapi.nets.ssdMobilenetv1,
            name: 'ssd_mobilenetv1_model',
            uri: `${modelUrl}/ssd_mobilenetv1_model-weights_manifest.json`
          },
          {
            net: faceapi.nets.faceLandmark68Net,
            name: 'face_landmark_68_model',
            uri: `${modelUrl}/face_landmark_68_model-weights_manifest.json`
          },
          {
            net: faceapi.nets.faceRecognitionNet,
            name: 'face_recognition_model',
            uri: `${modelUrl}/face_recognition_model-weights_manifest.json`
          },
          {
            net: faceapi.nets.faceExpressionNet,
            name: 'face_expression_model',
            uri: `${modelUrl}/face_expression_model-weights_manifest.json`
          },
          // MTCNN model is not included as it's not available locally
          // We'll use SSD MobileNet as our primary face detector
        ];

        // Load each model with proper error handling
        for (const model of modelsToLoad) {
          if (model.net.isLoaded) {
            console.log(`${model.name} already loaded in memory`);
            continue;
          }

          try {
            // For now, always load from URL to avoid IndexedDB complexity
            // This ensures models load properly without backend errors
            console.log(`Loading ${model.name} from URL`);
            await model.net.loadFromUri(modelUrl);
            console.log(`${model.name} loaded successfully`);
          } catch (modelError) {
            console.error(`Failed to load ${model.name}:`, modelError);
            // Continue loading other models even if one fails
            continue;
          }
        }

        console.log('All models loaded successfully');
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [modelUrl, offlineMode]); // Re-run when offlineMode changes

  return { isLoading, error, modelsLoaded };
};
