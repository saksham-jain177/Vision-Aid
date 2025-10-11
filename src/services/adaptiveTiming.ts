// Adaptive Signal Timing Service
// Implements intelligent signal timing based on historical traffic patterns and real-time conditions

export interface TrafficPattern {
  timeOfDay: number; // 0-23 hours
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  averageFlow: number; // vehicles per minute
  peakFlow: number; // maximum flow rate
  congestionLevel: number; // 0-100%
  optimalTimings: {
    northSouth: number; // seconds
    eastWest: number; // seconds
  };
  confidence: number; // 0-1, how reliable this pattern is
}

export interface TimingAdjustment {
  phase: 'north-south' | 'east-west';
  adjustment: number; // percentage change (-50 to +50)
  reason: string;
  confidence: number;
  duration: number; // how long to apply this adjustment
}

export interface AdaptiveTimingConfig {
  learningRate: number; // how quickly to adapt to new patterns
  historyWeight: number; // weight of historical data vs current data
  minGreenTime: number; // minimum green time in seconds
  maxGreenTime: number; // maximum green time in seconds
  patternMemoryDays: number; // how many days of patterns to remember
  adaptationThreshold: number; // minimum change needed to adjust timing
}

export class AdaptiveTimingSystem {
  private patterns: Map<string, TrafficPattern> = new Map();
  private currentTimings: { northSouth: number; eastWest: number } = { northSouth: 20, eastWest: 20 };
  private config: AdaptiveTimingConfig;
  private performanceHistory: Array<{
    timestamp: number;
    timing: { northSouth: number; eastWest: number };
    performance: number; // 0-100, higher is better
    conditions: {
      flow: number;
      congestion: number;
      waitingTime: number;
    };
  }> = [];

  constructor(config: AdaptiveTimingConfig) {
    this.config = config;
    this.initializeDefaultPatterns();
  }

  // Initialize default traffic patterns
  private initializeDefaultPatterns(): void {
    // Rush hour patterns (7-9 AM, 5-7 PM)
    for (let hour = 7; hour <= 9; hour++) {
      this.patterns.set(`weekday-${hour}`, {
        timeOfDay: hour,
        dayOfWeek: 1, // Monday
        averageFlow: 15 + Math.random() * 5,
        peakFlow: 25 + Math.random() * 10,
        congestionLevel: 60 + Math.random() * 30,
        optimalTimings: { northSouth: 30, eastWest: 30 },
        confidence: 0.8
      });
    }

    for (let hour = 17; hour <= 19; hour++) {
      this.patterns.set(`weekday-${hour}`, {
        timeOfDay: hour,
        dayOfWeek: 1, // Monday
        averageFlow: 18 + Math.random() * 7,
        peakFlow: 30 + Math.random() * 15,
        congestionLevel: 70 + Math.random() * 25,
        optimalTimings: { northSouth: 35, eastWest: 35 },
        confidence: 0.9
      });
    }

    // Off-peak patterns
    for (let hour = 0; hour < 24; hour++) {
      if (hour < 7 || hour > 19) {
        this.patterns.set(`weekday-${hour}`, {
          timeOfDay: hour,
          dayOfWeek: 1,
          averageFlow: 3 + Math.random() * 5,
          peakFlow: 8 + Math.random() * 7,
          congestionLevel: 10 + Math.random() * 20,
          optimalTimings: { northSouth: 15, eastWest: 15 },
          confidence: 0.6
        });
      }
    }

    // Weekend patterns
    for (let day = 0; day <= 6; day += 6) { // Sunday and Saturday
      for (let hour = 0; hour < 24; hour++) {
        this.patterns.set(`weekend-${day}-${hour}`, {
          timeOfDay: hour,
          dayOfWeek: day,
          averageFlow: 2 + Math.random() * 4,
          peakFlow: 6 + Math.random() * 6,
          congestionLevel: 5 + Math.random() * 15,
          optimalTimings: { northSouth: 12, eastWest: 12 },
          confidence: 0.5
        });
      }
    }
  }

