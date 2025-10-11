// Dynamic Traffic Signal Control Service
// Implements intelligent signal timing based on real-time vehicle density and traffic patterns

export interface VehicleDensity {
  north: number;
  south: number;
  east: number;
  west: number;
  total: number;
}

export interface SignalTiming {
  phase: 'north-south' | 'east-west';
  duration: number; // in seconds
  priority: number; // 0-1, higher means more urgent
  reason: string; // explanation for the timing decision
}

export interface TrafficConditions {
  density: VehicleDensity;
  waitingTimes: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  queueLengths: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  averageSpeed: number;
  congestionLevel: number;
}

export interface SignalControlConfig {
  minGreenTime: number; // minimum green time in seconds
  maxGreenTime: number; // maximum green time in seconds
  yellowTime: number; // yellow light duration
  densityThreshold: number; // minimum vehicles to consider for timing
  waitingTimeThreshold: number; // maximum acceptable waiting time
  emergencyOverride: boolean; // enable emergency vehicle priority
}

export class DynamicSignalController {
  private config: SignalControlConfig;
  private currentPhase: 'north-south' | 'east-west' = 'north-south';
  private phaseStartTime: number = 0;
  private lastDensity: VehicleDensity | null = null;
  private densityHistory: VehicleDensity[] = [];
  private maxHistorySize = 10;

  constructor(config: SignalControlConfig) {
    this.config = config;
  }

  // Calculate optimal signal timing based on current traffic conditions
  public calculateOptimalTiming(conditions: TrafficConditions): SignalTiming {
    const density = conditions.density;
    const waitingTimes = conditions.waitingTimes;
    const queueLengths = conditions.queueLengths;

    // Store density history for trend analysis
    this.densityHistory.push({ ...density });
    if (this.densityHistory.length > this.maxHistorySize) {
      this.densityHistory.shift();
    }

    // Calculate density scores for each direction
    const densityScores = this.calculateDensityScores(density);
    const waitingScores = this.calculateWaitingScores(waitingTimes);
    const queueScores = this.calculateQueueScores(queueLengths);
    const trendScores = this.calculateTrendScores();

    // Combine scores with weights
    const northSouthScore = this.combineScores(
      densityScores.north + densityScores.south,
      waitingScores.north + waitingScores.south,
      queueScores.north + queueScores.south,
      trendScores.north + trendScores.south
    );

    const eastWestScore = this.combineScores(
      densityScores.east + densityScores.west,
      waitingScores.east + waitingScores.west,
      queueScores.east + queueScores.west,
      trendScores.east + trendScores.west
    );

    // Determine if phase should switch
    const shouldSwitch = this.shouldSwitchPhase(
      northSouthScore,
      eastWestScore,
      conditions
    );

    let newPhase: 'north-south' | 'east-west';
    let duration: number;
    let priority: number;
    let reason: string;

    if (shouldSwitch) {
      // Switch to the direction with higher score
      if (eastWestScore > northSouthScore) {
        newPhase = 'east-west';
        priority = eastWestScore;
        reason = `High east-west traffic density (${density.east + density.west} vehicles)`;
      } else {
        newPhase = 'north-south';
        priority = northSouthScore;
        reason = `High north-south traffic density (${density.north + density.south} vehicles)`;
      }

      // Calculate duration based on traffic volume
      duration = this.calculatePhaseDuration(newPhase, conditions);
    } else {
      // Extend current phase
      newPhase = this.currentPhase;
      duration = this.calculatePhaseExtension(conditions);
      priority = newPhase === 'north-south' ? northSouthScore : eastWestScore;
      reason = `Extending ${newPhase} phase due to ongoing traffic`;
    }

    // Apply emergency override if needed
    if (this.config.emergencyOverride) {
      const emergencyResult = this.checkEmergencyOverride(conditions);
      if (emergencyResult) {
        newPhase = emergencyResult.phase;
        duration = emergencyResult.duration;
        priority = 1.0;
        reason = emergencyResult.reason;
      }
    }

    // Ensure duration is within bounds
    duration = Math.max(
      this.config.minGreenTime,
      Math.min(duration, this.config.maxGreenTime)
    );

    this.currentPhase = newPhase;
    this.phaseStartTime = Date.now();

    return {
      phase: newPhase,
      duration,
      priority,
      reason
    };
  }

  // Calculate density scores for each direction
  private calculateDensityScores(density: VehicleDensity): { north: number; south: number; east: number; west: number } {
    const maxDensity = Math.max(density.north, density.south, density.east, density.west, 1);
    
    return {
      north: density.north / maxDensity,
      south: density.south / maxDensity,
      east: density.east / maxDensity,
      west: density.west / maxDensity
    };
  }

  // Calculate waiting time scores
  private calculateWaitingScores(waitingTimes: { north: number; south: number; east: number; west: number }): { north: number; south: number; east: number; west: number } {
    const maxWaitingTime = Math.max(waitingTimes.north, waitingTimes.south, waitingTimes.east, waitingTimes.west, 1);
    
    return {
      north: waitingTimes.north / maxWaitingTime,
      south: waitingTimes.south / maxWaitingTime,
      east: waitingTimes.east / maxWaitingTime,
      west: waitingTimes.west / maxWaitingTime
    };
  }

  // Calculate queue length scores
  private calculateQueueScores(queueLengths: { north: number; south: number; east: number; west: number }): { north: number; south: number; east: number; west: number } {
    const maxQueueLength = Math.max(queueLengths.north, queueLengths.south, queueLengths.east, queueLengths.west, 1);
    
    return {
      north: queueLengths.north / maxQueueLength,
      south: queueLengths.south / maxQueueLength,
      east: queueLengths.east / maxQueueLength,
      west: queueLengths.west / maxQueueLength
    };
  }

