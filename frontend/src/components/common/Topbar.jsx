import React from 'react';

const VIEW_TITLES = {
  analyzer: { title: 'Food Image Analysis', sub: 'Multimodal Vision Engine' },
  cooking: { title: 'Recipe Generation', sub: 'Pantry-to-Plate Assistant' },
  favorites: { title: 'Favorite Recipes', sub: 'Saved Culinary Collection' },
  nutrition: { title: 'Basic Nutrition Information', sub: 'Verified USDA Benchmark Engine' },
  history: { title: 'Analysis History', sub: 'Historical Recognition Logs' },
};

export default function Topbar({ activeView, setActiveView, toggleMobileMenu }) {
  const currentMeta = VIEW_TITLES[activeView] || { title: 'Food Verse AI', sub: 'Culinary Intelligence' };

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
