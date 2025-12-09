import React, { useEffect, useState, useRef } from 'react';
import './Toast.css';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3500 }) => {
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Start the fade-out animation before closing
  const startFadeOut = () => {
    setIsFading(true);
    // Wait for the animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 500); // Match the animation duration in CSS
  };

  useEffect(() => {
    // Set a timer to start the fade-out animation
    timerRef.current = window.setTimeout(() => {
      startFadeOut();
    }, duration - 500); // Start the animation 500ms before the duration ends
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className={`toast toast-${type} ${isFading ? 'fade-out' : ''}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={startFadeOut}>
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
