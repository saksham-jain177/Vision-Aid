// Performance Metrics and Analytics Service
// Provides comprehensive performance tracking and analytics for traffic management

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: 'efficiency' | 'safety' | 'environmental' | 'user_experience';
  timestamp: number;
  trend: 'improving' | 'declining' | 'stable';
  target: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface TrafficAnalytics {
  efficiency: {
    averageWaitTime: number;
    throughput: number;
    flowRate: number;
    signalEfficiency: number;
    queueLength: number;
  };
  safety: {
    incidentCount: number;
    speedViolations: number;
    nearMisses: number;
    emergencyResponseTime: number;
    safetyScore: number;
  };
  environmental: {
    emissionsReduction: number;
    fuelEfficiency: number;
    noiseReduction: number;
    airQuality: number;
  };
  userExperience: {
    satisfactionScore: number;
    complaintCount: number;
    accessibilityScore: number;
    reliabilityScore: number;
  };
}

export interface PerformanceReport {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startTime: number;
  endTime: number;
  summary: {
    overallScore: number;
    keyAchievements: string[];
    areasForImprovement: string[];
    recommendations: string[];
  };
  metrics: PerformanceMetric[];
  analytics: TrafficAnalytics;
  comparisons: {
    previousPeriod: number;
    target: number;
    industryAverage: number;
  };
}

export interface PerformanceConfig {
  dataRetentionDays: number;
  reportingInterval: number; // minutes
  alertThresholds: {
    waitTime: number;
    incidentRate: number;
    efficiency: number;
  };
  targets: {
    maxWaitTime: number;
    minThroughput: number;
    maxIncidents: number;
  };
}

