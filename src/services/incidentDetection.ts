// Incident Detection and Emergency Response Service
// Implements AI-powered incident detection and automated emergency response

export interface Incident {
  id: string;
  type: 'accident' | 'breakdown' | 'congestion' | 'emergency_vehicle' | 'pedestrian' | 'hazard';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    x: number;
    y: number;
    lane: 'north' | 'south' | 'east' | 'west';
  };
  timestamp: number;
  description: string;
  status: 'detected' | 'responding' | 'resolved' | 'false_alarm';
  affectedVehicles: string[];
  estimatedDuration: number; // minutes
  responseActions: ResponseAction[];
}

export interface ResponseAction {
  id: string;
  type: 'signal_override' | 'lane_closure' | 'emergency_clearance' | 'traffic_reroute' | 'alert_dispatch';
  priority: number; // 1-10, higher is more urgent
  description: string;
  executed: boolean;
  timestamp: number;
  estimatedCompletion: number;
}

export interface EmergencyVehicle {
  id: string;
  type: 'ambulance' | 'fire_truck' | 'police' | 'rescue';
  location: { x: number; y: number };
  destination: { x: number; y: number };
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedArrival: number; // minutes
  status: 'en_route' | 'on_scene' | 'departed';
}

export interface IncidentDetectionConfig {
  accidentThreshold: number; // minimum vehicles stopped to detect accident
  congestionThreshold: number; // minimum vehicles for congestion detection
  speedAnomalyThreshold: number; // speed deviation for anomaly detection
  detectionRadius: number; // radius for incident detection
  responseTimeLimit: number; // maximum response time in minutes
  falseAlarmThreshold: number; // minimum confidence for incident detection
}

export class IncidentDetectionSystem {
  private incidents: Map<string, Incident> = new Map();
  private emergencyVehicles: Map<string, EmergencyVehicle> = new Map();
  private config: IncidentDetectionConfig;
  private detectionHistory: Array<{
    timestamp: number;
    type: string;
    location: { x: number; y: number };
    confidence: number;
  }> = [];

  constructor(config: IncidentDetectionConfig) {
    this.config = config;
  }

  // Analyze traffic data for potential incidents
  public analyzeTrafficData(
    vehicles: Array<{
      id: string;
      x: number;
      y: number;
      speed: number;
      direction: string;
      waitingTime: number;
      isStopped: boolean;
    }>,
    trafficLights: Array<{
      id: string;
      state: string;
      direction: string;
    }>
  ): Incident[] {
    const detectedIncidents: Incident[] = [];

    // Detect accidents (vehicles stopped in unusual locations)
    const accidentIncidents = this.detectAccidents(vehicles);
    detectedIncidents.push(...accidentIncidents);

    // Detect congestion (high vehicle density with low speed)
    const congestionIncidents = this.detectCongestion(vehicles);
    detectedIncidents.push(...congestionIncidents);

    // Detect speed anomalies (unusual speed patterns)
    const speedAnomalies = this.detectSpeedAnomalies(vehicles);
    detectedIncidents.push(...speedAnomalies);

    // Detect emergency vehicles
    const emergencyIncidents = this.detectEmergencyVehicles(vehicles);
    detectedIncidents.push(...emergencyIncidents);

    // Process each detected incident
    for (const incident of detectedIncidents) {
      this.processIncident(incident);
    }

    return Array.from(this.incidents.values()).filter(incident => 
      incident.status === 'detected' || incident.status === 'responding'
    );
  }

