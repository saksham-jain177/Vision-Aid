import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Car, 
  Shield, 
  Leaf, 
  Users,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import { createPerformanceMetricsService, PerformanceReport, TrafficAnalytics } from '../../services/performanceMetrics';
import './PerformanceDashboard.css';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isVisible, onClose }) => {
  const [performanceService] = useState(() => createPerformanceMetricsService());
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null);
  const [analytics, setAnalytics] = useState<TrafficAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [activeTab, setActiveTab] = useState<'overview' | 'efficiency' | 'safety' | 'environmental' | 'alerts'>('overview');

  // Simulate real-time data updates
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      // Simulate recording various metrics
      const now = Date.now();
      const hour = new Date(now).getHours();
      
      // Efficiency metrics
      performanceService.recordMetric('waitTime', 15 + Math.random() * 20, 'seconds', 'efficiency', 20);
      performanceService.recordMetric('throughput', 80 + Math.random() * 40, 'vehicles/hour', 'efficiency', 100);
      performanceService.recordMetric('flowRate', 30 + Math.random() * 20, 'vehicles/min', 'efficiency', 50);
      performanceService.recordMetric('signalEfficiency', 70 + Math.random() * 25, '%', 'efficiency', 80);
      performanceService.recordMetric('queueLength', 5 + Math.random() * 10, 'vehicles', 'efficiency', 8);

      // Safety metrics
      performanceService.recordMetric('incidentCount', Math.floor(Math.random() * 3), 'incidents', 'safety', 2);
      performanceService.recordMetric('speedViolations', Math.floor(Math.random() * 8), 'violations/hour', 'safety', 5);
      performanceService.recordMetric('nearMisses', Math.floor(Math.random() * 5), 'near misses', 'safety', 3);
      performanceService.recordMetric('emergencyResponseTime', 3 + Math.random() * 4, 'minutes', 'safety', 5);

      // Environmental metrics
      performanceService.recordMetric('emissionsReduction', 15 + Math.random() * 10, '%', 'environmental', 20);
      performanceService.recordMetric('fuelEfficiency', 85 + Math.random() * 10, '%', 'environmental', 90);
      performanceService.recordMetric('noiseReduction', 10 + Math.random() * 15, '%', 'environmental', 15);
      performanceService.recordMetric('airQuality', 70 + Math.random() * 20, 'AQI', 'environmental', 80);

      // User experience metrics
      performanceService.recordMetric('satisfactionScore', 3.5 + Math.random() * 1.5, '/5', 'user_experience', 4.0);
      performanceService.recordMetric('complaintCount', Math.floor(Math.random() * 5), 'complaints', 'user_experience', 3);
      performanceService.recordMetric('accessibilityScore', 80 + Math.random() * 15, '%', 'user_experience', 85);
      performanceService.recordMetric('reliabilityScore', 85 + Math.random() * 10, '%', 'user_experience', 90);

      // Update current analytics and report
      setAnalytics(performanceService.getCurrentAnalytics());
      setCurrentReport(performanceService.generateReport(selectedPeriod));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isVisible, selectedPeriod, performanceService]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'excellent': return '#27ae60';
      case 'good': return '#2ecc71';
      case 'fair': return '#f39c12';
      case 'poor': return '#e67e22';
      case 'critical': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={16} />;
      case 'good': return <CheckCircle size={16} />;
      case 'fair': return <AlertTriangle size={16} />;
      case 'poor': return <AlertTriangle size={16} />;
      case 'critical': return <AlertTriangle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp size={16} className="trend-up" />;
      case 'declining': return <TrendingDown size={16} className="trend-down" />;
      default: return <Activity size={16} className="trend-stable" />;
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="performance-dashboard"
    >
      <div className="dashboard-header">
        <h2>Performance Analytics</h2>
        <div className="header-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="period-selector"
          >
            <option value="hourly">Last Hour</option>
            <option value="daily">Last 24 Hours</option>
            <option value="weekly">Last 7 Days</option>
            <option value="monthly">Last 30 Days</option>
          </select>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'efficiency' ? 'active' : ''}`}
          onClick={() => setActiveTab('efficiency')}
        >
          <Clock size={16} />
          Efficiency
        </button>
        <button 
          className={`tab ${activeTab === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          <Shield size={16} />
          Safety
        </button>
        <button 
          className={`tab ${activeTab === 'environmental' ? 'active' : ''}`}
          onClick={() => setActiveTab('environmental')}
        >
          <Leaf size={16} />
          Environmental
        </button>
        <button 
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle size={16} />
          Alerts
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && currentReport && (
          <div className="overview-tab">
            <div className="overview-cards">
              <div className="overview-card">
                <div className="card-header">
                  <h3>Overall Performance</h3>
                  <div className="score" style={{ color: getStatusColor('good') }}>
                    {currentReport.summary.overallScore.toFixed(1)}
                  </div>
                </div>
                <div className="card-content">
                  <div className="score-bar">
                    <div 
                      className="score-fill" 
                      style={{ 
                        width: `${currentReport.summary.overallScore}%`,
                        backgroundColor: getStatusColor('good')
                      }}
                    />
                  </div>
                  <div className="comparison">
                    <span>vs Previous: {currentReport.comparisons.previousPeriod > 0 ? '+' : ''}{currentReport.comparisons.previousPeriod.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>Key Achievements</h3>
                </div>
                <div className="card-content">
                  <ul className="achievements-list">
                    {currentReport.summary.keyAchievements.map((achievement, index) => (
                      <li key={index} className="achievement-item">
                        <CheckCircle size={14} className="achievement-icon" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <h3>Areas for Improvement</h3>
                </div>
                <div className="card-content">
                  <ul className="improvements-list">
                    {currentReport.summary.areasForImprovement.map((improvement, index) => (
                      <li key={index} className="improvement-item">
                        <AlertTriangle size={14} className="improvement-icon" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="recommendations-section">
              <h3>Recommendations</h3>
              <div className="recommendations-grid">
                {currentReport.summary.recommendations.map((recommendation, index) => (
                  <div key={index} className="recommendation-card">
                    <Target size={16} className="recommendation-icon" />
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'efficiency' && analytics && (
          <div className="efficiency-tab">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <Clock size={20} />
                  <h4>Average Wait Time</h4>
                </div>
                <div className="metric-value">
                  {analytics.efficiency.averageWaitTime.toFixed(1)}s
                </div>
                <div className="metric-target">Target: 20s</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <Car size={20} />
                  <h4>Throughput</h4>
                </div>
                <div className="metric-value">
                  {analytics.efficiency.throughput.toFixed(0)} v/h
                </div>
                <div className="metric-target">Target: 100 v/h</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <Activity size={20} />
                  <h4>Flow Rate</h4>
                </div>
                <div className="metric-value">
                  {analytics.efficiency.flowRate.toFixed(1)} v/min
                </div>
                <div className="metric-target">Target: 50 v/min</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <BarChart3 size={20} />
                  <h4>Signal Efficiency</h4>
                </div>
                <div className="metric-value">
                  {analytics.efficiency.signalEfficiency.toFixed(1)}%
                </div>
                <div className="metric-target">Target: 80%</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safety' && analytics && (
          <div className="safety-tab">
            <div className="safety-overview">
              <div className="safety-score">
                <h3>Safety Score</h3>
                <div className="score-circle">
                  <div className="score-value">{analytics.safety.safetyScore.toFixed(0)}</div>
                  <div className="score-label">/ 100</div>
                </div>
              </div>
            </div>

            <div className="safety-metrics">
              <div className="safety-metric">
                <div className="metric-label">Incidents</div>
                <div className="metric-value">{analytics.safety.incidentCount}</div>
                <div className="metric-status">Target: 2</div>
              </div>

              <div className="safety-metric">
                <div className="metric-label">Speed Violations</div>
                <div className="metric-value">{analytics.safety.speedViolations}</div>
                <div className="metric-status">Target: 5</div>
              </div>

              <div className="safety-metric">
                <div className="metric-label">Near Misses</div>
                <div className="metric-value">{analytics.safety.nearMisses}</div>
                <div className="metric-status">Target: 3</div>
              </div>

              <div className="safety-metric">
                <div className="metric-label">Response Time</div>
                <div className="metric-value">{analytics.safety.emergencyResponseTime.toFixed(1)}m</div>
                <div className="metric-status">Target: 5m</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'environmental' && analytics && (
          <div className="environmental-tab">
            <div className="environmental-metrics">
              <div className="env-metric">
                <Leaf size={24} className="env-icon" />
                <div className="env-content">
                  <h4>Emissions Reduction</h4>
                  <div className="env-value">{analytics.environmental.emissionsReduction.toFixed(1)}%</div>
                  <div className="env-target">Target: 20%</div>
                </div>
              </div>

              <div className="env-metric">
                <Car size={24} className="env-icon" />
                <div className="env-content">
                  <h4>Fuel Efficiency</h4>
                  <div className="env-value">{analytics.environmental.fuelEfficiency.toFixed(1)}%</div>
                  <div className="env-target">Target: 90%</div>
                </div>
              </div>

              <div className="env-metric">
                <Activity size={24} className="env-icon" />
                <div className="env-content">
                  <h4>Noise Reduction</h4>
                  <div className="env-value">{analytics.environmental.noiseReduction.toFixed(1)}%</div>
                  <div className="env-target">Target: 15%</div>
                </div>
              </div>

              <div className="env-metric">
                <Shield size={24} className="env-icon" />
                <div className="env-content">
                  <h4>Air Quality</h4>
                  <div className="env-value">{analytics.environmental.airQuality.toFixed(0)} AQI</div>
                  <div className="env-target">Target: 80 AQI</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <div className="alerts-list">
              {performanceService.getActiveAlerts().map((alert) => (
                <div key={alert.id} className={`alert-item ${alert.severity}`}>
                  <div className="alert-icon">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="alert-content">
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="alert-severity">
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
              ))}
              {performanceService.getActiveAlerts().length === 0 && (
                <div className="no-alerts">
                  <CheckCircle size={48} />
                  <h3>No Active Alerts</h3>
                  <p>All systems are operating normally</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PerformanceDashboard;
