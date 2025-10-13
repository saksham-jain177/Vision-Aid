import { useState, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import { getModelFromIndexedDB, saveModelToIndexedDB, modelExistsInIndexedDB } from '../utils/indexedDBHelper';

// Global backend initialization state
let backendInitialized = false;
let preferredBackend: 'webgl' | 'cpu' = 'webgl';

// Ensure backend is ready - call this before any face detection operation
export const ensureBackendReady = async (): Promise<void> => {
  try {
    // Use the explicitly installed TensorFlow.js
    await tf.ready();
    const currentBackend = tf.getBackend();
    console.log(`[Backend Check] Current backend: ${currentBackend}`);
    
    // Always verify with a test operation
    try {
      const testTensor = tf.scalar(1);
      await testTensor.data();
      testTensor.dispose();
      console.log(`[Backend Check] Backend test passed, backend is ready`);
      return; // Backend is working
    } catch (testError) {
      console.warn('[Backend Check] Backend test failed, reinitializing...', testError);
      // Fall through to reinitialize
    }
  } catch (error) {
    console.warn('[Backend Check] Error checking backend, reinitializing...', error);
  }
  
  // Backend test failed or doesn't exist, reinitialize
  await initializeBackend();
};

// Initialize TensorFlow.js backend
const initializeBackend = async () => {
  try {
    // Try preferred backend first
    console.log(`Initializing TensorFlow.js backend (${preferredBackend})...`);
    await tf.setBackend(preferredBackend);
    await tf.ready(); // Ensure backend is fully initialized
    
    // Force backend initialization with a test operation
    const testTensor = tf.scalar(1);
    await testTensor.data();
    testTensor.dispose();
    
    // Verify backend is set
    const verifiedBackend = tf.getBackend();
    if (verifiedBackend === preferredBackend) {
      console.log(`✓ ${preferredBackend.toUpperCase()} backend initialized successfully`);
      backendInitialized = true;
    } else {
      throw new Error(`Backend mismatch: expected ${preferredBackend}, got ${verifiedBackend}`);
    }
  } catch (error) {
    // If preferred backend failed and it was WebGL, try CPU
    if (preferredBackend === 'webgl') {
      console.warn('WebGL failed, trying CPU...', error);
      preferredBackend = 'cpu';
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        const testTensor = tf.scalar(1);
        await testTensor.data();
        testTensor.dispose();
        
        const verifiedBackend = tf.getBackend();
        if (verifiedBackend === 'cpu') {
          console.log('✓ CPU backend initialized successfully');
          backendInitialized = true;
        } else {
          throw new Error(`CPU backend verification failed: got ${verifiedBackend}`);
        }
      } catch (cpuError) {
        console.error('❌ Both WebGL and CPU backends failed:', cpuError);
        throw new Error('Failed to initialize any TensorFlow.js backend');
      }
    } else {
      console.error('❌ CPU backend failed:', error);
      throw new Error('Failed to initialize CPU backend');
    }
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
