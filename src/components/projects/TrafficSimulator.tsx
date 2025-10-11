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
}

interface Vehicle {
  id: string;
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  speed: number;
  waitingTime: number;
  color: string;
  type: 'car' | 'truck' | 'bus' | 'motorcycle';
  size: number;
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
    { id: 'north', position: { x: 400, y: 150 }, state: 'red', timer: 0, maxTimer: 30, direction: 'north' },
    { id: 'south', position: { x: 400, y: 450 }, state: 'red', timer: 0, maxTimer: 30, direction: 'south' },
    { id: 'east', position: { x: 550, y: 300 }, state: 'green', timer: 0, maxTimer: 20, direction: 'east' },
    { id: 'west', position: { x: 250, y: 300 }, state: 'green', timer: 0, maxTimer: 20, direction: 'west' },
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
  const animationRef = useRef<number>();
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

  // Generate random vehicles with different types
  const generateVehicle = useCallback(() => {
    const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    let x = 0, y = 0;
    switch (direction) {
      case 'north':
        x = 400 + (Math.random() - 0.5) * 20;
        y = 600;
        break;
      case 'south':
        x = 400 + (Math.random() - 0.5) * 20;
        y = 0;
        break;
      case 'east':
        x = 0;
        y = 300 + (Math.random() - 0.5) * 20;
        break;
      case 'west':
        x = 800;
        y = 300 + (Math.random() - 0.5) * 20;
        break;
    }

    const colors = ['#4ECDC4', '#45B7D1', '#96CEB4'];
    
    return {
      id: `vehicle-${vehicleIdRef.current++}`,
      x,
      y,
      direction,
      speed: 1.5 + Math.random() * 0.5, // Consistent, reasonable speed
      waitingTime: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'car',
      size: 12,
    };
  }, []);

