// Vehicle Tracking Service
// Implements advanced vehicle tracking and speed estimation using YOLO detection data

export interface VehicleTrack {
  id: string;
  class: string;
  positions: Array<{
    x: number;
    y: number;
    timestamp: number;
    confidence: number;
  }>;
  speed: number; // km/h
  direction: 'north' | 'south' | 'east' | 'west';
  lastSeen: number;
  isActive: boolean;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  minSpeed: number;
}

export interface TrackingConfig {
  maxTrackAge: number; // milliseconds
  minTrackLength: number; // minimum positions for valid track
  speedCalculationWindow: number; // positions to use for speed calculation
  directionThreshold: number; // minimum movement for direction detection
  confidenceThreshold: number; // minimum confidence for tracking
  maxDistance: number; // maximum distance for position updates
}

export interface SpeedViolation {
  trackId: string;
  vehicleClass: string;
  speed: number;
  speedLimit: number;
  timestamp: number;
  location: { x: number; y: number };
  severity: 'low' | 'medium' | 'high';
}

export class VehicleTracker {
  private tracks: Map<string, VehicleTrack> = new Map();
  private config: TrackingConfig;
  private speedViolations: SpeedViolation[] = [];
  private speedLimit: number = 50; // km/h default

  constructor(config: TrackingConfig) {
    this.config = config;
  }

  // Process new detections and update tracks
  public processDetections(detections: Array<{
    id: string;
    class: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
    timestamp: number;
  }>): VehicleTrack[] {
    const currentTime = Date.now();
    const activeTracks: VehicleTrack[] = [];

    // Update existing tracks
    for (const detection of detections) {
      const trackId = this.findBestMatch(detection);
      
      if (trackId) {
        this.updateTrack(trackId, detection);
      } else {
        this.createNewTrack(detection);
      }
    }

    // Clean up old tracks and calculate speeds
    for (const [trackId, track] of this.tracks) {
      if (currentTime - track.lastSeen > this.config.maxTrackAge) {
        this.tracks.delete(trackId);
        continue;
      }

      if (track.positions.length >= this.config.minTrackLength) {
        this.calculateTrackMetrics(track);
        activeTracks.push(track);
      }
    }

    return activeTracks;
  }

  // Find best matching track for a detection
  private findBestMatch(detection: any): string | null {
    const detectionCenter = {
      x: detection.bbox.x + detection.bbox.width / 2,
      y: detection.bbox.y + detection.bbox.height / 2
    };

    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const [trackId, track] of this.tracks) {
      if (!track.isActive || track.class !== detection.class) continue;

      const lastPosition = track.positions[track.positions.length - 1];
      const distance = Math.sqrt(
        Math.pow(detectionCenter.x - lastPosition.x, 2) +
        Math.pow(detectionCenter.y - lastPosition.y, 2)
      );

      if (distance < this.config.maxDistance && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = trackId;
      }
    }