  // Calculate optimal timing based on current conditions
  public calculateOptimalTiming(
    currentConditions: {
      timeOfDay: number;
      dayOfWeek: number;
      flowRate: number;
      congestionLevel: number;
      waitingTime: number;
      vehicleCounts: { north: number; south: number; east: number; west: number };
    }
  ): TimingAdjustment[] {
    const adjustments: TimingAdjustment[] = [];
    
    // Get current pattern
    const currentPattern = this.getCurrentPattern(currentConditions);
    
    // Calculate base timing from pattern
    const baseTiming = this.calculateBaseTiming(currentPattern, currentConditions);
    
    // Apply real-time adjustments
    const realTimeAdjustments = this.calculateRealTimeAdjustments(currentConditions);
    
    // Combine pattern-based and real-time adjustments
    const finalTimings = this.combineAdjustments(baseTiming, realTimeAdjustments);
    
    // Generate adjustments for each phase
    if (Math.abs(finalTimings.northSouth - this.currentTimings.northSouth) > this.config.adaptationThreshold) {
      adjustments.push({
        phase: 'north-south',
        adjustment: ((finalTimings.northSouth - this.currentTimings.northSouth) / this.currentTimings.northSouth) * 100,
        reason: this.generateAdjustmentReason('north-south', finalTimings.northSouth, currentConditions),
        confidence: currentPattern.confidence,
        duration: this.calculateAdjustmentDuration(currentConditions)
      });
    }
    
    if (Math.abs(finalTimings.eastWest - this.currentTimings.eastWest) > this.config.adaptationThreshold) {
      adjustments.push({
        phase: 'east-west',
        adjustment: ((finalTimings.eastWest - this.currentTimings.eastWest) / this.currentTimings.eastWest) * 100,
        reason: this.generateAdjustmentReason('east-west', finalTimings.eastWest, currentConditions),
        confidence: currentPattern.confidence,
        duration: this.calculateAdjustmentDuration(currentConditions)
      });
    }
    
    // Update current timings
    this.currentTimings = finalTimings;
    
    return adjustments;
  }

  // Get current traffic pattern
  private getCurrentPattern(conditions: any): TrafficPattern {
    const key = conditions.dayOfWeek === 0 || conditions.dayOfWeek === 6 
      ? `weekend-${conditions.dayOfWeek}-${conditions.timeOfDay}`
      : `weekday-${conditions.timeOfDay}`;
    
    return this.patterns.get(key) || this.getDefaultPattern(conditions);
  }

  // Get default pattern for unknown conditions
  private getDefaultPattern(conditions: any): TrafficPattern {
    return {
      timeOfDay: conditions.timeOfDay,
      dayOfWeek: conditions.dayOfWeek,
      averageFlow: conditions.flowRate,
      peakFlow: conditions.flowRate * 1.5,
      congestionLevel: conditions.congestionLevel,
      optimalTimings: { northSouth: 20, eastWest: 20 },
      confidence: 0.3
    };
  }

  // Calculate base timing from pattern
  private calculateBaseTiming(pattern: TrafficPattern, conditions: any): { northSouth: number; eastWest: number } {
    let northSouth = pattern.optimalTimings.northSouth;
    let eastWest = pattern.optimalTimings.eastWest;
    
    // Adjust based on current flow vs pattern flow
    const flowRatio = conditions.flowRate / pattern.averageFlow;
    if (flowRatio > 1.2) {
      // Higher flow than pattern - increase timing
      northSouth *= 1.2;
      eastWest *= 1.2;
    } else if (flowRatio < 0.8) {
      // Lower flow than pattern - decrease timing
      northSouth *= 0.8;
      eastWest *= 0.8;
    }
    
    // Adjust based on congestion level
    if (conditions.congestionLevel > 70) {
      northSouth *= 1.3;
      eastWest *= 1.3;
    } else if (conditions.congestionLevel < 30) {
      northSouth *= 0.9;
      eastWest *= 0.9;
    }
    
    // Ensure within bounds
    northSouth = Math.max(this.config.minGreenTime, Math.min(northSouth, this.config.maxGreenTime));
    eastWest = Math.max(this.config.minGreenTime, Math.min(eastWest, this.config.maxGreenTime));
    
    return { northSouth, eastWest };
  }