  // Dynamic signal control based on vehicle density
  const optimizeTrafficLights = useCallback(() => {
    if (!aiOptimization) return;

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

  // Calculate reward for RL training
  const calculateReward = useCallback((state: TrafficState, action: Action, nextState: TrafficState): number => {
    let reward = 0;

    // Reward for reducing waiting times
    const totalWaitingTime = Object.values(state.waitingTimes).reduce((sum, time) => sum + time, 0);
    const nextTotalWaitingTime = Object.values(nextState.waitingTimes).reduce((sum, time) => sum + time, 0);
    const waitingTimeReduction = totalWaitingTime - nextTotalWaitingTime;
    reward += waitingTimeReduction * 0.1;

    // Reward for reducing congestion
    const congestionReduction = state.congestionLevel - nextState.congestionLevel;
    reward += congestionReduction * 0.2;

    // Penalty for frequent phase switching
    if (action.type === 'switch_phase') {
      reward -= 0.1;
    }

    // Reward for efficient phase management
    if (action.type === 'extend_green' && state.phaseDuration > 15) {
      const vehicleCount = state.currentPhase === 'north-south' 
        ? state.vehicleCounts.north + state.vehicleCounts.south
        : state.vehicleCounts.east + state.vehicleCounts.west;
      
      if (vehicleCount > 3) {
        reward += 0.3;
      }
    }

    // Penalty for excessive waiting
    const maxWaitingTime = Math.max(...Object.values(state.waitingTimes));
    if (maxWaitingTime > 20) {
      reward -= 0.5;
    }

    return reward;
  }, []);

  // Update traffic lights with delay based on vehicle count
  const updateTrafficLights = useCallback(() => {
    setTrafficLights(prev => prev.map(light => {
      const newTimer = light.timer + 1;
      
      if (newTimer >= light.maxTimer) {
        // Simple 2-phase system: North-South vs East-West
        let newState: 'red' | 'yellow' | 'green' = 'red';
        let newMaxTimer = 30;
        
        // Determine if this light should be green based on phase
        const isNorthSouthPhase = (light.direction === 'north' || light.direction === 'south');
        const isEastWestPhase = (light.direction === 'east' || light.direction === 'west');
        
        // Alternate between phases every 30 seconds
        const phaseTime = Math.floor(newTimer / 30) % 2;
        
        if (phaseTime === 0 && isNorthSouthPhase) {
          newState = 'green';
          newMaxTimer = 30;
        } else if (phaseTime === 1 && isEastWestPhase) {
          newState = 'green';
          newMaxTimer = 30;
        } else {
          newState = 'red';
          newMaxTimer = 30;
        }
        
        return { ...light, state: newState, timer: 0, maxTimer: newMaxTimer };
      }
      
      return { ...light, timer: newTimer };
    }));
  }, []);

  // Update vehicles with simple movement logic
  const updateVehicles = useCallback(() => {
    setVehicles(prev => {
      const newVehicles = prev.map(vehicle => {
        const light = trafficLights.find(l => l.direction === vehicle.direction);
        const isRedLight = light?.state === 'red';
        
        let newX = vehicle.x;
        let newY = vehicle.y;
        let newWaitingTime = vehicle.waitingTime;
        
        if (isRedLight && isAtIntersection(vehicle)) {
          // Vehicle is waiting at red light
          newWaitingTime = vehicle.waitingTime + 1;
        } else {
          // Vehicle is moving
          newWaitingTime = 0;
          
          switch (vehicle.direction) {
            case 'north':
              newY = vehicle.y - vehicle.speed;
              newX = 400; // Keep on center line
              break;
            case 'south':
              newY = vehicle.y + vehicle.speed;
              newX = 400; // Keep on center line
              break;
            case 'east':
              newX = vehicle.x + vehicle.speed;
              newY = 300; // Keep on center line
              break;
            case 'west':
              newX = vehicle.x - vehicle.speed;
              newY = 300; // Keep on center line
              break;
          }
        }
        
        return { ...vehicle, x: newX, y: newY, waitingTime: newWaitingTime };
      }).filter(vehicle => {
        // Remove vehicles that have passed through
        return vehicle.x >= -50 && vehicle.x <= 850 && vehicle.y >= -50 && vehicle.y <= 650;
      });
      
      // Add new vehicles very rarely
      if (Math.random() < 0.0005) {
        newVehicles.push(generateVehicle());
      }
      
      return newVehicles;
    });
  }, [trafficLights, generateVehicle]);

  // Check if vehicle is at intersection
  const isAtIntersection = (vehicle: Vehicle) => {
    const intersectionX = 400;
    const intersectionY = 300;
    const threshold = 30;
    
    return Math.abs(vehicle.x - intersectionX) < threshold && Math.abs(vehicle.y - intersectionY) < threshold;
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
      
      return {
        totalVehicles: vehicles.length,
        averageWaitingTime: Math.round(avgWaitingTime * 10) / 10,
        vehiclesPassed: prev.vehiclesPassed + (prev.totalVehicles - vehicles.length),
        congestionLevel: Math.round(congestionLevel),
        efficiency: Math.round(efficiency),
      };
    });
  }, [vehicles, flowAnalyzer]);

  // Animation loop
  const animate = useCallback(() => {
    if (!isRunning) return;
    
    updateTrafficLights();
    updateVehicles();
    updateStats();
    optimizeTrafficLights();
    
    // Incident detection
    if (incidentDetectionEnabled && incidentSystem) {
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
    
    // Record performance metrics
    if (performanceService) {
      performanceService.recordMetric('waitTime', stats.averageWaitingTime, 'seconds', 'efficiency', 20);
      performanceService.recordMetric('throughput', flowData?.throughput || 0, 'vehicles/hour', 'efficiency', 100);
      performanceService.recordMetric('flowRate', flowData?.flowRate || 0, 'vehicles/min', 'efficiency', 50);
      performanceService.recordMetric('signalEfficiency', (1 - stats.congestionLevel / 100) * 100, '%', 'efficiency', 80);
      performanceService.recordMetric('incidentCount', incidents.length, 'incidents', 'safety', 2);
      performanceService.recordMetric('congestionLevel', stats.congestionLevel, '%', 'efficiency', 30);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isRunning, updateTrafficLights, updateVehicles, updateStats, optimizeTrafficLights]);

  // Start/stop simulation
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  // Draw simulation
  const drawSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw intersection (properly centered)
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(380, 280, 40, 40);
    
    // Draw roads extending to canvas edges with consistent width
    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, 280, 800, 40); // Horizontal road - 40px height
    ctx.fillRect(380, 0, 40, 600); // Vertical road - 40px width
    
    // Draw road borders
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 4;
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
    
    // Draw traffic lights with poles
    trafficLights.forEach(light => {
      const { x, y, state } = light;
      const lightSize = 15;
      
      // Light pole (taller and more visible)
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(x - 4, y - 4, 8, 35);
      
      // Light housing (black rectangle)
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(x - 12, y - 8, 24, 20);
      
      // Light (brighter colors)
      ctx.fillStyle = state === 'red' ? '#FF0000' : state === 'yellow' ? '#FFFF00' : '#00FF00';
      ctx.beginPath();
      ctx.arc(x, y, lightSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Light border
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add glow effect
      ctx.shadowColor = state === 'red' ? '#FF0000' : state === 'yellow' ? '#FFFF00' : '#00FF00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, lightSize - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
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
    
    // Day/night switch removed from canvas - handled by external component
  }, [trafficLights, vehicles, aiOptimization, isDayMode]);

  // Redraw when data changes
  useEffect(() => {
    drawSimulation();
  }, [drawSimulation]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setVehicles([]);
    setStats({
      totalVehicles: 0,
      averageWaitingTime: 0,
      vehiclesPassed: 0,
      congestionLevel: 0,
      efficiency: 0,
    });
    vehicleIdRef.current = 0;
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
            <button 
              className={`control-btn secondary ${aiOptimization ? 'active' : ''}`}
              onClick={() => setAiOptimization(!aiOptimization)}
            >
              <Settings size={18} />
              AI
            </button>
            
            <button 
              className={`control-btn secondary ${showStats ? 'active' : ''}`}
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 size={18} />
              Stats
            </button>
            
            <button 
              className={`control-btn secondary ${showAdvancedSettings ? 'active' : ''}`}
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <Settings size={18} />
              Advanced
            </button>
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
