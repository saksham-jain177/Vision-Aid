import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateResponse } from '../services/openRouterService';
import { CHATBOT_ROUTE_ALIASES } from '../config/routes';
import { getCachedResponse, setCachedResponse } from '../utils/chatCache';
import { detectIntent, extractPageFromNavIntent } from '../utils/intentDetection';
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
  isDarkMode: boolean;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, isDarkMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: getGreetingMessage(), sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
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
          onClose();
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

  const onCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 500);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCloseWithAnimation();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Shared function to handle response actions (navigation, etc.)
  const processResponseAction = (response: string) => {
    const navigationMatch = response.match(/navigate:\/(\w+)/);

    if (navigationMatch) {
      let route = navigationMatch[1];
      route = route.replace(/\s+/g, '');
      const displayMessage = response.replace(/navigate:\/[\w-]+/, '').trim();

      // Add message first
      setMessages(prev => [...prev, { text: displayMessage, sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);

      // Then navigate after delay
      setTimeout(() => {
        const routePath = route.toLowerCase();
        const finalRoute = CHATBOT_ROUTE_ALIASES[routePath];

        if (finalRoute !== undefined) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          navigate(finalRoute);
        } else {
          setMessages(prev => [...prev, {
            text: "I'm not sure about that page. Available pages are: Home, Projects (including Urban Traffic Dynamics and Guardian Vision), About, and Contact.",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      }, 1000);
      return true; // Action taken
    }

    // Default: just show message
    setMessages(prev => [...prev, { text: response, sender: 'bot', timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]);
    return false;
  };

  const handleSendMessage = async () => {
    if (chatMessage.trim() && !isProcessing) {
      // Rate limiting: 2-second cooldown
      const now = Date.now();
      if (now - lastMessageTime < 2000) {
        console.log('⏳ Rate limit: Please wait before sending another message');
        return;
      }

      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const userMessage: ChatMessage = { text: chatMessage, sender: 'user', timestamp };
      setMessages(prev => [...prev, userMessage]);
      const currentMessage = chatMessage;
      setChatMessage('');
      setIsProcessing(true);
      setLastMessageTime(now);

      try {
        // 1. Check Cache
        const cachedResponse = getCachedResponse(currentMessage);
        if (cachedResponse) {
          console.log('💾 Cache Hit');
          // Process the cached response exactly like a new one (handles navigation)
          processResponseAction(cachedResponse);

          setIsProcessing(false);
          if (inputRef.current) inputRef.current.focus();
          return;
        }

        // 2. Detect Intent (Navigation vs Question)
        console.log('Analyzing intent...');
        const intent = await detectIntent(currentMessage);

        if (intent.isNavigation) {
          const page = extractPageFromNavIntent(currentMessage);
          if (page) {
            console.log(`✔️ Local Navigation detected to: ${page}`);
            const routePath = page.toLowerCase();
            const finalRoute = CHATBOT_ROUTE_ALIASES[routePath];

            if (finalRoute !== undefined) {
              const navMsg = `Navigating you to ${page}... navigate:/${page}`; // Add hidden command for consistency
              // Cache this local decision too!
              setCachedResponse(currentMessage, navMsg);
              processResponseAction(navMsg);

              setIsProcessing(false);
              return;
            }
          }
        }

        // 3. Call OpenRouter API (if not navigation or navigation failed)
        console.log('Calling OpenRouter API...');

        // Limit conversation history to last 10 messages
        const recentMessages = messages.slice(-10);

        const messageHistory: OpenRouterMessage[] = recentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

        const response = await generateResponse([
          ...messageHistory,
          { role: 'user' as const, content: currentMessage }
        ]);

        // Only cache successful responses (not error messages)
        if (response && !response.includes("I apologize") && !response.includes("trouble connecting")) {
          setCachedResponse(currentMessage, response);
        }

        processResponseAction(response);

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

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-link"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return ReactDOM.createPortal(
    <>
      <div
        className={`chatbot-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onCloseWithAnimation}
      />
      <div className={`chatbot-window ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''} ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="chatbot-header">
          <h3>AI Assistant</h3>
          <button onClick={onCloseWithAnimation}>
            <X size={20} />
          </button>
        </div>
        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chatbot-message ${message.sender} ${isProcessing && index === messages.length - 1 ? 'processing' : ''}`}>
              <div className="message-text">{renderMessageText(message.text)}</div>
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
    </>,
    document.body
  );
};

export default Chatbot;
