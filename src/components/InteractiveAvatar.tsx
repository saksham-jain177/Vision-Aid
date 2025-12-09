import React, { useEffect, useState, useRef } from 'react';

const InteractiveAvatar: React.FC = () => {
    const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!svgRef.current) return;

            // Get the bounding box of the SVG to calculate relative position
            const rect = svgRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calculate vector from center to mouse
            const dx = event.clientX - centerX;
            const dy = event.clientY - centerY;

            // Normalize and scale to limit movement range (increased to 8px for better visibility)
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 12;
            const scale = Math.min(maxDistance, distance / 12); // Increased sensitivity

            const angle = Math.atan2(dy, dx);
            const x = Math.cos(angle) * scale;
            const y = Math.sin(angle) * scale;

            setPupilPos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 150);
        }, 3000 + Math.random() * 2000);

        return () => clearInterval(blinkInterval);
    }, []);

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
                transform: 'scale(2.2)',
                overflow: 'visible'
            }}
        >
            {/* Head Background */}
            <defs>
                <linearGradient id="headGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0e0e0" />
                </linearGradient>
                <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2c3e50" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
                <radialGradient id="eyeGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00ffff" />
                    <stop offset="60%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#00a8cc" />
                </radialGradient>
            </defs>

            {/* Antennae */}
            <line x1="20" y1="40" x2="20" y2="20" stroke="#ff4081" strokeWidth="4" strokeLinecap="round" />
            <line x1="80" y1="40" x2="80" y2="20" stroke="#ff4081" strokeWidth="4" strokeLinecap="round" />
            <circle cx="20" cy="20" r="3" fill="#ff4081" />
            <circle cx="80" cy="20" r="3" fill="#ff4081" />

            {/* Main Head */}
            <rect x="15" y="30" width="70" height="60" rx="15" fill="url(#headGradient)" />

            {/* Top Light */}
            <rect x="35" y="25" width="30" height="8" rx="4" fill="#ffd700" />

            {/* Visor Area */}
            <rect x="25" y="45" width="50" height="25" rx="10" fill="url(#visorGradient)" />

            {/* Eyes Container Group */}
            <g transform={`translate(${pupilPos.x}, ${pupilPos.y})`}>
                {/* Left Eye Outer Glow */}
                <ellipse cx="40" cy="57" rx="10" ry="8" fill="#00d4ff" opacity={isBlinking ? '0' : '0.2'} style={{ filter: 'blur(3px)', transition: 'opacity 0.15s ease' }} />
                {/* Left Eye Glow */}
                <ellipse cx="40" cy="57" rx="9" ry="7" fill="#00d4ff" opacity={isBlinking ? '0' : '0.4'} style={{ filter: 'blur(1.5px)', transition: 'opacity 0.15s ease' }} />
                {/* Left Eye */}
                <ellipse cx="40" cy="57" rx="8" ry={isBlinking ? 1 : 6} fill="url(#eyeGradient)" style={{ transition: 'ry 0.15s ease' }} />
                {/* Left Eye Highlight */}
                <ellipse cx="38" cy="55" rx="3" ry={isBlinking ? 0.5 : 2} fill="#ffffff" opacity={isBlinking ? '0' : '0.8'} style={{ transition: 'ry 0.15s ease, opacity 0.15s ease' }} />

                {/* Right Eye Outer Glow */}
                <ellipse cx="60" cy="57" rx="10" ry="8" fill="#00d4ff" opacity={isBlinking ? '0' : '0.2'} style={{ filter: 'blur(3px)', transition: 'opacity 0.15s ease' }} />
                {/* Right Eye Glow */}
                <ellipse cx="60" cy="57" rx="9" ry="7" fill="#00d4ff" opacity={isBlinking ? '0' : '0.4'} style={{ filter: 'blur(1.5px)', transition: 'opacity 0.15s ease' }} />
                {/* Right Eye */}
                <ellipse cx="60" cy="57" rx="8" ry={isBlinking ? 1 : 6} fill="url(#eyeGradient)" style={{ transition: 'ry 0.15s ease' }} />
                {/* Right Eye Highlight */}
                <ellipse cx="58" cy="55" rx="3" ry={isBlinking ? 0.5 : 2} fill="#ffffff" opacity={isBlinking ? '0' : '0.8'} style={{ transition: 'ry 0.15s ease, opacity 0.15s ease' }} />
            </g>

            {/* Mouth */}
            <rect x="40" y="78" width="20" height="4" rx="2" fill="#333" />
        </svg>
    );
};

export default InteractiveAvatar;
