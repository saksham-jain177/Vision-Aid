import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Moon, Sun, Globe, Layers, Network,
  ArrowRight, Shield, Database, Clock
} from 'lucide-react';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import './VisionAidHomepage.css';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Chatbot from './Chatbot';

const VisionAidHomepage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Change false to true
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const chatbotImageUrl = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png";

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Type-safe boundary settings
    const bounds = {
      x: { min: -60, max: 60 },
      y: { min: -40, max: 40 },
      z: { min: -40, max: 40 }
    };

    type Axis = 'x' | 'y' | 'z';
    const axes: Axis[] = ['x', 'y', 'z'];

    interface CubeObject {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      initialPosition: THREE.Vector3;
      rotationSpeed: { x: number; y: number; z: number };
    }

    const cubes: CubeObject[] = [];

    const cubeCount = 50;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: isDarkMode ? 0x4a90e2 : 0x2c5282,
      transparent: true,
      opacity: 0.7,
      specular: 0x444444,
      shininess: 30
    });

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Create and position cubes with wider distribution
    for (let i = 0; i < cubeCount; i++) {
      const cube = new THREE.Mesh(geometry, material);

      // Distribute cubes more evenly across the scene
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * (bounds.x.max - bounds.x.min),
        (Math.random() - 0.5) * (bounds.y.max - bounds.y.min),
        (Math.random() - 0.5) * (bounds.z.max - bounds.z.min)
      );

      cube.position.copy(position);
      cube.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const cubeObject = {
        mesh: cube,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        initialPosition: position.clone(),
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        }
      };

      cubes.push(cubeObject);
      scene.add(cube);
    }

    camera.position.z = 50;

    // Mouse interaction
    const mouse = new THREE.Vector3();
    const mouseRaycaster = new THREE.Raycaster();
    const mousePosition = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

      mouseRaycaster.setFromCamera(mousePosition, camera);
      const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      mouseRaycaster.ray.intersectPlane(intersectPlane, mouse);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);

      cubes.forEach(cubeObj => {
        const { mesh, velocity, initialPosition, rotationSpeed } = cubeObj;

        // Natural floating movement
        velocity.setY(velocity.y + (Math.sin(Date.now() * 0.001) * 0.001));

        // Apply velocity
        mesh.position.add(velocity);

        // Rotate
        mesh.rotation.x += rotationSpeed.x;
        mesh.rotation.y += rotationSpeed.y;
        mesh.rotation.z += rotationSpeed.z;

        // Boundary collision - type-safe version
        axes.forEach((axis) => {
          const pos = mesh.position[axis];
          const vel = velocity[axis];
          const bound = bounds[axis];

          if (pos <= bound.min || pos >= bound.max) {
            // Type-safe way to set velocity
            switch(axis) {
              case 'x': velocity.setX(vel * -0.8); break;
              case 'y': velocity.setY(vel * -0.8); break;
              case 'z': velocity.setZ(vel * -0.8); break;
            }

            // Clamp position
            const clampedPos = Math.max(bound.min, Math.min(bound.max, pos));
            mesh.position[axis] = clampedPos;
          }
        });

        // Mouse interaction
        const distanceToMouse = mesh.position.distanceTo(mouse);
        if (distanceToMouse < 30) {  // Increased radius
          const repulsionForce = mesh.position.clone().sub(mouse);
          repulsionForce.normalize();
          // Increased force and adjusted distance scaling
          repulsionForce.multiplyScalar(1.0 / Math.max(0.1, distanceToMouse * 0.5));
          velocity.add(repulsionForce);
        }

        // Apply drag
        velocity.multiplyScalar(0.98);

        // Return force
        const returnForce = initialPosition.clone().sub(mesh.position);
        returnForce.multiplyScalar(0.001);
        velocity.add(returnForce);
      });

      // Camera movement
      camera.position.x = Math.sin(Date.now() * 0.0001) * 2;
      camera.position.y = Math.cos(Date.now() * 0.0001) * 2;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      geometry.dispose();
      material.dispose();
      cubes.forEach(cube => scene.remove(cube.mesh));
      renderer.dispose();
    };
  }, [isDarkMode]);

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

  const Header = () => {
    const location = useLocation();

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
          <button
            className="mode-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
          </button>
        </div>
      </header>
    );
  };

  // Update the interface for ProjectModal props
  interface ProjectModalProps {
    project: any;
  }

  const ProjectModal = ({ project }: ProjectModalProps) => {
    if (!project) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-icon-container">
              {project.icon}
            </div>
            <h2 className="modal-title">{project.title}</h2>
          </div>
          <p className="modal-description">{project.description}</p>
          <div className="modal-actions">
            <button
              onClick={() => setSelectedProject(null)}
              className="btn btn-primary"
            >
              Close Details
            </button>
            <button className="btn btn-secondary">
              Learn More
            </button>
          </div>
        </div>
      </div>
    );
  };

  const projects = [
    {
      title: "Urban Traffic Dynamics",
      description: "Revolutionizing urban mobility through AI-powered traffic optimization.",
      icon: <Network className="project-icon" />,
      color: "primary"
    },
    {
      title: "Guardian Vision",
      description: "AI-powered facial recognition system for locating missing persons.",
      icon: <Layers className="project-icon" />,
      color: "success"
    }
  ];

  const KeyFeatures = () => {
    const features = [
      {
        icon: <Shield size={40} strokeWidth={2.5} color="#ffffff" className="feature-icon" />,
        title: "Predictive Safety",
        description: "AI-powered risk assessment with 78% accuracy, identifying hazards before they occur."
      },
      {
        icon: <Clock size={40} strokeWidth={2.5} color="#ffffff" className="feature-icon" />,
        title: "Real-Time Monitoring",
        description: "Fast 1.2-second processing of video feeds for immediate detection."
      },
      {
        icon: <Network size={40} strokeWidth={2.5} color="#ffffff" className="feature-icon" />,
        title: "Smart Connectivity",
        description: "Seamless IoT integration with existing infrastructure for comprehensive data analysis."
      }
    ];

    return (
      <motion.section
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        viewport={{ once: true, margin: "-100px" }}
        className="features-section"
      >
        <div className="features-container">
          <h2 className="features-title">Key Technological Innovations</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-container">
                  {feature.icon}
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    );
  };

  const TechnologiesSection = () => {
    const technologies = [
      {
        icon: <Layers size={48} strokeWidth={2.5} color="#ffffff" className="technology-icon" />,
        name: "SSD (Single Shot MultiBox Detector)"
      },
      {
        icon: <Database size={48} strokeWidth={2.5} color="#ffffff" className="technology-icon" />,
        name: "PyTorch and OpenCV"
      },
      {
        icon: <Network size={48} strokeWidth={2.5} color="#ffffff" className="technology-icon" />,
        name: "React with TypeScript"
      }
    ];

    return (
      <motion.section
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        viewport={{ once: true, margin: "-100px" }}
        className="technologies-section"
      >
        <div className="technologies-container">
          <h2 className="technologies-title">
            Our Core Technologies
          </h2>
          <div className="technologies-grid">
            {technologies.map((tech, index) => (
              <div key={index} className="technology-card">
                <div className="technology-icon-container">
                  {tech.icon}
                </div>
                <div className="technology-content">
                  <p className="technology-name">{tech.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
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
              href="https://github.com/saksham-jain177/Vision-Aid"
              className="social-icon"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
            </a>
            <a href="https://www.linkedin.com/in/saksham-j-95a206225/" className="social-icon" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
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
          <p>Email: 177sakshamjain@gmail.com</p>
          <p>AI Developer: Saksham Jain</p>
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
        onClose={() => {
          console.log("Parent onClose called"); // Debug log
          setIsChatOpen(false);
        }}
      />

      <main className="main-content">
      <section>
  <motion.h1
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.8 }}
     className="main-heading"
  >
    VisionAid
  </motion.h1>
  <motion.div
    className="project-grid"
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{
      delay: 0.3,
      duration: 0.8,
      type: "spring",
      stiffness: 100,
      damping: 15
    }}
  >
    {projects.map((project, index) => (
      <div
        key={index}
        className="project-card"
        onClick={() => setSelectedProject(project)}
      >
        <div className="project-icon-container">
          {project.icon}
        </div>
        <h3 className="project-title">{project.title}</h3>
        <p className="project-description">{project.description}</p>
      </div>
    ))}
  </motion.div>
</section>

        {selectedProject && (
          <ProjectModal
            project={selectedProject}
          />
        )}

        <KeyFeatures />
        <TechnologiesSection />
      </main>

      <Footer />
    </div>
  );
};

export default VisionAidHomepage;
