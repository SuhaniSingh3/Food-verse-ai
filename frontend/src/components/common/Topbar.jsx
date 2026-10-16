import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const VIEW_TITLES = {
  dashboard: { title: 'Culinary Intelligence Dashboard', sub: 'Overview & Metrics' },
  analyzer: { title: 'Food Image Recognition & Analysis', sub: 'Vision AI Engine' },
  cooking: { title: 'Smart Cooking Assistant', sub: 'Pantry-Driven Recipe Generator' },
  nutrition: { title: 'Personalized Nutrition Planner', sub: 'Target Budget & Analytics' },
  freshness: { title: 'Produce Freshness Inspector', sub: 'Optional Module (P2)' },
  hygiene: { title: 'Kitchen & Dining Hygiene Screener', sub: 'Optional Module (P2)' },
  history: { title: 'Meal History & Logs', sub: 'Historical Timeline' },
  about: { title: 'About Project & Architecture', sub: 'Documentation & System Spec' },
};

export default function Topbar({ activeView, setActiveView, toggleMobileMenu }) {
  const [healthStatus, setHealthStatus] = useState('checking'); // 'healthy' | 'checking' | 'error'
  const [healthData, setHealthData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkStatus = useCallback(async () => {
    setHealthStatus('checking');
    try {
      const data = await api.checkHealth();
      setHealthData(data);
      setHealthStatus('healthy');
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealthData(null);
      setHealthStatus('error');
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Poll backend health every 45 seconds
    const interval = setInterval(checkStatus, 45000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const currentMeta = VIEW_TITLES[activeView] || { title: 'Food Verse AI', sub: 'Application' };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="breadcrumb-box">
          <span className="breadcrumb-sub">{currentMeta.sub}</span>
          <h1 className="breadcrumb-title">{currentMeta.title}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Backend Connectivity Status Pill */}
        <div
          className="health-status-badge"
          title={`Backend status at ${lastChecked || 'Pending'}. AI Provider: ${healthData?.ai_provider || 'Unknown'}`}
        >
          <span className={`status-indicator-dot ${healthStatus}`} aria-hidden="true" />
          <span>
            {healthStatus === 'healthy' && 'Backend Connected'}
            {healthStatus === 'checking' && 'Checking API...'}
            {healthStatus === 'error' && 'Backend Offline'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }}
            onClick={checkStatus}
            aria-label="Refresh backend health status"
          >
            ↻
          </button>
        </div>

        {activeView !== 'analyzer' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setActiveView('analyzer')}
          >
            📸 Scan Food
          </button>
        )}
      </div>
    </header>
  );
}
