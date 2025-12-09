import React from 'react';
import InteractiveAvatar from './InteractiveAvatar';
import './Chatbot.css'; // Ensure styles are loaded

interface ChatbotToggleProps {
    isOpen: boolean;
    onClick: () => void;
}

const ChatbotToggle: React.FC<ChatbotToggleProps> = ({ isOpen, onClick }) => {
    return (
        <button
            className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
            onClick={onClick}
            aria-label="Toggle Chatbot"
            style={{ overflow: 'visible' }}
        >
            <InteractiveAvatar />
        </button>
    );
};

export default ChatbotToggle;
