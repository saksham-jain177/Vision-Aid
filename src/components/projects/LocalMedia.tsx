import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as faceapi from '@vladmandic/face-api';
import './LocalMedia.css';

interface LocalMediaProps {
  faceMatcher: faceapi.FaceMatcher | null;
  onClose: () => void;
  matchThreshold: number;
  handleMatch?: (match: any) => void;
}

const LocalMedia: React.FC<LocalMediaProps> = ({ faceMatcher, onClose, matchThreshold, handleMatch }) => {
  // State for media type selection
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  // State for file handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // State for processing
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [matchResults, setMatchResults] = useState<string>('');
  const [matchFound, setMatchFound] = useState<boolean>(false);

  // Refs for media elements
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State for video playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);

  // State for detection results
  const [detections, setDetections] = useState<faceapi.WithFaceLandmarks<{
    detection: faceapi.FaceDetection;
  }, faceapi.FaceLandmarks68>[]>([]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    // Create URL for the file
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    // Reset states
    setMatchResults('');
    setMatchFound(false);
    setDetections([]);
    setIsProcessing(false);
    setProcessingProgress(0);
  };

  // Process image
  const processImage = async () => {
    if (!imageRef.current || !faceMatcher || !canvasRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(10);

    try {
      // Prepare canvas
      const img = imageRef.current;
      const canvas = canvasRef.current;
      const displaySize = { width: img.width, height: img.height };
      faceapi.matchDimensions(canvas, displaySize);

      setProcessingProgress(30);

      // Detect faces
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.2,
        maxResults: 15
      });

      const detections = await faceapi.detectAllFaces(img, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      setProcessingProgress(60);

      // Draw canvas
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      setDetections(resizedDetections);

      // Match faces
      let resultsLog = '';
      let foundMatch = false;

      if (detections.length === 0) {
        resultsLog = 'No faces detected in the image.';
      } else {
        resultsLog = `Detected ${detections.length} faces in the image.\n\n`;

        for (let i = 0; i < detections.length; i++) {
          const detection = detections[i];
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

          resultsLog += `Face #${i + 1}: ${bestMatch.toString()}\n`;

          // Always record the match result, whether found or not
          if (handleMatch) {
            handleMatch({
              label: bestMatch.label !== 'unknown' ? bestMatch.label : 'Unknown Person',
              distance: bestMatch.distance,
              confidence: (1 - bestMatch.distance) * 100,
              timestamp: new Date()
            });
          }

          // Update UI based on match status
          if (bestMatch.label !== 'unknown') {
            foundMatch = true;
            resultsLog += `MATCH FOUND! Confidence: ${((1 - bestMatch.distance) * 100).toFixed(2)}%\n`;
          } else {
            resultsLog += `No match found. Best distance: ${bestMatch.distance.toFixed(2)}\n`;
          }
        }
      }

      setMatchResults(resultsLog);
      setMatchFound(foundMatch);

      // Draw results on canvas
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);

      resizedDetections.forEach((detection, i) => {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const isMatch = bestMatch.label !== 'unknown';
        const boxColor = isMatch ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 0)';
        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          boxColor,
          lineWidth: 2,
          label: isMatch ? `Match: ${((1 - bestMatch.distance) * 100).toFixed(0)}%` : 'No Match'
        });
        drawBox.draw(canvas);
      });

      setProcessingProgress(100);
    } catch (error) {
      console.error('Error processing image:', error);
      setMatchResults(`Error processing image: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process video frame
  const processVideoFrame = async () => {
    if (!videoRef.current || !faceMatcher || !canvasRef.current) return;

    // If video is not playing, don't continue processing
    if (!isPlaying) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Make sure video dimensions are available
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(processVideoFrame);
        return;
      }

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      // Detect faces
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.2,
        maxResults: 15
      });

      const detections = await faceapi.detectAllFaces(video, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Draw canvas
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      setDetections(resizedDetections);

      // Match faces
      let foundMatch = false;
      let resultsLog = '';

      if (detections.length === 0) {
        resultsLog = 'No faces detected in current frame.';
      } else {
        resultsLog = `Detected ${detections.length} faces in current frame.\n\n`;

        for (let i = 0; i < detections.length; i++) {
          const detection = detections[i];
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

          resultsLog += `Face #${i + 1}: ${bestMatch.toString()}\n`;

          // Always record the match result, whether found or not
          if (handleMatch) {
            handleMatch({
              label: bestMatch.label !== 'unknown' ? bestMatch.label : 'Unknown Person',
              distance: bestMatch.distance,
              confidence: (1 - bestMatch.distance) * 100,
              timestamp: new Date()
            });
          }

          // Update UI based on match status
          if (bestMatch.label !== 'unknown') {
            foundMatch = true;
            resultsLog += `MATCH FOUND! Confidence: ${((1 - bestMatch.distance) * 100).toFixed(2)}%\n`;
          } else {
            resultsLog += `No match found. Best distance: ${bestMatch.distance.toFixed(2)}\n`;
          }
        }
      }

      setMatchResults(resultsLog);
      setMatchFound(foundMatch);

      // Draw results on canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw face detections
        resizedDetections.forEach((detection, i) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          const isMatch = bestMatch.label !== 'unknown';
          const boxColor = isMatch ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 0)';
          const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
            boxColor,
            lineWidth: 2,
            label: isMatch ? `Match: ${((1 - bestMatch.distance) * 100).toFixed(0)}%` : 'No Match'
          });
          drawBox.draw(canvas);

          // Draw face landmarks for better visualization
          if (detection.landmarks) {
            const drawLandmarks = new faceapi.draw.DrawFaceLandmarks(detection.landmarks, {
              lineWidth: 2,
              drawLines: true
            });
            drawLandmarks.draw(canvas);
          }
        });
      }
    } catch (error) {
      console.error('Error processing video frame:', error);
    }

    // Continue processing frames if video is still playing
    if (isPlaying) {
      requestAnimationFrame(processVideoFrame);
    }
  };

  // Handle video playback
  const handleVideoPlay = () => {
    setIsPlaying(true);
    // Start processing video frames
    requestAnimationFrame(processVideoFrame);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  // Start processing when video is loaded
  useEffect(() => {
    if (isVideoLoaded && videoRef.current && isPlaying) {
      requestAnimationFrame(processVideoFrame);
    }
  }, [isVideoLoaded, isPlaying]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsVideoLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Format time for video player
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Reset selection
  const resetSelection = () => {
    setMediaType(null);
    setSelectedFile(null);
    setFileUrl(null);
    setMatchResults('');
    setMatchFound(false);
    setDetections([]);
    setIsProcessing(false);
    setProcessingProgress(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsVideoLoaded(false);
  };

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  // Check if face matcher is available
  if (!faceMatcher) {
    return (
      <div className="local-media-container">
        <div className="error-message">
          <h2>No Reference Face Available</h2>
          <p>Please upload and process reference images first.</p>
          <button className="action-button" onClick={onClose}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="local-media-container">
      <div className="local-media-header">
        <h2>Local Media Search</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {!mediaType ? (
        <div className="media-type-selection">
          <h3>Select Media Type</h3>
          <div className="media-type-options">
            <motion.button
              className="media-type-option"
              onClick={() => setMediaType('image')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Image</span>
              <p className="media-type-description">Upload and scan images for missing persons</p>
            </motion.button>

            <motion.button
              className="media-type-option"
              onClick={() => setMediaType('video')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
              </svg>
              <span>Video</span>
              <p className="media-type-description">Upload and analyze video footage</p>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="media-processing-container">
          <div className="media-controls">
            <button className="back-button" onClick={resetSelection}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>

            <div className="file-upload-container">
              <label className="file-upload-label">
                <input
                  type="file"
                  accept={mediaType === 'image' ? "image/*" : "video/*"}
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <span>
                  {selectedFile ? selectedFile.name : `Choose ${mediaType === 'image' ? 'Image' : 'Video'} File`}
                </span>
              </label>

              {selectedFile && mediaType === 'image' && (
                <button
                  className="action-button process-button"
                  onClick={processImage}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Process Image'}
                </button>
              )}
            </div>
          </div>

          {isProcessing && (
            <div className="processing-indicator">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${processingProgress}%` }}></div>
              </div>
              <p>Processing... {processingProgress}%</p>
            </div>
          )}

          <div className="media-preview-container">
            {fileUrl && mediaType === 'image' && (
              <div className="image-container">
                <img
                  ref={imageRef}
                  src={fileUrl}
                  alt="Uploaded"
                  className="media-preview"
                  onLoad={() => {
                    if (canvasRef.current && imageRef.current) {
                      canvasRef.current.width = imageRef.current.width;
                      canvasRef.current.height = imageRef.current.height;
                    }
                  }}
                />
                <canvas ref={canvasRef} className="detection-canvas" data-will-read-frequently="true"></canvas>
              </div>
            )}

            {fileUrl && mediaType === 'video' && (
              <div className="video-container">
                <video
                  ref={videoRef}
                  src={fileUrl}
                  className="media-preview"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoaded}
                  controls
                  playsInline
                  crossOrigin="anonymous"
                ></video>
                <canvas ref={canvasRef} className="detection-canvas" data-will-read-frequently="true"></canvas>

                {isVideoLoaded && (
                  <div className="video-controls">
                    <div className="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="seek-bar"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {matchResults && (
            <div className={`match-results ${matchFound ? 'match-found' : 'no-match'}`}>
              <h3>{matchFound ? 'Match Found!' : 'Results'}</h3>
              <pre>{matchResults}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocalMedia;
