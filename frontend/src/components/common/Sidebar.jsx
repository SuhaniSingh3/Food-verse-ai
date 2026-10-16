import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Core Features' },
  { id: 'analyzer', label: 'Food Analyzer', icon: '📸', section: 'Core Features' },
  { id: 'cooking', label: 'Cooking Assistant', icon: '👨‍🍳', section: 'Core Features' },
  { id: 'nutrition', label: 'Nutrition Planner', icon: '🥗', section: 'Core Features' },
  { id: 'history', label: 'Meal History', icon: '📖', section: 'Core Features' },
  { id: 'freshness', label: 'Freshness Checker', icon: '🌿', section: 'Optional Modules', isOptional: true },
  { id: 'hygiene', label: 'Hygiene Screener', icon: '🧼', section: 'Optional Modules', isOptional: true },
  { id: 'about', label: 'About Project', icon: 'ℹ️', section: 'System & Docs' },
];

export default function Sidebar({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }) {
  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (isMobileOpen && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  // Group items by section
  const sections = ['Core Features', 'Optional Modules', 'System & Docs'];

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} aria-label="Main Navigation">
      <div className="sidebar-header">
        <a
          href="#dashboard"
          className="brand-link"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('dashboard');
          }}
        >
          <div className="brand-icon-box" aria-hidden="true">🥗</div>
          <div>
            <div className="brand-title">Food Verse AI</div>
            <div className="brand-sub">NASSCOM / GCP</div>
          </div>
        </a>
        {isMobileOpen && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {sections.map((sectionName) => {
          const items = NAV_ITEMS.filter((item) => item.section === sectionName);
          return (
            <div key={sectionName}>
              <div className="nav-section-label">{sectionName}</div>
              {items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.isOptional && <span className="nav-tag-opt">Opt</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
          GenAI Capstone Project
        </div>
        <div>Google Cloud Vertex / Gemini 1.5</div>
      </div>
    </aside>
  );
}