  // Detect vehicle accidents
  private detectAccidents(vehicles: any[]): Incident[] {
    const incidents: Incident[] = [];
    const stoppedVehicles = vehicles.filter(v => v.isStopped && v.waitingTime > 30);

    // Group stopped vehicles by proximity
    const accidentGroups = this.groupVehiclesByProximity(stoppedVehicles, 50);

    for (const group of accidentGroups) {
      if (group.length >= this.config.accidentThreshold) {
        const centerLocation = this.calculateGroupCenter(group);
        const severity = this.calculateAccidentSeverity(group);

        const incident: Incident = {
          id: `accident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'accident',
          severity,
          location: centerLocation,
          timestamp: Date.now(),
          description: `Vehicle accident detected with ${group.length} vehicles involved`,
          status: 'detected',
          affectedVehicles: group.map(v => v.id),
          estimatedDuration: severity === 'critical' ? 60 : severity === 'high' ? 45 : 30,
          responseActions: this.generateAccidentResponseActions(severity, centerLocation)
        };

        incidents.push(incident);
      }
    }

    return incidents;
  }

  // Detect traffic congestion
  private detectCongestion(vehicles: any[]): Incident[] {
    const incidents: Incident[] = [];
    const slowVehicles = vehicles.filter(v => v.speed < 10 && !v.isStopped);

    // Group slow vehicles by lane
    const laneGroups = this.groupVehiclesByLane(slowVehicles);

    for (const [lane, vehicles] of laneGroups) {
      if (vehicles.length >= this.config.congestionThreshold) {
        const centerLocation = this.calculateGroupCenter(vehicles);
        const severity = this.calculateCongestionSeverity(vehicles.length);

        const incident: Incident = {
          id: `congestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'congestion',
          severity,
          location: centerLocation,
          timestamp: Date.now(),
          description: `Traffic congestion detected in ${lane} lane with ${vehicles.length} vehicles`,
          status: 'detected',
          affectedVehicles: vehicles.map(v => v.id),
          estimatedDuration: severity === 'high' ? 30 : 15,
          responseActions: this.generateCongestionResponseActions(severity, lane)
        };

        incidents.push(incident);
      }
    }

    return incidents;
  }

  // Detect speed anomalies
  private detectSpeedAnomalies(vehicles: any[]): Incident[] {
    const incidents: Incident[] = [];
    const movingVehicles = vehicles.filter(v => v.speed > 0);

    if (movingVehicles.length < 5) return incidents; // Need minimum data

    const speeds = movingVehicles.map(v => v.speed);
    const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const speedVariance = speeds.reduce((sum, speed) => sum + Math.pow(speed - averageSpeed, 2), 0) / speeds.length;

    // Detect vehicles with significantly different speeds
    const anomalyVehicles = movingVehicles.filter(v => 
      Math.abs(v.speed - averageSpeed) > this.config.speedAnomalyThreshold * Math.sqrt(speedVariance)
    );

    if (anomalyVehicles.length > 0) {
      const centerLocation = this.calculateGroupCenter(anomalyVehicles);

      const incident: Incident = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'hazard',
        severity: 'medium',
        location: centerLocation,
        timestamp: Date.now(),
        description: `Speed anomaly detected with ${anomalyVehicles.length} vehicles`,
        status: 'detected',
        affectedVehicles: anomalyVehicles.map(v => v.id),
        estimatedDuration: 10,
        responseActions: this.generateAnomalyResponseActions(centerLocation)
      };

      incidents.push(incident);
    }

