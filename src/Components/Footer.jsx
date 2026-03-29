import React, { useState, useEffect } from "react";

const Footer = () => {
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

    useEffect(() => {
        const handleThemeChange = () => {
            setTheme(localStorage.getItem('app-theme') || 'light');
        };
        window.addEventListener('themeChange', handleThemeChange);
        window.addEventListener('storage', handleThemeChange);
        return () => {
            window.removeEventListener('themeChange', handleThemeChange);
            window.removeEventListener('storage', handleThemeChange);
        };
    }, []);

    // Reverse Theme: Light theme gets dark footer, Dark theme gets light footer
    const footerThemeClass = theme === 'light' ? 'footer_dark' : 'footer_light';

    return (
        <footer className={`home_bottom-nav ${footerThemeClass}`}>
            <div className="home_marquee-wrapper">
                <div className="home_marquee-content">
                    <span>🛡️ This platform is a personal archive for daily task storage and code showcasing. It is intended for individual portfolio use and does not aim to harm or conflict with a CSSBattle website. &nbsp; &nbsp; • &nbsp; &nbsp;</span>
                    <span>🛡️ This platform is a personal archive for daily task storage and code showcasing. It is intended for individual portfolio use and does not aim to harm or conflict with a CSSBattle website. &nbsp; &nbsp; • &nbsp; &nbsp;</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;