// Traffic Flow Analysis Service
// Implements algorithms for traffic flow optimization and congestion management

export interface TrafficFlowData {
  timestamp: number;
  vehicleCount: number;
  averageSpeed: number;
  congestionLevel: number;
  flowRate: number; // vehicles per minute
  density: number; // vehicles per km
  throughput: number; // vehicles per hour
}

export interface IntersectionMetrics {
  id: string;
  totalVehicles: number;
  averageWaitTime: number;
  queueLength: number;
  greenTimeUtilization: number;
  efficiency: number;
  throughput: number;
}

export interface TrafficPattern {
  timeOfDay: string;
  dayOfWeek: string;
  averageFlow: number;
  peakHours: string[];
  congestionPoints: string[];
  optimalTimings: {
    [direction: string]: number;
  };
}

export class TrafficFlowAnalyzer {
  private flowHistory: TrafficFlowData[] = [];
  private maxHistorySize = 1000;
  private patterns: Map<string, TrafficPattern> = new Map();

  // Add new flow data point
  public addFlowData(data: TrafficFlowData): void {
    this.flowHistory.push(data);
    
    // Maintain history size
    if (this.flowHistory.length > this.maxHistorySize) {
      this.flowHistory.shift();
    }
  }

  // Calculate current traffic flow metrics
  public calculateFlowMetrics(
    vehicleCount: number,
    averageSpeed: number,
    roadLength: number = 1 // km
  ): TrafficFlowData {
    const timestamp = Date.now();
    const congestionLevel = this.calculateCongestionLevel(vehicleCount, averageSpeed);
    const flowRate = this.calculateFlowRate(vehicleCount);
    const density = vehicleCount / roadLength;
    const throughput = flowRate * 60; // vehicles per hour

    return {
      timestamp,
      vehicleCount,
      averageSpeed,
      congestionLevel,
      flowRate,
      density,
      throughput
    };
  }

  // Calculate congestion level (0-100%)
  private calculateCongestionLevel(vehicleCount: number, averageSpeed: number): number {
    // Congestion increases with vehicle count and decreases with speed
    const densityFactor = Math.min(vehicleCount / 50, 1); // Max at 50 vehicles
    const speedFactor = Math.max(0, (60 - averageSpeed) / 60); // Max at 0 km/h
    
    return Math.min((densityFactor + speedFactor) * 50, 100);
  }

  // Calculate flow rate (vehicles per minute)
  private calculateFlowRate(vehicleCount: number): number {
    // Simple flow rate calculation based on recent history
    if (this.flowHistory.length < 2) return vehicleCount;
    
    const recentData = this.flowHistory.slice(-5); // Last 5 data points
    const timeSpan = (recentData[recentData.length - 1].timestamp - recentData[0].timestamp) / 60000; // minutes
    
    if (timeSpan === 0) return vehicleCount;
    
    const vehicleChange = recentData[recentData.length - 1].vehicleCount - recentData[0].vehicleCount;
    return Math.max(0, vehicleChange / timeSpan);
  }

  // Analyze traffic patterns
  public analyzePatterns(): TrafficPattern[] {
    const patterns: TrafficPattern[] = [];
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = now.getHours().toString().padStart(2, '0') + ':00';

    // Group data by time periods
    const hourlyData = this.groupDataByHour();
    const dailyData = this.groupDataByDay();

    // Find peak hours
    const peakHours = this.findPeakHours(hourlyData);
    
    // Find congestion points
    const congestionPoints = this.findCongestionPoints();
    
    // Calculate optimal timings
    const optimalTimings = this.calculateOptimalTimings();

    // Create pattern for current time
    const currentPattern: TrafficPattern = {
      timeOfDay,
      dayOfWeek,
      averageFlow: this.calculateAverageFlow(),
      peakHours,
      congestionPoints,
      optimalTimings
    };

    patterns.push(currentPattern);
    this.patterns.set(`${dayOfWeek}-${timeOfDay}`, currentPattern);

    return patterns;
  }

  // Group flow data by hour
  private groupDataByHour(): Map<number, TrafficFlowData[]> {
    const hourlyData = new Map<number, TrafficFlowData[]>();
    
    this.flowHistory.forEach(data => {
      const hour = new Date(data.timestamp).getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(data);
    });

    return hourlyData;
  }