export class PerformanceMetricsService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private config: PerformanceConfig;
  private alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    resolved: boolean;
  }> = [];

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  // Record a performance metric
  public recordMetric(
    name: string,
    value: number,
    unit: string,
    category: 'efficiency' | 'safety' | 'environmental' | 'user_experience',
    target?: number
  ): void {
    const metric: PerformanceMetric = {
      id: `${name}-${Date.now()}`,
      name,
      value,
      unit,
      category,
      timestamp: Date.now(),
      trend: this.calculateTrend(name, value),
      target: target || this.getDefaultTarget(name),
      status: this.calculateStatus(name, value, target)
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only recent data
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    this.metrics.set(name, metricHistory.filter(m => m.timestamp > cutoffTime));

    // Check for alerts
    this.checkAlerts(metric);
  }

  // Calculate trend for a metric
  private calculateTrend(name: string, currentValue: number): 'improving' | 'declining' | 'stable' {
    const history = this.metrics.get(name);
    if (!history || history.length < 2) return 'stable';

    const recent = history.slice(-5); // Last 5 values
    const older = history.slice(-10, -5); // Previous 5 values

    if (recent.length < 2 || older.length < 2) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  // Calculate status for a metric
  private calculateStatus(name: string, value: number, target?: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const targetValue = target || this.getDefaultTarget(name);
    const ratio = value / targetValue;

    // For metrics where lower is better (wait time, incidents)
    const isLowerBetter = ['waitTime', 'incidents', 'emissions', 'noise'].includes(name);

    if (isLowerBetter) {
      if (ratio <= 0.5) return 'excellent';
      if (ratio <= 0.8) return 'good';
      if (ratio <= 1.0) return 'fair';
      if (ratio <= 1.5) return 'poor';
      return 'critical';
    } else {
      // For metrics where higher is better (throughput, efficiency)
      if (ratio >= 1.5) return 'excellent';
      if (ratio >= 1.2) return 'good';
      if (ratio >= 1.0) return 'fair';
      if (ratio >= 0.8) return 'poor';
      return 'critical';
    }
  }

  // Get default target for a metric
  private getDefaultTarget(name: string): number {
    const targets: { [key: string]: number } = {
      waitTime: 30, // seconds
      throughput: 100, // vehicles per hour
      flowRate: 50, // vehicles per minute
      signalEfficiency: 80, // percentage
      incidentCount: 0, // incidents per day
      speedViolations: 5, // violations per hour
      emissionsReduction: 20, // percentage
      satisfactionScore: 4.0, // out of 5
    };
    return targets[name] || 100;
  }

  // Check for alerts
  private checkAlerts(metric: PerformanceMetric): void {
    const alerts = [];

    // Wait time alert
    if (metric.name === 'waitTime' && metric.value > this.config.alertThresholds.waitTime) {
      alerts.push({
        id: `wait-time-${Date.now()}`,
        type: 'wait_time',
        message: `Average wait time is ${metric.value.toFixed(1)}s, exceeding threshold of ${this.config.alertThresholds.waitTime}s`,
        severity: metric.value > this.config.alertThresholds.waitTime * 1.5 ? 'critical' : 'high',
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Incident rate alert
    if (metric.name === 'incidentCount' && metric.value > this.config.alertThresholds.incidentRate) {
      alerts.push({
        id: `incident-rate-${Date.now()}`,
        type: 'incident_rate',
        message: `Incident count is ${metric.value}, exceeding threshold of ${this.config.alertThresholds.incidentRate}`,
        severity: metric.value > this.config.alertThresholds.incidentRate * 2 ? 'critical' : 'high',
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Efficiency alert
    if (metric.name === 'signalEfficiency' && metric.value < this.config.alertThresholds.efficiency) {
      alerts.push({
        id: `efficiency-${Date.now()}`,
        type: 'efficiency',
        message: `Signal efficiency is ${metric.value.toFixed(1)}%, below threshold of ${this.config.alertThresholds.efficiency}%`,
        severity: metric.value < this.config.alertThresholds.efficiency * 0.7 ? 'critical' : 'medium',
        timestamp: Date.now(),
        resolved: false
      });
    }

    this.alerts.push(...alerts);
  }

  // Get current analytics
  public getCurrentAnalytics(): TrafficAnalytics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    return {
      efficiency: {
        averageWaitTime: this.getLatestMetric('waitTime')?.value || 0,
        throughput: this.getLatestMetric('throughput')?.value || 0,
        flowRate: this.getLatestMetric('flowRate')?.value || 0,
        signalEfficiency: this.getLatestMetric('signalEfficiency')?.value || 0,
        queueLength: this.getLatestMetric('queueLength')?.value || 0,
      },
      safety: {
        incidentCount: this.getLatestMetric('incidentCount')?.value || 0,
        speedViolations: this.getLatestMetric('speedViolations')?.value || 0,
        nearMisses: this.getLatestMetric('nearMisses')?.value || 0,
        emergencyResponseTime: this.getLatestMetric('emergencyResponseTime')?.value || 0,
        safetyScore: this.calculateSafetyScore(),
      },
      environmental: {
        emissionsReduction: this.getLatestMetric('emissionsReduction')?.value || 0,
        fuelEfficiency: this.getLatestMetric('fuelEfficiency')?.value || 0,
        noiseReduction: this.getLatestMetric('noiseReduction')?.value || 0,
        airQuality: this.getLatestMetric('airQuality')?.value || 0,
      },
      userExperience: {
        satisfactionScore: this.getLatestMetric('satisfactionScore')?.value || 0,
        complaintCount: this.getLatestMetric('complaintCount')?.value || 0,
        accessibilityScore: this.getLatestMetric('accessibilityScore')?.value || 0,
        reliabilityScore: this.getLatestMetric('reliabilityScore')?.value || 0,
      }
    };
  }

  // Get latest metric value
  private getLatestMetric(name: string): PerformanceMetric | undefined {
    const history = this.metrics.get(name);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  }

  // Calculate safety score
  private calculateSafetyScore(): number {
    const incidentCount = this.getLatestMetric('incidentCount')?.value || 0;
    const speedViolations = this.getLatestMetric('speedViolations')?.value || 0;
    const nearMisses = this.getLatestMetric('nearMisses')?.value || 0;

    // Safety score out of 100
    let score = 100;
    score -= incidentCount * 10; // -10 points per incident
    score -= speedViolations * 2; // -2 points per violation
    score -= nearMisses * 5; // -5 points per near miss

    return Math.max(0, Math.min(100, score));
  }

  // Generate performance report
  public generateReport(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): PerformanceReport {
    const now = Date.now();
    const startTime = this.getPeriodStartTime(period, now);
    const endTime = now;

    const metrics = this.getMetricsInPeriod(startTime, endTime);
    const analytics = this.getCurrentAnalytics();
    const summary = this.generateSummary(metrics, period);

    return {
      period,
      startTime,
      endTime,
      summary,
      metrics,
      analytics,
      comparisons: {
        previousPeriod: this.calculatePreviousPeriodComparison(period, startTime),
        target: this.calculateTargetComparison(metrics),
        industryAverage: this.getIndustryAverages()
      }
    };
  }

  // Get period start time
  private getPeriodStartTime(period: string, endTime: number): number {
    switch (period) {
      case 'hourly':
        return endTime - (60 * 60 * 1000);
      case 'daily':
        return endTime - (24 * 60 * 60 * 1000);
      case 'weekly':
        return endTime - (7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return endTime - (30 * 24 * 60 * 60 * 1000);
      default:
        return endTime - (24 * 60 * 60 * 1000);
    }
  }

  // Get metrics in period
  private getMetricsInPeriod(startTime: number, endTime: number): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const [name, history] of this.metrics) {
      const periodMetrics = history.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
      allMetrics.push(...periodMetrics);
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Generate summary
  private generateSummary(metrics: PerformanceMetric[], period: string): {
    overallScore: number;
    keyAchievements: string[];
    areasForImprovement: string[];
    recommendations: string[];
  } {
    const overallScore = this.calculateOverallScore(metrics);
    const keyAchievements = this.identifyAchievements(metrics);
    const areasForImprovement = this.identifyImprovementAreas(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      overallScore,
      keyAchievements,
      areasForImprovement,
      recommendations
    };
  }

  // Calculate overall score
  private calculateOverallScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;

    const categoryScores = {
      efficiency: 0,
      safety: 0,
      environmental: 0,
      user_experience: 0
    };

    const categoryCounts = {
      efficiency: 0,
      safety: 0,
      environmental: 0,
      user_experience: 0
    };

    metrics.forEach(metric => {
      const statusScore = this.getStatusScore(metric.status);
      categoryScores[metric.category] += statusScore;
      categoryCounts[metric.category]++;
    });

    let totalScore = 0;
    let totalCount = 0;

    Object.keys(categoryScores).forEach(category => {
      if (categoryCounts[category] > 0) {
        totalScore += categoryScores[category] / categoryCounts[category];
        totalCount++;
      }
    });

    return totalCount > 0 ? totalScore / totalCount : 0;
  }

  // Get status score
  private getStatusScore(status: string): number {
    const scores = {
      excellent: 100,
      good: 80,
      fair: 60,
      poor: 40,
      critical: 20
    };
    return scores[status] || 0;
  }

  // Identify achievements
  private identifyAchievements(metrics: PerformanceMetric[]): string[] {
    const achievements = [];

    const excellentMetrics = metrics.filter(m => m.status === 'excellent');
    if (excellentMetrics.length > 0) {
      achievements.push(`${excellentMetrics.length} metrics performing excellently`);
    }

    const improvingMetrics = metrics.filter(m => m.trend === 'improving');
    if (improvingMetrics.length > 0) {
      achievements.push(`${improvingMetrics.length} metrics showing improvement`);
    }

    const waitTimeMetric = metrics.find(m => m.name === 'waitTime');
    if (waitTimeMetric && waitTimeMetric.value < 20) {
      achievements.push('Average wait time below 20 seconds');
    }

    const efficiencyMetric = metrics.find(m => m.name === 'signalEfficiency');
    if (efficiencyMetric && efficiencyMetric.value > 85) {
      achievements.push('Signal efficiency above 85%');
    }

    return achievements;
  }

  // Identify improvement areas
  private identifyImprovementAreas(metrics: PerformanceMetric[]): string[] {
    const improvements = [];

    const criticalMetrics = metrics.filter(m => m.status === 'critical');
    if (criticalMetrics.length > 0) {
      improvements.push(`${criticalMetrics.length} metrics need immediate attention`);
    }

    const decliningMetrics = metrics.filter(m => m.trend === 'declining');
    if (decliningMetrics.length > 0) {
      improvements.push(`${decliningMetrics.length} metrics showing decline`);
    }

    const poorMetrics = metrics.filter(m => m.status === 'poor');
    if (poorMetrics.length > 0) {
      improvements.push(`${poorMetrics.length} metrics performing poorly`);
    }

    return improvements;
  }

  // Generate recommendations
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations = [];

    const waitTimeMetric = metrics.find(m => m.name === 'waitTime');
    if (waitTimeMetric && waitTimeMetric.value > 30) {
      recommendations.push('Consider adjusting signal timing to reduce wait times');
    }

    const incidentMetric = metrics.find(m => m.name === 'incidentCount');
    if (incidentMetric && incidentMetric.value > 5) {
      recommendations.push('Implement additional safety measures to reduce incidents');
    }

    const efficiencyMetric = metrics.find(m => m.name === 'signalEfficiency');
    if (efficiencyMetric && efficiencyMetric.value < 70) {
      recommendations.push('Optimize signal coordination to improve efficiency');
    }

    const speedViolationMetric = metrics.find(m => m.name === 'speedViolations');
    if (speedViolationMetric && speedViolationMetric.value > 10) {
      recommendations.push('Increase speed monitoring and enforcement');
    }

    return recommendations;
  }

  // Calculate previous period comparison
  private calculatePreviousPeriodComparison(period: string, currentStartTime: number): number {
    const previousStartTime = this.getPeriodStartTime(period, currentStartTime);
    const previousEndTime = currentStartTime;

    const currentMetrics = this.getMetricsInPeriod(currentStartTime, Date.now());
    const previousMetrics = this.getMetricsInPeriod(previousStartTime, previousEndTime);

    const currentScore = this.calculateOverallScore(currentMetrics);
    const previousScore = this.calculateOverallScore(previousMetrics);

    return previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : 0;
  }

  // Calculate target comparison
  private calculateTargetComparison(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;

    let totalAchievement = 0;
    let totalTargets = 0;

    metrics.forEach(metric => {
      if (metric.target > 0) {
        const achievement = (metric.value / metric.target) * 100;
        totalAchievement += achievement;
        totalTargets++;
      }
    });

    return totalTargets > 0 ? totalAchievement / totalTargets : 0;
  }

  // Get industry averages
  private getIndustryAverages(): number {
    // These would typically come from industry data
    return 75; // Placeholder industry average score
  }

  // Get active alerts
  public getActiveAlerts(): Array<{
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
  }> {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Resolve alert
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset service
  public reset(): void {
    this.metrics.clear();
    this.alerts = [];
  }
}

// Factory function to create performance metrics service
export function createPerformanceMetricsService(config?: Partial<PerformanceConfig>): PerformanceMetricsService {
  const defaultConfig: PerformanceConfig = {
    dataRetentionDays: 30,
    reportingInterval: 15,
    alertThresholds: {
      waitTime: 30,
      incidentRate: 5,
      efficiency: 70
    },
    targets: {
      maxWaitTime: 20,
      minThroughput: 100,
      maxIncidents: 2
    }
  };

  return new PerformanceMetricsService({ ...defaultConfig, ...config });
}
