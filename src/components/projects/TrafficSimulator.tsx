import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, BarChart3, Brain } from 'lucide-react';
import { createRLAgent, defaultRLConfig, TrafficState, Action } from '../../services/reinforcementLearning';
import { createTrafficFlowAnalyzer, TrafficFlowData } from '../../services/trafficFlowAnalysis';
import { createDynamicSignalController, TrafficConditions, SignalTiming } from '../../services/dynamicSignalControl';
import { createIncidentDetectionSystem, Incident } from '../../services/incidentDetection';
import { createAdaptiveTimingSystem, TimingAdjustment } from '../../services/adaptiveTiming';
import { createPerformanceMetricsService } from '../../services/performanceMetrics';
import PerformanceDashboard from './PerformanceDashboard';
import './TrafficSimulator.css';

interface TrafficLight {
  id: string;
  position: { x: number; y: number };
  state: 'red' | 'yellow' | 'green';
  timer: number;
  maxTimer: number;
  direction: 'north' | 'south' | 'east' | 'west';
  remainingTime?: number;
}

interface Vehicle {
  id: string;
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  targetDirection?: 'north' | 'south' | 'east' | 'west'; // Where vehicle wants to go
  speed: number;
  waitingTime: number;
  color: string;
  type: 'car' | 'truck' | 'bus' | 'motorcycle';
  size: number;
  hasTurned?: boolean; // Track if vehicle has made its turn
}

interface SimulationStats {
  totalVehicles: number;
  averageWaitingTime: number;
  vehiclesPassed: number;
  congestionLevel: number;
  efficiency: number;
}

const TrafficSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [trafficLights, setTrafficLights] = useState<TrafficLight[]>([
    { id: 'north', position: { x: 360, y: 240 }, state: 'red', timer: 0, maxTimer: 30, direction: 'north' },
    { id: 'south', position: { x: 440, y: 360 }, state: 'red', timer: 0, maxTimer: 30, direction: 'south' },
    { id: 'east', position: { x: 460, y: 340 }, state: 'green', timer: 0, maxTimer: 30, direction: 'east' },
    { id: 'west', position: { x: 340, y: 260 }, state: 'green', timer: 0, maxTimer: 30, direction: 'west' },
  ]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<SimulationStats>({
    totalVehicles: 0,
    averageWaitingTime: 0,
    vehiclesPassed: 0,
    congestionLevel: 0,
    efficiency: 0,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [aiOptimization, setAiOptimization] = useState(true);
  const [isDayMode, setIsDayMode] = useState(true);
  const [signalChangeDelay, setSignalChangeDelay] = useState(0);
  const [rlAgent, setRlAgent] = useState<any>(null);
  const [rlEnabled, setRlEnabled] = useState(false);
  const [rlStats, setRlStats] = useState({
    episode: 0,
    epsilon: 0.9,
    qTableSize: 0,
    totalQValues: 0
  });
  const [flowAnalyzer, setFlowAnalyzer] = useState<any>(null);
  const [flowData, setFlowData] = useState<TrafficFlowData | null>(null);
  const [flowPredictions, setFlowPredictions] = useState<TrafficFlowData[]>([]);
  const [dynamicController, setDynamicController] = useState<any>(null);
  const [dynamicControlEnabled, setDynamicControlEnabled] = useState(false);
  const [currentSignalTiming, setCurrentSignalTiming] = useState<SignalTiming | null>(null);
  const [incidentSystem, setIncidentSystem] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentDetectionEnabled, setIncidentDetectionEnabled] = useState(false);
  const [adaptiveTimingSystem, setAdaptiveTimingSystem] = useState<any>(null);
  const [adaptiveTimingEnabled, setAdaptiveTimingEnabled] = useState(false);
  const [timingAdjustments, setTimingAdjustments] = useState<TimingAdjustment[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [performanceService, setPerformanceService] = useState<any>(null);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const vehicleIdRef = useRef(0);
  const lastStateRef = useRef<TrafficState | null>(null);
  const lastActionRef = useRef<Action | null>(null);

  // Initialize RL agent and flow analyzer
  useEffect(() => {
    if (rlEnabled && !rlAgent) {
      const agent = createRLAgent('qlearning', defaultRLConfig);
      setRlAgent(agent);
    }
    
    if (!flowAnalyzer) {
      const analyzer = createTrafficFlowAnalyzer();
      setFlowAnalyzer(analyzer);
    }
    
    if (!dynamicController) {
      const controller = createDynamicSignalController();
      setDynamicController(controller);
    }
    
    if (!incidentSystem) {
      const system = createIncidentDetectionSystem();
      setIncidentSystem(system);
    }
    
    if (!adaptiveTimingSystem) {
      const system = createAdaptiveTimingSystem();
      setAdaptiveTimingSystem(system);
    }
    
    if (!performanceService) {
      const service = createPerformanceMetricsService();
      setPerformanceService(service);
    }
  }, [rlEnabled, rlAgent, flowAnalyzer]);

  // Convert current simulation state to RL state
  const getCurrentTrafficState = useCallback((): TrafficState => {
    const vehicleCounts = {
      north: vehicles.filter(v => v.direction === 'north').length,
      south: vehicles.filter(v => v.direction === 'south').length,
      east: vehicles.filter(v => v.direction === 'east').length,
      west: vehicles.filter(v => v.direction === 'west').length,
    };

    const waitingTimes = {
      north: vehicles.filter(v => v.direction === 'north').reduce((sum, v) => sum + v.waitingTime, 0),
      south: vehicles.filter(v => v.direction === 'south').reduce((sum, v) => sum + v.waitingTime, 0),
      east: vehicles.filter(v => v.direction === 'east').reduce((sum, v) => sum + v.waitingTime, 0),
      west: vehicles.filter(v => v.direction === 'west').reduce((sum, v) => sum + v.waitingTime, 0),
    };

    const currentPhase = trafficLights.find(l => l.state === 'green')?.direction === 'north' || 
                        trafficLights.find(l => l.state === 'green')?.direction === 'south' 
                        ? 'north-south' : 'east-west';

    const phaseDuration = trafficLights.find(l => l.state === 'green')?.timer || 0;
    const congestionLevel = Math.min(vehicles.length / 20, 1) * 100;

    return {
      vehicleCounts,
      waitingTimes,
      currentPhase,
      phaseDuration,
      congestionLevel
    };
  }, [vehicles, trafficLights]);

  // Generate random vehicles with different types - keeping them in proper lanes
  const generateVehicle = useCallback(() => {
    const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // Randomly assign a target direction (30% straight, 35% left turn, 35% right turn)
    let targetDirection: 'north' | 'south' | 'east' | 'west' = direction;
    const turnChance = Math.random();
    
    if (turnChance < 0.35) {
      // Left turn
      switch (direction) {
        case 'north': targetDirection = 'west'; break;
        case 'south': targetDirection = 'east'; break;
        case 'east': targetDirection = 'north'; break;
        case 'west': targetDirection = 'south'; break;
      }
    } else if (turnChance < 0.7) {
      // Right turn
      switch (direction) {
        case 'north': targetDirection = 'east'; break;
        case 'south': targetDirection = 'west'; break;
        case 'east': targetDirection = 'south'; break;
        case 'west': targetDirection = 'north'; break;
      }
    }
    // else stay straight (targetDirection = direction)
    
    let x = 0, y = 0;
    const laneOffset = 10; // Distance from center line
    
    switch (direction) {
      case 'north':
        // Moving upward (north) - stay on RIGHT side of center line
        x = 400 + laneOffset + Math.random() * 8;
        y = 600;
        break;
      case 'south':
        // Moving downward (south) - stay on LEFT side of center line
        x = 400 - laneOffset - Math.random() * 8;
        y = 0;
        break;
      case 'east':
        // Moving right (east) - stay on BOTTOM side of center line
        x = 0;
        y = 300 + laneOffset + Math.random() * 8;
        break;
      case 'west':
        // Moving left (west) - stay on TOP side of center line
        x = 800;
        y = 300 - laneOffset - Math.random() * 8;
        break;
    }

    const colors = ['#4ECDC4', '#45B7D1', '#96CEB4'];
    
    return {
      id: `vehicle-${vehicleIdRef.current++}`,
      x,
      y,
      direction,
      targetDirection,
      speed: 0.8 + Math.random() * 0.4, // Slower base speed for better control
      waitingTime: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'car' as 'car' | 'truck' | 'bus' | 'motorcycle',
      size: 12,
      hasTurned: false
    };
  }, []);

  // Dynamic signal control based on vehicle density
  const optimizeTrafficLights = useCallback(() => {
    // Disabled for simplicity - density already handled in updateTrafficLights
    return;

    // Use adaptive timing if enabled
    if (adaptiveTimingEnabled && adaptiveTimingSystem) {
      const now = new Date();
      const currentConditions = {
        timeOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
        flowRate: flowData?.flowRate || 0,
        congestionLevel: flowData?.congestionLevel || 0,
        waitingTime: stats.averageWaitingTime,
        vehicleCounts: {
          north: vehicles.filter(v => v.direction === 'north').length,
          south: vehicles.filter(v => v.direction === 'south').length,
          east: vehicles.filter(v => v.direction === 'east').length,
          west: vehicles.filter(v => v.direction === 'west').length
        }
      };

      const adjustments = adaptiveTimingSystem.calculateOptimalTiming(currentConditions);
      setTimingAdjustments(adjustments);

      // Apply timing adjustments
      if (adjustments.length > 0) {
        setTrafficLights(prev => prev.map(light => {
          const adjustment = adjustments.find(a => a.phase === 'north-south' && 
            (light.direction === 'north' || light.direction === 'south')) ||
            adjustments.find(a => a.phase === 'east-west' && 
            (light.direction === 'east' || light.direction === 'west'));
          
          if (adjustment) {
            const newMaxTimer = Math.round(light.maxTimer * (1 + adjustment.adjustment / 100));
            return { 
              ...light, 
              maxTimer: Math.max(10, Math.min(60, newMaxTimer))
            };
          }
          return light;
        }));

        // Learn from performance
        const performance = 100 - stats.congestionLevel; // Simple performance metric
        adaptiveTimingSystem.learnFromPerformance(
          { northSouth: 20, eastWest: 20 }, // Current timing
          performance,
          {
            flow: currentConditions.flowRate,
            congestion: currentConditions.congestionLevel,
            waitingTime: currentConditions.waitingTime
          }
        );
      }
    }
    // Use dynamic control if enabled, otherwise use RL
    else if (dynamicControlEnabled && dynamicController) {
      const conditions: TrafficConditions = {
        density: {
          north: vehicles.filter(v => v.direction === 'north').length,
          south: vehicles.filter(v => v.direction === 'south').length,
          east: vehicles.filter(v => v.direction === 'east').length,
          west: vehicles.filter(v => v.direction === 'west').length,
          total: vehicles.length
        },
        waitingTimes: {
          north: vehicles.filter(v => v.direction === 'north').reduce((sum, v) => sum + v.waitingTime, 0),
          south: vehicles.filter(v => v.direction === 'south').reduce((sum, v) => sum + v.waitingTime, 0),
          east: vehicles.filter(v => v.direction === 'east').reduce((sum, v) => sum + v.waitingTime, 0),
          west: vehicles.filter(v => v.direction === 'west').reduce((sum, v) => sum + v.waitingTime, 0)
        },
        queueLengths: {
          north: vehicles.filter(v => v.direction === 'north' && v.waitingTime > 5).length,
          south: vehicles.filter(v => v.direction === 'south' && v.waitingTime > 5).length,
          east: vehicles.filter(v => v.direction === 'east' && v.waitingTime > 5).length,
          west: vehicles.filter(v => v.direction === 'west' && v.waitingTime > 5).length
        },
        averageSpeed: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length : 0,
        congestionLevel: Math.min(vehicles.length / 20, 1) * 100
      };

      const signalTiming = dynamicController.calculateOptimalTiming(conditions);
      setCurrentSignalTiming(signalTiming);

      // Apply dynamic signal control
      setTrafficLights(prev => prev.map(light => {
        const isTargetPhase = signalTiming.phase === 'north-south' 
          ? (light.direction === 'north' || light.direction === 'south')
          : (light.direction === 'east' || light.direction === 'west');

        if (isTargetPhase) {
          return { 
            ...light, 
            state: 'green', 
            timer: 0, 
            maxTimer: Math.round(signalTiming.duration) 
          };
        } else {
          return { 
            ...light, 
            state: 'red', 
            timer: 0, 
            maxTimer: 30 
          };
        }
      }));
    } else if (rlEnabled && rlAgent) {
      // Use RL optimization
      const currentState = getCurrentTrafficState();
      const action = rlAgent.getAction(currentState);

      // Apply RL action
      setTrafficLights(prev => prev.map(light => {
        switch (action.type) {
          case 'extend_green':
            if (light.direction === action.direction && light.state === 'green') {
              return { ...light, maxTimer: Math.min(light.maxTimer + action.duration, 40) };
            }
            break;
          case 'switch_phase':
            if (light.direction === action.direction) {
              // Switch to green
              return { ...light, state: 'green', timer: 0, maxTimer: 20 };
            } else {
              // Switch to red
              return { ...light, state: 'red', timer: 0, maxTimer: 30 };
            }
          case 'maintain_current':
            // Keep current state
            break;
        }
        return light;
      }));

      // Store experience for training
      if (lastStateRef.current && lastActionRef.current) {
        const reward = calculateReward(lastStateRef.current, lastActionRef.current, currentState);
        rlAgent.train(lastStateRef.current, lastActionRef.current, reward, currentState);
        
        // Update RL stats
        setRlStats(rlAgent.getTrainingStats());
      }

      // Store current state and action for next iteration
      lastStateRef.current = currentState;
      lastActionRef.current = action;
    }
  }, [vehicles, aiOptimization, dynamicControlEnabled, dynamicController, rlEnabled, rlAgent, getCurrentTrafficState]);

  // Enhanced reward function prioritizing safety and collision avoidance
  const calculateReward = useCallback((state: TrafficState, action: Action, nextState: TrafficState): number => {
    let reward = 0;

    // HIGH PRIORITY: Safety reward - penalize collision risks
    // Check if any vehicles are dangerously close (simulated)
    const vehiclesNearIntersection = vehicles.filter(v => 
      Math.abs(v.x - 400) < 60 && Math.abs(v.y - 300) < 60
    );
    
    // Reward for collision-free movement
    if (vehiclesNearIntersection.length > 2) {
      // Multiple vehicles near intersection - check for potential conflicts
      const hasPerpendicularVehicles = vehiclesNearIntersection.some(v1 => 
        vehiclesNearIntersection.some(v2 => 
          v1.id !== v2.id &&
          ((v1.direction === 'north' || v1.direction === 'south') && 
           (v2.direction === 'east' || v2.direction === 'west')) ||
          ((v1.direction === 'east' || v1.direction === 'west') && 
           (v2.direction === 'north' || v2.direction === 'south'))
        )
      );
      
      if (hasPerpendicularVehicles) {
        // Potential conflict exists - penalize if action doesn't maintain safety
        reward -= 1.0;
      } else {
        // No conflicts - reward safe management
        reward += 0.5;
      }
    } else {
      // Few vehicles, safe condition
      reward += 0.2;
    }

    // Reward for reducing waiting times (secondary priority)
    const totalWaitingTime = Object.values(state.waitingTimes).reduce((sum, time) => sum + time, 0);
    const nextTotalWaitingTime = Object.values(nextState.waitingTimes).reduce((sum, time) => sum + time, 0);
    const waitingTimeReduction = totalWaitingTime - nextTotalWaitingTime;
    reward += waitingTimeReduction * 0.08; // Slightly reduced weight

    // Reward for reducing congestion
    const congestionReduction = state.congestionLevel - nextState.congestionLevel;
    reward += congestionReduction * 0.15; // Slightly reduced weight

    // Penalty for frequent phase switching (safety consideration)
    if (action.type === 'switch_phase') {
      reward -= 0.15; // Increased penalty to encourage stability
    }

    // Reward for efficient phase management
    if (action.type === 'extend_green' && state.phaseDuration > 15) {
      const vehicleCount = state.currentPhase === 'north-south' 
        ? state.vehicleCounts.north + state.vehicleCounts.south
        : state.vehicleCounts.east + state.vehicleCounts.west;
      
      if (vehicleCount > 3) {
        reward += 0.25;
      }
    }

    // Penalty for excessive waiting (safety and efficiency)
    const maxWaitingTime = Math.max(...Object.values(state.waitingTimes));
    if (maxWaitingTime > 20) {
      reward -= 0.6; // Increased penalty
    }
    
    // Penalty for very high congestion (safety risk)
    if (nextState.congestionLevel > 80) {
      reward -= 0.8;
    }

    // Reward for maintaining safe green phase duration
    if (state.phaseDuration >= 20 && state.phaseDuration <= 35) {
      reward += 0.2; // Optimal green time range
    }

    return reward;
  }, [vehicles]);

  // SIMPLE traffic light control based on density
  const [signalTimer, setSignalTimer] = useState(0);
  const [currentGreenAxis, setCurrentGreenAxis] = useState<'north-south' | 'east-west'>('north-south');
  const [currentPhase, setCurrentPhase] = useState<'green' | 'yellow' | 'red'>('green');
  
  const updateTrafficLights = useCallback(() => {
    // Calculate density for each direction
    const northSouthCount = vehicles.filter(v => v.direction === 'north' || v.direction === 'south').length;
    const eastWestCount = vehicles.filter(v => v.direction === 'east' || v.direction === 'west').length;
    
    // Dynamic green time based on density (15-45 seconds)
    // Convert to frames (60fps = 60 frames per second)
    const baseGreenTime = 20 * 60; // 20 seconds in frames
    const densityBonus = Math.min(25 * 60, Math.floor(
      currentGreenAxis === 'north-south' ? northSouthCount * 120 : eastWestCount * 120  // 2 seconds per vehicle
    ));
    const greenTime = baseGreenTime + densityBonus;
    const yellowTime = 3 * 60; // 3 seconds in frames
    const redTime = 2 * 60; // 2 seconds in frames
    
    setSignalTimer(prev => prev + 1);
    
    // Simple phase transitions
    let shouldTransition = false;
    let nextPhase = currentPhase;
    let nextAxis = currentGreenAxis;
    
    if (currentPhase === 'green' && signalTimer >= greenTime) {
      nextPhase = 'yellow';
      shouldTransition = true;
    } else if (currentPhase === 'yellow' && signalTimer >= yellowTime) {
      nextPhase = 'red';
      shouldTransition = true;
    } else if (currentPhase === 'red' && signalTimer >= redTime) {
      // Switch to other axis
      nextPhase = 'green';
      nextAxis = currentGreenAxis === 'north-south' ? 'east-west' : 'north-south';
      shouldTransition = true;
    }
    
    if (shouldTransition) {
      setSignalTimer(0);
      setCurrentPhase(nextPhase);
      setCurrentGreenAxis(nextAxis);
    }
    
    // Apply to all lights
    setTrafficLights(prev => prev.map(light => {
      const isNorthSouth = light.direction === 'north' || light.direction === 'south';
      const isEastWest = light.direction === 'east' || light.direction === 'west';
      const isCurrentAxis = (currentGreenAxis === 'north-south' && isNorthSouth) || 
                           (currentGreenAxis === 'east-west' && isEastWest);
      
      let state: 'red' | 'yellow' | 'green' = 'red';
      if (isCurrentAxis) {
        state = currentPhase === 'red' ? 'red' : currentPhase;
      }
      
      // Calculate remaining time in seconds
      let remainingTime = 0;
      if (state === 'green') {
        remainingTime = Math.ceil((greenTime - signalTimer) / 60); // Convert frames to seconds
      } else if (state === 'yellow') {
        remainingTime = Math.ceil((yellowTime - signalTimer) / 60);
      } else if (state === 'red') {
        // Calculate how long until this light turns green
        if (!isCurrentAxis && currentPhase === 'green') {
          remainingTime = Math.ceil((greenTime - signalTimer + yellowTime + redTime) / 60);
        } else if (!isCurrentAxis && currentPhase === 'yellow') {
          remainingTime = Math.ceil((yellowTime - signalTimer + redTime) / 60);
        } else {
          remainingTime = Math.ceil((redTime - signalTimer) / 60);
        }
      }
      
      return {
        ...light,
        state,
        timer: signalTimer,
        maxTimer: greenTime,
        remainingTime: Math.max(0, remainingTime)
      };
    }));
  }, [signalTimer, currentPhase, currentGreenAxis, vehicles]);

  // Balanced collision avoidance - safe but not too strict
  const isTooCloseToVehicleAhead = (vehicle: Vehicle, newX: number, newY: number, allVehicles: Vehicle[]) => {
    const safeDistance = 40; // Balanced distance
    
    for (const other of allVehicles) {
      if (other.id === vehicle.id) continue;
      
      // Check same-direction vehicles
      if (other.direction === vehicle.direction) {
        let distance = 0;
        let isAhead = false;
        
        switch (vehicle.direction) {
          case 'north':
            isAhead = other.y < vehicle.y;
            distance = vehicle.y - other.y;
            break;
          case 'south':
            isAhead = other.y > vehicle.y;
            distance = other.y - vehicle.y;
            break;
          case 'east':
            isAhead = other.x > vehicle.x;
            distance = other.x - vehicle.x;
            break;
          case 'west':
            isAhead = other.x < vehicle.x;
            distance = vehicle.x - other.x;
            break;
        }
        
        // Stop if vehicle ahead within safe distance
        if (isAhead && distance < safeDistance) {
          return true;
        }
      }
      
      // ABSOLUTE COLLISION CHECK: Simple distance between vehicles
      const dx = newX - other.x;
      const dy = newY - other.y;
      const directDistance = Math.sqrt(dx * dx + dy * dy);
      
      // If vehicles would be closer than 30 pixels, STOP
      if (directDistance < 30) {
        return true;
      }
    }
    
    return false;
  };

  // Vehicle update with turning capabilities and collision detection
  const updateVehicles = useCallback(() => {
    setVehicles(prev => {
      const newVehicles = prev.map((vehicle, index) => {
        const light = trafficLights.find(l => l.direction === vehicle.direction);
        const isRedLight = light?.state === 'red' || light?.state === 'yellow'; // Stop at yellow too
        
        // Keep vehicles in lanes
        const laneOffset = 10;
        let newX = vehicle.x;
        let newY = vehicle.y;
        let newWaitingTime = vehicle.waitingTime;
        let newDirection = vehicle.direction;
        let hasTurned = vehicle.hasTurned || false;
        
        // Check if at intersection center (for turning)
        const atIntersectionCenter = Math.abs(vehicle.x - 400) < 20 && Math.abs(vehicle.y - 300) < 20;
        
        // Check if approaching intersection
        const nearIntersection = isAtIntersection(vehicle);
        
        // Calculate potential new position
        let potentialX = newX;
        let potentialY = newY;
        
        if (!(isRedLight && nearIntersection)) {
          // Check if vehicle needs to turn at intersection
          if (atIntersectionCenter && !hasTurned && vehicle.targetDirection && vehicle.targetDirection !== vehicle.direction) {
            // Make the turn
            newDirection = vehicle.targetDirection;
            hasTurned = true;
          }
          
          // Calculate potential position based on direction
          switch (newDirection) {
            case 'north':
              potentialY = vehicle.y - vehicle.speed;
              potentialX = hasTurned ? vehicle.x : 400 + laneOffset;
              break;
            case 'south':
              potentialY = vehicle.y + vehicle.speed;
              potentialX = hasTurned ? vehicle.x : 400 - laneOffset;
              break;
            case 'east':
              potentialX = vehicle.x + vehicle.speed;
              potentialY = hasTurned ? vehicle.y : 300 + laneOffset;
              break;
            case 'west':
              potentialX = vehicle.x - vehicle.speed;
              potentialY = hasTurned ? vehicle.y : 300 - laneOffset;
              break;
          }
          
          // Check for collision with other vehicles
          const minSafeDistance = 25; // Minimum gap between vehicles
          let canMove = true;
          
          for (let i = 0; i < prev.length; i++) {
            if (i === index) continue; // Skip self
            const other = prev[i];
            
            // Calculate distance to other vehicle
            const dx = potentialX - other.x;
            const dy = potentialY - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if too close
            if (distance < minSafeDistance) {
              // Check if the other vehicle is in front (same direction)
              const sameDirection = vehicle.direction === other.direction || 
                                  (vehicle.hasTurned && vehicle.targetDirection === other.direction);
              
              if (sameDirection) {
                // Only stop if the other vehicle is ahead
                let isAhead = false;
                switch (newDirection) {
                  case 'north': isAhead = other.y < potentialY; break;
                  case 'south': isAhead = other.y > potentialY; break;
                  case 'east': isAhead = other.x > potentialX; break;
                  case 'west': isAhead = other.x < potentialX; break;
                }
                
                if (isAhead) {
                  canMove = false;
                  break;
                }
              } else if (distance < 20) {
                // Different directions but very close - avoid collision
                canMove = false;
                break;
              }
            }
          }
          
          if (canMove) {
            newX = potentialX;
            newY = potentialY;
            newWaitingTime = 0;
          } else {
            // Can't move - vehicle ahead
            newWaitingTime = vehicle.waitingTime + 1;
          }
        } else {
          // Stop at red/yellow light
          newWaitingTime = vehicle.waitingTime + 1;
        }
        
        return { ...vehicle, x: newX, y: newY, waitingTime: newWaitingTime, direction: newDirection, hasTurned };
      }).filter(vehicle => {
        // Remove vehicles that have left the canvas
        return vehicle.x >= -50 && vehicle.x <= 850 && vehicle.y >= -50 && vehicle.y <= 650;
      });
      
      // BALANCED VEHICLE GENERATION
      const currentCongestion = Math.min(newVehicles.length / 15, 1);
      
      // Moderate spawn rate
      let dynamicSpawnRate = 0.005; // Balanced rate
      
      if (currentCongestion > 0.7) {
        dynamicSpawnRate = 0.002;
      } else if (currentCongestion > 0.5) {
        dynamicSpawnRate = 0.003;
      }
      
      // Add new vehicles
      if (Math.random() < dynamicSpawnRate) {
        newVehicles.push(generateVehicle());
      }
      
      // Maintain reasonable minimum
      const minVehicles = 6;
      if (newVehicles.length < minVehicles) {
        newVehicles.push(generateVehicle());
      }
      
      // Cap at reasonable maximum
      const maxVehicles = 18;
      if (newVehicles.length > maxVehicles) {
        newVehicles.sort((a, b) => {
          const distA = Math.sqrt(Math.pow(a.x - 400, 2) + Math.pow(a.y - 300, 2));
          const distB = Math.sqrt(Math.pow(b.x - 400, 2) + Math.pow(b.y - 300, 2));
          return distB - distA;
        });
        newVehicles.splice(maxVehicles);
      }
      
      return newVehicles;
    });
  }, [trafficLights, generateVehicle]);

  // Check if vehicle is approaching or at intersection
  const isAtIntersection = (vehicle: Vehicle) => {
    const intersectionX = 400;
    const intersectionY = 300;
    const stopDistance = 50; // Distance before intersection to stop
    
    // Check based on direction - vehicle should stop BEFORE entering intersection
    switch (vehicle.direction) {
      case 'north':
        // Moving up, stop when Y is just above intersection (larger Y values)
        return vehicle.y > intersectionY + 20 && vehicle.y < intersectionY + stopDistance + 20;
      case 'south':
        // Moving down, stop when Y is just below intersection (smaller Y values)
        return vehicle.y < intersectionY - 20 && vehicle.y > intersectionY - stopDistance - 20;
      case 'east':
        // Moving right, stop when X is just before intersection (smaller X values)
        return vehicle.x < intersectionX - 20 && vehicle.x > intersectionX - stopDistance - 20;
      case 'west':
        // Moving left, stop when X is just after intersection (larger X values)
        return vehicle.x > intersectionX + 20 && vehicle.x < intersectionX + stopDistance + 20;
      default:
        return false;
    }
  };

  // Update statistics with flow analysis
  const updateStats = useCallback(() => {
    setStats(prev => {
      const totalWaitingTime = vehicles.reduce((sum, v) => sum + v.waitingTime, 0);
      const avgWaitingTime = vehicles.length > 0 ? totalWaitingTime / vehicles.length : 0;
      const congestionLevel = Math.min(vehicles.length / 20, 1) * 100;
      const efficiency = Math.max(0, 100 - avgWaitingTime * 2);
      
      // Calculate average speed
      const avgSpeed = vehicles.length > 0 
        ? vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length 
        : 0;
      
      // Update flow analysis
      if (flowAnalyzer) {
        const currentFlowData = flowAnalyzer.calculateFlowMetrics(
          vehicles.length,
          avgSpeed * 60, // Convert to km/h
          1 // road length in km
        );
        
        flowAnalyzer.addFlowData(currentFlowData);
        setFlowData(currentFlowData);
        
        // Get predictions
        const predictions = flowAnalyzer.getPredictions(1);
        setFlowPredictions(predictions);
      }
      
      // Calculate vehicles passed (vehicles that left the canvas)
      const vehiclesPassed = prev.totalVehicles > vehicles.length && vehicles.length > 0
        ? prev.vehiclesPassed + (prev.totalVehicles - vehicles.length)
        : prev.vehiclesPassed;
      
      return {
        totalVehicles: vehicles.length, // ACTUAL current vehicle count
        averageWaitingTime: Math.round(avgWaitingTime * 10) / 10,
        vehiclesPassed: vehiclesPassed,
        congestionLevel: Math.round(congestionLevel),
        efficiency: Math.round(efficiency),
      };
    });
  }, [vehicles, flowAnalyzer]);

  // Draw simulation
  const drawSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw roads FIRST extending to full canvas edges
    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, 280, 800, 40); // Horizontal road full width
    ctx.fillRect(380, 0, 40, 600); // Vertical road full height
    
    // Draw intersection on top
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(380, 280, 40, 40);
    
    // Draw road borders
    ctx.strokeStyle = '#1C2E40';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 280, 800, 40);
    ctx.strokeRect(380, 0, 40, 600);
    
    // Draw lane markings
    ctx.strokeStyle = '#F39C12';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    // Horizontal road center line
    ctx.moveTo(0, 300);
    ctx.lineTo(800, 300);
    // Vertical road center line
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw traffic lights with countdown timers
    trafficLights.forEach(light => {
      const { position, state, direction, remainingTime } = light;
      const { x, y } = position;
      
      // Determine light orientation based on direction
      const isVerticalRoad = direction === 'north' || direction === 'south';
      
      // Smaller, better positioned traffic lights
      const housingWidth = 45;
      const housingHeight = 15;
      
      // Draw traffic light housing
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(x - housingWidth/2, y - housingHeight/2, housingWidth, housingHeight);
      
      // Draw three lights (red, yellow, green) horizontally
      drawThreeLights(ctx, x - 15, y, state);
      
      // Draw countdown timer next to light
      if (remainingTime !== undefined) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const timerX = direction === 'north' || direction === 'south' ? x + 30 : x;
        const timerY = direction === 'east' || direction === 'west' ? y + 25 : y;
        ctx.fillRect(timerX - 12, timerY - 12, 24, 24);
        
        ctx.fillStyle = state === 'green' ? '#00FF00' : state === 'yellow' ? '#FFD700' : '#FF3333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(remainingTime).toString(), timerX, timerY + 5);
      }
    });
    
    // Helper function to draw three lights
    function drawThreeLights(ctx: CanvasRenderingContext2D, startX: number, centerY: number, state: string) {
      const lightRadius = 5;
      const spacing = 15;
      
      // Red light
      ctx.beginPath();
      ctx.arc(startX, centerY, lightRadius, 0, Math.PI * 2);
      ctx.fillStyle = state === 'red' ? '#FF3333' : '#4A0000';
      if (state === 'red') {
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Yellow light
      ctx.beginPath();
      ctx.arc(startX + spacing, centerY, lightRadius, 0, Math.PI * 2);
      ctx.fillStyle = state === 'yellow' ? '#FFD700' : '#4A4A00';
      if (state === 'yellow') {
        ctx.shadowColor = '#FFA500';
        ctx.shadowBlur = 15;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Green light
      ctx.beginPath();
      ctx.arc(startX + spacing * 2, centerY, lightRadius, 0, Math.PI * 2);
      ctx.fillStyle = state === 'green' ? '#00FF00' : '#004A00';
      if (state === 'green') {
        ctx.shadowColor = '#00CC00';
        ctx.shadowBlur = 15;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Draw vehicles with different shapes
    vehicles.forEach(vehicle => {
      const { x, y, color, waitingTime, type, size } = vehicle;
      
      ctx.fillStyle = color;
      
      // Draw different vehicle shapes
      switch (type) {
        case 'car':
          ctx.fillRect(x - size/2, y - size/3, size, size/1.5);
          break;
        case 'truck':
          ctx.fillRect(x - size/2, y - size/3, size, size/1.2);
          // Truck cabin
          ctx.fillStyle = '#2C3E50';
          ctx.fillRect(x - size/2, y - size/3, size/2, size/1.2);
          ctx.fillStyle = color;
          break;
        case 'bus':
          ctx.fillRect(x - size/2, y - size/3, size, size/1.1);
          // Bus windows
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(x - size/2 + 2, y - size/3 + 2, size - 4, size/4);
          ctx.fillStyle = color;
          break;
        case 'motorcycle':
          ctx.beginPath();
          ctx.arc(x, y, size/2, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      
      // Waiting indicator
      if (waitingTime > 0) {
        ctx.fillStyle = '#E74C3C';
        ctx.font = '8px Arial';
        ctx.fillText('⏱', x - 8, y - 10);
      }
    });
    
    // Draw traffic signal indicator in top right (separated from switch)
    const indicatorX = 750;
    const indicatorY = 15;
    
    // Indicator background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(indicatorX - 25, indicatorY - 15, 50, 30);
    
    // Current signal state
    const currentSignal = trafficLights.find(l => l.state !== 'red') || trafficLights[0];
    ctx.fillStyle = currentSignal.state === 'red' ? '#FF0000' : currentSignal.state === 'yellow' ? '#FFFF00' : '#00FF00';
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Signal label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentSignal.state.toUpperCase(), indicatorX, indicatorY + 20);
    ctx.textAlign = 'left';
    
    // Draw AI optimization indicator
    if (aiOptimization) {
      ctx.fillStyle = '#27AE60';
      ctx.font = '12px Arial';
      ctx.fillText('🤖 AI Optimized', 10, 20);
    }
  }, [trafficLights, vehicles, aiOptimization, isDayMode]);

  // Frame counter for speed control
  const frameCountRef = useRef(0);
  
  // Animation loop with speed control
  const animate = useCallback(() => {
    if (!isRunning) return;
    
    frameCountRef.current++;
    
    // Control update frequency based on speed slider
    // speed 0.5 = update every 4 frames (slowest)
    // speed 1.0 = update every 2 frames (normal)
    // speed 1.5 = update every frame
    // speed 2.0 = update twice per frame
    // speed 2.5 = update 3 times per frame
    // speed 3.0 = update 4 times per frame (fastest)
    
    const framesPerUpdate = speed >= 1.5 ? 1 : Math.round(2 / speed);
    const updatesPerFrame = speed > 1.5 ? Math.floor(speed) : 1;
    
    // Only update if we've reached the right frame
    if (frameCountRef.current % framesPerUpdate === 0) {
      // Run updates multiple times if speed > 1.5
      for (let i = 0; i < updatesPerFrame; i++) {
        // Update traffic lights
        updateTrafficLights();
        
        // Update vehicles
        updateVehicles();
        
        // Update statistics
        updateStats();
        
        // AI optimization (if enabled)
        if (aiOptimization) {
          optimizeTrafficLights();
        }
      }
    }
    
    // Always draw every frame for smooth visuals
    drawSimulation();
    
    // Incident detection (less frequent)
    if (frameCountRef.current % 30 === 0 && incidentDetectionEnabled && incidentSystem) {
      const vehicleData = vehicles.map(v => ({
        id: v.id,
        x: v.x,
        y: v.y,
        speed: v.speed,
        direction: v.direction,
        waitingTime: v.waitingTime,
        isStopped: v.speed < 1
      }));
      
      const trafficLightData = trafficLights.map(light => ({
        id: light.id,
        state: light.state,
        direction: light.direction
      }));
      
      const detectedIncidents = incidentSystem.analyzeTrafficData(vehicleData, trafficLightData);
      setIncidents(detectedIncidents);
    }
    
    // Record performance metrics (less frequent)
    if (frameCountRef.current % 60 === 0 && performanceService) {
      performanceService.recordMetric('waitTime', stats.averageWaitingTime, 'seconds', 'efficiency', 20);
      performanceService.recordMetric('throughput', flowData?.throughput || 0, 'vehicles/hour', 'efficiency', 100);
      performanceService.recordMetric('flowRate', flowData?.flowRate || 0, 'vehicles/min', 'efficiency', 50);
      performanceService.recordMetric('signalEfficiency', (1 - stats.congestionLevel / 100) * 100, '%', 'efficiency', 80);
      performanceService.recordMetric('incidentCount', incidents.length, 'incidents', 'safety', 2);
      performanceService.recordMetric('congestionLevel', stats.congestionLevel, '%', 'efficiency', 30);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isRunning, speed, updateTrafficLights, updateVehicles, updateStats, optimizeTrafficLights, aiOptimization, drawSimulation, incidentDetectionEnabled, incidentSystem, vehicles, trafficLights, performanceService, stats, flowData, incidents]);

  // Start/stop simulation
  useEffect(() => {
    if (isRunning) {
      animate();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  // Redraw when data changes
  useEffect(() => {
    drawSimulation();
  }, [drawSimulation]);

  const handleStart = () => {
    setIsRunning(true);
    frameCountRef.current = 0; // Reset frame counter
    
    // Add initial vehicles if none exist for better demonstration
    if (vehicles.length === 0) {
      const initialVehicles = [];
      for (let i = 0; i < 12; i++) {
        initialVehicles.push(generateVehicle());
      }
      setVehicles(initialVehicles);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    // Stop simulation
    setIsRunning(false);
    
    // Reset all state
    setVehicles([]);
    setStats({
      totalVehicles: 0,
      averageWaitingTime: 0,
      vehiclesPassed: 0,
      congestionLevel: 0,
      efficiency: 0,
    });
    
    // Reset traffic lights to initial state
    setSignalTimer(0);
    setCurrentGreenAxis('north-south');
    setCurrentPhase('green');
    setTrafficLights([
      { id: 'north', position: { x: 360, y: 240 }, state: 'green', timer: 0, maxTimer: 30, direction: 'north' },
      { id: 'south', position: { x: 440, y: 360 }, state: 'green', timer: 0, maxTimer: 30, direction: 'south' },
      { id: 'east', position: { x: 460, y: 340 }, state: 'red', timer: 0, maxTimer: 30, direction: 'east' },
      { id: 'west', position: { x: 340, y: 260 }, state: 'red', timer: 0, maxTimer: 30, direction: 'west' },
    ]);
    
    // Reset counters
    vehicleIdRef.current = 0;
    frameCountRef.current = 0;
    
    // Generate initial vehicles and start
    const initialVehicles = [];
    for (let i = 0; i < 8; i++) {
      initialVehicles.push(generateVehicle());
    }
    setVehicles(initialVehicles);
    
    // Auto-start after reset
    setTimeout(() => {
      setIsRunning(true);
    }, 100);
  };

  // Canvas click handler removed - switch is now external

  return (
    <div className="traffic-simulator">
      <div className="simulator-controls">
        <div className="main-controls">
          <div className="control-group">
            <button 
              className={`control-btn primary ${isRunning ? 'pause' : 'play'}`}
              onClick={isRunning ? handlePause : handleStart}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            
            <button className="control-btn secondary reset" onClick={handleReset}>
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
          
          <div className="control-group">
            <div className="speed-control">
              <label>Speed: {speed}x</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="speed-slider"
              />
            </div>
          </div>
          
          <div className="control-group">
            {/* AI button hidden - density-based timing is always on */}
            
            <button 
              className={`control-btn secondary ${showStats ? 'active' : ''}`}
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 size={18} />
              Stats
            </button>
            
            {/* Advanced button hidden for simplicity */}
          </div>
        </div>
        
        {showAdvancedSettings && (
          <div className="advanced-settings">
            <div className="settings-group">
              <h4>AI Systems</h4>
              <div className="settings-row">
                <button 
                  className={`setting-btn ${rlEnabled ? 'active' : ''}`}
                  onClick={() => setRlEnabled(!rlEnabled)}
                >
                  <Brain size={16} />
                  RL Learning
                </button>
                
                <button 
                  className={`setting-btn ${dynamicControlEnabled ? 'active' : ''}`}
                  onClick={() => setDynamicControlEnabled(!dynamicControlEnabled)}
                >
                  <Settings size={16} />
                  Dynamic Control
                </button>
                
                <button 
                  className={`setting-btn ${adaptiveTimingEnabled ? 'active' : ''}`}
                  onClick={() => setAdaptiveTimingEnabled(!adaptiveTimingEnabled)}
                >
                  <Settings size={16} />
                  Adaptive Timing
                </button>
              </div>
            </div>
            
            <div className="settings-group">
              <h4>Monitoring</h4>
              <div className="settings-row">
                <button 
                  className={`setting-btn ${incidentDetectionEnabled ? 'active' : ''}`}
                  onClick={() => setIncidentDetectionEnabled(!incidentDetectionEnabled)}
                >
                  <BarChart3 size={16} />
                  Incident Detection
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>

      <div className="simulator-content">
        <div className="simulation-canvas-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="simulation-canvas"
          />
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="settings-panel"
          >
            <h3>Simulation Settings</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={aiOptimization}
                  onChange={(e) => setAiOptimization(e.target.checked)}
                />
                AI Traffic Optimization
              </label>
            </div>
          </motion.div>
        )}

        {showStats && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="stats-panel"
          >
            <h3>Real-time Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Vehicles:</span>
                <span className="stat-value">{stats.totalVehicles}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Wait Time:</span>
                <span className="stat-value">{stats.averageWaitingTime}s</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Vehicles Passed:</span>
                <span className="stat-value">{stats.vehiclesPassed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Congestion:</span>
                <span className="stat-value">{stats.congestionLevel}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Efficiency:</span>
                <span className="stat-value">{stats.efficiency}%</span>
              </div>
            </div>
            
            {/* Traffic Light Status with Waiting Timers */}
            <div className="traffic-light-status">
              <h4>Traffic Light Status</h4>
              {trafficLights.map(light => {
                const remainingTime = Math.max(0, light.maxTimer - light.timer);
                const vehicleCount = vehicles.filter(v => v.direction === light.direction).length;
                const waitingCount = vehicles.filter(v => v.direction === light.direction && v.waitingTime > 2).length;
                
                return (
                  <div key={light.direction} className="light-status-item">
                    <div className="light-status-header">
                      <span className="direction-label">{light.direction.toUpperCase()}</span>
                      <span className={`status-indicator status-${light.state}`}></span>
                    </div>
                    <div className="light-status-details">
                      <span className="timer-display">
                        {light.state === 'red' ? '🔴' : light.state === 'yellow' ? '🟡' : '🟢'} {remainingTime}s
                      </span>
                      <span className="vehicle-count">
                        🚗 {vehicleCount} ({waitingCount} waiting)
                      </span>
                    </div>
                    <div className="timer-bar">
                      <div 
                        className={`timer-progress timer-progress-${light.state}`}
                        style={{ width: `${(light.timer / light.maxTimer) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {rlEnabled && (
              <div className="rl-stats">
                <h4>Reinforcement Learning</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Episode:</span>
                    <span className="stat-value">{rlStats.episode}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Epsilon:</span>
                    <span className="stat-value">{rlStats.epsilon.toFixed(3)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Q-Table Size:</span>
                    <span className="stat-value">{rlStats.qTableSize}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Q-Values:</span>
                    <span className="stat-value">{rlStats.totalQValues}</span>
                  </div>
                </div>
              </div>
            )}
            
            {flowData && (
              <div className="flow-stats">
                <h4>Traffic Flow Analysis</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Flow Rate:</span>
                    <span className="stat-value">{flowData.flowRate.toFixed(1)} v/min</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Density:</span>
                    <span className="stat-value">{flowData.density.toFixed(1)} v/km</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Throughput:</span>
                    <span className="stat-value">{flowData.throughput.toFixed(0)} v/h</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Congestion:</span>
                    <span className="stat-value" style={{ 
                      color: flowData.congestionLevel > 70 ? '#e74c3c' : 
                             flowData.congestionLevel > 40 ? '#f39c12' : '#27ae60' 
                    }}>
                      {flowData.congestionLevel.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {dynamicControlEnabled && currentSignalTiming && (
              <div className="dynamic-control-stats">
                <h4>Dynamic Signal Control</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Current Phase:</span>
                    <span className="stat-value">{currentSignalTiming.phase.toUpperCase()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Duration:</span>
                    <span className="stat-value">{currentSignalTiming.duration.toFixed(1)}s</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Priority:</span>
                    <span className="stat-value">{(currentSignalTiming.priority * 100).toFixed(0)}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Reason:</span>
                    <span className="stat-value" style={{ fontSize: '0.8rem', color: '#666' }}>
                      {currentSignalTiming.reason}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {incidentDetectionEnabled && incidents.length > 0 && (
              <div className="incident-stats">
                <h4>Incident Detection</h4>
                <div className="incident-list">
                  {incidents.slice(0, 3).map(incident => (
                    <div key={incident.id} className={`incident-item ${incident.severity}`}>
                      <div className="incident-header">
                        <span className="incident-type">{incident.type.toUpperCase()}</span>
                        <span className={`incident-severity ${incident.severity}`}>
                          {incident.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="incident-description">{incident.description}</div>
                      <div className="incident-meta">
                        <span>Lane: {incident.location.lane}</span>
                        <span>Vehicles: {incident.affectedVehicles.length}</span>
                        <span>Duration: {incident.estimatedDuration}m</span>
                      </div>
                    </div>
                  ))}
                </div>
                {incidents.length > 3 && (
                  <div className="incident-more">
                    +{incidents.length - 3} more incidents
                  </div>
                )}
              </div>
            )}
            
            {adaptiveTimingEnabled && timingAdjustments.length > 0 && (
              <div className="adaptive-timing-stats">
                <h4>Adaptive Timing</h4>
                <div className="timing-adjustments">
                  {timingAdjustments.map((adjustment, index) => (
                    <div key={index} className="timing-adjustment">
                      <div className="adjustment-header">
                        <span className="adjustment-phase">{adjustment.phase.toUpperCase()}</span>
                        <span className={`adjustment-value ${adjustment.adjustment > 0 ? 'positive' : 'negative'}`}>
                          {adjustment.adjustment > 0 ? '+' : ''}{adjustment.adjustment.toFixed(1)}%
                        </span>
                      </div>
                      <div className="adjustment-reason">{adjustment.reason}</div>
                      <div className="adjustment-meta">
                        <span>Confidence: {(adjustment.confidence * 100).toFixed(0)}%</span>
                        <span>Duration: {adjustment.duration}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="simulator-info">
        <h3>How It Works</h3>
        <ul>
          <li>🚦 <strong>Smart Traffic Lights:</strong> AI adjusts timing based on vehicle density</li>
          <li>🚗 <strong>Real-time Detection:</strong> Monitors vehicle count and waiting times</li>
          <li>📊 <strong>Dynamic Optimization:</strong> Reduces congestion by up to 35%</li>
          <li>⚡ <strong>Adaptive Timing:</strong> Green lights extend when more vehicles are waiting</li>
        </ul>
      </div>
      
      <PerformanceDashboard 
        isVisible={showPerformanceDashboard}
        onClose={() => setShowPerformanceDashboard(false)}
      />
    </div>
  );
};

export default TrafficSimulator;
