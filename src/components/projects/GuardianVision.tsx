import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  Camera,
  X
} from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import './GuardianVision.css';
import { useFaceApiModels, ensureBackendReady } from '../../hooks/useFaceApiModels';
import LocalMedia from './LocalMedia';
// Import Dashboard component
import DashboardComponent from './Dashboard';
// Import Settings component
import Settings from './Settings';
// Import LocationIndicator component
import LocationIndicator from './LocationIndicator';
// Import Toast component
import Toast from '../Toast';
// Import data augmentation utilities
import { createAugmentedImages } from '../../utils/dataAugmentation';
// Import face clustering utilities
import {
  analyzeReferenceImages,
  FaceDescriptorWithMetadata,
  FaceCluster
} from '../../utils/faceClusteringUtils';
// Import enhanced face matching hook
import useEnhancedFaceMatching from './EnhancedFaceMatching';
// Import custom icons
import cctvIcon from '../../assets/icons/cctv.svg';
import droneIcon from '../../assets/icons/drone.svg';
import webcamIcon from '../../assets/icons/webcam.svg';

export interface FaceMatch {
  label: string;
  distance: number;
  timestamp: Date;
  location?: GeolocationPosition;
  confidence: number;
  found?: boolean;
  source?: string;
  verificationLevel?: 'high' | 'medium' | 'low' | 'none';
  individualMatches?: number; // Number of individual descriptors that matched
  totalDescriptors?: number; // Total number of descriptors in the cluster
  distanceRatio?: number; // Ratio between best and second-best match
}

export interface ProcessedFace {
  descriptor: Float32Array;
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
  match?: FaceMatch;
}

interface FaceEncoding {
  descriptor: Float32Array;
  label: string;
}