    return bestMatch;
  }

  // Update existing track with new detection
  private updateTrack(trackId: string, detection: any): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    const detectionCenter = {
      x: detection.bbox.x + detection.bbox.width / 2,
      y: detection.bbox.y + detection.bbox.height / 2
    };

    track.positions.push({
      x: detectionCenter.x,
      y: detectionCenter.y,
      timestamp: detection.timestamp,
      confidence: detection.confidence
    });

    track.lastSeen = detection.timestamp;
    track.isActive = true;

    // Limit position history
    if (track.positions.length > 50) {
      track.positions.shift();
    }
  }

  // Create new track from detection
  private createNewTrack(detection: any): void {
    const detectionCenter = {
      x: detection.bbox.x + detection.bbox.width / 2,
      y: detection.bbox.y + detection.bbox.height / 2
    };

    const track: VehicleTrack = {
      id: detection.id,
      class: detection.class,
      positions: [{
        x: detectionCenter.x,
        y: detectionCenter.y,
        timestamp: detection.timestamp,
        confidence: detection.confidence
      }],
      speed: 0,
      direction: 'north',
      lastSeen: detection.timestamp,
      isActive: true,
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      minSpeed: Infinity
    };

    this.tracks.set(detection.id, track);
  }

  // Calculate track metrics (speed, direction, etc.)
  private calculateTrackMetrics(track: VehicleTrack): void {
    if (track.positions.length < 2) return;

    const positions = track.positions;
    const recentPositions = positions.slice(-this.config.speedCalculationWindow);

    // Calculate speed
    let totalDistance = 0;
    let totalTime = 0;
    const speeds: number[] = [];

    for (let i = 1; i < recentPositions.length; i++) {
      const prev = recentPositions[i - 1];
      const curr = recentPositions[i];

      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const time = (curr.timestamp - prev.timestamp) / 1000; // seconds

      if (time > 0) {
        const speed = (distance / time) * 3.6; // Convert to km/h (assuming 1 pixel = 1 meter)
        speeds.push(speed);
        totalDistance += distance;
        totalTime += time;
      }
    }

    // Update track metrics
    track.totalDistance = totalDistance;
    track.speed = speeds.length > 0 ? speeds[speeds.length - 1] : 0;
    track.averageSpeed = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;
    track.maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    track.minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;

    // Calculate direction
    if (positions.length >= 2) {
      const first = positions[0];
      const last = positions[positions.length - 1];
      
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      
      if (Math.abs(dx) > this.config.directionThreshold || Math.abs(dy) > this.config.directionThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          track.direction = dx > 0 ? 'east' : 'west';
        } else {
          track.direction = dy > 0 ? 'south' : 'north';
        }
      }
    }

    // Check for speed violations
    this.checkSpeedViolation(track);
  }

  // Check for speed violations
  private checkSpeedViolation(track: VehicleTrack): void {
    if (track.speed > this.speedLimit) {
      const severity: 'low' | 'medium' | 'high' = 
        track.speed > this.speedLimit * 1.5 ? 'high' :
        track.speed > this.speedLimit * 1.2 ? 'medium' : 'low';

      const violation: SpeedViolation = {
        trackId: track.id,
        vehicleClass: track.class,
        speed: track.speed,
        speedLimit: this.speedLimit,
        timestamp: track.lastSeen,
        location: {
          x: track.positions[track.positions.length - 1].x,
          y: track.positions[track.positions.length - 1].y
        },
        severity
      };

      this.speedViolations.push(violation);

      // Keep only recent violations
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.speedViolations = this.speedViolations.filter(v => v.timestamp > cutoffTime);
    }
  }

  // Get all active tracks
  public getActiveTracks(): VehicleTrack[] {
    return Array.from(this.tracks.values()).filter(track => track.isActive);
  }

  // Get tracks by class
  public getTracksByClass(vehicleClass: string): VehicleTrack[] {
    return this.getActiveTracks().filter(track => track.class === vehicleClass);
  }

  // Get speed violations
  public getSpeedViolations(): SpeedViolation[] {
    return [...this.speedViolations];
  }

  // Get traffic statistics
  public getTrafficStats(): {
    totalTracks: number;
    activeTracks: number;
    averageSpeed: number;
    speedViolations: number;
    vehicleCounts: { [key: string]: number };
  } {
    const activeTracks = this.getActiveTracks();
    const speeds = activeTracks.map(track => track.speed).filter(speed => speed > 0);
    
    const vehicleCounts: { [key: string]: number } = {};
    activeTracks.forEach(track => {
      vehicleCounts[track.class] = (vehicleCounts[track.class] || 0) + 1;
    });

    return {
      totalTracks: this.tracks.size,
      activeTracks: activeTracks.length,
      averageSpeed: speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0,
      speedViolations: this.speedViolations.length,
      vehicleCounts
    };
  }

  // Set speed limit
  public setSpeedLimit(limit: number): void {
    this.speedLimit = limit;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset tracker
  public reset(): void {
    this.tracks.clear();
    this.speedViolations = [];
  }

  // Get track by ID
  public getTrack(trackId: string): VehicleTrack | undefined {
    return this.tracks.get(trackId);
  }

  // Remove track
  public removeTrack(trackId: string): boolean {
    return this.tracks.delete(trackId);
  }
}

// Factory function to create vehicle tracker
export function createVehicleTracker(config?: Partial<TrackingConfig>): VehicleTracker {
  const defaultConfig: TrackingConfig = {
    maxTrackAge: 5000, // 5 seconds
    minTrackLength: 3,
    speedCalculationWindow: 5,
    directionThreshold: 10,
    confidenceThreshold: 0.5,
    maxDistance: 100
  };

  return new VehicleTracker({ ...defaultConfig, ...config });
}
