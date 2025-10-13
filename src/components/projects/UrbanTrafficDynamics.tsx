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
            <h3>About Urban Traffic Dynamics</h3>
            <div className="about-sections">
              <section>
                <h4>🚦 Smart Traffic Management</h4>
                <p>
                  Our AI-powered system uses computer vision to analyze real-time traffic patterns 
                  and dynamically adjust traffic light timing to optimize flow and reduce congestion.
                </p>
              </section>
              
              <section>
                <h4>🤖 AI Optimization</h4>
                <p>
                  Advanced machine learning algorithms continuously learn from traffic patterns 
                  to make intelligent decisions about signal timing, reducing wait times by up to 42%.
                </p>
              </section>
              
              <section>
                <h4>📊 Real-time Analytics</h4>
                <p>
                  Comprehensive monitoring and reporting system provides insights into traffic flow, 
                  congestion levels, and system performance for continuous improvement.
                </p>
              </section>
              
              <section>
                <h4>🌱 Environmental Impact</h4>
                <p>
                  By reducing idle time and improving traffic flow, our system contributes to 
                  significant fuel savings and CO2 emission reductions, making cities more sustainable.
                </p>
              </section>
            </div>
            
            <div className="technology-stack">
              <h4>Technology Stack</h4>
              <div className="tech-tags">
                <span className="tech-tag">YOLOv8</span>
                <span className="tech-tag">Computer Vision</span>
                <span className="tech-tag">TensorFlow</span>
                <span className="tech-tag">Real-time Detection</span>
                <span className="tech-tag">Traffic Analysis</span>
                <span className="tech-tag">React</span>
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