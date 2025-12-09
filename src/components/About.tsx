import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaLightbulb, FaHandHoldingHeart, FaEye, FaCogs, FaCheckCircle } from 'react-icons/fa';
import { Sun, Moon, Lightbulb, Beaker, Code, Target } from 'lucide-react';
import './About.css';
import './ImpactSection.css';
import Chatbot from './Chatbot';
import ChatbotToggle from './ChatbotToggle';
import Header from './Header';
import Footer from './Footer';

const About: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Animation variants for smoother transitions
  const fadeInUp = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault();
        if (!isChatOpen) {
          setIsChatOpen(true);
        }
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => {
      window.removeEventListener('keydown', handleSlashKey);
    };
  }, [isChatOpen]);




  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="about-container">
        <Header isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <button
            className="mode-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
          </button>

          <ChatbotToggle isOpen={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} />

          <Chatbot
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            isDarkMode={isDarkMode}
          />
        </motion.div>

        {/* Hero Section - Optimized animation */}
        <motion.section
          className="about-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.h1
            className="about-title"
            {...fadeInUp}
          >
            Our Vision for Accessibility
          </motion.h1>
          <motion.p
            className="about-subtitle"
            {...fadeInUp}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            We envision a world where urban infrastructure is seamlessly accessible to all, breaking barriers and empowering every individual to navigate cities with ease and independence.
          </motion.p>
        </motion.section>

        {/* Mission Section - Optimized animation */}
        <motion.section
          className="mission-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className="mission-content"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <FaEye className="mission-icon" />
            <h2>Our Mission</h2>
            <p>
              VisionAid creates smarter, sustainable cities through AI, optimizing infrastructure for everyone.
            </p>
          </motion.div>
        </motion.section>

        {/* Values Section - Optimized animation */}
        <motion.section
          className="values-section"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <h2 className="values-title">Our Core Values</h2>
          <div className="values-grid">
            <motion.div
              className="value-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <FaUsers className="value-icon" />
              <h3>Inclusivity</h3>
              <p>VisionAid builds smarter, sustainable cities through AI and real-time analytics, optimizing infrastructure for all.</p>
            </motion.div>

            <motion.div
              className="value-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <FaLightbulb className="value-icon" />
              <h3>Innovation</h3>
              <p>Continuously pushing the boundaries of AI and smart surveillance to enhance urban infrastructure.</p>
            </motion.div>

            <motion.div
              className="value-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <FaHandHoldingHeart className="value-icon" />
              <h3>Empowerment</h3>
              <p> Providing communities and law enforcement with tools to improve safety, mobility, and response efficiency.</p>
            </motion.div>
          </div>
        </motion.section>

        {/* Timeline Section */}
        <section className="timeline-section">
          <motion.h2
            className="timeline-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Our Journey
          </motion.h2>
          <div className="timeline">
            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            >
              <motion.div
                className="timeline-content inception"
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="timeline-icon">
                  <Lightbulb size={28} />
                </div>
                <div className="timeline-text">
                  <h3>💡 Project Inception</h3>
                  <p>AI-driven traffic and security solutions</p>
                </div>

              </motion.div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 100 }}
            >
              <motion.div
                className="timeline-content research"
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="timeline-icon">
                  <Beaker size={28} />
                </div>
                <div className="timeline-text">
                  <h3>🔬 Research & Development</h3>
                  <p>Testing innovative accessibility solutions</p>
                </div>

              </motion.div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6, type: "spring", stiffness: 100 }}
            >
              <motion.div
                className="timeline-content implementation"
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="timeline-icon">
                  <Code size={28} />
                </div>
                <div className="timeline-text">
                  <h3>⚙️ Implementation</h3>
                  <p>Building & refining accessibility tools</p>
                </div>

              </motion.div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.8, type: "spring", stiffness: 100 }}
            >
              <motion.div
                className="timeline-content future"
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="timeline-icon">
                  <Target size={28} />
                </div>
                <div className="timeline-text">
                  <h3>🚀 Future Vision</h3>
                  <p>Cloud integration & smart city collaboration</p>
                </div>

              </motion.div>
            </motion.div>
          </div>
        </section>

        <motion.section
          className="about-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="section-title">
            <FaCogs className="section-icon" />
            Hybrid AI Architecture
          </h2>
          <p className="section-text">
            VisionAid leverages a cutting-edge <strong>Hybrid AI Engine</strong> that seamlessly switches between
            cloud-based Large Language Models (via OpenRouter) and local, privacy-focused models (via Ollama).
            This architecture ensures:
          </p>
          <ul className="feature-list">
            <li>
              <FaCheckCircle className="list-icon" />
              <strong>Privacy First:</strong> Sensitive data can be processed locally without leaving your device.
            </li>
            <li>
              <FaCheckCircle className="list-icon" />
              <strong>High Availability:</strong> Cloud fallback ensures the assistant is always ready to help.
            </li>
            <li>
              <FaCheckCircle className="list-icon" />
              <strong>Cost Efficiency:</strong> Routine queries are handled locally, reducing API costs.
            </li>
          </ul>
        </motion.section>

        {/* Impact Section */}
        <section className="impact-section">
          <h2 className="impact-title">Our Impact</h2>
          <p className="impact-description">
            Through cutting-edge computer vision and AI solutions, VisionAid is reshaping the way cities manage traffic, security, and accessibility.
          </p>
          <div className="impact-grid">
            <motion.div
              className="impact-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3>10+ Cities</h3>
              <p>Pilots and deployments across urban centres</p>
            </motion.div>
            <motion.div
              className="impact-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3>98% Accuracy</h3>
              <p>In detecting traffic violations and hazards</p>
            </motion.div>
            <motion.div
              className="impact-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3>24/7 Monitoring</h3>
              <p>Real-time insights for safer streets</p>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default About; 
