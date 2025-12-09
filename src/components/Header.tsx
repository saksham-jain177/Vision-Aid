import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import './Header.css';

interface HeaderProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
    const location = useLocation();

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
                    <img
                        src="/logo-final.png"
                        alt="VisionAid Logo"
                        className="logo-icon"
                        style={{
                            width: '100px',
                            height: '100px',
                            position: 'absolute',
                            top: '50%',
                            left: '-10px',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                    <h1 className="logo-text">VisionAid</h1>
                </Link>
                <nav className="nav-menu">
                    <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
                    <Link to="/projects" className={`nav-link ${location.pathname === '/projects' ? 'active' : ''}`}>Projects</Link>
                    <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
                    <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
                </nav>
                <button className="mode-toggle" onClick={toggleTheme}>
                    {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
                </button>
            </div>
        </header>
    );
};

export default Header;