  // Calculate trend scores based on density history
  private calculateTrendScores(): { north: number; south: number; east: number; west: number } {
    if (this.densityHistory.length < 2) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    const recent = this.densityHistory[this.densityHistory.length - 1];
    const previous = this.densityHistory[this.densityHistory.length - 2];

    return {
      north: Math.max(0, recent.north - previous.north),
      south: Math.max(0, recent.south - previous.south),
      east: Math.max(0, recent.east - previous.east),
      west: Math.max(0, recent.west - previous.west)
    };
  }

  // Combine different scores with weights
  private combineScores(densityScore: number, waitingScore: number, queueScore: number, trendScore: number): number {
    return (
      densityScore * 0.4 +      // 40% weight on current density
      waitingScore * 0.3 +      // 30% weight on waiting times
      queueScore * 0.2 +        // 20% weight on queue lengths
      trendScore * 0.1          // 10% weight on trend
    );
  }

  // Determine if phase should switch
  private shouldSwitchPhase(
    northSouthScore: number,
    eastWestScore: number,
    conditions: TrafficConditions
  ): boolean {
    const currentPhaseScore = this.currentPhase === 'north-south' ? northSouthScore : eastWestScore;
    const otherPhaseScore = this.currentPhase === 'north-south' ? eastWestScore : northSouthScore;

    // Don't switch if current phase is still busy
    if (currentPhaseScore > 0.6) {
      return false;
    }

    // Switch if other phase is significantly more urgent
    if (otherPhaseScore > currentPhaseScore + 0.3) {
      return true;
    }

    // Switch if other phase has been waiting too long
    const maxWaitingTime = this.currentPhase === 'north-south' 
      ? Math.max(conditions.waitingTimes.east, conditions.waitingTimes.west)
      : Math.max(conditions.waitingTimes.north, conditions.waitingTimes.south);

    if (maxWaitingTime > this.config.waitingTimeThreshold) {
      return true;
    }

    // Switch if current phase has been active too long
    const phaseDuration = (Date.now() - this.phaseStartTime) / 1000;
    if (phaseDuration > this.config.maxGreenTime) {
      return true;
    }

    return false;
  }

  // Calculate phase duration based on traffic volume
  private calculatePhaseDuration(phase: 'north-south' | 'east-west', conditions: TrafficConditions): number {
    const density = conditions.density;
    const congestionLevel = conditions.congestionLevel;

    let baseDuration = this.config.minGreenTime;
    
    if (phase === 'north-south') {
      const vehicleCount = density.north + density.south;
      baseDuration += vehicleCount * 2; // 2 seconds per vehicle
    } else {
      const vehicleCount = density.east + density.west;
      baseDuration += vehicleCount * 2; // 2 seconds per vehicle
    }

    // Adjust for congestion
    if (congestionLevel > 70) {
      baseDuration *= 1.5; // Extend green time in high congestion
    } else if (congestionLevel < 30) {
      baseDuration *= 0.8; // Reduce green time in low congestion
    }

    return Math.min(baseDuration, this.config.maxGreenTime);
  }

  // Calculate phase extension duration
  private calculatePhaseExtension(conditions: TrafficConditions): number {
    const density = conditions.density;
    const waitingTimes = conditions.waitingTimes;
    
    let extension = 0;

    if (this.currentPhase === 'north-south') {
      const vehicleCount = density.north + density.south;
      const waitingTime = Math.max(waitingTimes.north, waitingTimes.south);
      
      if (vehicleCount > 3) {
        extension += 5; // 5 seconds for each group of 3 vehicles
      }
      
      if (waitingTime > 10) {
        extension += 3; // 3 seconds for high waiting time
      }
    } else {
      const vehicleCount = density.east + density.west;
      const waitingTime = Math.max(waitingTimes.east, waitingTimes.west);
      
      if (vehicleCount > 3) {
        extension += 5; // 5 seconds for each group of 3 vehicles
      }
      
      if (waitingTime > 10) {
        extension += 3; // 3 seconds for high waiting time
      }
    }

    return Math.min(extension, this.config.maxGreenTime - this.config.minGreenTime);
  }

  // Check for emergency vehicle override
  private checkEmergencyOverride(conditions: TrafficConditions): { phase: 'north-south' | 'east-west'; duration: number; reason: string } | null {
    // This would integrate with emergency vehicle detection
    // For now, return null (no emergency)
    return null;
  }

  // Get current phase
  public getCurrentPhase(): 'north-south' | 'east-west' {
    return this.currentPhase;
  }

  // Get phase duration
  public getPhaseDuration(): number {
    return (Date.now() - this.phaseStartTime) / 1000;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<SignalControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  public getConfig(): SignalControlConfig {
    return { ...this.config };
  }

  // Reset controller state
  public reset(): void {
    this.currentPhase = 'north-south';
    this.phaseStartTime = Date.now();
    this.lastDensity = null;
    this.densityHistory = [];
  }
}

// Factory function to create dynamic signal controller
export function createDynamicSignalController(config?: Partial<SignalControlConfig>): DynamicSignalController {
  const defaultConfig: SignalControlConfig = {
    minGreenTime: 10,
    maxGreenTime: 60,
    yellowTime: 3,
    densityThreshold: 1,
    waitingTimeThreshold: 15,
    emergencyOverride: true
  };

  return new DynamicSignalController({ ...defaultConfig, ...config });
}