  // Calculate real-time adjustments
  private calculateRealTimeAdjustments(conditions: any): { northSouth: number; eastWest: number } {
    const adjustments = { northSouth: 0, eastWest: 0 };
    
    // Adjust based on vehicle distribution
    const totalVehicles = conditions.vehicleCounts.north + conditions.vehicleCounts.south + 
                         conditions.vehicleCounts.east + conditions.vehicleCounts.west;
    
    if (totalVehicles > 0) {
      const northSouthRatio = (conditions.vehicleCounts.north + conditions.vehicleCounts.south) / totalVehicles;
      const eastWestRatio = (conditions.vehicleCounts.east + conditions.vehicleCounts.west) / totalVehicles;
      
      if (northSouthRatio > 0.6) {
        adjustments.northSouth = 0.2; // Increase north-south timing
        adjustments.eastWest = -0.1; // Decrease east-west timing
      } else if (eastWestRatio > 0.6) {
        adjustments.northSouth = -0.1; // Decrease north-south timing
        adjustments.eastWest = 0.2; // Increase east-west timing
      }
    }
    
    // Adjust based on waiting time
    if (conditions.waitingTime > 20) {
      adjustments.northSouth += 0.15;
      adjustments.eastWest += 0.15;
    } else if (conditions.waitingTime < 5) {
      adjustments.northSouth -= 0.1;
      adjustments.eastWest -= 0.1;
    }
    
    return adjustments;
  }

  // Combine pattern-based and real-time adjustments
  private combineAdjustments(
    baseTiming: { northSouth: number; eastWest: number },
    adjustments: { northSouth: number; eastWest: number }
  ): { northSouth: number; eastWest: number } {
    return {
      northSouth: baseTiming.northSouth * (1 + adjustments.northSouth),
      eastWest: baseTiming.eastWest * (1 + adjustments.eastWest)
    };
  }

  // Generate adjustment reason
  private generateAdjustmentReason(
    phase: string, 
    newTiming: number, 
    conditions: any
  ): string {
    const reasons = [];
    
    if (conditions.congestionLevel > 70) {
      reasons.push('high congestion');
    }
    if (conditions.waitingTime > 15) {
      reasons.push('long waiting times');
    }
    if (conditions.flowRate > 20) {
      reasons.push('high traffic flow');
    }
    
    const timeOfDay = conditions.timeOfDay;
    if (timeOfDay >= 7 && timeOfDay <= 9) {
      reasons.push('morning rush hour');
    } else if (timeOfDay >= 17 && timeOfDay <= 19) {
      reasons.push('evening rush hour');
    }
    
    return reasons.length > 0 
      ? `Adjusting ${phase} timing due to ${reasons.join(', ')}`
      : `Optimizing ${phase} timing for current conditions`;
  }

  // Calculate adjustment duration
  private calculateAdjustmentDuration(conditions: any): number {
    // Base duration of 5 minutes
    let duration = 5;
    
    // Extend duration for rush hours
    const timeOfDay = conditions.timeOfDay;
    if ((timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19)) {
      duration = 10;
    }
    
    // Extend duration for high congestion
    if (conditions.congestionLevel > 70) {
      duration += 5;
    }
    
    return duration;
  }