    return incidents;
  }

  // Detect emergency vehicles
  private detectEmergencyVehicles(vehicles: any[]): Incident[] {
    const incidents: Incident[] = [];
    // This would integrate with emergency vehicle detection system
    // For now, return empty array
    return incidents;
  }

  // Group vehicles by proximity
  private groupVehiclesByProximity(vehicles: any[], maxDistance: number): any[][] {
    const groups: any[][] = [];
    const processed = new Set<string>();

    for (const vehicle of vehicles) {
      if (processed.has(vehicle.id)) continue;

      const group = [vehicle];
      processed.add(vehicle.id);

      for (const otherVehicle of vehicles) {
        if (processed.has(otherVehicle.id)) continue;

        const distance = Math.sqrt(
          Math.pow(vehicle.x - otherVehicle.x, 2) + 
          Math.pow(vehicle.y - otherVehicle.y, 2)
        );

        if (distance <= maxDistance) {
          group.push(otherVehicle);
          processed.add(otherVehicle.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  // Group vehicles by lane
  private groupVehiclesByLane(vehicles: any[]): Map<string, any[]> {
    const laneGroups = new Map<string, any[]>();

    for (const vehicle of vehicles) {
      const lane = this.determineLane(vehicle.x, vehicle.y);
      if (!laneGroups.has(lane)) {
        laneGroups.set(lane, []);
      }
      laneGroups.get(lane)!.push(vehicle);
    }

    return laneGroups;
  }

  // Determine vehicle lane based on position
  private determineLane(x: number, y: number): string {
    // Simplified lane detection based on position
    if (y < 200) return 'north';
    if (y > 400) return 'south';
    if (x < 200) return 'west';
    return 'east';
  }

  // Calculate group center location
  private calculateGroupCenter(vehicles: any[]): { x: number; y: number; lane: string } {
    const avgX = vehicles.reduce((sum, v) => sum + v.x, 0) / vehicles.length;
    const avgY = vehicles.reduce((sum, v) => sum + v.y, 0) / vehicles.length;
    const lane = this.determineLane(avgX, avgY);

    return { x: avgX, y: avgY, lane };
  }

  // Calculate accident severity
  private calculateAccidentSeverity(vehicles: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (vehicles.length >= 5) return 'critical';
    if (vehicles.length >= 3) return 'high';
    if (vehicles.length >= 2) return 'medium';
    return 'low';
  }

  // Calculate congestion severity
  private calculateCongestionSeverity(vehicleCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (vehicleCount >= 15) return 'critical';
    if (vehicleCount >= 10) return 'high';
    if (vehicleCount >= 5) return 'medium';
    return 'low';
  }

  // Generate response actions for accidents
  private generateAccidentResponseActions(severity: string, location: any): ResponseAction[] {
    const actions: ResponseAction[] = [];

    // Signal override for emergency clearance
    actions.push({
      id: `signal-override-${Date.now()}`,
      type: 'signal_override',
      priority: severity === 'critical' ? 10 : 8,
      description: 'Override traffic signals for emergency vehicle access',
      executed: false,
      timestamp: Date.now(),
      estimatedCompletion: 2
    });

    // Alert emergency services
    actions.push({
      id: `alert-dispatch-${Date.now()}`,
      type: 'alert_dispatch',
      priority: 10,
      description: 'Dispatch emergency services to accident location',
      executed: false,
      timestamp: Date.now(),
      estimatedCompletion: 5
    });

    // Lane closure if severe
    if (severity === 'high' || severity === 'critical') {
      actions.push({
        id: `lane-closure-${Date.now()}`,
        type: 'lane_closure',
        priority: 7,
        description: `Close ${location.lane} lane for accident investigation`,
        executed: false,
        timestamp: Date.now(),
        estimatedCompletion: 1
      });
    }

    return actions;
  }

  // Generate response actions for congestion
  private generateCongestionResponseActions(severity: string, lane: string): ResponseAction[] {
    const actions: ResponseAction[] = [];

    // Traffic rerouting
    actions.push({
      id: `traffic-reroute-${Date.now()}`,
      type: 'traffic_reroute',
      priority: 6,
      description: `Reroute traffic away from congested ${lane} lane`,
      executed: false,
      timestamp: Date.now(),
      estimatedCompletion: 3
    });

    // Signal timing adjustment
    actions.push({
      id: `signal-adjustment-${Date.now()}`,
      type: 'signal_override',
      priority: 5,
      description: 'Adjust signal timing to clear congestion',
      executed: false,
      timestamp: Date.now(),
      estimatedCompletion: 2
    });

    return actions;
  }

  // Generate response actions for anomalies
  private generateAnomalyResponseActions(location: any): ResponseAction[] {
    return [{
      id: `anomaly-investigation-${Date.now()}`,
      type: 'alert_dispatch',
      priority: 4,
      description: 'Investigate speed anomaly in traffic flow',
      executed: false,
      timestamp: Date.now(),
      estimatedCompletion: 5
    }];
  }

  // Process detected incident
  private processIncident(incident: Incident): void {
    // Check if similar incident already exists
    const existingIncident = this.findSimilarIncident(incident);
    
    if (existingIncident) {
      // Update existing incident
      this.updateIncident(existingIncident.id, incident);
    } else {
      // Add new incident
      this.incidents.set(incident.id, incident);
      this.executeResponseActions(incident);
    }
  }

  // Find similar incident
  private findSimilarIncident(incident: Incident): Incident | null {
    for (const existing of this.incidents.values()) {
      if (existing.type === incident.type && 
          existing.status !== 'resolved' &&
          this.calculateDistance(existing.location, incident.location) < 100) {
        return existing;
      }
    }
    return null;
  }

  // Calculate distance between locations
  private calculateDistance(loc1: any, loc2: any): number {
    return Math.sqrt(
      Math.pow(loc1.x - loc2.x, 2) + Math.pow(loc1.y - loc2.y, 2)
    );
  }

  // Update existing incident
  private updateIncident(incidentId: string, newData: Partial<Incident>): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      Object.assign(incident, newData);
      incident.timestamp = Date.now();
    }
  }

  // Execute response actions
  private executeResponseActions(incident: Incident): void {
    for (const action of incident.responseActions) {
      this.executeResponseAction(action, incident);
    }
  }

  // Execute individual response action
  private executeResponseAction(action: ResponseAction, incident: Incident): void {
    // Simulate action execution
    setTimeout(() => {
      action.executed = true;
      console.log(`Executed response action: ${action.description}`);
    }, action.estimatedCompletion * 1000);
  }

  // Get all active incidents
  public getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(incident => 
      incident.status !== 'resolved'
    );
  }

  // Get incidents by type
  public getIncidentsByType(type: string): Incident[] {
    return Array.from(this.incidents.values()).filter(incident => 
      incident.type === type
    );
  }

  // Get incidents by severity
  public getIncidentsBySeverity(severity: string): Incident[] {
    return Array.from(this.incidents.values()).filter(incident => 
      incident.severity === severity
    );
  }

  // Resolve incident
  public resolveIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = 'resolved';
      return true;
    }
    return false;
  }

  // Get incident statistics
  public getIncidentStats(): {
    total: number;
    active: number;
    resolved: number;
    byType: { [key: string]: number };
    bySeverity: { [key: string]: number };
  } {
    const incidents = Array.from(this.incidents.values());
    const byType: { [key: string]: number } = {};
    const bySeverity: { [key: string]: number } = {};

    incidents.forEach(incident => {
      byType[incident.type] = (byType[incident.type] || 0) + 1;
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    });

    return {
      total: incidents.length,
      active: incidents.filter(i => i.status !== 'resolved').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      byType,
      bySeverity
    };
  }

  // Update configuration
  public updateConfig(newConfig: Partial<IncidentDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset system
  public reset(): void {
    this.incidents.clear();
    this.emergencyVehicles.clear();
    this.detectionHistory = [];
  }
}

// Factory function to create incident detection system
export function createIncidentDetectionSystem(config?: Partial<IncidentDetectionConfig>): IncidentDetectionSystem {
  const defaultConfig: IncidentDetectionConfig = {
    accidentThreshold: 2,
    congestionThreshold: 5,
    speedAnomalyThreshold: 2.0,
    detectionRadius: 100,
    responseTimeLimit: 10,
    falseAlarmThreshold: 0.7
  };

  return new IncidentDetectionSystem({ ...defaultConfig, ...config });
}
