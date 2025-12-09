import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Settings, Cpu, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateResponse } from '../services/openRouterService';
import { generateOllamaResponse, checkOllamaConnection } from '../services/ollamaService';
import { CHATBOT_ROUTE_ALIASES } from '../config/routes';
import { getCachedResponse, setCachedResponse } from '../utils/chatCache';
import { detectIntent, extractPageFromNavIntent } from '../utils/intentDetection';
import { sanitizeChatMessage } from '../utils/sanitize';
import { chatRateLimiter, getSessionId } from '../utils/rateLimit';
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
  const [modelProvider, setModelProvider] = useState<'cloud' | 'local'>('cloud');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProvider = localStorage.getItem('visionAid_modelProvider');
    if (savedProvider === 'local' || savedProvider === 'cloud') {
      setModelProvider(savedProvider);
    }
  }, []);

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

  const toggleModelProvider = async (provider: 'cloud' | 'local') => {
    if (provider === modelProvider) return;
    if (provider === 'local') {
      const isOllamaAvailable = await checkOllamaConnection();
      if (!isOllamaAvailable) {
        setToastMessage('⚠️ Ollama not running');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }
    }
    setModelProvider(provider);
    localStorage.setItem('visionAid_modelProvider', provider);
    setToastMessage(`Switched to ${provider === 'local' ? 'Local' : 'Cloud'}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

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
      // Security: Sanitize user input
      const sanitized = sanitizeChatMessage(chatMessage);

      if (!sanitized.valid) {
        setToastMessage(sanitized.error || 'Invalid message');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      // Security: Rate limiting (10 messages per minute)
      const sessionId = getSessionId();
      if (!chatRateLimiter.canMakeRequest(sessionId, 10, 60000)) {
        const waitTime = chatRateLimiter.getTimeUntilReset(sessionId, 60000);
        setToastMessage(`⏱️ Please wait ${waitTime}s before sending another message`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const userMessage: ChatMessage = { text: sanitized.sanitized, sender: 'user', timestamp };
      setMessages(prev => [...prev, userMessage]);
      const currentMessage = sanitized.sanitized;
      setChatMessage('');
      setLastMessageTime(Date.now());
      setIsProcessing(true);
      setAgentStatus('Thinking...');

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

        // 3. Call LLM (Cloud or Local)
        let response: string;

        if (modelProvider === 'local') {
          console.log('Calling Local Ollama...');
          setAgentStatus('Processing locally...');

          // Check connection first
          const isConnected = await checkOllamaConnection();
          if (!isConnected) {
            throw new Error("Ollama not reachable. Make sure it's running on port 11434.");
          }

          const recentMessages = messages.slice(-10);
          const messageHistory = recentMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));

          response = await generateOllamaResponse([
            ...messageHistory,
            { role: 'user', content: currentMessage }
          ]);

        } else {
          // Cloud (OpenRouter)
          console.log('Calling OpenRouter API...');
          setAgentStatus('Contacting cloud...');

          const recentMessages = messages.slice(-10);
          const messageHistory: OpenRouterMessage[] = recentMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));

          response = await generateResponse([
            ...messageHistory,
            { role: 'user' as const, content: currentMessage }
          ]);
        }

        // Only cache successful responses (not error messages)
        if (response && !response.includes("I apologize") && !response.includes("trouble connecting")) {
          setCachedResponse(currentMessage, response);
        }

        processResponseAction(response);

      } catch (error: any) {
        console.error("Chat Error:", error);
        let errorMessage = "I apologize, but I'm having trouble connecting right now. Please try again.";

        if (modelProvider === 'local' && error.message.includes("Ollama")) {
          errorMessage = "⚠️ Could not connect to Ollama. Is it running locally on port 11434? You can switch back to Cloud mode in settings.";
        }

        setMessages(prev => [...prev, {
          text: errorMessage,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
      } finally {
        setIsProcessing(false);
        setAgentStatus('');
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
          <div className="header-title">
            <h3>AI Assistant</h3>
            <span className={`provider-badge ${modelProvider}`}>
              {modelProvider === 'cloud' ? <Cloud size={12} /> : <Cpu size={12} />}
              {modelProvider === 'cloud' ? 'Cloud' : 'Local'}
            </span>
          </div>
          <div className="header-actions">
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="settings-btn">
              <Settings size={18} />
            </button>
            <button onClick={onCloseWithAnimation}>
              <X size={20} />
            </button>
          </div>
        </div>

        {showToast && (
          <div className="chatbot-toast">
            {toastMessage}
          </div>
        )}

        {isSettingsOpen && (
          <div className="chatbot-settings">
            <h4>Neural Engine</h4>
            <div className="provider-options">
              <button
                className={`provider-option ${modelProvider === 'cloud' ? 'active' : ''}`}
                onClick={() => toggleModelProvider('cloud')}
              >
                <Cloud size={16} />
                <div className="provider-info">
                  <span className="name">Cloud (OpenRouter)</span>
                  <span className="desc">Production Grade • Zero Setup</span>
                </div>
              </button>
              <button
                className={`provider-option ${modelProvider === 'local' ? 'active' : ''}`}
                onClick={() => toggleModelProvider('local')}
              >
                <Cpu size={16} />
                <div className="provider-info">
                  <span className="name">Local (Ollama)</span>
                  <span className="desc">Privacy Focused • Requires Setup</span>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chatbot-message ${message.sender}`}>
              <div className="message-text">{renderMessageText(message.text)}</div>
              <div className="message-timestamp">{message.timestamp}</div>
            </div>
          ))}
          {isProcessing && (
            <div className="chatbot-message bot processing-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              {agentStatus && <span className="agent-status-text">{agentStatus}</span>}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chatbot-input">
          <input
            ref={inputRef}
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={agentStatus || (isProcessing ? "Processing..." : "Press '/' to chat")}
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing) {
                handleSendMessage();
              }
            }}
          />
          <button onClick={handleSendMessage} disabled={isProcessing}>
            <Send size={24} />
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default Chatbot;
