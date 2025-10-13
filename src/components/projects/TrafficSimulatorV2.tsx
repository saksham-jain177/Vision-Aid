import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, BarChart3 } from 'lucide-react';
import './TrafficSimulator.css';

// Proper lane structure
interface Lane {
  id: string;
  type: 'incoming' | 'outgoing';
  direction: 'north' | 'south' | 'east' | 'west';
  position: { x: number; y: number; width: number; height: number };
}

interface TrafficSignal {
  position: 'North' | 'South' | 'East' | 'West';
  facingDirection: 'north' | 'south' | 'east' | 'west';
  state: 'red' | 'yellow' | 'green';
  timer: number;
  waitingTime: number;
  x: number;
  y: number;
}

interface Vehicle {
  id: string;
  x: number;
  y: number;
  fromDirection: 'North' | 'South' | 'East' | 'West';
  toDirection: 'North' | 'South' | 'East' | 'West';
  currentLane: string;
  turnType: 'straight' | 'left' | 'right';
  speed: number;
  color: string;
  waitingTime: number;
  hasTurned: boolean;
  size: number;
}

interface Route {
  from: string;
  to: string;
  turn: 'straight' | 'left' | 'right';
  path: { x: number; y: number }[];
}

const TrafficSimulatorV2: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameCountRef = useRef(0);
  const vehicleIdRef = useRef(0);
  
  // Canvas dimensions - dynamic width, fixed height
  const [canvasWidth, setCanvasWidth] = useState(600);
  const CANVAS_HEIGHT = 500;
  const INTERSECTION_SIZE = 50;
  const ROAD_WIDTH = 50; // Two lanes each direction
  const LANE_WIDTH = 25;
  
  // Center of intersection
  const CENTER_X = canvasWidth / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  
  // Define proper lanes
  const lanes: Lane[] = [
    // North lanes
    { id: 'N1', type: 'incoming', direction: 'south', position: { x: CENTER_X + 10, y: 0, width: LANE_WIDTH, height: CENTER_Y - INTERSECTION_SIZE/2 } },
    { id: 'N2', type: 'outgoing', direction: 'north', position: { x: CENTER_X - LANE_WIDTH - 10, y: 0, width: LANE_WIDTH, height: CENTER_Y - INTERSECTION_SIZE/2 } },
    
    // South lanes
    { id: 'S1', type: 'incoming', direction: 'north', position: { x: CENTER_X - LANE_WIDTH - 10, y: CENTER_Y + INTERSECTION_SIZE/2, width: LANE_WIDTH, height: CENTER_Y - INTERSECTION_SIZE/2 } },
    { id: 'S2', type: 'outgoing', direction: 'south', position: { x: CENTER_X + 10, y: CENTER_Y + INTERSECTION_SIZE/2, width: LANE_WIDTH, height: CENTER_Y - INTERSECTION_SIZE/2 } },
    
    // East lanes - E1 outgoing (top), E2 incoming (bottom)
    { id: 'E1', type: 'outgoing', direction: 'east', position: { x: CENTER_X + INTERSECTION_SIZE/2, y: CENTER_Y - LANE_WIDTH - 10, width: CENTER_X - INTERSECTION_SIZE/2, height: LANE_WIDTH } },
    { id: 'E2', type: 'incoming', direction: 'west', position: { x: CENTER_X + INTERSECTION_SIZE/2, y: CENTER_Y + 10, width: CENTER_X - INTERSECTION_SIZE/2, height: LANE_WIDTH } },
    
    // West lanes - W1 outgoing (bottom), W2 incoming (top)
    { id: 'W1', type: 'outgoing', direction: 'west', position: { x: 0, y: CENTER_Y + 10, width: CENTER_X - INTERSECTION_SIZE/2, height: LANE_WIDTH } },
    { id: 'W2', type: 'incoming', direction: 'east', position: { x: 0, y: CENTER_Y - LANE_WIDTH - 10, width: CENTER_X - INTERSECTION_SIZE/2, height: LANE_WIDTH } },
  ];
  
  // Traffic signals positioned BEFORE intersection entrances
  const [trafficSignals, setTrafficSignals] = useState<TrafficSignal[]>([
    { position: 'North', facingDirection: 'south', state: 'red', timer: 0, waitingTime: 30, x: 0, y: 0 },
    { position: 'South', facingDirection: 'north', state: 'red', timer: 0, waitingTime: 30, x: 0, y: 0 },
    { position: 'East', facingDirection: 'west', state: 'green', timer: 0, waitingTime: 30, x: 0, y: 0 },
    { position: 'West', facingDirection: 'east', state: 'green', timer: 0, waitingTime: 30, x: 0, y: 0 },
  ]);
  
  // Update traffic signal positions when canvas width changes
  useEffect(() => {
    setTrafficSignals(prev => prev.map(signal => {
      switch (signal.position) {
        case 'North':
          return { ...signal, x: CENTER_X + 35, y: CENTER_Y - 75 };
        case 'South':
          return { ...signal, x: CENTER_X - 35, y: CENTER_Y + 75 };
        case 'East':
          return { ...signal, x: CENTER_X + 75, y: CENTER_Y + 35 }; // Bottom lane (E2 incoming)
        case 'West':
          return { ...signal, x: CENTER_X - 75, y: CENTER_Y - 35 }; // Top lane (W2 incoming)
        default:
          return signal;
      }
    }));
  }, [canvasWidth, CENTER_X, CENTER_Y]);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'NS' | 'EW'>('EW');
  const [phaseTimer, setPhaseTimer] = useState(0);
  
  // Define possible routes
  const routes: Route[] = [
    // From North
    { from: 'North', to: 'South', turn: 'straight', path: [] },
    { from: 'North', to: 'West', turn: 'left', path: [] },
    { from: 'North', to: 'East', turn: 'right', path: [] },
    
    // From South
    { from: 'South', to: 'North', turn: 'straight', path: [] },
    { from: 'South', to: 'East', turn: 'left', path: [] },
    { from: 'South', to: 'West', turn: 'right', path: [] },
    
    // From East
    { from: 'East', to: 'West', turn: 'straight', path: [] },
    { from: 'East', to: 'North', turn: 'left', path: [] },
    { from: 'East', to: 'South', turn: 'right', path: [] },
    
    // From West
    { from: 'West', to: 'East', turn: 'straight', path: [] },
    { from: 'West', to: 'South', turn: 'left', path: [] },
    { from: 'West', to: 'North', turn: 'right', path: [] },
  ];
  
  // Generate vehicle with proper lane assignment
  const generateVehicle = useCallback(() => {
    const directions: Array<'North' | 'South' | 'East' | 'West'> = ['North', 'South', 'East', 'West'];
    const fromDirection = directions[Math.floor(Math.random() * directions.length)];
    
    // Determine destination based on realistic turning probabilities
    let toDirection: 'North' | 'South' | 'East' | 'West';
    let turnType: 'straight' | 'left' | 'right';
    const turnChance = Math.random();
    
    if (turnChance < 0.5) {
      // Straight (50%)
      turnType = 'straight';
      switch (fromDirection) {
        case 'North': toDirection = 'South'; break;
        case 'South': toDirection = 'North'; break;
        case 'East': toDirection = 'West'; break;
        case 'West': toDirection = 'East'; break;
        default: toDirection = 'South';
      }
    } else if (turnChance < 0.75) {
      // Right turn (25%)
      turnType = 'right';
      switch (fromDirection) {
        case 'North': toDirection = 'East'; break;
        case 'South': toDirection = 'West'; break;
        case 'East': toDirection = 'South'; break;
        case 'West': toDirection = 'North'; break;
        default: toDirection = 'East';
      }
    } else {
      // Left turn (25%)
      turnType = 'left';
      switch (fromDirection) {
        case 'North': toDirection = 'West'; break;
        case 'South': toDirection = 'East'; break;
        case 'East': toDirection = 'North'; break;
        case 'West': toDirection = 'South'; break;
        default: toDirection = 'West';
      }
    }
    
    // Set initial position in the correct incoming lane
    let x = 0, y = 0, currentLane = '';
    switch (fromDirection) {
      case 'North':
        x = CENTER_X + 15; // Right lane for incoming from north
        y = 10;
        currentLane = 'N1';
        break;
      case 'South':
        x = CENTER_X - 15; // Left lane for incoming from south
        y = CANVAS_HEIGHT - 10;
        currentLane = 'S1';
        break;
      case 'East':
        x = canvasWidth - 10;
        y = CENTER_Y + 15; // Bottom lane for incoming from east (E2)
        currentLane = 'E2';
        break;
      case 'West':
        x = 10;
        y = CENTER_Y - 15; // Top lane for incoming from west (W2)
        currentLane = 'W2';
        break;
    }
    
    return {
      id: `vehicle-${vehicleIdRef.current++}`,
      x,
      y,
      fromDirection,
      toDirection,
      currentLane,
      turnType,
      speed: 1 + Math.random() * 0.5,
      color: ['#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 3)],
      waitingTime: 0,
      hasTurned: false,
      size: 10,
    };
  }, []);
  
  // Update traffic signals based on density
  const updateTrafficSignals = useCallback(() => {
    setPhaseTimer(prev => prev + 1);
    
    // Calculate density for each direction
    const northDensity = vehicles.filter(v => v.fromDirection === 'North' && !v.hasTurned).length;
    const southDensity = vehicles.filter(v => v.fromDirection === 'South' && !v.hasTurned).length;
    const eastDensity = vehicles.filter(v => v.fromDirection === 'East' && !v.hasTurned).length;
    const westDensity = vehicles.filter(v => v.fromDirection === 'West' && !v.hasTurned).length;
    
    // Calculate dynamic phase duration based on density
    const nsDensity = northDensity + southDensity;
    const ewDensity = eastDensity + westDensity;
    
    const baseTime = 20 * 60; // 20 seconds base
    const timePerVehicle = 3 * 60; // 3 seconds per vehicle
    const minTime = 10 * 60; // Minimum 10 seconds
    const maxTime = 60 * 60; // Maximum 60 seconds
    
    // Priority-based timing: higher density gets more green time
    let nsWaitTime = Math.min(maxTime, Math.max(minTime, baseTime + nsDensity * timePerVehicle));
    let ewWaitTime = Math.min(maxTime, Math.max(minTime, baseTime + ewDensity * timePerVehicle));
    
    // If one axis has much more traffic, give it extra time
    const densityRatio = Math.max(nsDensity, ewDensity) / (Math.min(nsDensity, ewDensity) || 1);
    if (densityRatio > 2) {
      if (nsDensity > ewDensity) {
        nsWaitTime = Math.min(maxTime, nsWaitTime * 1.3);
        ewWaitTime = Math.max(minTime, ewWaitTime * 0.7);
      } else {
        ewWaitTime = Math.min(maxTime, ewWaitTime * 1.3);
        nsWaitTime = Math.max(minTime, nsWaitTime * 0.7);
      }
    }
    
    const currentWaitTime = currentPhase === 'NS' ? nsWaitTime : ewWaitTime;
    
    // Phase transitions - CRITICAL: Never all red, never all green
    const yellowTime = 180; // 3 seconds
    
    if (phaseTimer >= currentWaitTime) {
      // SWITCH PHASE
      const newPhase = currentPhase === 'NS' ? 'EW' : 'NS';
      setPhaseTimer(0);
      setCurrentPhase(newPhase);
      
      // Update signal states - NEW phase gets green, OLD phase gets red
      setTrafficSignals(prev => prev.map(signal => {
        const isNorthSouth = signal.position === 'North' || signal.position === 'South';
        const isEastWest = signal.position === 'East' || signal.position === 'West';
        
        if (newPhase === 'NS') {
          // NS gets green, EW stays/becomes red
          return { 
            ...signal, 
            state: isNorthSouth ? 'green' : 'red', 
            timer: 0 
          };
        } else {
          // EW gets green, NS stays/becomes red
          return { 
            ...signal, 
            state: isEastWest ? 'green' : 'red', 
            timer: 0 
          };
        }
      }));
    } else if (phaseTimer === currentWaitTime - yellowTime) {
      // Yellow warning for CURRENT green phase only
      setTrafficSignals(prev => prev.map(signal => {
        const isNorthSouth = signal.position === 'North' || signal.position === 'South';
        const isEastWest = signal.position === 'East' || signal.position === 'West';
        
        // Only turn yellow if currently green
        if ((currentPhase === 'NS' && isNorthSouth) ||
            (currentPhase === 'EW' && isEastWest)) {
          return { ...signal, state: 'yellow' };
        }
        return signal;
      }));
    }
    
    // Update timers
    setTrafficSignals(prev => prev.map(signal => ({
      ...signal,
      timer: signal.timer + 1,
      waitingTime: signal.state === 'green' ? 
        Math.ceil((currentWaitTime - phaseTimer) / 60) : 
        Math.ceil((currentWaitTime + (currentPhase === 'NS' ? ewWaitTime : nsWaitTime) - phaseTimer) / 60)
    })));
  }, [vehicles, currentPhase, phaseTimer]);
  
  // Update vehicles with proper lane discipline and collision prevention
  const updateVehicles = useCallback(() => {
    setVehicles(prev => {
      const updated = prev.map((vehicle, index) => {
        const signal = trafficSignals.find(s => s.position === vehicle.fromDirection);
        const canMove = signal?.state === 'green' || signal?.state === 'yellow';
        
        let newX = vehicle.x;
        let newY = vehicle.y;
        let newWaitingTime = vehicle.waitingTime;
        let hasTurned = vehicle.hasTurned;
        let currentLane = vehicle.currentLane;
        
        // Define stop line positions (before intersection)
        const STOP_LINE_OFFSET = 50;
        const stopLinePositions = {
          'North': CENTER_Y - INTERSECTION_SIZE/2 - STOP_LINE_OFFSET,
          'South': CENTER_Y + INTERSECTION_SIZE/2 + STOP_LINE_OFFSET,
          'East': CENTER_X + INTERSECTION_SIZE/2 + STOP_LINE_OFFSET,
          'West': CENTER_X - INTERSECTION_SIZE/2 - STOP_LINE_OFFSET
        };
        
        // Check if at stop line
        const atStopLine = 
          (vehicle.fromDirection === 'North' && !hasTurned && 
           vehicle.y >= stopLinePositions.North - 5 && vehicle.y <= stopLinePositions.North + 5) ||
          (vehicle.fromDirection === 'South' && !hasTurned && 
           vehicle.y <= stopLinePositions.South + 5 && vehicle.y >= stopLinePositions.South - 5) ||
          (vehicle.fromDirection === 'East' && !hasTurned && 
           vehicle.x <= stopLinePositions.East + 5 && vehicle.x >= stopLinePositions.East - 5) ||
          (vehicle.fromDirection === 'West' && !hasTurned && 
           vehicle.x >= stopLinePositions.West - 5 && vehicle.x <= stopLinePositions.West + 5);
        
        // Check if at intersection
        const atIntersection = Math.abs(vehicle.x - CENTER_X) < INTERSECTION_SIZE/2 && 
                              Math.abs(vehicle.y - CENTER_Y) < INTERSECTION_SIZE/2;
        
        // Calculate potential new position
        let potentialX = newX;
        let potentialY = newY;
        
        if (!hasTurned) {
          // Moving towards intersection
          switch (vehicle.fromDirection) {
            case 'North':
              potentialY = vehicle.y + vehicle.speed;
              potentialX = CENTER_X + 15; // Stay in incoming lane
              break;
            case 'South':
              potentialY = vehicle.y - vehicle.speed;
              potentialX = CENTER_X - 15; // Stay in incoming lane
              break;
            case 'East':
              potentialX = vehicle.x - vehicle.speed;
              potentialY = CENTER_Y + 15; // Stay in incoming lane (E2 - bottom)
              break;
            case 'West':
              potentialX = vehicle.x + vehicle.speed;
              potentialY = CENTER_Y - 15; // Stay in incoming lane (W2 - top)
              break;
          }
        } else {
          // Moving away from intersection in new direction
          switch (vehicle.toDirection) {
            case 'North':
              potentialY = vehicle.y - vehicle.speed;
              potentialX = CENTER_X - 15; // Outgoing lane
              break;
            case 'South':
              potentialY = vehicle.y + vehicle.speed;
              potentialX = CENTER_X + 15; // Outgoing lane
              break;
            case 'East':
              potentialX = vehicle.x + vehicle.speed;
              potentialY = CENTER_Y - 15; // Outgoing lane (E1 - top)
              break;
            case 'West':
              potentialX = vehicle.x - vehicle.speed;
              potentialY = CENTER_Y + 15; // Outgoing lane (W1 - bottom)
              break;
          }
        }
        
        // Check for collision with ALL other vehicles
        let canMoveToPosition = true;
        const minDistance = 30; // Increased for better spacing
        
        for (let i = 0; i < prev.length; i++) {
          if (i === index) continue;
          const other = prev[i];
          
          const dx = potentialX - other.x;
          const dy = potentialY - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) {
            // Check if vehicles are in same lane or path
            const sameLane = 
              (vehicle.currentLane === other.currentLane) ||
              (!vehicle.hasTurned && !other.hasTurned && vehicle.fromDirection === other.fromDirection) ||
              (vehicle.hasTurned && other.hasTurned && vehicle.toDirection === other.toDirection);
            
            if (sameLane) {
              // Check if other vehicle is ahead
              let isAhead = false;
              if (!vehicle.hasTurned) {
                switch (vehicle.fromDirection) {
                  case 'North': isAhead = other.y > vehicle.y; break;
                  case 'South': isAhead = other.y < vehicle.y; break;
                  case 'East': isAhead = other.x < vehicle.x; break;
                  case 'West': isAhead = other.x > vehicle.x; break;
                }
              } else {
                switch (vehicle.toDirection) {
                  case 'North': isAhead = other.y < vehicle.y; break;
                  case 'South': isAhead = other.y > vehicle.y; break;
                  case 'East': isAhead = other.x > vehicle.x; break;
                  case 'West': isAhead = other.x < vehicle.x; break;
                }
              }
              
              if (isAhead || distance < 20) {
                canMoveToPosition = false;
                break;
              }
            } else if (distance < 20) {
              // Different lanes but too close - prevent collision
              canMoveToPosition = false;
              break;
            }
          }
        }
        
        // Decision logic
        if (atStopLine && !canMove) {
          // Stop at stop line if red light
          newWaitingTime = vehicle.waitingTime + 1;
          // Don't update position
        } else if (!canMoveToPosition) {
          // Can't move due to vehicle ahead
          newWaitingTime = vehicle.waitingTime + 1;
          // Don't update position
        } else {
          // Can move
          newWaitingTime = 0;
          newX = potentialX;
          newY = potentialY;
          
          // Handle turning at intersection
          if (atIntersection && !hasTurned) {
            hasTurned = true;
            // Update lane based on turn direction (outgoing lanes)
            switch (vehicle.toDirection) {
              case 'North': currentLane = 'N2'; break;
              case 'South': currentLane = 'S2'; break;
              case 'East': currentLane = 'E1'; break; // E1 is outgoing for East
              case 'West': currentLane = 'W1'; break; // W1 is outgoing for West
            }
          }
        }
        
        return { 
          ...vehicle, 
          x: newX, 
          y: newY, 
          waitingTime: newWaitingTime,
          hasTurned,
          currentLane
        };
      }).filter(v => {
        // Remove vehicles that have left the canvas
        return v.x >= -50 && v.x <= canvasWidth + 50 && 
               v.y >= -50 && v.y <= CANVAS_HEIGHT + 50;
      });
      
      // Add new vehicles with spacing check
      if (Math.random() < 0.015 && updated.length < 20) {
        const newVehicle = generateVehicle();
        
        // Check if spawn position is clear
        let canSpawn = true;
        for (const existing of updated) {
          const dx = newVehicle.x - existing.x;
          const dy = newVehicle.y - existing.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 40) {
            canSpawn = false;
            break;
          }
        }
        
        if (canSpawn) {
          updated.push(newVehicle);
        }
      }
      
      return updated;
    });
  }, [trafficSignals, generateVehicle, CENTER_X, CENTER_Y, INTERSECTION_SIZE]);
  
  // Draw everything
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, CANVAS_HEIGHT);
    
    // Draw roads
    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, CENTER_Y - ROAD_WIDTH/2, canvasWidth, ROAD_WIDTH);
    ctx.fillRect(CENTER_X - ROAD_WIDTH/2, 0, ROAD_WIDTH, CANVAS_HEIGHT);
    
    // Draw intersection
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(CENTER_X - INTERSECTION_SIZE/2, CENTER_Y - INTERSECTION_SIZE/2, INTERSECTION_SIZE, INTERSECTION_SIZE);
    
    // Draw lane dividers
    ctx.strokeStyle = '#F39C12';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, CENTER_Y);
    ctx.lineTo(CENTER_X - INTERSECTION_SIZE/2, CENTER_Y);
    ctx.moveTo(CENTER_X + INTERSECTION_SIZE/2, CENTER_Y);
    ctx.lineTo(canvasWidth, CENTER_Y);
    ctx.stroke();
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(CENTER_X, 0);
    ctx.lineTo(CENTER_X, CENTER_Y - INTERSECTION_SIZE/2);
    ctx.moveTo(CENTER_X, CENTER_Y + INTERSECTION_SIZE/2);
    ctx.lineTo(CENTER_X, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw zebra crossings (black and white stripes)
    const STOP_LINE_OFFSET = 50;
    const STRIPE_WIDTH = 6;
    const CROSSING_WIDTH = 8;
    
    // North zebra crossing
    for (let i = 0; i < Math.floor(ROAD_WIDTH / STRIPE_WIDTH); i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
      ctx.fillRect(
        CENTER_X + i * STRIPE_WIDTH,
        CENTER_Y - INTERSECTION_SIZE/2 - STOP_LINE_OFFSET - CROSSING_WIDTH/2,
        STRIPE_WIDTH,
        CROSSING_WIDTH
      );
    }
    
    // South zebra crossing
    for (let i = 0; i < Math.floor(ROAD_WIDTH / STRIPE_WIDTH); i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
      ctx.fillRect(
        CENTER_X - ROAD_WIDTH + i * STRIPE_WIDTH,
        CENTER_Y + INTERSECTION_SIZE/2 + STOP_LINE_OFFSET - CROSSING_WIDTH/2,
        STRIPE_WIDTH,
        CROSSING_WIDTH
      );
    }
    
    // East zebra crossing - bottom lane (E2 incoming)
    for (let i = 0; i < Math.floor(ROAD_WIDTH / 2 / STRIPE_WIDTH); i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
      ctx.fillRect(
        CENTER_X + INTERSECTION_SIZE/2 + STOP_LINE_OFFSET - CROSSING_WIDTH/2,
        CENTER_Y + i * STRIPE_WIDTH,
        CROSSING_WIDTH,
        STRIPE_WIDTH
      );
    }
    
    // West zebra crossing - top lane (W2 incoming)
    for (let i = 0; i < Math.floor(ROAD_WIDTH / 2 / STRIPE_WIDTH); i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#000000';
      ctx.fillRect(
        CENTER_X - INTERSECTION_SIZE/2 - STOP_LINE_OFFSET - CROSSING_WIDTH/2,
        CENTER_Y - ROAD_WIDTH/2 + i * STRIPE_WIDTH,
        CROSSING_WIDTH,
        STRIPE_WIDTH
      );
    }
    
    // Draw traffic signals at proper positions
    trafficSignals.forEach(signal => {
      // Signal housing
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(signal.x - 20, signal.y - 7, 40, 14);
      
      // Three lights
      const colors = {
        red: signal.state === 'red' ? '#FF0000' : '#4A0000',
        yellow: signal.state === 'yellow' ? '#FFD700' : '#4A4A00',
        green: signal.state === 'green' ? '#00FF00' : '#004A00'
      };
      
      // Draw lights
      ctx.beginPath();
      ctx.arc(signal.x - 10, signal.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors.red;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(signal.x, signal.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors.yellow;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(signal.x + 10, signal.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors.green;
      ctx.fill();
      
      // Draw countdown - position to avoid road overlap
      ctx.fillStyle = signal.state === 'green' ? '#00FF00' : 
                     signal.state === 'yellow' ? '#FFD700' : '#FF0000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      
      // Position timer based on signal location
      let timerX = signal.x;
      let timerY = signal.y + 25;
      
      if (signal.position === 'East') {
        timerX = signal.x + 30; // Move to right
        timerY = signal.y + 5;
      } else if (signal.position === 'West') {
        timerX = signal.x - 30; // Move to left
        timerY = signal.y + 5;
      }
      
      ctx.fillText(signal.waitingTime.toString(), timerX, timerY);
    });
    
    // Draw vehicles
    vehicles.forEach(vehicle => {
      ctx.fillStyle = vehicle.color;
      ctx.fillRect(vehicle.x - vehicle.size/2, vehicle.y - vehicle.size/2, vehicle.size, vehicle.size);
    });
    
    // Draw stats
    const northDensity = vehicles.filter(v => v.fromDirection === 'North' && !v.hasTurned).length;
    const southDensity = vehicles.filter(v => v.fromDirection === 'South' && !v.hasTurned).length;
    const eastDensity = vehicles.filter(v => v.fromDirection === 'East' && !v.hasTurned).length;
    const westDensity = vehicles.filter(v => v.fromDirection === 'West' && !v.hasTurned).length;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`N: ${northDensity}`, 10, 20);
    ctx.fillText(`S: ${southDensity}`, 10, 40);
    ctx.fillText(`E: ${eastDensity}`, 10, 60);
    ctx.fillText(`W: ${westDensity}`, 10, 80);
    ctx.fillText(`Phase: ${currentPhase}`, 10, 100);
  }, [trafficSignals, vehicles, currentPhase, canvasWidth]);
  
  // Animation loop
  const animate = useCallback(() => {
    if (!isRunning) return;
    
    frameCountRef.current++;
    
    // Control speed
    const framesPerUpdate = speed >= 1.5 ? 1 : Math.round(2 / speed);
    const updatesPerFrame = speed > 1.5 ? Math.floor(speed) : 1;
    
    if (frameCountRef.current % framesPerUpdate === 0) {
      for (let i = 0; i < updatesPerFrame; i++) {
        updateTrafficSignals();
        updateVehicles();
      }
    }
    
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [isRunning, speed, updateTrafficSignals, updateVehicles, draw]);
  
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
  
  const handleStart = () => {
    setIsRunning(true);
    frameCountRef.current = 0;
    
    // Add initial vehicles
    if (vehicles.length === 0) {
      const initial = [];
      for (let i = 0; i < 8; i++) {
        initial.push(generateVehicle());
      }
      setVehicles(initial);
    }
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setVehicles([]);
    setPhaseTimer(0);
    setCurrentPhase('EW');
    frameCountRef.current = 0;
    vehicleIdRef.current = 0;
    
    // Reset signals
    setTrafficSignals([
      { position: 'North', facingDirection: 'south', state: 'red', timer: 0, waitingTime: 30, x: CENTER_X + 35, y: CENTER_Y - 75 },
      { position: 'South', facingDirection: 'north', state: 'red', timer: 0, waitingTime: 30, x: CENTER_X - 35, y: CENTER_Y + 75 },
      { position: 'East', facingDirection: 'west', state: 'green', timer: 0, waitingTime: 30, x: CENTER_X + 75, y: CENTER_Y + 35 },
      { position: 'West', facingDirection: 'east', state: 'green', timer: 0, waitingTime: 30, x: CENTER_X - 75, y: CENTER_Y - 35 },
    ]);
    
    // Auto-start
    setTimeout(() => {
      handleStart();
    }, 100);
  };
  
  return (
    <div className="traffic-simulator">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={CANVAS_HEIGHT}
          style={{ 
            border: '2px solid #333',
            background: '#1a1a1a',
            borderRadius: '8px',
            display: 'block',
            cursor: 'ew-resize'
          }}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          color: '#fff'
        }}>
          <button 
            onClick={() => setCanvasWidth(prev => Math.min(1200, prev + 50))}
            style={{
              padding: '8px 12px',
              background: '#3498db',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ▶
          </button>
          <button 
            onClick={() => setCanvasWidth(prev => Math.max(400, prev - 50))}
            style={{
              padding: '8px 12px',
              background: '#3498db',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ◀
          </button>
          <div style={{ 
            fontSize: '12px', 
            textAlign: 'center',
            color: '#95a5a6'
          }}>
            {canvasWidth}px
          </div>
        </div>
      </div>
      
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
            
            <button 
              className="control-btn secondary reset"
              onClick={handleReset}
            >
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
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulatorV2;
