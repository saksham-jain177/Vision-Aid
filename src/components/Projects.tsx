import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe, Sun, Moon, ArrowRight, Network,
  Layers, Bolt, Lightbulb, TrendingUp,
  Search
} from 'lucide-react';
import * as THREE from 'three';
import './Projects.css';
import Chatbot from './Chatbot';
import ProjectDetailsModal from './projects/ProjectDetailsModal';
import SuggestProjectModal from './projects/SuggestProjectModal';
import { useLocation } from 'react-router-dom';


interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  technologies: string[];
  features: string[];
  status: 'active' | 'inactive';
  metrics: Array<{ value: string; label: string }>;
  image?: string;
  liveUrl?: boolean;
  impact?: string;
}

const Projects: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const chatbotImageUrl = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png";

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current as HTMLCanvasElement,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Set background color
    const bgColor = isDarkMode ? new THREE.Color(0x0a1128) : new THREE.Color(0xf0f8ff);
    scene.background = bgColor;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(
      isDarkMode ? 0x404040 : 0xffffff,
      isDarkMode ? 0.5 : 0.7
    );
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 50;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: isDarkMode ? 0x4fc3f7 : 0x2962ff,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Position camera
    camera.position.z = 15;

    // Animation loop
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = Date.now() * 0.0005;

      // Rotate particles slowly
      particlesMesh.rotation.y = time * 0.05;
      particlesMesh.rotation.x = time * 0.025;

      // Create subtle wave effect
      particlesMesh.position.y = Math.sin(time) * 0.2;

      // Subtle camera movement
      camera.position.x = Math.sin(time * 0.2) * 0.5;
      camera.position.y = Math.cos(time * 0.2) * 0.5;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frame);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          // @ts-ignore: Object is possibly 'null'
          object.material.dispose();
        }
      });
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, [isDarkMode]);

  const Header = () => {
    const location = useLocation(); // Get current route path

    return (
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
            <Globe className="logo-icon" />
            <h1 className="logo-text">VisionAid</h1>
          </Link>
          <nav className="nav-menu">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to="/projects" className={`nav-link ${location.pathname === '/projects' ? 'active' : ''}`}>Projects</Link>
            <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
          </nav>
          <button className="mode-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
          </button>
        </div>
      </header>
    );
  };

  const Footer = () => (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">VisionAid</h3>
          <p>Transforming urban infrastructure through intelligent technology.</p>
          <div className="social-icons">
            <a
              href="https://github.com/ArnavNath2003/Vision-Aid"
              className="social-icon"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
            </a>
            <a href="#" className="social-icon"><FaLinkedin /></a>
            <a href="#" className="social-icon"><FaTwitter /></a>
            <a href="#" className="social-icon"><FaInstagram /></a>
          </div>
        </div>
        <div className="footer-section">
          <h4 className="footer-title">Quick Links</h4>
          <div className="footer-links">
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/projects" className="footer-link">Projects</Link>
            <Link to="/about" className="footer-link">About</Link>
            <Link to="/contact" className="footer-link">Contact</Link>
          </div>
        </div>
        <div className="footer-section">
          <h4 className="footer-title">Contact</h4>
          <p>Email: info@visionaid.tech</p>
          <p>Phone: +1 (555) 123-4567</p>
        </div>
        <div className="footer-section">
          <h4 className="footer-title">Newsletter</h4>
          <div className="newsletter-form">
            <input
              type="email"
              placeholder="Enter your email"
              className="newsletter-input"
            />
            <button className="newsletter-button">
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        © 2024 VisionAid. All Rights Reserved.
      </div>
    </footer>
  );

  const projects: Project[] = [
    {
      id: "urban-traffic",
      title: "Urban Traffic Dynamics",
      category: "ai",
      description: "Revolutionizing urban mobility through AI-powered traffic optimization, reducing congestion by up to 35% in pilot cities.",
      icon: <Network className="project-icon" />,
      color: "primary",
      technologies: ["YOLOv8", "Computer Vision", "TensorFlow", "Real-time Detection", "Traffic Analysis", "React"],
      features: [
        "Real-time traffic flow optimization",
        "Predictive congestion management",
        "Smart traffic light synchronization",
        "Emergency vehicle priority routing",
      ],
      status: "active",
      metrics: [
        { value: "23%", label: "Congestion Reduction" },
        { value: "8.5M+", label: "Daily Commuters" },
        { value: "3", label: "Pilot Cities" }
      ],
      image: "/images/traffic-system.jpg",
      liveUrl: true,
      impact: "Reduced urban traffic congestion by 35% in pilot cities"
    },
    {
      id: "guardian-vision",
      title: "Guardian Vision",
      category: "ai",
      description: "AI-powered facial recognition system for locating missing persons through multi-source surveillance integration, including CCTV networks and real-time video feeds.",
      icon: <Search className="project-icon" />,
      color: "success",
      technologies: ["Facial Recognition", "SSD Detection", "TensorFlow.js", "WebRTC", "React", "Multi-source Analysis"],
      features: [
        "Multi-source video processing",
        "Real-time facial recognition",
        "Geolocation tracking",
        "Facial landmark detection",
        "Live webcam integration"
      ],
      status: "active",
      metrics: [
        { value: "78%", label: "Recognition Accuracy" },
        { value: "1.2s", label: "Processing Time" },
        { value: "3+", label: "Input Sources" }
      ],
      image: "/images/guardian-vision.jpg",
      liveUrl: true,
      impact: "Helping locate missing persons through advanced AI surveillance integration"
    },
    // Add more projects with varying heights
  ];

  const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleTryNow = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Scroll to top before navigation
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      if (project.id === "urban-traffic") {
        navigate('/projects/urban-traffic-dynamics');
      } else if (project.id === "guardian-vision") {
        navigate('/projects/guardian-vision');
      }
    };

    const handleViewDetails = () => {
      setIsModalOpen(true);
    };

    return (
      <motion.div
        className="project-grid-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="project-card-content">
          <div className="project-top-content">
            <div className="project-header">
              <div className="project-header-main">
                <div className={`project-icon-container ${project.color}`}>
                  {project.icon}
                </div>
                <h3 className="project-title">{project.title}</h3>
              </div>
              <div className={`project-status ${project.status}`}>
                <span className="status-dot" />
                {project.status === 'active' ? 'Active' : 'Inactive'}
              </div>
            </div>

            <p className="project-description">{project.description}</p>

            {/* Image placeholder removed as requested */}

            <div className="tech-tags">
              {project.technologies.slice(0, 6).map((tech, index) => (
                <motion.span
                  key={index}
                  className="tech-badge"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="button-container">
            <motion.button
              className="view-details-button"
              onClick={handleViewDetails}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Details
            </motion.button>
            {project.liveUrl && (
              <motion.button
                className="try-now-button"
                onClick={handleTryNow}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try Now <ArrowRight size={16} />
              </motion.button>
            )}
          </div>
        </div>
        {isModalOpen && (
          <ProjectDetailsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            project={project}
          />
        )}
      </motion.div>
    );
  };

  // Use useRef to track if benefits have been animated
  const benefitsAnimated = useRef(false);

  const ProjectBenefits = () => {
    const [hasAnimated, setHasAnimated] = useState(benefitsAnimated.current);

    // Set the ref to true after animation completes
    const handleAnimationComplete = () => {
      benefitsAnimated.current = true;
      setHasAnimated(true);
    };

    const benefits = [
      {
        icon: <TrendingUp className="benefit-icon" />,
        title: "Real-time Analysis",
        description: "Process video feeds in real-time for immediate detection and response capabilities."
      },
      {
        icon: <Layers className="benefit-icon" />,
        title: "Multi-source Integration",
        description: "Seamlessly connect to various video sources including CCTV, drones, and webcams."
      },
      {
        icon: <Lightbulb className="benefit-icon" />,
        title: "Advanced AI Models",
        description: "Leverage cutting-edge computer vision and facial recognition technologies."
      },
      {
        icon: <Bolt className="benefit-icon" />,
        title: "Accessible & User-friendly",
        description: "Intuitive interfaces designed for both technical and non-technical users."
      }
    ];

    return (
      <motion.section
        className="project-benefits-section"
        initial={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        onAnimationComplete={handleAnimationComplete}
      >
        <h2 className="benefits-heading">Project Benefits</h2>
        <div className="benefits-container">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="benefit-card"
              initial={hasAnimated ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                delay: hasAnimated ? 0 : index * 0.1
              }}
              whileHover={{ y: -10 }}
            >
              <div className="benefit-icon-container">
                {benefit.icon}
              </div>
              <h3 className="benefit-title">{benefit.title}</h3>
              <p className="benefit-description">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    );
  };


  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <canvas ref={canvasRef} className="canvas-container" />
      <Header />

      <button
        className="chatbot-toggle"
        onClick={() => setIsChatOpen(true)}
      >
        <img src={chatbotImageUrl} alt="Chatbot" />
      </button>

      <Chatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <main className="projects-container">
        {/* Hero Section */}
        <motion.section
          className="projects-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="projects-title"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Our Innovation Portfolio
          </motion.h1>
          <motion.p
            className="projects-subtitle"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Exploring the frontier of accessible technology solutions
          </motion.p>
        </motion.section>

        {/* Project Grid Section */}
        <section className="projects-grid-section">
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <ProjectBenefits />

        {/* Call To Action */}
        <motion.section
          className="projects-cta"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <div className="cta-content">
            <h2 className="cta-title">Join Our Innovation Journey</h2>
            <p className="cta-description">
              Get involved with our projects or suggest new accessibility challenges we can solve together.
            </p>
            <div className="cta-buttons">
              <button className="cta-button primary">
                Become a Partner
              </button>
              <button
                className="cta-button secondary"
                onClick={() => setIsSuggestModalOpen(true)}
              >
                Suggest a Project
              </button>
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />

      {/* Suggest Project Modal */}
      <SuggestProjectModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />
    </div>
  );
};

export default Projects;
