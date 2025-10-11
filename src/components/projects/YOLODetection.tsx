import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Camera, Video, Play, Pause, RotateCcw, Image as ImageIcon } from 'lucide-react';
import './YOLODetection.css';

interface YOLODetectionProps {
  onClose: () => void;
}

interface Detection {
  id: string;
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * YOLO Detection Component
 * Allows users to upload images/videos for real-time object detection
 */
const YOLODetection: React.FC<YOLODetectionProps> = ({ onClose }) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? 'image' : 'video');
    setMediaUrl(URL.createObjectURL(file));
    setDetections([]);
  };

  /**
   * Simulate YOLO detection (placeholder for actual YOLO implementation)
   */
  const simulateDetection = () => {
    setIsProcessing(true);

    // Simulated detection - in production, this would call actual YOLO API
    setTimeout(() => {
      const mockDetections: Detection[] = [
        {
          id: '1',
          class: 'car',
          confidence: 0.92,
          x: 100,
          y: 150,
          width: 120,
          height: 80
        },
        {
          id: '2',
          class: 'truck',
          confidence: 0.88,
          x: 300,
          y: 200,
          width: 150,
          height: 100
        },
        {
          id: '3',
          class: 'person',
          confidence: 0.95,
          x: 450,
          y: 300,
          width: 50,
          height: 120
        },
        {
          id: '4',
          class: 'motorcycle',
          confidence: 0.85,
          x: 200,
          y: 400,
          width: 80,
          height: 60
        }
      ];

      setDetections(mockDetections);
      setIsProcessing(false);
      drawDetections(mockDetections);
    }, 1500);
  };

  /**
   * Draw detection boxes on canvas
   */
  const drawDetections = (dets: Detection[]) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const video = videoRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image or video frame
    if (mediaType === 'image' && image) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);
    } else if (mediaType === 'video' && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
    }

    // Draw detection boxes
    dets.forEach(detection => {
      // Draw box
      ctx.strokeStyle = getColorForClass(detection.class);
      ctx.lineWidth = 3;
      ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);

      // Draw label background
      const label = `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = getColorForClass(detection.class);
      ctx.fillRect(detection.x, detection.y - 25, textWidth + 10, 25);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, detection.x + 5, detection.y - 7);
    });
  };

  /**
   * Get color for detection class
   */
  const getColorForClass = (className: string): string => {
    const colors: { [key: string]: string } = {
      car: '#3182ce',
      truck: '#e53e3e',
      bus: '#f6ad55',
      motorcycle: '#48bb78',
      bicycle: '#9f7aea',
      person: '#ed8936',
      pedestrian: '#ed8936'
    };
    return colors[className] || '#718096';
  };

  /**
   * Handle video play/pause
   */
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
      // Simulate detection on each frame (in production, use actual YOLO)
      requestAnimationFrame(processVideoFrame);
    }
    setIsPlaying(!isPlaying);
  };

  /**
   * Process video frames
   */
  const processVideoFrame = () => {
    if (!isPlaying || !videoRef.current) return;

    simulateDetection();
    requestAnimationFrame(processVideoFrame);
  };

  /**
   * Reset media
   */
  const handleReset = () => {
    setMediaFile(null);
    setMediaType(null);
    setMediaUrl(null);
    setDetections([]);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="yolo-detection-overlay"
    >
      <div className="yolo-detection-container">
        {/* Header */}
        <div className="yolo-header">
          <h2>YOLO Object Detection</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Upload Area */}
        {!mediaUrl && (
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <div className="upload-prompt" onClick={() => fileInputRef.current?.click()}>
              <Upload size={64} className="upload-icon" />
              <h3>Upload Image or Video</h3>
              <p>Click to select a file for object detection</p>
              <div className="file-types">
                <span><ImageIcon size={16} /> Images: JPG, PNG, GIF</span>
                <span><Video size={16} /> Videos: MP4, AVI, MOV</span>
              </div>
            </div>

            <div className="upload-options">
              <button className="option-btn" onClick={() => fileInputRef.current?.click()}>
                <Camera size={20} />
                From Camera
              </button>
              <button className="option-btn" onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                From Files
              </button>
            </div>
          </div>
        )}

        {/* Media Display */}
        {mediaUrl && (
          <div className="media-container">
            <div className="media-display">
              <canvas
                ref={canvasRef}
                className="detection-canvas"
                style={{ display: detections.length > 0 ? 'block' : 'none' }}
              />
              
              {mediaType === 'image' && (
                <img
                  ref={imageRef}
                  src={mediaUrl}
                  alt="Uploaded"
                  className="media-preview"
                  style={{ display: detections.length === 0 ? 'block' : 'none' }}
                  onLoad={() => {
                    if (canvasRef.current && imageRef.current) {
                      canvasRef.current.width = imageRef.current.naturalWidth;
                      canvasRef.current.height = imageRef.current.naturalHeight;
                    }
                  }}
                />
              )}

              {mediaType === 'video' && (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  className="media-preview"
                  style={{ display: detections.length === 0 ? 'block' : 'none' }}
                  onLoadedMetadata={() => {
                    if (canvasRef.current && videoRef.current) {
                      canvasRef.current.width = videoRef.current.videoWidth;
                      canvasRef.current.height = videoRef.current.videoHeight;
                    }
                  }}
                />
              )}
            </div>

            {/* Controls */}
            <div className="media-controls">
              {mediaType === 'image' && (
                <button
                  className="control-btn primary"
                  onClick={simulateDetection}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Detect Objects'}
                </button>
              )}

              {mediaType === 'video' && (
                <button className="control-btn primary" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  {isPlaying ? 'Pause' : 'Play & Detect'}
                </button>
              )}

              <button className="control-btn secondary" onClick={handleReset}>
                <RotateCcw size={20} />
                Reset
              </button>

              <button className="control-btn secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                New File
              </button>
            </div>

            {/* Detection Results */}
            {detections.length > 0 && (
              <div className="detection-results">
                <h3>Detected Objects ({detections.length})</h3>
                <div className="detections-list">
                  {detections.map(detection => (
                    <div key={detection.id} className="detection-item">
                      <div
                        className="detection-color"
                        style={{ background: getColorForClass(detection.class) }}
                      />
                      <span className="detection-class">{detection.class}</span>
                      <span className="detection-confidence">
                        {(detection.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Information */}
        <div className="yolo-info">
          <p><strong>Note:</strong> This is a demonstration interface. In production, this would integrate with actual YOLO models for real-time object detection on traffic images and videos.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default YOLODetection;