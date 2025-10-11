// Multi-Intersection Coordination Service
// Coordinates traffic signals across multiple intersections for optimal city-wide traffic flow

export interface IntersectionNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  currentPhase: 'north-south' | 'east-west';
  phaseTimer: number;
  vehicleCount: number;
  congestionLevel: number;
  connectedIntersections: string[];
  signalState: {
    north: 'red' | 'yellow' | 'green';
    south: 'red' | 'yellow' | 'green';
    east: 'red' | 'yellow' | 'green';
    west: 'red' | 'yellow' | 'green';
  };
  averageWaitTime: number;
  throughput: number;
}

export interface TrafficWave {
  sourceIntersection: string;
  targetIntersection: string;
  vehicleCount: number;
  estimatedArrivalTime: number;
  speed: number;
}

export interface CoordinationStrategy {
  type: 'green_wave' | 'adaptive_offset' | 'distributed_control' | 'predictive';
  description: string;
  efficiency: number;
}

export interface NetworkMetrics {
  totalVehicles: number;
  averageWaitTime: number;
  networkThroughput: number;
  congestionHotspots: string[];
  coordinationEfficiency: number;
  co2Reduction: number;
}

export class MultiIntersectionCoordinator {
  private intersections: Map<string, IntersectionNode> = new Map();
  private trafficWaves: TrafficWave[] = [];
  private currentStrategy: CoordinationStrategy;
  private updateInterval: number = 1000; // 1 second

  constructor() {
    this.currentStrategy = {
      type: 'adaptive_offset',
      description: 'Adaptive offset coordination based on real-time traffic',
      efficiency: 0
    };
  }

  /**
   * Add an intersection to the coordination network
   */
  public addIntersection(intersection: IntersectionNode): void {
    this.intersections.set(intersection.id, intersection);
  }

  /**
   * Remove an intersection from the coordination network
   */
  public removeIntersection(id: string): void {
    this.intersections.delete(id);
  }

  /**
   * Update intersection state
   */
  public updateIntersection(id: string, updates: Partial<IntersectionNode>): void {
    const intersection = this.intersections.get(id);
    if (intersection) {
      Object.assign(intersection, updates);
    }
  }

  /**
   * Calculate optimal phase offsets for green wave coordination
   * Green wave allows vehicles to pass through multiple intersections without stopping
   */
  public calculateGreenWaveOffsets(): Map<string, number> {
    const offsets = new Map<string, number>();
    const intersectionArray = Array.from(this.intersections.values());

    // Sort intersections by position (left to right, top to bottom)
    intersectionArray.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    // Calculate average travel time between intersections
    const averageSpeed = 40; // km/h
    const baseOffset = 0;

    for (let i = 0; i < intersectionArray.length; i++) {
      if (i === 0) {
        offsets.set(intersectionArray[i].id, baseOffset);
      } else {
        const prev = intersectionArray[i - 1];
        const current = intersectionArray[i];
        
        // Calculate distance between intersections
        const distance = Math.sqrt(
          Math.pow(current.position.x - prev.position.x, 2) +
          Math.pow(current.position.y - prev.position.y, 2)
        );

        // Convert distance to travel time (in seconds)
        const travelTime = (distance / 100) * (3600 / averageSpeed);
        
        // Calculate offset to create green wave
        const offset = (offsets.get(prev.id) || 0) + travelTime;
        offsets.set(current.id, offset % 60); // Wrap around 60 seconds
      }
    }

    return offsets;
  }

  /**
   * Predict traffic waves between intersections
   */
  public predictTrafficWaves(): TrafficWave[] {
    const waves: TrafficWave[] = [];

    this.intersections.forEach(intersection => {
      intersection.connectedIntersections.forEach(connectedId => {
        const connected = this.intersections.get(connectedId);
        if (connected) {
          // Estimate vehicles moving from one intersection to another
          const vehicleCount = Math.floor(intersection.vehicleCount * 0.3); // 30% move to next intersection
          
          if (vehicleCount > 0) {
            const distance = Math.sqrt(
              Math.pow(connected.position.x - intersection.position.x, 2) +
              Math.pow(connected.position.y - intersection.position.y, 2)
            );

            const speed = 40; // km/h
            const arrivalTime = (distance / 100) * (3600 / speed); // in seconds

            waves.push({
              sourceIntersection: intersection.id,
              targetIntersection: connectedId,
              vehicleCount,
              estimatedArrivalTime: Date.now() + arrivalTime * 1000,
              speed
            });
          }
        }
      });
    });

    this.trafficWaves = waves;
    return waves;
  }

