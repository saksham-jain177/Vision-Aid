import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, TrendingUp, AlertTriangle, Activity, X } from 'lucide-react';
import { 
  MultiIntersectionCoordinator, 
  IntersectionNode, 
  NetworkMetrics,
  CoordinationStrategy 
} from '../../services/multiIntersectionCoordination';
import './IntersectionGridView.css';

interface IntersectionGridViewProps {
  isVisible: boolean;
  rows?: number;
  cols?: number;
  onClose?: () => void;
}

/**
 * IntersectionGridView Component
 * Displays a grid of intersections with real-time coordination visualization
 */
const IntersectionGridView: React.FC<IntersectionGridViewProps> = ({ 
  isVisible, 
  rows = 3, 
  cols = 3,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coordinator] = useState(() => new MultiIntersectionCoordinator());
  const [intersections, setIntersections] = useState<IntersectionNode[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [strategy, setStrategy] = useState<CoordinationStrategy['type']>('adaptive_offset');
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize grid
  useEffect(() => {
    if (isVisible) {
      coordinator.initializeGrid(rows, cols);
      setIntersections(coordinator.getIntersections());
    }
  }, [isVisible, rows, cols, coordinator]);

  // Animation loop
  useEffect(() => {
    if (!isVisible) return;

    const animate = () => {
      // Update each intersection
      intersections.forEach(intersection => {
        // Update phase timer
        const newTimer = intersection.phaseTimer + 0.1;
        if (newTimer >= 30) {
          // Switch phase
          const newPhase: 'north-south' | 'east-west' = 
            intersection.currentPhase === 'north-south' ? 'east-west' : 'north-south';
          
          coordinator.updateIntersection(intersection.id, {
            currentPhase: newPhase,
            phaseTimer: 0,
            signalState: {
              north: newPhase === 'north-south' ? 'green' : 'red',
              south: newPhase === 'north-south' ? 'green' : 'red',
              east: newPhase === 'east-west' ? 'green' : 'red',
              west: newPhase === 'east-west' ? 'green' : 'red'
            }
          });
        } else {
          coordinator.updateIntersection(intersection.id, {
            phaseTimer: newTimer
          });
        }

        // Simulate traffic changes
        const vehicleChange = Math.floor(Math.random() * 3) - 1;
        const newVehicleCount = Math.max(0, Math.min(30, intersection.vehicleCount + vehicleChange));
        coordinator.updateIntersection(intersection.id, {
          vehicleCount: newVehicleCount,
          congestionLevel: (newVehicleCount / 30) * 100
        });
      });

      // Execute coordination strategy
      coordinator.executeStrategy();

      // Update metrics
      setMetrics(coordinator.calculateNetworkMetrics());

      // Update intersections
      setIntersections([...coordinator.getIntersections()]);

      // Draw canvas
      drawGrid();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, intersections, coordinator]);

  // Draw grid on canvas
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw roads connecting intersections
    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 3;

    intersections.forEach(intersection => {
      intersection.connectedIntersections.forEach(connectedId => {
        const connected = intersections.find(i => i.id === connectedId);
        if (connected) {
          ctx.beginPath();
          ctx.moveTo(intersection.position.x, intersection.position.y);
          ctx.lineTo(connected.position.x, connected.position.y);
          ctx.stroke();
        }
      });
    });

    // Draw intersections
    intersections.forEach(intersection => {
      const { x, y } = intersection.position;
      const size = 20;

      // Draw intersection box
      ctx.fillStyle = '#2D3748';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      // Draw signal state
      const signalSize = 6;
      const offset = size / 2 + 5;

      // North signal
      ctx.fillStyle = intersection.signalState.north === 'green' ? '#48BB78' : '#E53E3E';
      ctx.beginPath();
      ctx.arc(x, y - offset, signalSize, 0, Math.PI * 2);
      ctx.fill();

      // South signal
      ctx.fillStyle = intersection.signalState.south === 'green' ? '#48BB78' : '#E53E3E';
      ctx.beginPath();
      ctx.arc(x, y + offset, signalSize, 0, Math.PI * 2);
      ctx.fill();

      // East signal
      ctx.fillStyle = intersection.signalState.east === 'green' ? '#48BB78' : '#E53E3E';
      ctx.beginPath();
      ctx.arc(x + offset, y, signalSize, 0, Math.PI * 2);
      ctx.fill();

      // West signal
      ctx.fillStyle = intersection.signalState.west === 'green' ? '#48BB78' : '#E53E3E';
      ctx.beginPath();
      ctx.arc(x - offset, y, signalSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw congestion indicator
      const congestionColor = 
        intersection.congestionLevel > 70 ? '#E53E3E' :
        intersection.congestionLevel > 40 ? '#F6AD55' : '#48BB78';
      
      ctx.fillStyle = congestionColor;
      ctx.fillRect(x - size / 2, y - size / 2 - 8, (size * intersection.congestionLevel) / 100, 3);

      // Draw vehicle count
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(intersection.vehicleCount.toString(), x, y + size / 2 + 18);
    });
  };

  // Handle strategy change
  const handleStrategyChange = (newStrategy: CoordinationStrategy['type']) => {
    setStrategy(newStrategy);
    coordinator.setStrategy({
      type: newStrategy,
      description: getStrategyDescription(newStrategy),
      efficiency: 0
    });
  };

  const getStrategyDescription = (strategyType: CoordinationStrategy['type']): string => {
    switch (strategyType) {
      case 'green_wave':
        return 'Synchronized green lights for smooth traffic flow';
      case 'adaptive_offset':
        return 'Real-time adaptation based on traffic conditions';
      case 'distributed_control':
        return 'Each intersection coordinates with neighbors';
      case 'predictive':
        return 'Predicts traffic waves and adjusts proactively';
      default:
        return '';
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="intersection-grid-view"
    >
      <div className="grid-header">
        <div className="grid-title">
          <Grid3x3 size={24} />
          <h3>Multi-Intersection Coordination Network</h3>
        </div>
        <div className="grid-header-controls">
          <div className="strategy-selector">
            <label>Coordination Strategy:</label>
            <select value={strategy} onChange={(e) => handleStrategyChange(e.target.value as any)}>
              <option value="adaptive_offset">Adaptive Offset</option>
              <option value="green_wave">Green Wave</option>
              <option value="distributed_control">Distributed Control</option>
              <option value="predictive">Predictive</option>
            </select>
          </div>
          {onClose && (
            <button onClick={onClose} className="grid-close-button" title="Close Grid View">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="grid-content">
        <div className="grid-canvas-container">
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            className="grid-canvas"
          />
        </div>

        {metrics && (
          <div className="grid-metrics">
            <div className="metric-card">
              <Activity size={20} className="metric-icon" />
              <div className="metric-content">
                <div className="metric-label">Network Efficiency</div>
                <div className="metric-value">{metrics.coordinationEfficiency.toFixed(1)}%</div>
              </div>
            </div>

            <div className="metric-card">
              <TrendingUp size={20} className="metric-icon success" />
              <div className="metric-content">
                <div className="metric-label">Total Vehicles</div>
                <div className="metric-value">{metrics.totalVehicles}</div>
              </div>
            </div>

            <div className="metric-card">
              <Activity size={20} className="metric-icon" />
              <div className="metric-content">
                <div className="metric-label">Avg Wait Time</div>
                <div className="metric-value">{metrics.averageWaitTime.toFixed(1)}s</div>
              </div>
            </div>

            <div className="metric-card">
              <TrendingUp size={20} className="metric-icon success" />
              <div className="metric-content">
                <div className="metric-label">Throughput</div>
                <div className="metric-value">{metrics.networkThroughput.toFixed(0)} v/h</div>
              </div>
            </div>

            <div className="metric-card">
              <Activity size={20} className="metric-icon success" />
              <div className="metric-content">
                <div className="metric-label">CO₂ Reduction</div>
                <div className="metric-value">{metrics.co2Reduction.toFixed(1)}%</div>
              </div>
            </div>

            {metrics.congestionHotspots.length > 0 && (
              <div className="metric-card alert">
                <AlertTriangle size={20} className="metric-icon warning" />
                <div className="metric-content">
                  <div className="metric-label">Congestion Hotspots</div>
                  <div className="metric-value">{metrics.congestionHotspots.length}</div>
                  <div className="hotspot-list">
                    {metrics.congestionHotspots.map((name, i) => (
                      <span key={i} className="hotspot-badge">{name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#48BB78' }}></div>
          <span>Green Signal</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#E53E3E' }}></div>
          <span>Red Signal</span>
        </div>
        <div className="legend-item">
          <div className="legend-bar low"></div>
          <span>Low Congestion</span>
        </div>
        <div className="legend-item">
          <div className="legend-bar high"></div>
          <span>High Congestion</span>
        </div>
      </div>
    </motion.div>
  );
};

export default IntersectionGridView;