  // Learn from performance feedback
  public learnFromPerformance(
    timing: { northSouth: number; eastWest: number },
    performance: number,
    conditions: {
      flow: number;
      congestion: number;
      waitingTime: number;
    }
  ): void {
    // Store performance data
    this.performanceHistory.push({
      timestamp: Date.now(),
      timing: { ...timing },
      performance,
      conditions: { ...conditions }
    });
    
    // Keep only recent history
    const cutoffTime = Date.now() - (this.config.patternMemoryDays * 24 * 60 * 60 * 1000);
    this.performanceHistory = this.performanceHistory.filter(h => h.timestamp > cutoffTime);
    
    // Update patterns based on performance
    this.updatePatternsFromPerformance();
  }

  // Update patterns based on performance history
  private updatePatternsFromPerformance(): void {
    if (this.performanceHistory.length < 10) return; // Need minimum data
    
    // Group performance data by time patterns
    const timeGroups = new Map<string, any[]>();
    
    this.performanceHistory.forEach(entry => {
      const date = new Date(entry.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = dayOfWeek === 0 || dayOfWeek === 6 
        ? `weekend-${dayOfWeek}-${hour}`
        : `weekday-${hour}`;
      
      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }
      timeGroups.get(key)!.push(entry);
    });
    
    // Update patterns based on performance
    timeGroups.forEach((entries, key) => {
      if (entries.length < 3) return; // Need minimum entries
      
      const avgPerformance = entries.reduce((sum, e) => sum + e.performance, 0) / entries.length;
      const bestEntry = entries.reduce((best, current) => 
        current.performance > best.performance ? current : best
      );
      
      if (avgPerformance > 70 && bestEntry.performance > avgPerformance + 10) {
        // Good performance, update pattern
        const pattern = this.patterns.get(key);
        if (pattern) {
          pattern.optimalTimings = { ...bestEntry.timing };
          pattern.confidence = Math.min(1.0, pattern.confidence + 0.1);
        }
      }
    });
  }

  // Get current timings
  public getCurrentTimings(): { northSouth: number; eastWest: number } {
    return { ...this.currentTimings };
  }

  // Get performance statistics
  public getPerformanceStats(): {
    averagePerformance: number;
    totalSamples: number;
    recentTrend: 'improving' | 'declining' | 'stable';
    bestTiming: { northSouth: number; eastWest: number };
  } {
    if (this.performanceHistory.length === 0) {
      return {
        averagePerformance: 0,
        totalSamples: 0,
        recentTrend: 'stable',
        bestTiming: { northSouth: 20, eastWest: 20 }
      };
    }
    
    const avgPerformance = this.performanceHistory.reduce((sum, h) => sum + h.performance, 0) / this.performanceHistory.length;
    
    // Calculate recent trend
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recent.length >= 5 && older.length >= 5) {
      const recentAvg = recent.reduce((sum, h) => sum + h.performance, 0) / recent.length;
      const olderAvg = older.reduce((sum, h) => sum + h.performance, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }
    
    // Find best timing
    const bestEntry = this.performanceHistory.reduce((best, current) => 
      current.performance > best.performance ? current : best
    );
    
    return {
      averagePerformance: avgPerformance,
      totalSamples: this.performanceHistory.length,
      recentTrend: trend,
      bestTiming: bestEntry.timing
    };
  }

  // Update configuration
  public updateConfig(newConfig: Partial<AdaptiveTimingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset system
  public reset(): void {
    this.patterns.clear();
    this.performanceHistory = [];
    this.currentTimings = { northSouth: 20, eastWest: 20 };
    this.initializeDefaultPatterns();
  }
}

// Factory function to create adaptive timing system
export function createAdaptiveTimingSystem(config?: Partial<AdaptiveTimingConfig>): AdaptiveTimingSystem {
  const defaultConfig: AdaptiveTimingConfig = {
    learningRate: 0.1,
    historyWeight: 0.7,
    minGreenTime: 10,
    maxGreenTime: 60,
    patternMemoryDays: 30,
    adaptationThreshold: 2
  };

  return new AdaptiveTimingSystem({ ...defaultConfig, ...config });
}
