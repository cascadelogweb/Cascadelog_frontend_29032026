import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiUser, FiPhone, FiLock, FiEye, FiEyeOff,
  FiEdit3, FiActivity, FiTrendingUp, FiCamera, FiCheck, FiX, FiLoader,
  FiChevronDown
} from 'react-icons/fi';
import { supabase } from './Auth/supabaseClient';
import '../Styles/Profile.css';
import API_BASE_URL from './Auth/Config';
import { LoadingSvg } from './Utilities';
import { useModal } from '../Context/ModalContext';

const Profile = () => {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null); // Full API Data
  const [profileImg, setProfileImg] = useState(null);   // Avatar URL
  const { showAlert } = useModal();

  // About Me States
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  // CSS Battle URL States
  const [cssUrl, setCssUrl] = useState("");
  const [isEditingCss, setIsEditingCss] = useState(false);
  const [isSavingCss, setIsSavingCss] = useState(false);

  // Password Edit States
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '' });
  const [consistencyStats, setConsistencyStats] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  const years = [2026, 2025, 2024];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fileInputRef = useRef(null);
  const bioRef = useRef(null);
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



  // --- Real Consistency Logic ---
  const heatmapData = useMemo(() => {
    const allDays = [];
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    // Find initial padding (if Jan 1st isn't Sunday)
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      allDays.push({ valid: false });
    }

    // Fill all days of the year
    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = d.toISOString().split('T')[0];
      const hasUpload = consistencyStats.some(u => u.date === dateStr);
      allDays.push({
        dateStr,
        active: hasUpload,
        valid: true,
        month: months[d.getMonth()]
      });
      d.setDate(d.getDate() + 1);
    }

    // Group into weeks (7 days each)
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7);
      // Identify month label for the week
      const firstValidDay = weekDays.find(wd => wd.valid);
      weeks.push({
        monthLabel: firstValidDay ? firstValidDay.month : null,
        days: weekDays
      });
    }

    return weeks;
  }, [consistencyStats, selectedYear]);

  const barGraphData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = consistencyStats.filter(u => u.date === dateStr).length;
      return { day, count };
    });
  }, [selectedYear, selectedMonth, consistencyStats]);

  // --- 1. FETCH FULL PROFILE DATA ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/full-profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error("Failed to load profile");

        const data = await response.json();
        setProfileData(data);

        if (data.details.profileImg) setProfileImg(data.details.profileImg);
        if (data.details.about) setDescription(data.details.about);
        if (data.details.cssurl) setCssUrl(data.details.cssurl);

        // Fetch consistency stats separately
        const consResponse = await fetch(`${API_BASE_URL}/api/submissions/consistency`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (consResponse.ok) {
          const consData = await consResponse.json();
          setConsistencyStats(consData);
        }

      } catch (err) {
        console.error("Profile Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // --- 2. HANDLE IMAGE UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optimistic UI Update
    setProfileImg(URL.createObjectURL(file));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/api/update-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Update with server URL to ensure consistency
      setProfileImg(result.url);
      localStorage.setItem('profileImg', result.url);
      window.dispatchEvent(new Event("profileUpdated"));

    } catch (err) {
      console.error("Upload failed", err);
      showAlert({
        type: 'danger',
        title: 'Update Failed',
        message: "We couldn't save your new profile picture. Please try again or check your connection.",
        confirmText: 'Dismiss'
      });
    }
  };

  // --- 3. HANDLE ABOUT ME SAVE ---
  const handleSaveAbout = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSavingAbout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_BASE_URL}/api/update-about`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ about: description })
      });

      if (!response.ok) throw new Error("Failed to update");

      setIsEditing(false); // Exit edit mode

    } catch (err) {
      console.error(err);
      showAlert({
        type: 'warning',
        title: 'Save Interrupted',
        message: "Your bio couldn't be saved at this moment. Please double-check your network.",
        confirmText: 'Okay'
      });
    } finally {
      setIsSavingAbout(false);
    }
  };

  // --- 3.5 HANDLE CSS URL SAVE ---
  const handleSaveCssUrl = async () => {
    if (!isEditingCss) {
      setIsEditingCss(true);
      return;
    }

    setIsSavingCss(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      console.log("Sending CSS URL:", cssUrl);

      const response = await fetch(`${API_BASE_URL}/api/update-cssurl`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ cssurl: cssUrl })
      });

      console.log("Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Save Error Detail:", errorData);
        throw new Error("Failed to update CSS URL");
      }

      setIsEditingCss(false); // Exit edit mode
      showAlert({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your CSS Battle URL has been saved successfully.',
        confirmText: 'Great!'
      });

    } catch (err) {
      console.error(err);
      showAlert({
        type: 'warning',
        title: 'Save Interrupted',
        message: "Your CSS Battle URL couldn't be saved at this moment. Please double-check your network.",
        confirmText: 'Okay'
      });
    } finally {
      setIsSavingCss(false);
    }
  };



  // --- 4. COMPUTE WEEKLY GRAPH DATA ---
  const currentWeekData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start (0)

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isActive = consistencyStats.some(u => u.date === dateStr);

      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        active: isActive,
        isToday: d.toDateString() === today.toDateString()
      };
    });
  }, [consistencyStats]);

  if (loading) {
    return (
      <div className="Prof_container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSvg />
      </div>
    );
  }

  // Safe Defaults
  const user = profileData?.details || { name: "User", email: "...", phone: "Not Set" };
  const stats = profileData?.stats || { streak: 0, monthly: 0, total: 0 };
  const recentTasks = profileData?.activity?.recent || [];

  return (
    <div className={`Prof_container ${theme === 'dark' ? 'Prof_dark' : 'Prof_light'} fade-in`}>
      <div className="Prof_contentWrapper">
        {/* --- SIDEBAR (LEETCODE LEFT) --- */}
        <aside className="Prof_sidebar">

          {/* 1. Identity Card */}
          <div className="Prof_userCard">
            <div className="Prof_avatarSection">
              <div className="Prof_avatarLg">
                {profileImg ? (
                  <img src={profileImg} alt="Profile" className="Prof_imgFill" />
                ) : (
                  <FiUser />
                )}
                <button className="Prof_avatarEdit" onClick={() => fileInputRef.current.click()}>
                  <FiCamera />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="Prof_hiddenInput"
                accept="image/*"
              />
            </div>

            <div className="Prof_idTexts">
              <h1 className="Prof_mainName">{user.name}</h1>
              <p className="Prof_mainEmail">{user.email}</p>
            </div>

            <button className="Prof_btnPrimary" onClick={() => { setIsEditing(true); setTimeout(() => bioRef.current?.focus(), 100); }}>
              Edit Profile
            </button>
          </div>

          {/* 2. Community / Stats Card */}
          <div className="Prof_sidePanel">
            <h4 className="Prof_panelTitle">Community Stats</h4>
            <div className="Prof_miniStatsGrid">
              <div className="Prof_miniStatTab">
                <header>Streak</header>
                <p>{stats.streak}</p>
              </div>
              <div className="Prof_miniStatTab">
                <header>Overall</header>
                <p>{stats.total}</p>
              </div>
            </div>

            <div className="Prof_weekGraphSection">
              <h5 className="Prof_miniSubTitle">Week Activity</h5>
              <div className="Prof_weekBarsArea">
                {currentWeekData.map((d, i) => (
                  <div key={i} className="Prof_weekBarGroup">
                    <div className={`Prof_weekBar ${d.active ? 'active' : ''} ${d.isToday ? 'today' : ''}`} />
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Personal Info Panel */}
          <div className="Prof_sidePanel">
            <header className="Prof_panelHeader">
              <h4 className="Prof_panelTitle" style={{ margin: 0, border: 'none', padding: 0 }}>Personal Details</h4>
              <FiEdit3 className="Prof_infoItem" onClick={() => setIsChangingPass(!isChangingPass)} />
            </header>

            <div className="Prof_infoItem">
              <FiPhone /> <span>{user.phone}</span>
            </div>

            <div className="Prof_infoItem">
              <FiLock />
              <span>Security Settings</span>
            </div>

            {isChangingPass && (
              <div className="Prof_sideEditArea scale-in" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="password"
                  placeholder="New Password"
                  className="Prof_sideInput"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                />
                <div className="Prof_sideActions" style={{ display: 'flex', gap: '8px' }}>
                  <button className="Prof_sideConfirmBtn" onClick={() => setIsChangingPass(false)}>
                    <FiCheck /> Confirm
                  </button>
                  <button className="Prof_sideCancelBtn" onClick={() => setIsChangingPass(false)}>
                    <FiX />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. CSS Battle Card */}
          <div className="Prof_sidePanel">
            <div className="Prof_sectionRow">
              <h4 className="Prof_panelTitle">CSS Profile</h4>
              <FiEdit3 className="Prof_infoItem" onClick={() => setIsEditingCss(!isEditingCss)} />
            </div>

            {isEditingCss ? (
              <div className="Prof_sideEditArea">
                <input
                  type="text"
                  value={cssUrl}
                  onChange={(e) => setCssUrl(e.target.value)}
                  className="Prof_sideInput"
                  placeholder="URL here"
                />
                <button onClick={handleSaveCssUrl} className="Prof_sideMiniBtn">Save</button>
              </div>
            ) : (
              cssUrl ? (
                <a href={cssUrl.startsWith('http') ? cssUrl : `https://${cssUrl}`} target="_blank" rel="noopener noreferrer" className="Prof_leetcodeLink" style={{ wordBreak: 'break-all' }}>
                  <FiTrendingUp style={{ flexShrink: 0 }} /> {cssUrl}
                </a>
              ) : <p className="Prof_noneText">No profile linked.</p>
            )}
          </div>
        </aside>

        {/* --- MAIN AREA (LEETCODE RIGHT) --- */}
        <section className="Prof_mainContent">

          {/* 1. Contribution Grid (Full 12 Months) */}
          <div className="Prof_mainPanel">
            <header className="Prof_panelHeader">
              <div className="Prof_headerLeft">
                <h3>Activity Grid</h3>
                <div className="Prof_dropdownWrapper">
                  <button className="Prof_miniTabBtn" onClick={() => setIsYearOpen(!isYearOpen)}>
                    {selectedYear} <FiChevronDown />
                  </button>
                  {isYearOpen && (
                    <div className="Prof_miniDropdown">
                      {years.map(y => (
                        <div key={y} className="Prof_dropItem" onClick={() => { setSelectedYear(y); setIsYearOpen(false); }}>{y}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span>{consistencyStats.length} total submissions</span>
            </header>

            <div className="Prof_heatmapContainer">
              <div className="Prof_heatmapGrid">
                {heatmapData.map((week, i) => {
                  const showLabel = i === 0 || (heatmapData[i - 1] && heatmapData[i - 1].monthLabel !== week.monthLabel);
                  return (
                    <div key={i} className={`Prof_heatmapCol ${showLabel ? 'Prof_monthStart' : ''}`}>
                      {showLabel ? (
                        <span className="Prof_monthLabel">{week.monthLabel}</span>
                      ) : (
                        <span className="Prof_monthLabel empty" />
                      )}
                      <div className="Prof_sqStack">
                        {week.days.map((d, di) => (
                          d.valid ? (
                            <div
                              key={di}
                              className={`Prof_sq ${d.active ? 'active' : ''}`}
                              title={d.dateStr}
                            />
                          ) : <div key={di} className="Prof_sq empty" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="Prof_graphFooter">
                <span>Less</span>
                <div className="Prof_sq" />
                <div className="Prof_sq active" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* 2. Monthly Trend Graph */}
          <div className="Prof_mainPanel">
            <header className="Prof_panelHeader">
              <div className="Prof_headerLeft">
                <h3>Monthly Trends</h3>
                <div className="Prof_dropdownWrapper">
                  <button className="Prof_miniTabBtn" onClick={() => setIsMonthOpen(!isMonthOpen)}>
                    {months[selectedMonth]} <FiChevronDown />
                  </button>
                  {isMonthOpen && (
                    <div className="Prof_miniDropdown">
                      {months.map((m, idx) => (
                        <div key={m} className="Prof_dropItem" onClick={() => { setSelectedMonth(idx); setIsMonthOpen(false); }}>{m}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="Prof_trendChart">
              <div className="Prof_barsArea">
                {barGraphData.map((d, i) => (
                  <div key={i} className="Prof_trendBarGroup">
                    <div
                      className={`Prof_trendBar ${d.count > 0 ? 'active' : ''}`}
                      style={{ height: d.count > 0 ? '100%' : '15%' }}
                      title={`${d.day}: ${d.count} posts`}
                    />
                    {d.day % 5 === 0 && <span className="Prof_barNum">{d.day}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. About Me */}
          <div className="Prof_mainPanel">
            <header className="Prof_panelHeader">
              <h3>Bio</h3>
              <FiEdit3 className="Prof_infoItem" onClick={() => setIsEditing(!isEditing)} />
            </header>

            {isEditing ? (
              <textarea
                ref={bioRef}
                className="Prof_mainTextarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveAbout}
                placeholder="Tell the community about yourself..."
              />
            ) : (
              <p className="Prof_mainBioText">
                {description || "No bio added yet."}
              </p>
            )}
          </div>

          {/* 4. Recent Activity */}
          <div className="Prof_mainPanel">
            <header className="Prof_panelHeader">
              <h3>Recent Submissions</h3>
            </header>

            <div className="Prof_activityList">
              {recentTasks.length > 0 ? (
                recentTasks.map((task, index) => (
                  <div key={index} className="Prof_activityRow">
                    <div className="Prof_actIcon"><FiActivity /></div>
                    <div className="Prof_actInfo">
                      <div className="Prof_actHeader">
                        <span className="Prof_actName">{task.name}</span>
                        <span className="Prof_actTime">{task.time}</span>
                      </div>
                      <p className="Prof_actDesc">{task.description || "No description provided."}</p>
                      <span className="Prof_actDate">{task.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="Prof_noneText">No recent activity detected.</p>
              )}
            </div>
          </div>

        </section>
      </div>
    </div>
  );
};

export default Profile;