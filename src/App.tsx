import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VisionAidHomepage from './components/VisionAidHomepage';
import Projects from './components/Projects';
import About from './components/About';
import Contact from './components/Contact';
import UrbanTrafficDynamics from './components/projects/UrbanTrafficDynamics';
import GuardianVision from './components/projects/GuardianVision';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

import { useState, useEffect, useRef } from 'react';
import Chatbot from './components/Chatbot';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const chatbotImageUrl = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  // Global keyboard shortcut for opening chat
  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key === '/') {
        // Don't trigger if user is typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        if (!isChatOpen) {
          setIsChatOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleSlashKey);
    return () => {
      window.removeEventListener('keydown', handleSlashKey);
    };
  }, [isChatOpen]);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<VisionAidHomepage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/urban-traffic-dynamics" element={<UrbanTrafficDynamics />} />
        <Route path="/projects/guardian-vision" element={<GuardianVision />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>

      {/* Global Chatbot */}
      <button
        className="chatbot-toggle"
        onClick={() => setIsChatOpen(true)}
        style={{ zIndex: 9999 }} // Ensure it's above everything
      >
        <img src={chatbotImageUrl} alt="Chatbot" />
      </button>

      <Chatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isDarkMode={isDarkMode}
      />
    </Router>
  );
}

export default App;