  // Group flow data by day
  private groupDataByDay(): Map<string, TrafficFlowData[]> {
    const dailyData = new Map<string, TrafficFlowData[]>();
    
    this.flowHistory.forEach(data => {
      const day = new Date(data.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      if (!dailyData.has(day)) {
        dailyData.set(day, []);
      }
      dailyData.get(day)!.push(data);
    });

    return dailyData;
  }

  // Find peak traffic hours
  private findPeakHours(hourlyData: Map<number, TrafficFlowData[]>): string[] {
    const hourlyAverages = new Map<number, number>();
    
    hourlyData.forEach((data, hour) => {
      const averageFlow = data.reduce((sum, d) => sum + d.flowRate, 0) / data.length;
      hourlyAverages.set(hour, averageFlow);
    });

    // Sort by flow rate and get top 3 hours
    const sortedHours = Array.from(hourlyAverages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);

    return sortedHours;
  }

  // Find congestion points
  private findCongestionPoints(): string[] {
    const congestionPoints: string[] = [];
    
    // Analyze recent data for high congestion
    const recentData = this.flowHistory.slice(-20);
    const highCongestionData = recentData.filter(d => d.congestionLevel > 70);
    
    if (highCongestionData.length > 5) {
      congestionPoints.push('Main Intersection');
    }
    
    if (highCongestionData.some(d => d.averageSpeed < 20)) {
      congestionPoints.push('Highway On-ramp');
    }

    return congestionPoints;
  }

  // Calculate optimal signal timings
  private calculateOptimalTimings(): { [direction: string]: number } {
    const timings: { [direction: string]: number } = {};
    
    // Analyze flow data to determine optimal green times
    const recentData = this.flowHistory.slice(-50);
    
    if (recentData.length > 0) {
      const avgCongestion = recentData.reduce((sum, d) => sum + d.congestionLevel, 0) / recentData.length;
      
      // Base timing on congestion level
      const baseTime = 20; // seconds
      const congestionMultiplier = Math.max(0.5, Math.min(2.0, avgCongestion / 50));
      
      timings['north-south'] = Math.round(baseTime * congestionMultiplier);
      timings['east-west'] = Math.round(baseTime * congestionMultiplier);
    } else {
      // Default timings
      timings['north-south'] = 20;
      timings['east-west'] = 20;
    }

    return timings;
  }

  // Calculate average flow rate
  private calculateAverageFlow(): number {
    if (this.flowHistory.length === 0) return 0;
    
    return this.flowHistory.reduce((sum, d) => sum + d.flowRate, 0) / this.flowHistory.length;
  }

  // Get traffic flow predictions
  public getPredictions(hoursAhead: number = 1): TrafficFlowData[] {
    const predictions: TrafficFlowData[] = [];
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    // Simple linear prediction based on recent trends
    const recentData = this.flowHistory.slice(-10);
    if (recentData.length < 2) return predictions;
    
    const trend = this.calculateTrend(recentData);
    
    for (let i = 1; i <= hoursAhead; i++) {
      const futureTime = now + (i * hourInMs);
      const predictedFlow = this.extrapolateFlow(recentData[recentData.length - 1], trend, i);
      
      predictions.push({
        timestamp: futureTime,
        vehicleCount: predictedFlow.vehicleCount,
        averageSpeed: predictedFlow.averageSpeed,
        congestionLevel: predictedFlow.congestionLevel,
        flowRate: predictedFlow.flowRate,
        density: predictedFlow.density,
        throughput: predictedFlow.throughput
      });
    }
    
    return predictions;
  }

  // Calculate trend from recent data
  private calculateTrend(data: TrafficFlowData[]): { vehicleCount: number; averageSpeed: number } {
    if (data.length < 2) return { vehicleCount: 0, averageSpeed: 0 };
    
    const first = data[0];
    const last = data[data.length - 1];
    const timeSpan = (last.timestamp - first.timestamp) / 60000; // minutes
    
    if (timeSpan === 0) return { vehicleCount: 0, averageSpeed: 0 };
    
    return {
      vehicleCount: (last.vehicleCount - first.vehicleCount) / timeSpan,
      averageSpeed: (last.averageSpeed - first.averageSpeed) / timeSpan
    };
  }

  // Extrapolate flow data
  private extrapolateFlow(
    baseData: TrafficFlowData, 
    trend: { vehicleCount: number; averageSpeed: number }, 
    hoursAhead: number
  ): TrafficFlowData {
    const vehicleCount = Math.max(0, baseData.vehicleCount + (trend.vehicleCount * hoursAhead * 60));
    const averageSpeed = Math.max(0, baseData.averageSpeed + (trend.averageSpeed * hoursAhead * 60));
    
    return this.calculateFlowMetrics(vehicleCount, averageSpeed);
  }

  // Get intersection efficiency metrics
  public getIntersectionMetrics(
    intersectionId: string,
    totalVehicles: number,
    averageWaitTime: number,
    queueLength: number,
    greenTimeUtilization: number
  ): IntersectionMetrics {
    const efficiency = this.calculateEfficiency(averageWaitTime, greenTimeUtilization);
    const throughput = this.calculateThroughput(totalVehicles, averageWaitTime);
    
    return {
      id: intersectionId,
      totalVehicles,
      averageWaitTime,
      queueLength,
      greenTimeUtilization,
      efficiency,
      throughput
    };
  }

  // Calculate intersection efficiency
  private calculateEfficiency(averageWaitTime: number, greenTimeUtilization: number): number {
    // Efficiency based on wait time and green time utilization
    const waitTimeScore = Math.max(0, 100 - (averageWaitTime * 2)); // Penalty for long waits
    const utilizationScore = greenTimeUtilization * 100; // Reward for good utilization
    
    return (waitTimeScore + utilizationScore) / 2;
  }

  // Calculate throughput
  private calculateThroughput(totalVehicles: number, averageWaitTime: number): number {
    // Throughput = vehicles per hour
    if (averageWaitTime === 0) return totalVehicles * 60;
    
    const cycleTime = averageWaitTime * 2; // Assume 2-phase cycle
    return (totalVehicles / cycleTime) * 3600; // vehicles per hour
  }

  // Get flow history
  public getFlowHistory(): TrafficFlowData[] {
    return [...this.flowHistory];
  }

  // Clear flow history
  public clearHistory(): void {
    this.flowHistory = [];
    this.patterns.clear();
  }

  // Get patterns
  public getPatterns(): Map<string, TrafficPattern> {
    return new Map(this.patterns);
  }
}

// Factory function to create traffic flow analyzer
export function createTrafficFlowAnalyzer(): TrafficFlowAnalyzer {
  return new TrafficFlowAnalyzer();
}