  /**
   * Adaptive offset coordination - adjusts signal timing based on real-time conditions
   */
  public adaptiveOffsetCoordination(): void {
    const offsets = this.calculateGreenWaveOffsets();
    
    this.intersections.forEach((intersection, id) => {
      const offset = offsets.get(id) || 0;
      const congestionFactor = intersection.congestionLevel / 100;
      
      // Adjust phase duration based on congestion
      let phaseDuration = 30; // base duration
      if (congestionFactor > 0.7) {
        phaseDuration = 40; // extend green time
      } else if (congestionFactor < 0.3) {
        phaseDuration = 25; // reduce green time
      }

      // Apply offset to synchronize with network
      const adjustedTimer = (intersection.phaseTimer + offset) % phaseDuration;
      
      this.updateIntersection(id, {
        phaseTimer: adjustedTimer
      });
    });
  }

  /**
   * Distributed control - each intersection makes decisions based on neighbors
   */
  public distributedControl(): void {
    this.intersections.forEach((intersection, id) => {
      // Get state of connected intersections
      const neighborStates = intersection.connectedIntersections.map(connectedId => {
        const neighbor = this.intersections.get(connectedId);
        return neighbor ? {
          congestion: neighbor.congestionLevel,
          phase: neighbor.currentPhase,
          waitTime: neighbor.averageWaitTime
        } : null;
      }).filter(Boolean);

      // Calculate optimal phase based on neighbors
      const avgNeighborCongestion = neighborStates.reduce((sum, n) => sum + (n?.congestion || 0), 0) / neighborStates.length;
      
      // If neighbors are congested, adjust this intersection's timing
      if (avgNeighborCongestion > 60) {
        // Prioritize clearing traffic to congested neighbors
        const shouldSwitchPhase = intersection.phaseTimer > 20;
        if (shouldSwitchPhase) {
          const newPhase: 'north-south' | 'east-west' = 
            intersection.currentPhase === 'north-south' ? 'east-west' : 'north-south';
          
          this.updateIntersection(id, {
            currentPhase: newPhase,
            phaseTimer: 0
          });
        }
      }
    });
  }

  /**
   * Predictive coordination - uses traffic wave predictions
   */
  public predictiveCoordination(): void {
    const waves = this.predictTrafficWaves();
    
    waves.forEach(wave => {
      const targetIntersection = this.intersections.get(wave.targetIntersection);
      if (targetIntersection) {
        const timeUntilArrival = (wave.estimatedArrivalTime - Date.now()) / 1000;
        
        // If vehicles arriving soon, prepare green light
        if (timeUntilArrival < 10 && timeUntilArrival > 0) {
          // Determine which phase should be green for incoming vehicles
          const sourceIntersection = this.intersections.get(wave.sourceIntersection);
          if (sourceIntersection) {
            const dx = targetIntersection.position.x - sourceIntersection.position.x;
            const dy = targetIntersection.position.y - sourceIntersection.position.y;
            
            const requiredPhase: 'north-south' | 'east-west' = 
              Math.abs(dx) > Math.abs(dy) ? 'east-west' : 'north-south';
            
            // Switch to required phase if not already
            if (targetIntersection.currentPhase !== requiredPhase) {
              this.updateIntersection(wave.targetIntersection, {
                currentPhase: requiredPhase,
                phaseTimer: 0
              });
            }
          }
        }
      }
    });
  }