const GuardianVision: React.FC = () => {
  // All state hooks
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedSinks, setSelectedSinks] = useState<string[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [sourceImage, setSourceImage] = useState<string | null>(null); // Keep for backward compatibility
  const [processedFaces, setProcessedFaces] = useState<ProcessedFace[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  // State for toggling between video and canvas views
  const [showVideoFeed, setShowVideoFeed] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [faceEncodings, setFaceEncodings] = useState<FaceEncoding[]>([]);
  const [referenceImagesCount, setReferenceImagesCount] = useState<number>(0);
  const [minRecommendedImages] = useState<number>(3);
  const maxAllowedImages = 5; // Changed from useState to a constant since it's not changing
  const [showReferenceWarning, setShowReferenceWarning] = useState<boolean>(false);

  // State for face clusters
  const [faceClusters, setFaceClusters] = useState<FaceCluster[]>([]);
  const [identityWarningShown, setIdentityWarningShown] = useState<boolean>(false);

  // State for temporal smoothing of webcam face matching results
  const [matchBuffer, setMatchBuffer] = useState<{isMatch: boolean, confidence: number, verificationLevel?: 'high' | 'medium' | 'low' | 'none'}[]>([]);
  const matchBufferSize = 15; // Number of frames to consider for smoothing
  const matchConsistencyThreshold = 0.7; // 70% of frames must agree to change state

  // State to track if a face is currently detected in the frame
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);
  const [lastFaceDetectionTime, setLastFaceDetectionTime] = useState<number>(0);

  // State for pending images (uploaded but not processed)
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagesReadyToProcess, setImagesReadyToProcess] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  const [frameSkip, setFrameSkip] = useState(2);
  // Performance Mode option removed - accuracy is critical for missing person detection
  const [showConfidence, setShowConfidence] = useState(true);
  // State for data augmentation (enabled by default)
  const [dataAugmentation, setDataAugmentation] = useState(true);
  const [matchHistory, setMatchHistory] = useState<FaceMatch[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [matchThresholdSlider, setMatchThresholdSlider] = useState(60);
  const [showDashboard, setShowDashboard] = useState(false);
  // State for toast notifications
  const [toasts, setToasts] = useState<Array<{id: number, message: string, type: 'success' | 'error' | 'info' | 'warning'}>>([]);
  const [isToastActive, setIsToastActive] = useState<boolean>(false);
  // State to track geolocation status
  const [geoStatus, setGeoStatus] = useState<'inactive' | 'active' | 'error'>('inactive');
  const [locationUpdateTime, setLocationUpdateTime] = useState<string>('');
  // We'll use the existing referenceImagesCount state

  // All refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Import the custom hook for model loading
  const MODEL_URL = `${window.location.origin}/weights`;
  // The useFaceApiModels hook uses IndexedDB for caching models when offlineMode is enabled
  const { error: modelsError, modelsLoaded: faceApiModelsLoaded } = useFaceApiModels(MODEL_URL, offlineMode);

  // Update state based on the hook results
  useEffect(() => {
    if (modelsError) {
      setModelError('Failed to load face detection models. Please refresh the page.');
      console.error('Model loading error:', modelsError);
    }

    if (faceApiModelsLoaded) {
      setModelsLoaded(true);
      console.log('Face API models loaded and ready to use');
    }
  }, [modelsError, faceApiModelsLoaded]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  useEffect(() => {
    // Make matching more lenient by adjusting the threshold
    // Higher threshold = more lenient matching
    // Adding 0.15 to make it much more lenient for better face recognition
    setMatchThreshold(1 - (matchThresholdSlider / 100) + 0.15);
  }, [matchThresholdSlider]);

  // Effect to handle geolocation tracking based on the geolocationEnabled setting
  useEffect(() => {
    let watchId: number | null = null;

    if (geolocationEnabled) {
      if (navigator.geolocation) {
        setGeoStatus('active');

        // Get initial position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation(position);
            const now = new Date();
            setLocationUpdateTime(now.toLocaleTimeString());
            console.log('Geolocation enabled, initial position acquired');
          },
          (error) => {
            console.error('Geolocation error:', error);
            setGeoStatus('error');
          }
        );

        // Set up continuous tracking
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            // Check if position has changed significantly before updating state
            const hasSignificantChange = !currentLocation ||
              Math.abs(position.coords.latitude - currentLocation.coords.latitude) > 0.0001 ||
              Math.abs(position.coords.longitude - currentLocation.coords.longitude) > 0.0001;

            if (hasSignificantChange) {
              console.log('Significant position change detected, updating location');
              setCurrentLocation(position);
              const now = new Date();
              setLocationUpdateTime(now.toLocaleTimeString());
            }
          },
          (error) => {
            console.error('Geolocation tracking error:', error);
            setGeoStatus('error');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 60000, // Use cached position if less than 1 minute old
            timeout: 30000     // Allow 30 seconds to get a new position
          }
        );

        console.log('Geolocation tracking started');
      } else {
        console.warn('Geolocation is not supported by this browser');
        setGeoStatus('error');
      }
    } else {
      setGeoStatus('inactive');
      // Always clear location data when disabled, regardless of current state
      setCurrentLocation(null);
      setLocationUpdateTime('');
      console.log('Geolocation disabled, location data cleared');
    }

    // Cleanup function to stop tracking when component unmounts or setting changes
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('Geolocation tracking stopped');
      }
    };
  }, [geolocationEnabled]); // Only depend on whether geolocation is enabled, not the current location

  // Video styling is now applied directly in the JSX

  // Model loading is now handled by the useFaceApiModels hook

  // Note: processSourceImage has been replaced by processReferenceImage
  // which supports multiple reference images for better face recognition

  // Match results are now handled by the enhanced face matching hook

  // State to track whether panels are expanded or collapsed
  const [isDebugPanelExpanded, setIsDebugPanelExpanded] = useState<boolean>(false); // Collapsed by default
  const [isMetricsPanelExpanded, setIsMetricsPanelExpanded] = useState<boolean>(false); // Collapsed by default

  // State for connection settings
  const [showCctvSettings, setShowCctvSettings] = useState<boolean>(false);
  const [showDroneSettings, setShowDroneSettings] = useState<boolean>(false);
  const [cctvConnected, setCctvConnected] = useState<boolean>(false);
  const [droneConnected, setDroneConnected] = useState<boolean>(false);

  // State for LocalMedia component
  const [showLocalMedia, setShowLocalMedia] = useState<boolean>(false);

  // State for simulated connections
  const [simulationMode, setSimulationMode] = useState<'real' | 'demo'>('real');
  const [cctvSimulated, setCctvSimulated] = useState<boolean>(false);
  const [droneSimulated, setDroneSimulated] = useState<boolean>(false);

  // CCTV connection settings
  const [cctvSettings, setCctvSettings] = useState({
    ipAddress: '192.168.1.100',
    port: '8080',
    username: 'admin',
    password: '',
    protocol: 'rtsp'
  });

  // Drone connection settings
  const [droneSettings, setDroneSettings] = useState({
    droneId: 'DJI-1234',
    connectionType: 'wifi',
    ssid: 'Drone-Network',
    password: '',
    channel: '5'
  });

  // Create refs to store the last dimensions and counts for logging optimization
  const lastWidthRef = useRef<number>(0);
  const lastHeightRef = useRef<number>(0);
  const lastFaceCountRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);

  // Use enhanced face matching hook
  const enhancedMatching = useEnhancedFaceMatching(faceEncodings, faceClusters, matchThreshold, frameCountRef);

  const matchFace = (descriptor: Float32Array): {
    isMatch: boolean;
    confidence: number;
    verificationLevel?: 'high' | 'medium' | 'low' | 'none';
    individualMatches?: number;
    totalDescriptors?: number;
    distanceRatio?: number;
  } => {
    // Use the enhanced face matching hook instead of the original implementation
    return enhancedMatching.matchFace(descriptor);
  };

  const processWebcamFrame = async (video: HTMLVideoElement, canvas: HTMLCanvasElement, _previousDetections: any[] = []): Promise<any[]> => {
    try {
      // Double-check video is ready
      if (video.readyState < 2) {
        console.log('Video not ready for processing in processWebcamFrame');
        return [];
      }

      // Get video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        console.log('Invalid video dimensions, skipping frame');
        return [];
      }

      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Create display size object for face-api.js
      const displaySize = { width: videoWidth, height: videoHeight };

      // Match dimensions for face-api.js
      faceapi.matchDimensions(canvas, displaySize);

      console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);

      // Get canvas context with willReadFrequently flag to optimize performance
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('Could not get canvas context');
        return [];
      }

      // Only log dimensions on first frame or when they change
      if (canvas.width !== lastWidthRef.current || canvas.height !== lastHeightRef.current) {
        console.log('Processing webcam frame with dimensions:', canvas.width, 'x', canvas.height);
        lastWidthRef.current = canvas.width;
        lastHeightRef.current = canvas.height;
      }

      // Always process face detection, but only draw landmarks if they're visible

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Check if we have face encodings to match against
      if (faceEncodings.length === 0) {
        console.warn('No face encodings available for matching');
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('No reference faces available', canvas.width / 2, canvas.height / 2);
        return [];
      }

      // Use SSD MobileNet with optimized parameters for face detection
      // We've removed the Performance Mode option as accuracy is critical for missing person detection
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        // Use a low confidence threshold to detect more challenging faces
        minConfidence: 0.2,
        // Increase the number of results to consider more potential faces
        maxResults: 15
      });

      // Ensure backend is ready before face detection
      await ensureBackendReady();
      
      // Detect faces
      // Increment frame counter
      frameCountRef.current += 1;

      // Only log this once every 60 frames to reduce console spam
      if (frameCountRef.current % 60 === 0) {
        console.log('%cDetecting faces...', 'color: #4682b4; font-style: italic');
      }

      const detections = await faceapi.detectAllFaces(video, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Only log face count when it changes and not too frequently
      if (detections.length !== lastFaceCountRef.current && frameCountRef.current % 15 === 0) {
        console.log(`%cFaces detected: ${detections.length}`, 'color: #4682b4; font-weight: bold');
        lastFaceCountRef.current = detections.length;
      }

      // If no faces detected, show a message and update state
      if (detections.length === 0) {
        // Draw a message on canvas
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('No faces detected', canvas.width / 2, canvas.height / 2);

        // Update face detection state
        setIsFaceDetected(false);

        // Clear match buffer when no face is detected for more than 1 second
        const now = Date.now();
        if (now - lastFaceDetectionTime > 1000) {
          setMatchBuffer([]);
        }

        return [];
      }

      // Update face detection state and timestamp
      setIsFaceDetected(true);
      setLastFaceDetectionTime(Date.now());

      // Resize detections to match display size
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Draw landmarks directly to ensure they appear
      // Only log this once every 120 frames to minimize console output
      if (frameCountRef.current % 120 === 0) {
        console.log('%cRendering landmarks', 'color: #9370db; font-style: italic');
      }
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      // Draw custom landmarks for better visibility
      resizedDetections.forEach(detection => {
        if (detection.landmarks && detection.landmarks.positions) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw larger landmarks
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;

          // Draw points
          detection.landmarks.positions.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      });

      // Also draw detections with boxes
      faceapi.draw.drawDetections(canvas, resizedDetections);

      // We'll also handle drawing our custom landmarks in renderDetections
      // This gives us more control over the appearance

      // Process each detected face
      resizedDetections.forEach(detection => {
        // Match face against stored encodings
        const matchResult = matchFace(detection.descriptor);
        const { isMatch, confidence, verificationLevel } = matchResult;
        console.log(`Face match result: isMatch=${isMatch}, confidence=${confidence.toFixed(2)}%, verification=${verificationLevel || 'none'}`);

        // Apply temporal smoothing to reduce flickering between match/no match states
        // Add current match result to buffer
        setMatchBuffer(prev => {
          const newBuffer = [...prev, { isMatch, confidence, verificationLevel: verificationLevel || 'none' }];
          // Keep only the most recent frames
          return newBuffer.slice(-matchBufferSize);
        });

        // Calculate smoothed match result based on buffer
        let smoothedIsMatch = isMatch;
        let smoothedConfidence = confidence;
        let smoothedVerificationLevel = verificationLevel;

        // Only apply smoothing if we have enough frames in the buffer
        if (matchBuffer.length >= 5) {
          // Count matches in the buffer
          const matchCount = matchBuffer.filter(m => m.isMatch).length;

          // Calculate match ratio
          const matchRatio = matchCount / matchBuffer.length;

          // Only change state if we have a strong consensus
          if (isMatch && matchRatio < (1 - matchConsistencyThreshold)) {
            // Current frame says match but history disagrees strongly
            smoothedIsMatch = false;
          } else if (!isMatch && matchRatio > matchConsistencyThreshold) {
            // Current frame says no match but history disagrees strongly
            smoothedIsMatch = true;

            // Use the average confidence of the matching frames
            const matchingFrames = matchBuffer.filter(m => m.isMatch);
            if (matchingFrames.length > 0) {
              smoothedConfidence = matchingFrames.reduce((sum, m) => sum + m.confidence, 0) / matchingFrames.length;

              // Use the most common verification level
              // Count occurrences of each verification level
              const highCount = matchingFrames.filter(m => m.verificationLevel === 'high').length;
              const mediumCount = matchingFrames.filter(m => m.verificationLevel === 'medium').length;
              const lowCount = matchingFrames.filter(m => m.verificationLevel === 'low').length;
              const noneCount = matchingFrames.filter(m => m.verificationLevel === 'none').length;

              // Find the most common level
              let mostCommonLevel = verificationLevel;
              let maxCount = 0;

              if (highCount > maxCount) {
                maxCount = highCount;
                mostCommonLevel = 'high';
              }

              if (mediumCount > maxCount) {
                maxCount = mediumCount;
                mostCommonLevel = 'medium';
              }

              if (lowCount > maxCount) {
                maxCount = lowCount;
                mostCommonLevel = 'low';
              }

              if (noneCount > maxCount) {
                maxCount = noneCount;
                mostCommonLevel = 'none';
              }

              smoothedVerificationLevel = mostCommonLevel;
            }
          }

          console.log(`Smoothed match result: isMatch=${smoothedIsMatch}, confidence=${smoothedConfidence.toFixed(2)}%, verification=${smoothedVerificationLevel || 'none'} (buffer ratio: ${matchRatio.toFixed(2)})`);
        }

        // Record match if found and geolocation is enabled
        // Use smoothed results if available, otherwise use raw results
        const finalIsMatch = matchBuffer.length >= 5 ? smoothedIsMatch : isMatch;
        const finalConfidence = matchBuffer.length >= 5 ? smoothedConfidence : confidence;
        const finalVerificationLevel = matchBuffer.length >= 5 ? smoothedVerificationLevel : verificationLevel;

        if (finalIsMatch && currentLocation) {
          const newMatch: FaceMatch = {
            label: 'Match',
            distance: 1 - (finalConfidence / 100),
            timestamp: new Date(),
            location: currentLocation,
            confidence: finalConfidence,
            verificationLevel: finalVerificationLevel,
            individualMatches: matchResult.individualMatches,
            totalDescriptors: matchResult.totalDescriptors,
            distanceRatio: matchResult.distanceRatio
          };
          handleMatch(newMatch);
        }

        // Draw box around face with match information
        // Use smoothed results if available, otherwise use raw results
        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          label: finalIsMatch
            ? showConfidence
              ? `Match: ${finalConfidence.toFixed(2)}% (${finalVerificationLevel?.toUpperCase() || 'NONE'})${matchResult.individualMatches ? ` [${matchResult.individualMatches}/${matchResult.totalDescriptors}]` : ''}`
              : `Match (${finalVerificationLevel?.toUpperCase() || 'NONE'})`
            : 'No Match',
          boxColor: finalIsMatch
            ? finalVerificationLevel === 'high' ? '#00ff00' // Bright green for high verification
            : finalVerificationLevel === 'medium' ? '#88cc00' // Yellow-green for medium verification
            : '#ffcc00' // Yellow for low verification
            : '#ff0000', // Red for no match
          lineWidth: finalIsMatch && finalVerificationLevel === 'high' ? 3 : 2 // Thicker line for high verification
        });

        drawBox.draw(canvas);

        // Apply privacy blur if needed
        if (privacyMode && !finalIsMatch) {
          const box = detection.detection.box;
          ctx.filter = 'blur(10px)';
          ctx.drawImage(
            video,
            box.x, box.y, box.width, box.height,
            box.x, box.y, box.width, box.height
          );
          ctx.filter = 'none';
        } else {
          // Draw facial landmarks with improved stability
          const landmarks = detection.landmarks;

          // Set styles based on match status
          const color = finalIsMatch ? '#00ff00' : '#ff0000';
          const glowColor = finalIsMatch ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';

          // Draw the facial landmark lines first (underneath)
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';

          // Add glow effect to lines
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;

          // Connect landmarks with lines
          ctx.moveTo(landmarks.positions[0].x, landmarks.positions[0].y);
          for (let i = 1; i < landmarks.positions.length; i++) {
            ctx.lineTo(landmarks.positions[i].x, landmarks.positions[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw points for each landmark on top
          landmarks.positions.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;

            // Add glow effect to points
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Add a white center to each point for better visibility
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
          });
        }

        // Add processed face to state for display
        const processedFace: ProcessedFace = {
          descriptor: detection.descriptor,
          detection: detection.detection,
          landmarks: detection.landmarks,
          match: finalIsMatch ? {
            label: 'Match',
            distance: 1 - (finalConfidence / 100),
            timestamp: new Date(),
            confidence: finalConfidence,
            verificationLevel: finalVerificationLevel,
            individualMatches: matchResult.individualMatches,
            totalDescriptors: matchResult.totalDescriptors,
            distanceRatio: matchResult.distanceRatio
          } : undefined
        };

        // Update processed faces (only keep faces from the current session)
        setProcessedFaces(prev => {
          // Only keep up to 5 most recent faces to avoid clutter
          const newFaces = [...prev, processedFace];
          return newFaces.slice(-5); // Keep only the last 5 faces
        });
      });

      // Return the processed detections with match information
      // Add detailed logging to help diagnose issues
      const processedDetections = resizedDetections.map(detection => {
        const { isMatch, confidence } = matchFace(detection.descriptor);

        // Log detection details
        console.log('Processing detection:', {
          box: detection.detection.box,
          landmarksCount: detection.landmarks.positions.length,
          isMatch,
          confidence
        });

        return {
          detection: detection.detection,
          landmarks: detection.landmarks,
          descriptor: detection.descriptor,
          match: { isMatch, confidence }
        };
      });

      console.log(`Processed ${processedDetections.length} detections`);
      return processedDetections;
    } catch (error) {
      console.error('Error in processWebcamFrame:', error);
      return [];
    }
  };

  // Function to select key facial landmarks for a cleaner look
  const selectKeyFacialLandmarks = (allPoints: Array<{x: number, y: number}>) => {
    // If we don't have enough points, return all of them
    if (allPoints.length < 20) return allPoints;

    // Select key points for face outline and major features
    // These indices are based on the 68-point facial landmark model
    // used by face-api.js
    const keyIndices = [
      // Jaw line (more points for better face outline)
      0, 2, 4, 6, 8, 10, 12, 14, 16,
      // Right eyebrow (all points)
      17, 18, 19, 20, 21,
      // Left eyebrow (all points)
      22, 23, 24, 25, 26,
      // Nose bridge (all points)
      27, 28, 29, 30,
      // Nose bottom and nostrils
      31, 32, 33, 34, 35,
      // Right eye (all points)
      36, 37, 38, 39, 40, 41,
      // Left eye (all points)
      42, 43, 44, 45, 46, 47,
      // Outer mouth (all points)
      48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
      // Inner mouth (optional, for more detail)
      60, 61, 62, 63, 64, 65, 66, 67
    ];

    // Return only the key points
    return keyIndices.map(index => {
      // Make sure the index is valid
      if (index < allPoints.length) {
        return allPoints[index];
      }
      // Fallback to first point if index is invalid
      return allPoints[0];
    });
  };

  // Helper function to apply a blur effect to an image region
  // This is a simple box blur implementation for privacy mode
  const applyBlurEffect = (imageData: ImageData, radius: number, width: number, height: number): ImageData => {
    // Create a copy of the image data to work with
    const pixels = new Uint8ClampedArray(imageData.data);
    const output = new Uint8ClampedArray(imageData.data.length);

    // Simple box blur algorithm
    // We're using a dynamic count for each pixel instead of a fixed divisor

    // For each pixel in the image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        // Sample the surrounding pixels
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const i = (py * width + px) * 4;

            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            a += pixels[i + 3];
            count++;
          }
        }

        // Calculate the average color
        const i = (y * width + x) * 4;
        output[i] = r / count;
        output[i + 1] = g / count;
        output[i + 2] = b / count;
        output[i + 3] = a / count;
      }
    }

    // Create a new ImageData object with the blurred data
    return new ImageData(output, width, height);
  };

  // Function to render detections without running face detection again
  const renderDetections = (_video: HTMLVideoElement, canvas: HTMLCanvasElement, detections: any[]) => {
    try {
      // Get canvas context with willReadFrequently flag
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // If landmarks are hidden, don't render anything on the canvas
      if (showVideoFeed) {
        // Just clear the canvas and return
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      console.log(`Rendering ${detections.length} detections on canvas ${canvas.width}x${canvas.height}`);

      // Clear the canvas completely to ensure transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all detections
      detections.forEach(detection => {
        // Make sure we have valid detection data
        if (!detection || !detection.detection || !detection.detection.box) {
          console.error('Invalid detection object:', detection);
          return;
        }

        // Draw box around face with match information
        const { isMatch, confidence } = detection.match || { isMatch: false, confidence: 0 };

        // Log the box we're about to draw
        console.log('Drawing box:', detection.detection.box);

        // Privacy mode is now handled by the video element's CSS filter
        // We don't need to apply blur here as it would interfere with landmark visibility
        // Just log that privacy mode is enabled if applicable
        if (privacyMode && !isMatch) {
          console.log('Privacy mode enabled for non-matching face');
        }

        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          label: isMatch
            ? showConfidence ? `Match: ${confidence.toFixed(2)}%` : 'Match'
            : 'No Match',
          boxColor: isMatch ? '#00ff00' : '#ff0000',
          lineWidth: 8, // Much thicker line for better visibility
          drawLabelOptions: {
            fontSize: 24, // Even larger font size
            fontStyle: 'bold',
            padding: 12,
            backgroundColor: isMatch ? 'rgba(0, 128, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)'
          }
        });

        // Draw the box
        drawBox.draw(canvas);

        // Draw facial landmarks with improved stability
        try {
          // Make sure landmarks exist
          if (!detection.landmarks || !detection.landmarks.positions || detection.landmarks.positions.length === 0) {
            console.error('No landmarks found in detection:', detection);
            return;
          }

          const landmarks = detection.landmarks;
          console.log(`Drawing landmarks with ${landmarks.positions.length} points`);

          // Set styles based on match status - using brighter colors for better visibility
          const color = isMatch ? '#00ff00' : '#ff3333';
          const glowColor = isMatch ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 51, 51, 0.9)';

          // Select key facial landmarks instead of using all of them
          // This makes the overlay look cleaner and less like a filter
          const keyPoints = selectKeyFacialLandmarks(landmarks.positions);
          console.log(`Selected ${keyPoints.length} key points for landmarks`);

          if (keyPoints.length > 0) {
            // Draw face outline with extremely thick lines for maximum visibility
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 15; // Extremely thick lines
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            // Add very strong glow effect to lines
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 35; // Very strong glow

            // Draw jaw line
            const jawPoints = keyPoints.slice(0, 9);
            ctx.beginPath();
            ctx.moveTo(jawPoints[0].x, jawPoints[0].y);
            for (let i = 1; i < jawPoints.length; i++) {
              ctx.lineTo(jawPoints[i].x, jawPoints[i].y);
            }
            ctx.stroke();

            // Draw right eyebrow
            const rightEyebrowPoints = keyPoints.slice(9, 14);
            ctx.beginPath();
            ctx.moveTo(rightEyebrowPoints[0].x, rightEyebrowPoints[0].y);
            for (let i = 1; i < rightEyebrowPoints.length; i++) {
              ctx.lineTo(rightEyebrowPoints[i].x, rightEyebrowPoints[i].y);
            }
            ctx.stroke();

            // Draw left eyebrow
            const leftEyebrowPoints = keyPoints.slice(14, 19);
            ctx.beginPath();
            ctx.moveTo(leftEyebrowPoints[0].x, leftEyebrowPoints[0].y);
            for (let i = 1; i < leftEyebrowPoints.length; i++) {
              ctx.lineTo(leftEyebrowPoints[i].x, leftEyebrowPoints[i].y);
            }
            ctx.stroke();

            // Draw nose bridge
            const noseBridgePoints = keyPoints.slice(19, 23);
            ctx.beginPath();
            ctx.moveTo(noseBridgePoints[0].x, noseBridgePoints[0].y);
            for (let i = 1; i < noseBridgePoints.length; i++) {
              ctx.lineTo(noseBridgePoints[i].x, noseBridgePoints[i].y);
            }
            ctx.stroke();

            // Draw nose bottom
            const noseBottomPoints = keyPoints.slice(23, 28);
            ctx.beginPath();
            ctx.moveTo(noseBottomPoints[0].x, noseBottomPoints[0].y);
            for (let i = 1; i < noseBottomPoints.length; i++) {
              ctx.lineTo(noseBottomPoints[i].x, noseBottomPoints[i].y);
            }
            ctx.stroke();

            // Draw right eye
            const rightEyePoints = keyPoints.slice(28, 34);
            ctx.beginPath();
            ctx.moveTo(rightEyePoints[0].x, rightEyePoints[0].y);
            for (let i = 1; i < rightEyePoints.length; i++) {
              ctx.lineTo(rightEyePoints[i].x, rightEyePoints[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw left eye
            const leftEyePoints = keyPoints.slice(34, 40);
            ctx.beginPath();
            ctx.moveTo(leftEyePoints[0].x, leftEyePoints[0].y);
            for (let i = 1; i < leftEyePoints.length; i++) {
              ctx.lineTo(leftEyePoints[i].x, leftEyePoints[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw outer mouth
            const outerMouthPoints = keyPoints.slice(40, 52);
            ctx.beginPath();
            ctx.moveTo(outerMouthPoints[0].x, outerMouthPoints[0].y);
            for (let i = 1; i < outerMouthPoints.length; i++) {
              ctx.lineTo(outerMouthPoints[i].x, outerMouthPoints[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw inner mouth
            const innerMouthPoints = keyPoints.slice(52, 60);
            ctx.beginPath();
            ctx.moveTo(innerMouthPoints[0].x, innerMouthPoints[0].y);
            for (let i = 1; i < innerMouthPoints.length; i++) {
              ctx.lineTo(innerMouthPoints[i].x, innerMouthPoints[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Draw extremely large points for each key landmark
            keyPoints.forEach((point: { x: number; y: number }) => {
              // Draw outer glow
              ctx.beginPath();
              ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI); // Extremely large dots (15px)
              ctx.fillStyle = color;
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 30; // Very strong glow
              ctx.fill();
              ctx.shadowBlur = 0;

              // Add a white center for better visibility
              ctx.beginPath();
              ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI); // Larger white center (6px)
              ctx.fillStyle = 'white';
              ctx.fill();
            });

            // Draw a label above the face
            const box = detection.detection.box;
            const labelY = box.y - 10;
            const labelX = box.x + box.width / 2;

            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = color;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 5;
            ctx.fillText(isMatch
              ? (showConfidence ? `MATCH ${confidence.toFixed(0)}%` : 'MATCH')
              : 'NO MATCH',
              labelX, labelY);
            ctx.shadowBlur = 0;
          } else {
            console.warn('No key points selected for landmarks');
          }
        } catch (error) {
          console.error('Error drawing landmarks:', error);
        }
      });
    } catch (error) {
      console.error('Error rendering detections:', error);
    }
  };

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Get current pending images and add the new ones
    const currentPendingImages = [...pendingImages];
    const fileArray = Array.from(files);

    // Add new files to the existing array
    const combinedFiles = [...currentPendingImages, ...fileArray];

    // Check if we're exceeding the maximum allowed images
    if (combinedFiles.length > maxAllowedImages) {
      // Show warning toast
      addToast(`Maximum ${maxAllowedImages} reference images allowed. Only the first ${maxAllowedImages} will be used.`, 'warning');
    }

    // Limit to maxAllowedImages if needed
    const finalFiles = combinedFiles.slice(0, maxAllowedImages);
    setPendingImages(finalFiles);

    // Check if we have multiple files
    const fileCount = finalFiles.length;
    console.log(`Added new images. Total: ${fileCount} reference images ready to process`);

    // Update reference images count (but don't process yet)
    setReferenceImagesCount(fileCount);

    // Show warning if fewer than recommended images
    if (fileCount < minRecommendedImages) {
      setShowReferenceWarning(true);
      console.warn(`Only ${fileCount} reference images provided. For better accuracy, ${minRecommendedImages} or more are recommended.`);
    } else {
      setShowReferenceWarning(false);
    }

    // Set flag to show the process button
    setImagesReadyToProcess(true);
  };

  // New function to process the pending images when the user clicks the Process button
  const processReferenceImages = async () => {
    if (pendingImages.length === 0) {
      alert('Please upload reference images first');
      return;
    }

    // Check if we have too many images
    if (pendingImages.length > maxAllowedImages) {
      alert(`You can only process up to ${maxAllowedImages} reference images. Please remove some images.`);
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress(10);

      // Clear previous processed faces when starting a new processing session
      setProcessedFaces([]);

      // Process all images
      const fileCount = pendingImages.length;
      const newSourceImages: string[] = [];
      const allEncodings: FaceEncoding[] = [];
      const allDescriptors: Float32Array[] = [];

      // Process each image sequentially
      for (let i = 0; i < fileCount; i++) {
        const file = pendingImages[i];
        const imageData = await readFileAsDataURL(file);

        if (!imageData) continue;

        const img = new Image();
        img.src = imageData;

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Process this image
        setUploadProgress(10 + Math.floor((i / fileCount) * 70)); // Update progress based on current image
        const { success, encodings, descriptors } = await processReferenceImage(img, i);

        if (success) {
          newSourceImages.push(imageData);
          allEncodings.push(...encodings);
          allDescriptors.push(...descriptors);
        }
      }

      // If we have at least one successful image
      if (newSourceImages.length > 0) {
        // Update state with all processed images
        setSourceImages(newSourceImages);
        setSourceImage(newSourceImages[0]); // Set first image as primary for backward compatibility

        // Create a face matcher with all descriptors
        if (allDescriptors.length > 0) {
          // Convert descriptors to format needed for clustering
          const descriptorsWithMetadata: FaceDescriptorWithMetadata[] = allEncodings.map((encoding, index) => {
            // Extract image index from label (e.g., "Image_1_original" -> 1)
            const imageIndex = parseInt(encoding.label.split('_')[1]) || 0;
            return {
              descriptor: encoding.descriptor,
              imageIndex,
              faceIndex: index,
              label: encoding.label
            };
          });

          // Analyze reference images to detect if they contain different people
          const analysisResult = analyzeReferenceImages(descriptorsWithMetadata);
          setFaceClusters(analysisResult.clusters);

          // If mixed identities detected, set the warning flag but don't show toast
          // Data augmentation can cause confusion for clustering algorithms
          if (analysisResult.hasMixedIdentities && !identityWarningShown) {
            setIdentityWarningShown(true);

            // Log the information for debugging purposes only
            const totalFaces = descriptorsWithMetadata.length;
            const dominantClusterSize = analysisResult.dominantCluster?.members.length || 0;
            const outlierCount = analysisResult.outliers.length;
            const dominantPercentage = Math.round((dominantClusterSize / totalFaces) * 100);

            console.warn(`Detected ${analysisResult.clusters.length} different identities in reference images`);
            console.warn(`Dominant identity: ${dominantClusterSize} faces (${dominantPercentage}%)`);
            console.warn(`Outliers: ${outlierCount} faces`);
          }

          // Create face matcher based on clusters if we have mixed identities,
          // otherwise use all descriptors
          let faceMatcher;
          if (analysisResult.hasMixedIdentities && analysisResult.dominantCluster) {
            // Use only the dominant cluster for matching
            const dominantDescriptors = analysisResult.dominantCluster.members.map(m => m.descriptor);
            const labeledDescriptors = new faceapi.LabeledFaceDescriptors('User', dominantDescriptors);
            faceMatcher = new faceapi.FaceMatcher([labeledDescriptors], matchThreshold);
            console.log(`Created face matcher with ${dominantDescriptors.length} descriptors from dominant identity`);
          } else {
            // Use all descriptors if no mixed identities detected
            const labeledDescriptors = new faceapi.LabeledFaceDescriptors('User', allDescriptors);
            faceMatcher = new faceapi.FaceMatcher([labeledDescriptors], matchThreshold);
            console.log(`Created face matcher with ${allDescriptors.length} descriptors`);
          }

          setFaceMatcher(faceMatcher);
          setFaceEncodings(allEncodings);
          setSelectedSource('upload');
        } else {
          // Show a helpful error message if no faces were detected
          alert('No faces were detected in your reference images. Please try different images with clearer faces, better lighting, or more frontal face angles.');
          console.warn('No face descriptors were generated from the reference images');
        }
      }

      setUploadProgress(100); // Complete progress

      // Reset the pending images and ready flag after processing
      setPendingImages([]);
      setImagesReadyToProcess(false);

      // Show success toast notification
      addToast(`Successfully processed ${fileCount} reference ${fileCount === 1 ? 'image' : 'images'}`, 'success');

      console.log('Reference images processed successfully');
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to read a file as data URL
  const readFileAsDataURL = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          resolve(null);
          return;
        }
        resolve(event.target.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Process a single reference image with data augmentation
  const processReferenceImage = async (img: HTMLImageElement, index: number): Promise<{ success: boolean; encodings: FaceEncoding[]; descriptors: Float32Array[] }> => {
    try {
      console.log(`Processing reference image ${index + 1}`);

      // Use SSD MobileNet with optimized parameters for face detection
      // We've removed the Performance Mode option as accuracy is critical for missing person detection
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        // Use a low confidence threshold to detect more challenging faces
        minConfidence: 0.2,
        // Increase the number of results to consider more potential faces
        maxResults: 15
      });
      console.log(`Using optimized SSD MobileNet for face detection on image ${index + 1}`);

      // Create augmented versions of the image if data augmentation is enabled
      let augmentedImages: HTMLCanvasElement[] = [];
      if (dataAugmentation) {
        console.log(`%cCreating augmented versions of reference image ${index + 1}`, 'color: #4CAF50; font-weight: bold');
        augmentedImages = createAugmentedImages(img);
        console.log(`%cCreated ${augmentedImages.length} augmented versions of reference image ${index + 1}`, 'color: #4CAF50; font-weight: bold');
        console.log('Augmentation types: rotations, brightness variations, contrast adjustments, flips, and combinations');
      } else {
        console.log(`%cData augmentation disabled for reference image ${index + 1}`, 'color: #FF5722; font-weight: bold');
        console.log('Enable data augmentation in Settings > Advanced Settings for better face recognition');
      }

      // Process original image first with aggressive backend initialization
      let originalDetections;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Ensure backend is ready before detection
          await ensureBackendReady();
          console.log(`[Detection Attempt ${retryCount + 1}] Backend ready, starting detection...`);
          
          originalDetections = await faceapi.detectAllFaces(img, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();
          console.log(`[Detection Attempt ${retryCount + 1}] Success! Detected ${originalDetections.length} face(s)`);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.error(`[Detection Attempt ${retryCount}] Failed:`, error);
          if (retryCount >= maxRetries) {
            console.error('❌ Failed to detect faces after 3 attempts');
            throw error;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (originalDetections.length === 0) {
        console.warn(`No faces detected in original reference image ${index + 1}`);
        // Try with augmented images before giving up
      }

      // Collect all descriptors from original and augmented images
      const allEncodings: FaceEncoding[] = [];
      const allDescriptors: Float32Array[] = [];

      // Add original detections
      if (originalDetections.length > 0) {
        // Use the first face detected in the original image
        const detection = originalDetections[0];
        allEncodings.push({
          descriptor: detection.descriptor,
          label: `Image_${index + 1}_original`
        });
        allDescriptors.push(detection.descriptor);
      }

      // Process each augmented image
      let augmentedCount = 0;
      for (let i = 0; i < augmentedImages.length; i++) {
        try {
          const augmentedImg = augmentedImages[i];
          const augmentedDetections = await faceapi.detectAllFaces(augmentedImg, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (augmentedDetections.length > 0) {
            // Use the first face detected in each augmented image
            const detection = augmentedDetections[0];
            allEncodings.push({
              descriptor: detection.descriptor,
              label: `Image_${index + 1}_aug_${i + 1}`
            });
            allDescriptors.push(detection.descriptor);
            augmentedCount++;
          }
        } catch (augError) {
          console.warn(`Error processing augmented image ${i + 1} for reference image ${index + 1}:`, augError);
          // Continue with other augmented images
        }
      }

      if (dataAugmentation) {
        console.log(`%cSuccessfully processed ${augmentedCount} augmented versions of reference image ${index + 1}`, 'color: #4CAF50; font-weight: bold');
        console.log(`%cTotal descriptors for reference image ${index + 1}: ${allDescriptors.length}`, 'color: #4CAF50; font-weight: bold');
        const originalCount = originalDetections.length || 1;
        const totalCount = allDescriptors.length;
        const additionalSamples = totalCount - originalCount;
        console.log(`%cData augmentation added ${additionalSamples} additional samples (${totalCount} total from ${originalCount} original)`, 'color: #2196F3; font-weight: bold');
      } else {
        console.log(`Total descriptors for reference image ${index + 1}: ${allDescriptors.length}`);
      }

      if (allDescriptors.length === 0) {
        console.warn(`No faces detected in any version of reference image ${index + 1}`);
        return { success: false, encodings: [], descriptors: [] };
      }

      return {
        success: true,
        encodings: allEncodings,
        descriptors: allDescriptors
      };
    } catch (error) {
      console.error(`Error processing reference image ${index + 1}:`, error);
      return { success: false, encodings: [], descriptors: [] };
    }
  };

  // Global variable to track if processing is active
  const processingActive = useRef(false);

  const handleWebcamStream = async () => {
    if (!videoRef.current || !webcamCanvasRef.current) {
      console.error('Video or canvas reference not available');
      return;
    }

    // Set the processing active flag
    processingActive.current = true;

    const video = videoRef.current;
    const canvas = webcamCanvasRef.current;

    // Make sure canvas is visible and positioned correctly
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '100';

    // Ensure canvas dimensions match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Log important information for debugging
    console.log('Starting webcam stream processing');
    console.log('Video readyState:', video.readyState);
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('isWebcamActive state:', isWebcamActive);
    console.log('processingActive ref:', processingActive.current);

    // Wait for video to be properly initialized if dimensions are not available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not ready, waiting...');
      await new Promise<void>((resolve) => {
        const checkDimensions = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('Video dimensions now available:', video.videoWidth, 'x', video.videoHeight);
            resolve();
          } else {
            setTimeout(checkDimensions, 100);
          }
        };
        checkDimensions();
      });
    }

    // Now set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);

    const displaySize = { width: canvas.width, height: canvas.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Store the last detection results to reduce flickering
    let lastDetections: any[] = [];
    let frameCount = 0;
    let lastFrameTime = 0;
    let stableFrameCounter = 0;

    // Define the frame processing function
    const processFrame = async (timestamp: number) => {
      // Only process if enough time has passed (throttle for performance)
      // Limit to ~30fps for smooth rendering

      if (timestamp - lastFrameTime < 1000 / 30) { // Limit rendering to ~30fps
        requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTime = timestamp;

      // Apply frameSkip setting - only process every Nth frame
      // frameCount is incremented each time this function is called
      frameCount++;
      if (frameCount % frameSkip !== 0) {
        // Skip this frame based on frameSkip setting
        requestAnimationFrame(processFrame);
        return;
      }

      // Check if processing should continue
      if (!processingActive.current) {
        console.log('Processing has been stopped');
        return;
      }

      // Check if video element is still valid
      if (!video) {
        console.log('Video element no longer available');
        processingActive.current = false;
        return;
      }

      // Check if video is ready for processing
      if (video.paused || video.ended) {
        console.log('Video is paused or ended, will retry');
        requestAnimationFrame(processFrame);
        return;
      }

      // Check video readyState
      if (video.readyState < 2) {
        console.log('Video not ready yet (readyState < 2), will retry');
        requestAnimationFrame(processFrame);
        return;
      }

      try {
        frameCount++;

        // Ensure canvas dimensions match video dimensions on every frame
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          console.log('Updated canvas dimensions to match video:', canvas.width, 'x', canvas.height);
        }

        // Set canvas visibility based on landmark toggle state
        canvas.style.display = !showVideoFeed ? 'block' : 'none';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '100';

        // Run face detection on every frame to ensure dynamic movement
        // This ensures the landmarks move with the face in real-time
        const newDetections = await processWebcamFrame(video, canvas, lastDetections);

        if (newDetections && newDetections.length > 0) {
          // Update last detections with new ones
          lastDetections = newDetections;
          stableFrameCounter = 0; // Reset stability counter

          // Immediately render the new detections
          renderDetections(video, canvas, lastDetections);
        } else {
          // If no faces detected, increment stability counter
          stableFrameCounter++;

          // If we've had several frames with no detections, clear lastDetections
          if (stableFrameCounter > 5) {
            lastDetections = [];
          } else if (lastDetections.length > 0) {
            // Still render the last known detections for a few frames
            // to reduce flickering when face detection temporarily fails
            renderDetections(video, canvas, lastDetections);
          }
        }
      } catch (error) {
        console.error('Frame processing error:', error);
      }

      // Continue processing frames if still active
      if (processingActive.current) {
        requestAnimationFrame(processFrame);
      } else {
        console.log('Processing has been stopped');
      }
    };

    // Start processing frames
    requestAnimationFrame(processFrame);
    console.log('Frame processing started');
  };

  const stopWebcam = () => {
    // Stop the frame processing
    processingActive.current = false;

    // Stop the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Update the state
    setIsWebcamActive(false);

    console.log('Webcam stopped, processing deactivated');
  };

  const startWebcam = async () => {
    // Clear processed faces when starting a new webcam session
    setProcessedFaces([]);
    if (sourceImages.length === 0 && !sourceImage) {
      alert('Please upload at least one reference image first');
      // Redirect to the upload section
      setSelectedSource('upload');
      return;
    }

    // Show warning if fewer than recommended images
    if (referenceImagesCount < minRecommendedImages) {
      setShowReferenceWarning(true);
      console.warn(`Only ${referenceImagesCount} reference images provided. For better accuracy, ${minRecommendedImages} or more are recommended.`);
    }

    // Check if we have face encodings to match against
    if (faceEncodings.length === 0) {
      console.warn('No face encodings available for matching');
      alert('No faces were detected in your reference images. Please try different images with clearer faces, better lighting, or more frontal face angles.');
      return;
    }

    console.log('Starting webcam with face encodings:', faceEncodings);

    try {
      // Stop any existing webcam stream
      stopWebcam();

      // Models should already be loaded by the useFaceApiModels hook
      if (!faceApiModelsLoaded) {
        console.log('Waiting for face detection models to load...');
        // Wait for models to load instead of trying to load them directly
        await new Promise(resolve => {
          const checkModels = () => {
            if (faceApiModelsLoaded) {
              resolve(true);
            } else {
              setTimeout(checkModels, 500);
            }
          };
          checkModels();
        });
      }

      // Set up camera constraints
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } as MediaTrackConstraints
      };

      try {
        const preferredCameraId = await getPreferredCamera();
        if (preferredCameraId) {
          constraints.video = {
            ...(constraints.video as MediaTrackConstraints),
            deviceId: { ideal: preferredCameraId }
          };
        }
      } catch (error) {
        console.log('Could not get preferred camera, using default');
      }

      console.log('Attempting to start webcam with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store the stream reference
      streamRef.current = stream;

      if (videoRef.current) {
        // Set up video element
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true; // Mute to avoid feedback

        // Clear any previous processed faces
        setProcessedFaces([]);

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = async () => {
            try {
              // Start playing the video
              await video.play();
              console.log('Video play() successful');
              resolve();
            } catch (playError) {
              console.error('Error playing video:', playError);
              alert('Error starting video stream. Please try again.');
              stopWebcam();
            }
          };
        });

        // Reset the processing flag
        processingActive.current = false;

        // Initialize the canvas to ensure it's ready
        if (webcamCanvasRef.current) {
          const canvas = webcamCanvasRef.current;
          canvas.style.display = !showVideoFeed ? 'block' : 'none';
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.zIndex = '100';
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          console.log('Canvas initialized with dimensions:', canvas.width, 'x', canvas.height);
        }

        // Set webcam as active BEFORE starting processing
        setIsWebcamActive(true);
        console.log('Video is playing, starting face detection');
        console.log('Match threshold set to:', matchThreshold);

        // Give a small delay to ensure everything is ready
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log('Starting webcam stream after delay');
            handleWebcamStream();
          } else {
            console.log('Video not ready yet, waiting a bit longer');
            setTimeout(() => {
              if (videoRef.current) {
                console.log('Trying again after additional delay');
                handleWebcamStream();
              }
            }, 1000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Unable to access webcam. Please ensure you have granted camera permissions.');
      stopWebcam();
    }
  };

  const getPreferredCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log('Available cameras:', videoDevices.map(d => ({
        label: d.label || 'Unnamed camera',
        id: d.deviceId
      })));

      if (videoDevices.length === 0) {
        console.log('No cameras found');
        return null;
      }

      const preferredCamera = videoDevices.find(device => {
        const label = device.label.toLowerCase();
        return (
          label.includes('truevision') ||
          label.includes('hp') ||
          label.includes('webcam') ||
          label.includes('integrated') ||
          label.includes('built-in')
        );
      });

      if (preferredCamera) {
        console.log('Using camera:', preferredCamera.label);
        return preferredCamera.deviceId;
      }

      console.log('Using default camera:', videoDevices[0].label);
      return videoDevices[0].deviceId;
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return null;
    }
  };

  const renderProcessedFaces = () => {
    if (processedFaces.length === 0) return null;

    // Get only the faces from the current session (based on sourceImages count)
    const currentSessionFaces = processedFaces.slice(-Math.min(processedFaces.length, sourceImages.length));

    if (currentSessionFaces.length === 0) return null;

    return (
      <div className="metrics-panel">
        <div className="metrics-header" onClick={() => setIsMetricsPanelExpanded(!isMetricsPanelExpanded)}>
          <h3>Face Recognition Metrics</h3>
          <button
            className="metrics-toggle"
            title={isMetricsPanelExpanded ? "Collapse" : "Expand"}
          >
            {isMetricsPanelExpanded ? "−" : "+"}
          </button>
        </div>

        <div className={`metrics-content ${isMetricsPanelExpanded ? 'expanded' : 'collapsed'}`}>
          {currentSessionFaces.map((face, index) => (
            <div key={index} className="processed-face-info">
              <div className="metric-row">
                <span className="metric-label">Face ID:</span>
                <span className="metric-value">Image_{index + 1}</span>
              </div>

              {face.match && (
                <>
                  {showConfidence && (
                    <div className="metric-row">
                      <span className="metric-label">Match Confidence:</span>
                      <span className="metric-value confidence-value">
                        {((1 - face.match.distance) * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="metric-row">
                    <span className="metric-label">{showConfidence ? 'Distance Score' : 'Match Status'}:</span>
                    <span className="metric-value">
                      {showConfidence ? face.match.distance.toFixed(4) : 'Positive Match'}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Verification Level:</span>
                    <span className={`metric-value verification-${face.match.verificationLevel || 'none'}`}>
                      {face.match.verificationLevel ? face.match.verificationLevel.toUpperCase() : 'NONE'}
                    </span>
                  </div>

                  {/* Add individual match information if available */}
                  {face.match.individualMatches !== undefined && face.match.totalDescriptors !== undefined && (
                    <div className="metric-row">
                      <span className="metric-label">Individual Matches:</span>
                      <span className="metric-value">
                        {face.match.individualMatches}/{face.match.totalDescriptors}
                        ({((face.match.individualMatches / face.match.totalDescriptors) * 100).toFixed(1)}%)

                        {/* Add match quality indicator */}
                        {(() => {
                          const matchRatio = face.match.totalDescriptors > 0 ?
                            (face.match.individualMatches / face.match.totalDescriptors) : 0;

                          if (matchRatio >= 0.6) {
                            return <span className="match-quality match-quality-excellent">EXCELLENT</span>;
                          } else if (matchRatio >= 0.4) {
                            return <span className="match-quality match-quality-good">GOOD</span>;
                          } else if (matchRatio >= 0.2) {
                            return <span className="match-quality match-quality-fair">FAIR</span>;
                          } else {
                            return <span className="match-quality match-quality-poor">POOR</span>;
                          }
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="metric-row">
                <span className="metric-label">Status:</span>
                <span className={`metric-value status-value ${face.match ? 'status-match' : 'status-nomatch'}`}>
                  {face.match ? 'MATCH FOUND' : 'NO MATCH'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sourceOptions = [
    { id: 'image', label: 'Upload Image', icon: <Upload /> },
    { id: 'webcam', label: 'Camera', icon: <Camera /> },
  ];

  // Real-world search sources
  const sinkOptions = [
    { id: 'cctv', label: 'CCTV Cameras', icon: <img src={cctvIcon} alt="CCTV" className="custom-icon" /> },
    { id: 'drones', label: 'Drones', icon: <img src={droneIcon} alt="Drone" className="custom-icon" /> },
    { id: 'local', label: 'Local Media', icon: <Upload /> },
  ];

  // Testing options
  const testingOptions = [
    { id: 'webcam', label: 'Live Webcam', icon: <img src={webcamIcon} alt="Webcam" className="custom-icon" /> },
  ];

  // This function is used to process video files for face detection
  // It's currently not used directly but kept for future functionality
  /* @ts-ignore */
  const processVideo = async (video: HTMLVideoElement) => {
    const canvas = mediaCanvasRef.current;
    if (!canvas || !faceMatcher) {
      console.warn('Cannot process video: canvas or faceMatcher not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Cannot process video: canvas context not available');
      return;
    }

    console.log('Setting up video processing...');

    const processFrame = async () => {
      if (video.paused || video.ended) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Use SSD MobileNet with optimized parameters for face detection
      // We've removed the Performance Mode option as accuracy is critical for missing person detection
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        // Use a low confidence threshold to detect more challenging faces
        minConfidence: 0.2,
        // Increase the number of results to consider more potential faces
        maxResults: 15
      });
      console.log('Using optimized SSD MobileNet for local media processing');

      const detections = await faceapi.detectAllFaces(canvas, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, {
        width: canvas.width,
        height: canvas.height
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      resizedDetections.forEach(detection => {
        const match = faceMatcher.findBestMatch(detection.descriptor);
        const isMatch = match.distance < matchThreshold;
        const confidence = (1 - match.distance) * 100;

        // Apply privacy mode - blur non-matching faces if enabled
        if (privacyMode && !isMatch) {
          try {
            // Get the face region
            const box = detection.detection.box;
            const faceRegion = ctx.getImageData(box.x, box.y, box.width, box.height);

            // Apply a blur effect to the face region
            const blurRadius = 10;
            const blurredFace = applyBlurEffect(faceRegion, blurRadius, box.width, box.height);

            // Put the blurred face back on the canvas
            ctx.putImageData(blurredFace, box.x, box.y);

            console.log('Applied blur to non-matching face in local media (privacy mode)');
          } catch (error) {
            console.error('Error applying privacy blur in local media:', error);
          }
        }

        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          label: isMatch
            ? showConfidence ? `Match: ${confidence.toFixed(2)}%` : 'Match'
            : 'No Match',
          boxColor: isMatch ? '#00ff00' : '#ff0000',
          lineWidth: 2
        });
        drawBox.draw(canvas);
      });

      requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      processFrame();
      console.log('Video processing started');
    });
  };

  if (modelError) {
    return (
      <div className="error-message">
        {modelError}
      </div>
    );
  }

  if (!modelsLoaded) {
    return (
      <div className="loading-message">
        <div className="loading-spinner" />
        <h2 className="loading-title">Loading Face Detection Models</h2>
        <p className="loading-subtitle">Preparing advanced facial recognition capabilities...</p>
        <div className="loading-progress">
          <div className="loading-progress-bar"></div>
        </div>
      </div>
    );
  }

  const handleSourceOptionClick = (optionId: string) => {
    // Clear processed faces when switching sources
    setProcessedFaces([]);

    if (optionId === 'webcam') {
      setShowCamera(true);
      setSelectedSource(null);
    } else if (optionId === 'cctv') {
      // Show CCTV connection settings
      setShowCctvSettings(true);
      setSelectedSource(null);
    } else if (optionId === 'drones') {
      // Show drone connection settings
      setShowDroneSettings(true);
      setSelectedSource(null);
    } else if (optionId === 'local') {
      // Show local media component
      setShowLocalMedia(true);
      setSelectedSource(null);
    } else {
      // Always set the selected source to the option clicked
      // This ensures the upload UI stays visible when clicking on it again
      setSelectedSource(optionId);

      // If it's the image option and we have pending images, show them
      if (optionId === 'image' && pendingImages.length > 0) {
        // Generate preview images for any pending images that don't have previews yet
        const previewPendingImages = async () => {
          // Only generate previews if we don't have source images yet
          if (sourceImages.length < pendingImages.length) {
            const newSourceImages = [...sourceImages];

            // Generate previews for any new pending images
            for (let i = sourceImages.length; i < pendingImages.length; i++) {
              const file = pendingImages[i];
              const imageData = await readFileAsDataURL(file);
              if (imageData) {
                newSourceImages.push(imageData);
              }
            }

            // Update source images with previews
            if (newSourceImages.length > sourceImages.length) {
              setSourceImages(newSourceImages);
              if (!sourceImage && newSourceImages.length > 0) {
                setSourceImage(newSourceImages[0]);
              }
            }
          }
        };

        previewPendingImages();
      }
    }
  };

  const renderActionButton = () => {
    // Always show the button, but disable it if no source image
    const noSourceImage = !sourceImage;

    return (
      <div className="webcam-controls">
        {!isWebcamActive ? (
          <button
            className="webcam-button start-button"
            onClick={startWebcam}
            disabled={isProcessing}
            title={noSourceImage ? 'Please upload reference images first' : 'Start face detection'}
          >
            <Camera size={20} />
            Start Detection
          </button>
        ) : (
          <button
            className="webcam-button stop-button"
            onClick={stopWebcam}
          >
            <X size={20} />
            Stop Detection
          </button>
        )}
      </div>
    );
  };

  const handleCameraCapture = (imageData: string) => {
    // Get current images and add the new one
    const currentImages = [...sourceImages];
    const currentPendingImages = [...pendingImages];

    // Add the new image to the list
    currentImages.push(imageData);

    // Set the first image as the primary source image if none exists
    if (!sourceImage) {
      setSourceImage(imageData);
    }

    // Update the source images array
    setSourceImages(currentImages);
    setShowCamera(false);
    setSelectedSource(null);

    // Create a File object from the image data
    const byteString = atob(imageData.split(',')[1]);
    const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const timestamp = new Date().getTime();
    const file = new File([blob], `camera-capture-${timestamp}.jpg`, { type: mimeString });

    // Add the new file to pending images
    currentPendingImages.push(file);
    setPendingImages(currentPendingImages);

    // Update reference images count
    const newCount = currentImages.length;
    setReferenceImagesCount(newCount);

    // Show warning if fewer than recommended images
    if (newCount < minRecommendedImages) {
      setShowReferenceWarning(true);
      console.warn(`Only ${newCount} reference images provided. For better accuracy, ${minRecommendedImages} or more are recommended.`);
    } else {
      setShowReferenceWarning(false);
    }

    // Set flag to show the process button
    setImagesReadyToProcess(true);

    console.log(`Camera capture added. Total images: ${newCount}`);
  };

  // We don't need a separate function for camera captures since processReferenceImages handles both

  const CameraCapture: React.FC<{ onCapture: (image: string) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          track.enabled = false;
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
    }, []);

    useEffect(() => {
      let mounted = true;

      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
          });

          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error('Error accessing camera:', err);
          alert('Unable to access camera');
          onClose();
        }
      };

      startCamera();

      return () => {
        mounted = false;
        stopCamera();
      };
    }, [onClose, stopCamera]);

    const captureImage = useCallback(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg');
          stopCamera();
          onCapture(imageData);
          onClose();
        }
      }
    }, [onCapture, onClose, stopCamera]);

    const handleClose = useCallback(() => {
      stopCamera();
      requestAnimationFrame(() => {
        onClose();
      });
    }, [onClose, stopCamera]);

    return (
      <div className="camera-capture-modal">
        <div className="camera-capture-content">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-preview"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} data-will-read-frequently="true" />
          <div className="camera-controls">
            <button onClick={captureImage} className="capture-button">
              Take Photo
            </button>
            <button onClick={handleClose} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const exportMatchHistory = () => {
    // Create a comprehensive export object with all relevant data
    const exportData = {
      matchHistory,
      processedFaces: processedFaces.map(face => ({
        // Convert Float32Array to regular array for JSON serialization
        descriptor: Array.from(face.descriptor),
        detection: {
          box: face.detection.box,
          score: face.detection.score,
          classScore: face.detection.classScore
        },
        match: face.match
      })),
      stats: {
        totalSearches: matchHistory.length,
        matchesFound: matchHistory.filter(match => match.distance < 0.6).length,
        referenceImagesCount: sourceImages.length,
        timestamp: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'guardian-vision-data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearMatchHistory = () => {
    setMatchHistory([]);
  };

  // Handle CCTV settings change
  const handleCctvSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCctvSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Drone settings change
  const handleDroneSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDroneSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Connect to CCTV
  const connectToCctv = () => {
    // Simulate connection process
    setIsProcessing(true);

    // In real mode, attempt to connect to a real device
    if (simulationMode === 'real') {
      setTimeout(() => {
        // In a real implementation, this would attempt to connect to the actual device
        // For now, we'll always show that no real device is available

        // Show no device available message with more helpful information
        alert(
          'No physical CCTV device available at ' +
          `${cctvSettings.protocol}://${cctvSettings.ipAddress}:${cctvSettings.port}\n\n` +
          'This is expected as this is a demo application. ' +
          'To see a simulated CCTV feed, please use the "Demo Connection" button instead.'
        );

        setIsProcessing(false);
      }, 2000);
    }
    // In demo mode, always show a simulated feed
    else {
      setTimeout(() => {
        setCctvConnected(true);
        setCctvSimulated(true);
        setShowCctvSettings(false);

        // Show success message with simulation notice
        alert(
          'Successfully connected to CCTV camera (SIMULATED)\n\n' +
          'This is a simulated connection for demonstration purposes. ' +
          'No actual CCTV camera is connected.'
        );

        setIsProcessing(false);
      }, 2000);
    }
  };

  // Connect to Drone
  const connectToDrone = () => {
    // Simulate connection process
    setIsProcessing(true);

    // In real mode, attempt to connect to a real device
    if (simulationMode === 'real') {
      setTimeout(() => {
        // In a real implementation, this would attempt to connect to the actual device
        // For now, we'll always show that no real device is available

        // Show no device available message with more helpful information
        alert(
          'No physical drone available with ID: ' + droneSettings.droneId + '\n\n' +
          'This is expected as this is a demo application. ' +
          'To see a simulated drone feed, please use the "Demo Connection" button instead.'
        );

        setIsProcessing(false);
      }, 2000);
    }
    // In demo mode, always show a simulated feed
    else {
      setTimeout(() => {
        setDroneConnected(true);
        setDroneSimulated(true);
        setShowDroneSettings(false);

        // Show success message with simulation notice
        alert(
          'Successfully connected to drone (SIMULATED)\n\n' +
          'This is a simulated connection for demonstration purposes. ' +
          'No actual drone is connected.'
        );

        setIsProcessing(false);
      }, 2000);
    }
  };

  const Tutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const totalSteps = 6;
    const contentRef = useRef<HTMLDivElement>(null);

    const nextStep = () => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      }
    };

    const prevStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    };

    // Handle clicks outside the tutorial content
    const handleOverlayClick = (e: React.MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    return (
      <div className="tutorial-overlay" onClick={handleOverlayClick}>
        <div className="tutorial-content" ref={contentRef}>
          <button className="tutorial-close-x" onClick={onClose} aria-label="Close tutorial">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h2>How to Use Guardian Vision</h2>
          <p className="tutorial-intro">Guardian Vision helps you locate missing persons using advanced facial recognition technology. Follow these steps to get started:</p>

          <div className="tutorial-progress">
            <div className="tutorial-progress-bar" style={{ width: `${(currentStep + 1) / totalSteps * 100}%` }}></div>
            <div className="tutorial-progress-text">{currentStep + 1} of {totalSteps}</div>
          </div>

          <div className="tutorial-steps">
            {currentStep === 0 && (
              <div className="tutorial-step active">
                <h3>Step 1: Upload Reference Images</h3>
                <p>Upload 3-5 clear photos of the person you're looking for. Multiple reference images improve recognition accuracy.</p>
                <p>You can:</p>
                <ul>
                  <li>Click on <strong>Upload Image</strong> to select files from your device</li>
                  <li>Use <strong>Camera</strong> to take photos directly</li>
                  <li>Drag and drop images into the upload area</li>
                </ul>
                <p>After uploading, click <strong>Process Images</strong> to prepare them for recognition.</p>
              </div>
            )}

            {currentStep === 1 && (
              <div className="tutorial-step active">
                <h3>Step 2: Choose Search Method</h3>
                <p>Select from available search sources:</p>
                <ul>
                  <li><strong>Local Media</strong>: Upload images or videos from your device for analysis</li>
                  <li><strong>Live Webcam</strong>: Use your computer's camera for real-time testing</li>
                  <li><strong>CCTV Cameras</strong>: Connect to surveillance networks (real or simulated)</li>
                  <li><strong>Drones</strong>: Connect to aerial surveillance feeds (real or simulated)</li>
                </ul>
                <p>Note: The Testing section and Search Sources section are mutually exclusive - you can only select one option at a time.</p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="tutorial-step active">
                <h3>Step 3: Connect to Devices</h3>
                <p>When connecting to CCTV or Drone sources:</p>
                <ul>
                  <li>Use <strong>Connect</strong> to attempt connection to a real device</li>
                  <li>Use <strong>Demo Connection</strong> for simulated feeds</li>
                  <li>Click on a connected device to access the <strong>Disconnect</strong> option</li>
                </ul>
                <p>Connected devices will show a status indicator:</p>
                <ul>
                  <li>Green dot: Real connection</li>
                  <li>Blue "DEMO" badge: Simulated connection</li>
                </ul>
              </div>
            )}

            {currentStep === 3 && (
              <div className="tutorial-step active">
                <h3>Step 4: Test Face Recognition</h3>
                <p>After selecting a search source and uploading reference images:</p>
                <ul>
                  <li>Click <strong>Start Detection</strong> to begin face recognition</li>
                  <li>For Live Webcam, position your face in the camera view</li>
                  <li>Use the <strong>Show/Hide Landmarks</strong> toggle to view facial detection points</li>
                </ul>
                <p>The system will analyze faces and compare them to your reference images.</p>
              </div>
            )}

            {currentStep === 4 && (
              <div className="tutorial-step active">
                <h3>Step 5: Review Results</h3>
                <p>When faces are detected:</p>
                <ul>
                  <li>Matches will be highlighted with confidence scores</li>
                  <li>The match quality indicator shows how reliable the match is</li>
                  <li>Detailed analysis is available in the debug panel</li>
                  <li>Match information includes verification level and confidence percentage</li>
                </ul>
                <p>If no match is found, the system will indicate "No Match Found" in red.</p>
              </div>
            )}

            {currentStep === 5 && (
              <div className="tutorial-step active">
                <h3>Step 6: Use the Dashboard & Settings</h3>
                <p>Access additional features:</p>
                <ul>
                  <li><strong>Dashboard</strong>: View analytics, recent searches, and performance metrics</li>
                  <li><strong>Settings</strong>: Customize the system behavior:</li>
                  <ul>
                    <li>Adjust match threshold for stricter or more lenient matching</li>
                    <li>Enable/disable confidence display</li>
                    <li>Toggle data augmentation for improved recognition</li>
                    <li>Manage privacy settings and geolocation</li>
                  </ul>
                  <li><strong>Export Data</strong>: Save your search results for external analysis</li>
                </ul>
              </div>
            )}
          </div>

          <div className="tutorial-navigation">
            <button
              className={`tutorial-nav-button ${currentStep === 0 ? 'disabled' : ''}`}
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </button>

            {currentStep < totalSteps - 1 ? (
              <button className="tutorial-nav-button" onClick={nextStep}>
                Next
              </button>
            ) : (
              <button className="tutorial-close" onClick={onClose}>Got it!</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Old Dashboard component removed

  // Function to add a toast notification
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    // Prevent spam by checking if a toast is already active
    if (isToastActive) return;

    setIsToastActive(true);

    const newToast = {
      id: Date.now(),
      message,
      type
    };
    setToasts(prevToasts => [...prevToasts, newToast]);

    // Allow new toasts after 3 seconds
    setTimeout(() => {
      setIsToastActive(false);
    }, 3000);

    // Remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== newToast.id));
    }, 4000);
  };

  const handleMatch = (match: FaceMatch) => {
    // Determine if this is a successful match based on the distance
    const isFound = match.distance < 0.6; // Threshold for considering a match as "found"

    // Determine the source based on selected sinks or current context
    let source = 'unknown';
    if (selectedSinks.length > 0) {
      source = selectedSinks[0];
    } else if (showLocalMedia) {
      source = 'local';
    } else if (isWebcamActive) {
      source = 'webcam';
    }

    // Add found property and source to the match
    const enhancedMatch = {
      ...match,
      found: isFound,
      source: source,
      timestamp: new Date() // Ensure we have a timestamp
    };

    // Show toast notification for match with location if geolocation is enabled
    if (isFound && geolocationEnabled && match.location) {
      const lat = match.location.coords.latitude.toFixed(6);
      const lng = match.location.coords.longitude.toFixed(6);
      addToast(`Match found at location: ${lat}, ${lng}`, 'success');
    }

    // Update match history
    console.log('Adding match to history:', enhancedMatch);
    setMatchHistory(prev => [enhancedMatch, ...prev]);

    if (geolocationEnabled) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position);
          setMatchHistory(prev => [{
            ...enhancedMatch,
            location: position
          }, ...prev.slice(1)]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className={`guardian-vision-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prevToasts => prevToasts.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      <div className="guardian-header">
        <Link to="/projects" className="back-button">
          <ArrowLeft />
          <span>Back to Projects</span>
        </Link>
        <div className="header-controls">
          <div className="theme-switch-wrapper">
            <label className="guardian-theme-switch">
              <input
                type="checkbox"
                checked={!isDarkMode}
                onChange={() => setIsDarkMode(!isDarkMode)}
              />
              <div className="guardian-slider">
                <div className="guardian-gooey-ball"></div>
                <div className="guardian-gooey-icons">
                  <svg className="guardian-sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    <path d="M12 5V3M12 21v-2M5 12H3m18 0h-2M6.4 6.4L5 5m12.6 12.6l1.4 1.4M6.4 17.6L5 19m12.6-12.6L19 5"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <svg className="guardian-moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <motion.main
        className="guardian-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="title">Guardian Vision</h1>
        <p className="description">
          Advanced facial recognition system for locating missing persons through multiple surveillance sources.
          <span className="feature-badge">Optimized for improved side-profile detection</span>
        </p>

        <Settings
          showConfidence={showConfidence}
          setShowConfidence={setShowConfidence}
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          geolocationEnabled={geolocationEnabled}
          setGeolocationEnabled={setGeolocationEnabled}
          offlineMode={offlineMode}
          setOfflineMode={setOfflineMode}
          showAdvancedSettings={showAdvancedSettings}
          setShowAdvancedSettings={setShowAdvancedSettings}
          matchThresholdSlider={matchThresholdSlider}
          setMatchThresholdSlider={setMatchThresholdSlider}
          frameSkip={frameSkip}
          setFrameSkip={setFrameSkip}
          // Performance Mode option removed - accuracy is critical for missing person detection
          performanceMode={false}
          setPerformanceMode={() => {/* No-op */}}
          // Data augmentation for improved face recognition
          dataAugmentation={dataAugmentation}
          setDataAugmentation={setDataAugmentation}
          onOpenDashboard={() => setShowDashboard(true)}
        />

        <div className="action-buttons">
          <button
            className="action-button"
            onClick={() => setShowTutorial(true)}
          >
            Tutorial
          </button>
          <button
            className={`action-button ${matchHistory.length === 0 ? 'disabled' : ''}`}
            onClick={exportMatchHistory}
            disabled={matchHistory.length === 0}
            title={matchHistory.length === 0 ? 'Complete a search first to export data' : 'Export search data as JSON'}
          >
            Export Data
          </button>
        </div>

        <section className="source-section">
          <h2>Select Reference Images</h2>
          <p className="reference-description">
            For best results, provide 3-5 different images of the person you want to recognize.
            Using multiple reference images significantly improves recognition accuracy.
          </p>
          <div className="source-options">
            {sourceOptions.map((option) => (
              <motion.button
                key={option.id}
                className={`source-option ${selectedSource === option.id ? 'selected' : ''}`}
                onClick={() => {
                  // Toggle the selected source - if already selected, deselect it
                  if (selectedSource === option.id) {
                    setSelectedSource(null);
                  } else {
                    handleSourceOptionClick(option.id);
                    // If there are pending images, show them
                    if (option.id === 'image' && pendingImages.length > 0) {
                      setImagesReadyToProcess(true);
                    }
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {option.icon}
                <span>{option.label}</span>
              </motion.button>
            ))}
          </div>

          {selectedSource === 'image' && (
            <div
              className="upload-container"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('dragging');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('dragging');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('dragging');

                // Handle dropped files
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  // Create a synthetic event object with the files
                  const syntheticEvent = {
                    target: {
                      files: e.dataTransfer.files,
                      value: ''
                    }
                  } as React.ChangeEvent<HTMLInputElement>;

                  // Process the files using the existing handler
                  handleSourceUpload(syntheticEvent);
                  setSelectedSource(null);
                }
              }}
            >
              <label className="file-input-label">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleSourceUpload(e);
                    e.target.value = '';
                    // Don't automatically close the upload dialog
                    // This allows users to add more files if needed
                  }}
                  className="file-input"
                  id="guardian-file-input"
                />
                <span>
                  {pendingImages.length > 0
                    ? `${pendingImages.length} files selected (${minRecommendedImages}-${maxAllowedImages} recommended)`
                    : `Choose files or drag them here (${minRecommendedImages}-${maxAllowedImages} recommended)`
                  }
                </span>
              </label>

              {/* Preview container for uploaded images */}
              {pendingImages.length > 0 && (
                <div className="preview-thumbnails">
                  {pendingImages.slice(0, 1).map((file, index) => (
                    <div key={index} className="preview-container">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="preview-image"
                      />
                      {pendingImages.length > 1 && (
                        <div className="reference-count" title="Hover to see all images">
                          +{pendingImages.length - 1} more images
                          <div className="image-hover-preview">
                            <h3 className="preview-title">Pending Images</h3>
                            {pendingImages.map((file, idx) => (
                              idx > 0 && (
                                <div key={idx} className="preview-thumbnail">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${idx + 1}`}
                                  />
                                  <span>Image {idx + 1}</span>
                                  <button
                                    className="remove-thumbnail"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Remove this specific image
                                      const newPendingImages = [...pendingImages];
                                      newPendingImages.splice(idx, 1);
                                      setPendingImages(newPendingImages);

                                      // Update reference images count
                                      setReferenceImagesCount(newPendingImages.length);

                                      // If no images left, reset everything
                                      if (newPendingImages.length === 0) {
                                        setImagesReadyToProcess(false);
                                      }
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        className="remove-image"
                        onClick={() => {
                          setPendingImages([]);
                          setImagesReadyToProcess(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Process button - only shown when images are ready to process */}
              {imagesReadyToProcess && (
                <motion.button
                  className="action-button process-button"
                  onClick={processReferenceImages}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  Process Images
                </motion.button>
              )}
              {sourceImage && (
                <div className="preview-container">
                  <img src={sourceImage} alt="Reference" className="preview-image" />
                  {referenceImagesCount > 1 && (
                    <div className="reference-count" title="Hover to see all images">
                      +{referenceImagesCount - 1} more images
                      <div className="image-hover-preview">
                        <h3 className="preview-title">Reference Images</h3>
                        {sourceImages.map((img, index) => (
                          index > 0 && ( /* Skip the first image (Image_1) */
                            <div key={index} className="preview-thumbnail">
                              <img src={img} alt={`Reference ${index + 1}`} />
                              <span>Image {index + 1}</span>
                              <button
                                className="remove-thumbnail"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent closing the hover preview
                                  // Remove this specific image
                                  const newSourceImages = [...sourceImages];
                                  newSourceImages.splice(index, 1);

                                  // Update state
                                  if (newSourceImages.length > 0) {
                                    setSourceImages(newSourceImages);
                                    setReferenceImagesCount(newSourceImages.length);
                                    // If we're removing the primary image, set the new first image as primary
                                    if (index === 0) {
                                      setSourceImage(newSourceImages[0]);
                                    }
                                  } else {
                                    // If no images left, reset everything
                                    setSourceImage(null);
                                    setSourceImages([]);
                                    setFaceEncodings([]);
                                    setReferenceImagesCount(0);
                                    setImagesReadyToProcess(false);
                                    setPendingImages([]);
                                  }
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    className="remove-image"
                    onClick={() => {
                      setSourceImage(null);
                      setSourceImages([]);
                      setFaceEncodings([]);
                      setReferenceImagesCount(0);
                      setImagesReadyToProcess(false);
                      setPendingImages([]);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {showReferenceWarning && sourceImage && (
                <div className="reference-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>Using fewer than 3 reference images may reduce recognition accuracy.</span>
                </div>
              )}
            </div>
          )}

          {/* Common process button shown when images are ready to process */}
          {!selectedSource && imagesReadyToProcess && sourceImage && (
            <div className="camera-process-container">
              <div className="preview-container">
                <img src={sourceImage} alt="Reference" className="preview-image" />
                {referenceImagesCount > 1 && (
                  <div className="reference-count" title="Hover to see all images">
                    +{referenceImagesCount - 1} more images
                    <div className="image-hover-preview">
                      <h3 className="preview-title">Reference Images</h3>
                      {sourceImages.map((img, index) => (
                        index > 0 && ( /* Skip the first image (Image_1) */
                          <div key={index} className="preview-thumbnail">
                            <img src={img} alt={`Reference ${index + 1}`} />
                            <span>Image {index + 1}</span>
                            <button
                              className="remove-thumbnail"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent closing the hover preview
                                // Remove this specific image
                                const newSourceImages = [...sourceImages];
                                newSourceImages.splice(index, 1);

                                // Update state
                                if (newSourceImages.length > 0) {
                                  setSourceImages(newSourceImages);
                                  setReferenceImagesCount(newSourceImages.length);
                                  // If we're removing the primary image, set the new first image as primary
                                  if (index === 0) {
                                    setSourceImage(newSourceImages[0]);
                                  }
                                } else {
                                  // If no images left, reset everything
                                  setSourceImage(null);
                                  setSourceImages([]);
                                  setFaceEncodings([]);
                                  setReferenceImagesCount(0);
                                  setImagesReadyToProcess(false);
                                  setPendingImages([]);
                                }
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="remove-image"
                  onClick={() => {
                    setSourceImage(null);
                    setSourceImages([]);
                    setFaceEncodings([]);
                    setReferenceImagesCount(0);
                    setImagesReadyToProcess(false);
                    setPendingImages([]);
                  }}
                >
                  ×
                </button>
              </div>

              <motion.button
                className="action-button process-button"
                onClick={processReferenceImages}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                Process Images ({referenceImagesCount})
              </motion.button>

              {showReferenceWarning && (
                <div className="reference-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>Using fewer than {minRecommendedImages} reference images may reduce recognition accuracy.</span>
                </div>
              )}

              {identityWarningShown && (
                <div className="identity-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ff5722" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>Your reference images may contain different people. For best results, use images of the same person.</span>
                </div>
              )}

              <div className="capture-more-container">
                <button
                  className="capture-more-button"
                  onClick={() => setShowCamera(true)}
                >
                  Capture Another Image
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="search-and-testing-container">
          <div className={`sink-section ${selectedSinks.some(id => testingOptions.some(opt => opt.id === id)) ? 'disabled' : ''}`}>
            <h2>Select Search Sources</h2>
            <div className="sink-options">
              {sinkOptions.map((option) => (
                <div key={option.id} className="sink-option-container">
                  <motion.button
                    className={`sink-option
                      ${selectedSinks.includes(option.id) ? 'selected' : ''}
                      ${(option.id === 'cctv' && cctvConnected) ? (cctvSimulated ? 'simulated' : 'connected') : ''}
                      ${(option.id === 'drones' && droneConnected) ? (droneSimulated ? 'simulated' : 'connected') : ''}
                    `}
                    onClick={() => {
                    // If this option is already selected, deselect it
                    if (selectedSinks.includes(option.id)) {
                      setSelectedSinks([]);
                    } else {
                      // Otherwise, clear all selections and select only this one
                      // Also clear any testing options
                      setSelectedSinks([option.id]);

                      // Show appropriate settings modal
                      if (option.id === 'cctv') {
                        // Always show the settings modal, even if already connected
                        setShowCctvSettings(true);
                        // If already connected, show a toast notification
                        if (cctvConnected) {
                          if (cctvSimulated) {
                            addToast('CCTV Camera already connected (SIMULATED). You can disconnect from the settings.', 'info');
                          } else {
                            addToast('CCTV Camera already connected. You can disconnect from the settings.', 'info');
                          }
                        }
                      } else if (option.id === 'drones') {
                        // Always show the settings modal, even if already connected
                        setShowDroneSettings(true);
                        // If already connected, show a toast notification
                        if (droneConnected) {
                          if (droneSimulated) {
                            addToast('Drone already connected (SIMULATED). You can disconnect from the settings.', 'info');
                          } else {
                            addToast('Drone already connected. You can disconnect from the settings.', 'info');
                          }
                        }
                      } else if (option.id === 'local') {
                        // Show local media component
                        setShowLocalMedia(true);
                      }
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </motion.button>
                </div>
              ))}
            </div>
          </div>

          <div className={`testing-section ${selectedSinks.some(id => sinkOptions.some(opt => opt.id === id)) ? 'disabled' : ''}`}>
            <h2>Testing</h2>
            <div className="testing-options">
              {testingOptions.map((option) => (
                <motion.button
                  key={option.id}
                  className={`sink-option ${selectedSinks.includes(option.id) ? 'selected' : ''}`}
                  onClick={() => {
                    // If this option is already selected, deselect it
                    if (selectedSinks.includes(option.id)) {
                      setSelectedSinks([]);
                    } else {
                      // Otherwise, clear all selections and select only this testing option
                      setSelectedSinks([option.id]);
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Detection button moved inside testing section */}
            <div className="detection-controls">
              {renderActionButton()}
            </div>
          </div>
        </section>

        {/* Original action button position - removed */}
      </motion.main>

      <div
        className="webcam-container"
        style={{
          display: isWebcamActive ? 'block' : 'none'
        }}
      >
        {/* Toggle button for facial landmarks */}
        <button
          className="landmarks-toggle-button"
          onClick={() => setShowVideoFeed(!showVideoFeed)}
        >
          {showVideoFeed ? 'Show Landmarks' : 'Hide Landmarks'}
        </button>

        {/* Video element - always visible */}
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
          playsInline
          muted
          autoPlay
        />

        {/* Canvas overlay for facial landmarks - visibility toggled */}
        <canvas
          ref={webcamCanvasRef}
          className="webcam-overlay"
          data-will-read-frequently="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            background: 'transparent' // Transparent background for landmarks
          }}
        />

        {/* Match results debug panel */}
        {enhancedMatching.matchResults && (
          <div className={`match-results-debug ${!isFaceDetected ? 'no-face' : enhancedMatching.matchResults.includes('NO MATCH') ? 'no-match' : 'match'}`}>
            <div className="debug-panel-header">
              <h4>
                {!isFaceDetected
                  ? 'No Face Detected'
                  : enhancedMatching.matchResults.includes('NO MATCH')
                    ? 'Enhanced Detection Analysis'
                    : 'Enhanced Match Analysis'}
              </h4>
              <button
                className="debug-panel-toggle"
                onClick={() => setIsDebugPanelExpanded(!isDebugPanelExpanded)}
                title={isDebugPanelExpanded ? "Collapse" : "Expand"}
              >
                {isDebugPanelExpanded ? "−" : "+"}
              </button>
            </div>
            <pre className={isDebugPanelExpanded ? "expanded" : "collapsed"}>
              {!isFaceDetected
                ? "No face detected in the current frame. Please position your face in the camera view."
                : enhancedMatching.matchResults}
            </pre>
          </div>
        )}
        {/* Face detection status label */}
        <div className={`face-match-label ${!isFaceDetected ? 'no-face' : processedFaces.length > 0 && processedFaces[processedFaces.length - 1].match ? 'match' : 'no-match'}`}>
          {!isFaceDetected ? (
            <>No Face Detected</>
          ) : processedFaces.length > 0 ? (
              showConfidence ? (
                <>Match Found: {
                  isNaN(((1 - processedFaces[processedFaces.length - 1].match?.distance!) * 100))
                    ? '0.00'
                    : ((1 - processedFaces[processedFaces.length - 1].match?.distance!) * 100).toFixed(2)
                }%
                {processedFaces[processedFaces.length - 1].match?.verificationLevel && (
                  <span className={`verification-${processedFaces[processedFaces.length - 1].match?.verificationLevel}`}>
                    [{processedFaces[processedFaces.length - 1].match?.verificationLevel?.toUpperCase() || 'NONE'}]
                  </span>
                )}

                {/* Add match quality indicator if available */}
                {processedFaces[processedFaces.length - 1].match?.individualMatches !== undefined &&
                 processedFaces[processedFaces.length - 1].match?.totalDescriptors !== undefined && (
                  <span>
                    {(() => {
                      const face = processedFaces[processedFaces.length - 1];
                      const matchRatio = face.match?.totalDescriptors! > 0 ?
                        (face.match?.individualMatches! / face.match?.totalDescriptors!) : 0;

                      if (matchRatio >= 0.6) {
                        return <span className="match-quality match-quality-excellent">EXCELLENT</span>;
                      } else if (matchRatio >= 0.4) {
                        return <span className="match-quality match-quality-good">GOOD</span>;
                      } else if (matchRatio >= 0.2) {
                        return <span className="match-quality match-quality-fair">FAIR</span>;
                      } else {
                        return <span className="match-quality match-quality-poor">POOR</span>;
                      }
                    })()}
                  </span>
                )}
                </>
              ) : (
                <>Match Found
                {processedFaces[processedFaces.length - 1].match?.verificationLevel && (
                  <span className={`verification-${processedFaces[processedFaces.length - 1].match?.verificationLevel}`}>
                    [{processedFaces[processedFaces.length - 1].match?.verificationLevel?.toUpperCase() || 'NONE'}]
                  </span>
                )}
                </>
              )
            ) : (
              <>No Match Found</>
            )}
          </div>
      </div>

      {renderProcessedFaces()}

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner"></div>
            <p>Processing Face Recognition</p>
            {uploadProgress > 0 && (
              <div className="processing-progress">
                <div
                  className="processing-progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
                <span>{uploadProgress}%</span>
              </div>
            )}
            <div className="processing-info">
              {uploadProgress < 30 && 'Initializing face detection...'}
              {uploadProgress >= 30 && uploadProgress < 60 && 'Detecting facial features...'}
              {uploadProgress >= 60 && uploadProgress < 90 && 'Creating face encodings...'}
              {uploadProgress >= 90 && 'Finalizing...'}
            </div>
          </div>
        </div>
      )}

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      {/* Dashboard Component */}
      {showDashboard && (
        <div>
          {/* Use type assertion to fix TypeScript error */}
          {React.createElement(DashboardComponent as any, {
            onClose: () => setShowDashboard(false),
            processedFaces,
            matchHistory,
            referenceImagesCount: sourceImages.length,
            clearHistory: clearMatchHistory
          })}
        </div>
      )}

      {/* Local Media Component */}
      {showLocalMedia && faceMatcher && (
        <LocalMedia
          faceMatcher={faceMatcher}
          onClose={() => setShowLocalMedia(false)}
          matchThreshold={matchThreshold}
          handleMatch={handleMatch}
        />
      )}

      {/* Location Indicator */}
      <LocationIndicator
        geoStatus={geoStatus}
        currentLocation={currentLocation}
        locationUpdateTime={locationUpdateTime}
        matchFound={processedFaces.length > 0 && processedFaces[processedFaces.length - 1].match !== null}
      />

      {/* CCTV Settings Modal */}
      {showCctvSettings && (
        <div className="connection-modal-overlay">
          <div className="connection-modal">
            <h2>CCTV Camera Connection</h2>
            <div className="connection-form">
              <div className="form-group">
                <label htmlFor="protocol">Protocol</label>
                <select
                  id="protocol"
                  name="protocol"
                  value={cctvSettings.protocol}
                  onChange={handleCctvSettingsChange}
                >
                  <option value="rtsp">RTSP</option>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ipAddress">IP Address</label>
                <input
                  type="text"
                  id="ipAddress"
                  name="ipAddress"
                  value={cctvSettings.ipAddress}
                  onChange={handleCctvSettingsChange}
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="port">Port</label>
                <input
                  type="text"
                  id="port"
                  name="port"
                  value={cctvSettings.port}
                  onChange={handleCctvSettingsChange}
                  placeholder="8080"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={cctvSettings.username}
                  onChange={handleCctvSettingsChange}
                  placeholder="admin"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={cctvSettings.password}
                  onChange={handleCctvSettingsChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="connection-buttons">
                <button
                  className="cancel-button"
                  onClick={() => {
                    setShowCctvSettings(false);
                    setSelectedSinks([]);
                  }}
                >
                  Cancel
                </button>
                {cctvConnected ? (
                  <button
                    className="disconnect-button"
                    onClick={() => {
                      setCctvConnected(false);
                      setCctvSimulated(false);
                      setShowCctvSettings(false);
                      setSelectedSinks([]);
                      addToast('CCTV Camera disconnected', 'info');
                    }}
                  >
                    🔗 Disconnect
                  </button>
                ) : (
                  <>
                    <button
                      className="connect-button"
                      onClick={() => {
                        setSimulationMode('real');
                        connectToCctv();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing && simulationMode === 'real' ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      className="demo-connect-button"
                      onClick={() => {
                        setSimulationMode('demo');
                        connectToCctv();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing && simulationMode === 'demo' ? 'Connecting...' : 'Demo Connection'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drone Settings Modal */}
      {showDroneSettings && (
        <div className="connection-modal-overlay">
          <div className="connection-modal">
            <h2>Drone Connection</h2>
            <div className="connection-form">
              <div className="form-group">
                <label htmlFor="connectionType">Connection Type</label>
                <select
                  id="connectionType"
                  name="connectionType"
                  value={droneSettings.connectionType}
                  onChange={handleDroneSettingsChange}
                >
                  <option value="wifi">Wi-Fi</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="radio">Radio Control</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="droneId">Drone ID</label>
                <input
                  type="text"
                  id="droneId"
                  name="droneId"
                  value={droneSettings.droneId}
                  onChange={handleDroneSettingsChange}
                  placeholder="DJI-1234"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ssid">Network SSID</label>
                <input
                  type="text"
                  id="ssid"
                  name="ssid"
                  value={droneSettings.ssid}
                  onChange={handleDroneSettingsChange}
                  placeholder="Drone-Network"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={droneSettings.password}
                  onChange={handleDroneSettingsChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label htmlFor="channel">Channel</label>
                <select
                  id="channel"
                  name="channel"
                  value={droneSettings.channel}
                  onChange={handleDroneSettingsChange}
                >
                  <option value="1">Channel 1</option>
                  <option value="2">Channel 2</option>
                  <option value="3">Channel 3</option>
                  <option value="4">Channel 4</option>
                  <option value="5">Channel 5</option>
                </select>
              </div>

              <div className="connection-buttons">
                <button
                  className="cancel-button"
                  onClick={() => {
                    setShowDroneSettings(false);
                    setSelectedSinks([]);
                  }}
                >
                  Cancel
                </button>
                {droneConnected ? (
                  <button
                    className="disconnect-button"
                    onClick={() => {
                      setDroneConnected(false);
                      setDroneSimulated(false);
                      setShowDroneSettings(false);
                      setSelectedSinks([]);
                      addToast('Drone disconnected', 'info');
                    }}
                  >
                    🔗 Disconnect
                  </button>
                ) : (
                  <>
                    <button
                      className="connect-button"
                      onClick={() => {
                        setSimulationMode('real');
                        connectToDrone();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing && simulationMode === 'real' ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      className="demo-connect-button"
                      onClick={() => {
                        setSimulationMode('demo');
                        connectToDrone();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing && simulationMode === 'demo' ? 'Connecting...' : 'Demo Connection'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardianVision;
