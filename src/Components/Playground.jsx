import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiDownload, FiMaximize, FiUploadCloud, FiX, FiCheckCircle, FiColumns, FiAlignJustify, FiSun, FiMoon } from 'react-icons/fi';
import { supabase } from './Auth/supabaseClient';
import API_BASE_URL from './Auth/Config';
import '../Styles/playground.css';

const Playground = () => {
  const [html, setHtml] = useState('<h1>Hello World</h1>');
  const [css, setCss] = useState('h1 { color: coral; }');
  const [js, setJs] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [isUploaded, setIsUploaded] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    window.dispatchEvent(new Event('themeChange'));
  }, [theme]);

  // Handle global theme changes
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


  useEffect(() => {
    const savedCode = localStorage.getItem('playground_code');
    if (savedCode) {
      try {
        const parsed = JSON.parse(savedCode);
        if (parsed.html != null) setHtml(parsed.html);
        if (parsed.css != null) setCss(parsed.css);
        if (parsed.js != null) setJs(parsed.js);
        if (parsed.isUploaded) setIsUploaded(true);
      } catch (e) { }
      localStorage.removeItem('playground_code');
    }
  }, []);
  const [srcDoc, setSrcDoc] = useState('');

  // Resizing State
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  // Extension State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [submissionType, setSubmissionType] = useState('dailyTasks');
  const [description, setDescription] = useState('');
  const [submitFiles, setSubmitFiles] = useState({ html: true, css: true, js: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [layout, setLayout] = useState('row'); // 'row' or 'col'
  const [topHeight, setTopHeight] = useState(50); // percentage for column mode

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const playgroundRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`<html><style>${css}</style><body>${html}</body><script>${js}</script></html>`);
    }, 250);
    return () => clearTimeout(timeout);
  }, [html, css, js]);

  // --- Resizing Logic ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing && playgroundRef.current) {
      const containerRect = playgroundRef.current.getBoundingClientRect();

      if (layout === 'row') {
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 10 && newWidth < 90) setLeftWidth(newWidth);
      } else {
        const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
        if (newHeight > 10 && newHeight < 90) setTopHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      playgroundRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSubmit = async () => {
    if (!description) {
      setMessage("Description is required");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Must be logged in to submit.");

      const formData = new FormData();
      if (submissionType === 'dailyTasks') {
        formData.append('description', description);
      } else {
        formData.append('title', description);
      }

      const appendFile = (content, name) => {
        const file = new File([content], `${name}.txt`, { type: 'text/plain' });
        formData.append(name, file);
      };

      if (submitFiles.html && html.trim()) appendFile(html, 'html');
      if (submitFiles.css && css.trim()) appendFile(css, 'css');
      if (submitFiles.js && js.trim()) appendFile(js, 'js');

      // Send to backend via our protected API, bypassing RLS issues.
      const endpoint = submissionType === 'dailyTasks' ? '/api/submissions/submit' : '/api/css-battles/submit';

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Submission failed on server");

      setMessage("Success!");
      setShowSubmitPanel(false);
      setDescription("");

    } catch (err) {
      console.error(err);
      setMessage(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`Play_container Play_${theme} ${layout === 'col' ? 'Play_col' : ''}`}
      ref={playgroundRef}
      style={{ cursor: isResizing ? (layout === 'row' ? 'col-resize' : 'row-resize') : 'default' }}
    >

      <div className="Play_workspace">
        {/* Editor Portion */}
      <div
        className="Play_editorSection"
        style={layout === 'row' ? { width: `${leftWidth}%` } : { height: `${topHeight}%`, width: '100%', borderRight: 'none' }}
      >
        <div className="Play_toolbar">
          <div className="Play_tabs">
            <button className={activeTab === 'html' ? 'active' : ''} onClick={() => setActiveTab('html')} title="HTML Editor">HTML</button>
            <button className={activeTab === 'css' ? 'active' : ''} onClick={() => setActiveTab('css')} title="CSS Styles">CSS</button>
            <button className={activeTab === 'js' ? 'active' : ''} onClick={() => setActiveTab('js')} title="JavaScript Logic">JS</button>
          </div>
          <div className="Play_actions">
            <button onClick={() => { /* Download Logic */ }} title="Download Source Files"><FiDownload /></button>
            {!isUploaded && (
              <button
                onClick={() => setShowSubmitPanel(!showSubmitPanel)}
                className={showSubmitPanel ? 'active' : ''}
                title="Submit to Platform"
              >
                <FiUploadCloud />
              </button>
            )}
            <button
              onClick={() => setLayout(layout === 'row' ? 'col' : 'row')}
              title={layout === 'row' ? "Switch to Stacked View" : "Switch to Side-by-Side View"}
              className="Play_layoutToggleBtn"
            >
              {layout === 'row' ? <FiAlignJustify /> : <FiColumns />}
            </button>
            <button onClick={toggleFullScreen} title="Toggle Fullscreen"><FiMaximize /></button>
          </div>
        </div>

        {/* Submission Panel */}
        {showSubmitPanel && (
          <div className="Play_submitPanel">
            <div className="Play_panelHeader">
              <h3>Submit Activity</h3>
              <button onClick={() => setShowSubmitPanel(false)}><FiX /></button>
            </div>

            <div className="Play_panelBody">
              <div className="Play_formGroup">
                <label>Submit As</label>
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="Play_select"
                >
                  <option value="dailyTasks">Daily Task</option>
                  <option value="cssBattles">CSS Battle</option>
                </select>
              </div>

              <div className="Play_formGroup">
                <label>Description / Name</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={submissionType === 'dailyTasks' ? "Describe your task..." : "Battle name..."}
                  className="Play_input"
                />
              </div>

              <div className="Play_formGroup">
                <label>Files to Include</label>
                <div className="Play_fileSwitches">
                  <label><input type="checkbox" checked={submitFiles.html} onChange={(e) => setSubmitFiles({ ...submitFiles, html: e.target.checked })} /> HTML</label>
                  <label><input type="checkbox" checked={submitFiles.css} onChange={(e) => setSubmitFiles({ ...submitFiles, css: e.target.checked })} /> CSS</label>
                  <label><input type="checkbox" checked={submitFiles.js} onChange={(e) => setSubmitFiles({ ...submitFiles, js: e.target.checked })} /> JS</label>
                </div>
              </div>

              {message && <div className={`Play_message ${message === 'Success!' ? 'success' : 'error'}`}>{message}</div>}

              <button
                className="Play_submitBtn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : <><FiCheckCircle /> Submit</>}
              </button>
            </div>
          </div>
        )}

        <textarea
          className="Play_textarea"
          value={activeTab === 'html' ? html : activeTab === 'css' ? css : js}
          onChange={(e) => {
            const val = e.target.value;
            if (activeTab === 'html') setHtml(val);
            else if (activeTab === 'css') setCss(val);
            else setJs(val);
          }}
          spellCheck="false"
        />
      </div>

      {/* DRAGGABLE RESIZER BAR */}
      <div
        className={`Play_resizer ${isResizing ? 'isResizing' : ''} ${layout === 'col' ? 'Play_resizer_h' : ''}`}
        onMouseDown={startResizing}
      />

      {/* Preview Portion */}
      <div
        className="Play_previewSection"
        style={layout === 'row' ? { width: `${100 - leftWidth}%` } : { height: `${100 - topHeight}%`, width: '100%' }}
      >
        <div className="Play_previewHeader">
          <span>Browser Preview</span>
        </div>
        <iframe
          srcDoc={srcDoc}
          title="output"
          sandbox="allow-scripts"
          className={isResizing ? 'disable-pointer' : ''} // Prevents iframe from stealing mouse events
        />
        </div>
      </div>
    </div>
  );
};

export default Playground;