  /**
   * Calculate network-wide metrics
   */
  public calculateNetworkMetrics(): NetworkMetrics {
    const intersectionArray = Array.from(this.intersections.values());
    
    const totalVehicles = intersectionArray.reduce((sum, i) => sum + i.vehicleCount, 0);
    const averageWaitTime = intersectionArray.reduce((sum, i) => sum + i.averageWaitTime, 0) / intersectionArray.length;
    const networkThroughput = intersectionArray.reduce((sum, i) => sum + i.throughput, 0);
    
    // Find congestion hotspots (intersections with >70% congestion)
    const congestionHotspots = intersectionArray
      .filter(i => i.congestionLevel > 70)
      .map(i => i.name);
    
    // Calculate coordination efficiency (0-100%)
    const avgCongestion = intersectionArray.reduce((sum, i) => sum + i.congestionLevel, 0) / intersectionArray.length;
    const coordinationEfficiency = Math.max(0, 100 - avgCongestion);
    
    // Estimate CO2 reduction from coordination (compared to uncoordinated system)
    const baselineCO2 = totalVehicles * 0.2; // kg per vehicle without coordination
    const optimizedCO2 = baselineCO2 * (1 - coordinationEfficiency / 100);
    const co2Reduction = ((baselineCO2 - optimizedCO2) / baselineCO2) * 100;
    
    return {
      totalVehicles,
      averageWaitTime,
      networkThroughput,
      congestionHotspots,
      coordinationEfficiency,
      co2Reduction
    };
  }

  /**
   * Execute coordination strategy
   */
  public executeStrategy(): void {
    switch (this.currentStrategy.type) {
      case 'green_wave':
        this.calculateGreenWaveOffsets();
        break;
      case 'adaptive_offset':
        this.adaptiveOffsetCoordination();
        break;
      case 'distributed_control':
        this.distributedControl();
        break;
      case 'predictive':
        this.predictiveCoordination();
        break;
    }

    // Update strategy efficiency
    const metrics = this.calculateNetworkMetrics();
    this.currentStrategy.efficiency = metrics.coordinationEfficiency;
  }

  /**
   * Set coordination strategy
   */
  public setStrategy(strategy: CoordinationStrategy): void {
    this.currentStrategy = strategy;
  }

  /**
   * Get current strategy
   */
  public getStrategy(): CoordinationStrategy {
    return this.currentStrategy;
  }

  /**
   * Get all intersections
   */
  public getIntersections(): IntersectionNode[] {
    return Array.from(this.intersections.values());
  }

  /**
   * Get traffic waves
   */
  public getTrafficWaves(): TrafficWave[] {
    return this.trafficWaves;
  }

  /**
   * Initialize a grid of intersections for testing
   */
  public initializeGrid(rows: number, cols: number): void {
    this.intersections.clear();
    
    const spacing = 200;
    const startX = 100;
    const startY = 100;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = `intersection-${row}-${col}`;
        const connectedIntersections: string[] = [];
        
        // Connect to adjacent intersections
        if (col > 0) connectedIntersections.push(`intersection-${row}-${col - 1}`); // left
        if (col < cols - 1) connectedIntersections.push(`intersection-${row}-${col + 1}`); // right
        if (row > 0) connectedIntersections.push(`intersection-${row - 1}-${col}`); // top
        if (row < rows - 1) connectedIntersections.push(`intersection-${row + 1}-${col}`); // bottom
        
        const intersection: IntersectionNode = {
          id,
          name: `Int ${row + 1}-${col + 1}`,
          position: { x: startX + col * spacing, y: startY + row * spacing },
          currentPhase: Math.random() > 0.5 ? 'north-south' : 'east-west',
          phaseTimer: Math.floor(Math.random() * 30),
          vehicleCount: Math.floor(Math.random() * 20) + 5,
          congestionLevel: Math.floor(Math.random() * 80) + 20,
          connectedIntersections,
          signalState: {
            north: 'red',
            south: 'red',
            east: 'green',
            west: 'green'
          },
          averageWaitTime: Math.floor(Math.random() * 30) + 10,
          throughput: Math.floor(Math.random() * 50) + 20
        };
        
        this.addIntersection(intersection);
      }
    }
  }
}

/**
 * Factory function to create multi-intersection coordinator
 */
export function createMultiIntersectionCoordinator(): MultiIntersectionCoordinator {
  return new MultiIntersectionCoordinator();
}
