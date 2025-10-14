import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateResponse } from '../services/openRouterService';
import './Chatbot.css';

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: getGreetingMessage(), sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault();
        if (!isOpen) {
          onClose(); // If closed, still call onClose to handle state in parent
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
  }, [isOpen, onClose]);

  // This is the main closing function that should be called everywhere
  const onCloseWithAnimation = () => {
    setIsClosing(true);
    // Don't call onClose immediately
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 500);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCloseWithAnimation();  // Make sure we're using onCloseWithAnimation
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const handleSendMessage = async () => {
    if (chatMessage.trim() && !isProcessing) {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const userMessage: ChatMessage = { text: chatMessage, sender: 'user', timestamp };
      setMessages(prev => [...prev, userMessage]);
      setChatMessage('');
      setIsProcessing(true);

      try {
        const messageHistory: OpenRouterMessage[] = messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

        const response = await generateResponse([
          ...messageHistory,
          { role: 'user' as const, content: chatMessage }
        ]);

        const navigationMatch = response.match(/navigate:\/(\w+)/);
        if (navigationMatch) {
          let route = navigationMatch[1];
          // Handle cases where the route might contain spaces (e.g., "project 1")
          route = route.replace(/\s+/g, '');
          const displayMessage = response.replace(/navigate:\/[\w-]+/, '').trim();
          setMessages(prev => [...prev, { text: displayMessage, sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
          setTimeout(() => {
            // Handle plural variations of routes
            const routePath = route.toLowerCase();
            const routeMapping: { [key: string]: string } = {
              'project': 'projects',
              'projects': 'projects',
              'project1': 'projects/urban-traffic-dynamics',
              'project2': 'projects/guardian-vision',
              'project-1': 'projects/urban-traffic-dynamics',
              'project-2': 'projects/guardian-vision',
              'project_1': 'projects/urban-traffic-dynamics',
              'project_2': 'projects/guardian-vision',
              'contact': 'contact',
              'contacts': 'contact',
              'home': '',
              'homepage': '',
              'main': '',
              'about': 'about',
              'urbantraffic': 'projects/urban-traffic-dynamics',
              'urban': 'projects/urban-traffic-dynamics',
              'traffic': 'projects/urban-traffic-dynamics',
              'urbantrafic': 'projects/urban-traffic-dynamics',
              'urbantraficdinamics': 'projects/urban-traffic-dynamics',
              'urbantrafficdynamics': 'projects/urban-traffic-dynamics',
              'guardian': 'projects/guardian-vision',
              'guardianvision': 'projects/guardian-vision',
              'vision': 'projects/guardian-vision',
              'guard': 'projects/guardian-vision'
            };

            const finalRoute = routeMapping[routePath];
            if (finalRoute !== undefined) {
              // Scroll to top before navigation
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              navigate(finalRoute ? `/${finalRoute}` : '/');
            } else {
              // Handle unknown routes
              setMessages(prev => [...prev, {
                text: "I'm not sure about that page. Available pages are: Home, Projects (including Urban Traffic Dynamics and Guardian Vision), About, and Contact.",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              }]);
            }
          }, 1000);
        } else {
          setMessages(prev => [...prev, { text: response, sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          text: "I apologize, but I'm having trouble connecting right now. Please try again.",
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
      } finally {
        setIsProcessing(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getGreetingMessage() {
    const currentHour = new Date().getHours();
    let greeting = "Good evening!";

    if (currentHour >= 5 && currentHour < 12) {
      greeting = "Good morning!";
    } else if (currentHour >= 12 && currentHour < 18) {
      greeting = "Good afternoon!";
    }
    return greeting + " How can I help you today?";
  }

  return (
    <>
      {/* Make sure onClick is using onCloseWithAnimation */}
      <div
        className={`chatbot-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onCloseWithAnimation}
      />
      <div className={`chatbot-window ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
        <div className="chatbot-header">
          <h3>AI Assistant</h3>
          {/* Make sure X button is using onCloseWithAnimation */}
          <button onClick={onCloseWithAnimation}>
            <X size={20} />
          </button>
        </div>
        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chatbot-message ${message.sender} ${isProcessing && index === messages.length - 1 ? 'processing' : ''}`}>
              <div className="message-text">{message.text}</div>
              <div className="message-timestamp">{message.timestamp}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chatbot-input">
          <input
            ref={inputRef}
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={isProcessing ? "Processing..." : "Press '/' to chat"}
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing) {
                handleSendMessage();
              }
            }}
          />
          <button onClick={handleSendMessage} disabled={isProcessing}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
