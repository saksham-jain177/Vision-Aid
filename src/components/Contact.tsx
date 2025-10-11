import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { Globe, Sun, Moon, MessageCircle, X, Send, ArrowRight } from 'lucide-react';
import './Contact.css';
import Chatbot from './Chatbot';
import { useLocation } from 'react-router-dom';

const Contact: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const chatbotImageUrl = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link with form data
    const subject = encodeURIComponent(formData.subject);
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n\n` +
      `Message:\n${formData.message}`
    );
    
    // Open email client with pre-filled data
    window.open(`mailto:177sakshamjain@gmail.com?subject=${subject}&body=${body}`);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    
    // Show success message (you could add a toast notification here)
    alert('Email client opened! Please send the email to complete your message.');
  };

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
        © 2025 VisionAid. All Rights Reserved.
      </div>
    </footer>
  );

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="contact-container">
        <Header />
        
        <button
          className="mode-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
        </button>

        <button
          className="chatbot-toggle"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <img src={chatbotImageUrl} alt="Chatbot" />
        </button>
        
        <Chatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Hero Section */}
        <motion.section 
          className="contact-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="contact-title"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Get In Touch
          </motion.h1>
          <motion.p
            className="contact-subtitle"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            We'd love to hear from you. Let us know how we can help.
          </motion.p>
        </motion.section>

        {/* Contact Info Cards */}
        <section className="contact-info-section">
          <div className="contact-info-grid">
            <motion.div
              className="contact-info-card"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <FaMapMarkerAlt className="contact-icon" />
              <h3>Location</h3>
              <p>Vision Aid Hub<br />JEMTEC<br />Greater Noida, 201308</p>
            </motion.div>

            <motion.div
              className="contact-info-card"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <FaEnvelope className="contact-icon" />
              <h3>Email</h3>
              <p>177sakshamjain@gmail.com<br />Available for inquiries</p>
            </motion.div>

            <motion.div
              className="contact-info-card"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <FaGithub className="contact-icon" />
              <h3>AI Developer</h3>
              <p>Saksham Jain<br />Computer Vision & AI Specialist</p>
            </motion.div>
          </div>
        </section>

        {/* Contact Form Section */}
        <motion.section 
          className="contact-form-section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h2 className="contact-form-title">Send us a message</h2>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <motion.textarea
                whileFocus={{ scale: 1.02 }}
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={6}
              />
            </div>
            <motion.button
              type="submit"
              className="submit-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Send Message
              <Send className="send-icon" size={18} />
            </motion.button>
          </form>
        </motion.section>

        {/* Map Section */}
        <section className="map-section">
          <div className="map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.123456789!2d77.123456789!3d28.123456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDA3JzI0LjQiTiA3N8KwMDcnMjQuNCJF!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
              width="100%"
              height="400"
              style={{ border: 0, borderRadius: '12px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Vision Aid Location Map"
            />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Contact; 
