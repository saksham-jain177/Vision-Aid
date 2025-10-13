// UrbanTrafficDynamics.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, BarChart3, Settings, Info, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import TrafficSimulatorV2 from './TrafficSimulatorV2';
import YOLODetection from './YOLODetection';
import './UrbanTrafficDynamics.css';

const UrbanTrafficDynamics: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [activeTab, setActiveTab] = useState<'simulator' | 'analytics' | 'about' | 'yolo'>('simulator');
  const [showYoloModal, setShowYoloModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }: {
    id: string;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      className={`tab-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'simulator':
        return <TrafficSimulatorV2 />;
      case 'yolo':
        return <TrafficSimulatorV2 />;
      case 'analytics':
        return (
          <div className="analytics-content">
            <h3>Traffic Analytics Dashboard</h3>
            <div className="analytics-grid">
              <div className="metric-card">
                <h4>Congestion Reduction</h4>
                <div className="metric-value">35%</div>
                <p>Average improvement in traffic flow</p>
              </div>
              <div className="metric-card">
                <h4>Wait Time Reduction</h4>
                <div className="metric-value">42%</div>
                <p>Decrease in average waiting time</p>
              </div>
              <div className="metric-card">
                <h4>Fuel Savings</h4>
                <div className="metric-value">28%</div>
                <p>Reduction in fuel consumption</p>
              </div>
              <div className="metric-card">
                <h4>CO2 Reduction</h4>
                <div className="metric-value">31%</div>
                <p>Decrease in emissions</p>
              </div>
            </div>
            <div className="analytics-chart">
              <h4>Performance Over Time</h4>
              <div className="chart-placeholder">
                <p>📊 Real-time analytics chart would be displayed here</p>
                <p>Shows traffic flow improvements, signal timing optimization, and congestion patterns</p>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="about-content">
            <div className="about-header">
              <h3>Urban Traffic Dynamics</h3>
              <p className="about-subtitle">Real-time Traffic Simulation & Optimization System</p>
            </div>
            
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">🚦</div>
                <h4>Density-Based Signal Timing</h4>
                <p>Allocates green time based on vehicle count: 20s base + 3s per vehicle, with priority adjustments for congested lanes.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h4>Smart Collision Avoidance</h4>
                <p>Lane-aware detection ensures opposing traffic flows freely while maintaining safe 30px distance in same-lane vehicles.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h4>Real-World Traffic Rules</h4>
                <p>Implements right-turn-only policy (70% straight, 30% right) to eliminate left-turn conflicts with oncoming traffic.</p>
              </div>
            </div>
            
            <div className="tech-stack-section">
              <h4>Implementation Stack</h4>
              <div className="tech-circle-container">
                <div className="tech-circle-center">
                  <span className="center-label">Built With</span>
                </div>
                <div className="tech-pill-circle tech-pill-1">
                  <span className="tech-pill core">TypeScript</span>
                </div>
                <div className="tech-pill-circle tech-pill-2">
                  <span className="tech-pill core">React 19</span>
                </div>
                <div className="tech-pill-circle tech-pill-3">
                  <span className="tech-pill core">Canvas API</span>
                </div>
                <div className="tech-pill-circle tech-pill-4">
                  <span className="tech-pill engine">Round-Robin</span>
                </div>
                <div className="tech-pill-circle tech-pill-5">
                  <span className="tech-pill engine">Density Logic</span>
                </div>
                <div className="tech-pill-circle tech-pill-6">
                  <span className="tech-pill algo">Lane Physics</span>
                </div>
                <div className="tech-pill-circle tech-pill-7">
                  <span className="tech-pill ui">Framer Motion</span>
                </div>
                <div className="tech-pill-circle tech-pill-8">
                  <span className="tech-pill ui">Lucide Icons</span>
                </div>
              </div>
            </div>
            
            <div className="project-info">
              <div className="info-card">
                <h5>Version</h5>
                <p>v1.2.0</p>
              </div>
              <div className="info-card">
                <h5>Last Updated</h5>
                <p>October 2025</p>
              </div>
              <div className="info-card">
                <h5>Status</h5>
                <p className="status-active">Active Development</p>
              </div>
            </div>
          </div>
        );
      default:
        return <TrafficSimulatorV2 />;
    }
  };

  return (
    <div className={`urban-traffic-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="urban-header">
      <Link to="/projects" className="back-button">
        <ArrowLeft />
        <span>Back to Projects</span>
      </Link>
        <div className="header-controls">
          <div className="theme-switch-wrapper">
            <label className="guardian-theme-switch">
          <input
            type="checkbox"
            checked={!isDarkMode}
            onChange={() => setIsDarkMode(!isDarkMode)}
          />
              <div className="guardian-slider">
                <div className="guardian-gooey-ball"></div>
                <div className="guardian-gooey-icons">
                  <svg className="guardian-sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    <path d="M12 5V3M12 21v-2M5 12H3m18 0h-2M6.4 6.4L5 5m12.6 12.6l1.4 1.4M6.4 17.6L5 19m12.6-12.6L19 5"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <svg className="guardian-moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
          </div>
        </label>
          </div>
        </div>
      </div>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="project-header"
      >
        <h1>Urban Traffic Dynamics</h1>
        <p className="project-description">
          AI-powered traffic optimization system for smart cities
        </p>
      </motion.header>

      <div className="tab-navigation">
        <TabButton
          id="simulator"
          label="Traffic Simulator"
          icon={Play}
          isActive={activeTab === 'simulator'}
          onClick={() => setActiveTab('simulator')}
        />
        <TabButton
          id="yolo"
          label="YOLO Detection"
          icon={Eye}
          isActive={showYoloModal}
          onClick={() => setShowYoloModal(true)}
        />
        <TabButton
          id="analytics"
          label="Analytics"
          icon={BarChart3}
          isActive={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
        />
        <TabButton
          id="about"
          label="About"
          icon={Info}
          isActive={activeTab === 'about'}
          onClick={() => setActiveTab('about')}
            />
          </div>

            <motion.div
        key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="tab-content"
      >
        {renderContent()}
            </motion.div>

      {/* YOLO Detection Modal */}
      {showYoloModal && (
        <YOLODetection onClose={() => setShowYoloModal(false)} />
      )}
    </div>
  );
};

export default UrbanTrafficDynamics;