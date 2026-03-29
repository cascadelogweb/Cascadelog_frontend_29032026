import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiArrowLeft, FiXCircle } from 'react-icons/fi';
import { LogoSVG } from './Utilities';
import '../Styles/NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

    useEffect(() => {
        const handleThemeChange = () => {
            setTheme(localStorage.getItem('app-theme') || 'light');
        };
        window.addEventListener('storage', handleThemeChange);
        window.addEventListener('themeChange', handleThemeChange);
        return () => {
            window.removeEventListener('storage', handleThemeChange);
            window.removeEventListener('themeChange', handleThemeChange);
        };
    }, []);

    const timestamp = new Date().toISOString();
    const currentPath = window.location.hash || window.location.pathname;

    return (
        <div className={`NotFound_container ${theme === 'dark' ? 'NotFound_dark' : 'NotFound_light'}`}>
            <div className="NotFound_illustration NotFound_appear">
                <svg viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="250" cy="175" r="140" fill="url(#paint0_linear_404)" fillOpacity="0.1" />
                    <text x="50%" y="180" dominantBaseline="middle" textAnchor="middle" 
                          fill="url(#paint0_linear_404)" fontSize="180" fontWeight="900" style={{fontFamily: 'Poppins'}}>
                        404
                    </text>
                    <defs>
                        <linearGradient id="paint0_linear_404" x1="0" y1="0" x2="500" y2="350" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF1493" />
                            <stop offset="1" stopColor="#FF8C00" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="NotFound_content">
                <div className="NotFound_topBrand NotFound_appear NotFound_delay-1">
                    <LogoSVG /> <span>CascadeLog</span>
                </div>
                
                <h1 className="NotFound_title NotFound_appear NotFound_delay-2">OUT OF SCOPE</h1>
                <p className="NotFound_note NotFound_appear NotFound_delay-2">
                    The requested coordinates do not exist in our platform logs.
                </p>

                <div className="NotFound_diagnosticBox NotFound_appear NotFound_delay-3">
                    <p>STATUS: UNRESOLVED_ROUTE_ENTRY</p>
                    <p>LOG_PATH: {currentPath}</p>
                    <p>TIMESTAMP: {timestamp}</p>
                    <p>SUGGESTION: Purge cache or verify URL precision.</p>
                </div>
                
                <div className="NotFound_actions NotFound_appear NotFound_delay-3">
                    <button onClick={() => navigate(-1)} className="NotFound_backBtn">
                        <FiArrowLeft /> <span>Go Back</span>
                    </button>
                    <Link to="/" className="NotFound_homeBtn">
                        <FiHome /> <span>Back to Base</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};


export default NotFound;
