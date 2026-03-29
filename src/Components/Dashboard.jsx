import React, { useState, useEffect } from 'react';
import {
  FiTarget,
  FiActivity,
  FiSettings,
  FiTerminal,
  FiImage,
  FiLogOut,
  FiChevronRight,
  FiChevronLeft,
  FiUser,
  FiUpload,
  FiMoon,
  FiSun
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { supabase } from './Auth/supabaseClient';
import Playground from '../Components/Playground'; // Import your new page component
import CssUpload from './CssUpload'; // Import CssUpload page
import UserManagement from './Admin/UserManagement';
import UserActivity from './Admin/UserActivity';
import { FiUsers, FiActivity as FiPlatformActivity } from 'react-icons/fi';
import '../Styles/Dashboard.css';
import DailyActivity from './DailyActivity';
import Gallery from './Gallery';
import Consistency from './Consistency';
import Profile from './Profile';

const Dashboard = () => {
  // Initialize state based on cached role or default
  const initialIsAdmin = localStorage.getItem('userRole')?.toLowerCase() === 'admin';
  const initialTab = initialIsAdmin ? 'User Management' : 'daily Activity';

  const [activeTab, setActiveTab] = useState(localStorage.getItem('dash_active_tab') || initialTab);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  
  // Default to system theme if not set
  const getInitialTheme = () => {
    const saved = localStorage.getItem('app-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme());
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = () => {
      setTheme(localStorage.getItem('app-theme') || 'light');
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event from Playground since same-window storage events don't fire
    window.addEventListener('themeChange', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleStorageChange);
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('dash_active_tab', tab);

    // Toggle sidebar based on playground view
    if (tab === 'playground') {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  };

  useEffect(() => {
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      updateAdminState(session);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      updateAdminState(session);
    });

    const updateAdminState = async (session) => {
      // 1. Get latest session forcefully
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const effectiveSession = session || freshSession;
      
      if (!effectiveSession) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', effectiveSession.user.id)
          .single();
        
        const rawRole = profile?.role || 'user';
        const currentIsAdmin = rawRole.toLowerCase() === 'admin';
        
        // --- SYNC SESSION DATA ---
        localStorage.setItem('userRole', rawRole.toLowerCase());
        setIsAdmin(currentIsAdmin);

        const savedTab = localStorage.getItem('dash_active_tab');
        
        if (currentIsAdmin) {
          const adminTabs = ['User Management', 'Platform Activity'];
          if (!savedTab || !adminTabs.includes(savedTab)) {
            handleTabChange('User Management');
          } else {
            setActiveTab(savedTab);
          }
        } else {
          const userTabs = ['daily Activity', 'playground', 'cssUpload', 'gallery', 'Profile'];
          if (!savedTab || !userTabs.includes(savedTab)) {
            handleTabChange('daily Activity');
          } else {
            setActiveTab(savedTab);
          }
        }
      } catch (e) {
        console.error('Permission sync failed:', e);
      }
    };

    const handleNavigateToPlayground = (event) => {
      if (event.detail) {
        localStorage.setItem('playground_code', JSON.stringify(event.detail));
      }
      handleTabChange('playground');
    };

    window.addEventListener('navigateToPlayground', handleNavigateToPlayground);

    checkCurrentSession();
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('navigateToPlayground', handleNavigateToPlayground);
    };
  }, []);

  const menuItems = isAdmin
    ? [
      { name: 'User Management', icon: <FiUsers /> },
      { name: 'Platform Activity', icon: <FiPlatformActivity /> }
    ]
    : [
      { name: 'daily Activity', icon: <FiActivity /> },
      { name: 'playground', icon: <FiTerminal /> },
      { name: 'cssUpload', icon: <FiUpload /> },
      { name: 'gallery', icon: <FiImage /> },
      { name: 'Profile', icon: <FiUser /> }
    ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event("storage"));
    navigate('/auth');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    window.dispatchEvent(new Event('themeChange'));
  };

  // Helper function to render the correct component based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'playground':
        return <Playground />;
      case 'cssUpload':
        return <CssUpload />
      case 'daily Activity':
        return <DailyActivity />;
      case 'gallery':
        return <Gallery />;
      case 'Profile':
        return <Profile />;
      case 'User Management':
        return <UserManagement />;
      case 'Platform Activity':
        return <UserActivity />;
      default:
        return (
          <div className="Dash_card">
            <h3 style={{ textTransform: 'capitalize' }}>{activeTab}</h3>
            <p>This section is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <div className={`Dash_container ${isCollapsed ? 'collapsed' : ''} ${theme === 'dark' ? 'Dash_dark' : ''}`}>
      <aside className="Dash_sidebar">
        <div className="Dash_sidebarHeader">
          {!isCollapsed && (
            <h2 className="Dash_logoText">
              Cascade<span>Log</span>
            </h2>
          )}

          <button
            className="Dash_toggleBtn"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="Dash_nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`Dash_navItem ${activeTab === item.name ? 'Dash_active' : ''}`}
              onClick={() => {
                if (item.name === 'Profile') {
                  // If clicking profile and it's already active, toggle theme
                  if (activeTab === 'Profile') toggleTheme();
                  else handleTabChange(item.name);
                } else {
                  handleTabChange(item.name);
                }
              }}
            >
              <span className="Dash_icon">{item.icon}</span>
              <span className="Dash_linkText">{item.name}</span>
              {activeTab === item.name && !isCollapsed && <FiChevronRight className="Dash_indicator" />}
            </button>
          ))}

          <div className="Dash_sidebarFooter">
            <button className="Dash_navItem Dash_themeToggle" onClick={toggleTheme}>
              <span className="Dash_icon">{theme === 'light' ? <FiMoon /> : <FiSun />}</span>
              {!isCollapsed && <span className="Dash_linkText">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
            </button>
            <button className="Dash_navItem Dash_logoutBtn" onClick={handleLogout}>
              <span className="Dash_icon"><FiLogOut /></span>
              {!isCollapsed && <span className="Dash_linkText">Logout</span>}
            </button>
          </div>
        </nav>
      </aside>

      <main className="Dash_main">
        <section className={`Dash_contentBody ${activeTab === 'playground' ? 'Dash_fullHeight' : ''}`}>
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;