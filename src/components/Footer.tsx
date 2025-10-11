import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa';
import { ArrowRight } from 'lucide-react';

const Footer: React.FC = () => (
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

export default Footer;
