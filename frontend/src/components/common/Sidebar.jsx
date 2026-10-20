import React from 'react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { id: 'analyzer', label: 'Food Image Analysis', icon: '📸', desc: 'Multimodal image recognition' },
  { id: 'pantry', label: 'Cook With Ingredients', icon: '🥘', desc: 'Match recipes to your pantry' },
  { id: 'cooking', label: 'Recipe Generator', icon: '👨‍🍳', desc: 'Pantry-driven recipes' },
  { id: 'favorites', label: 'Favorite Recipes', icon: '❤️', desc: 'Saved favorite recipes' },
  { id: 'nutrition', label: 'Basic Nutrition', icon: '🥗', desc: 'USDA benchmark calculations' },
  { id: 'history', label: 'Analysis History', icon: '📖', desc: 'Recognition logs & meals' },
];

export default function Sidebar({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }) {
  const { savedRecipes = [] } = useApp();

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (isMobileOpen && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} aria-label="Main Navigation">
      <div className="sidebar-header">
        <a
          href="#analyzer"
          className="brand-link"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('analyzer');
          }}
        >
          <div className="brand-icon-box" aria-hidden="true">🥗</div>
          <div>
            <div className="brand-title">Food Verse AI</div>
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
        <div>
          <div className="nav-section-label">Core Features</div>
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const isFavItem = item.id === 'favorites';
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span>{item.label}</span>
                  <span style={{ fontSize: '0.72rem', color: isActive ? 'var(--green-deep)' : 'var(--text-dim)', fontWeight: '400' }}>
                    {item.desc}
                  </span>
                </div>
                {isFavItem && savedRecipes.length > 0 && (
                  <span className="nav-tag-opt" aria-label={`${savedRecipes.length} saved favorites`}>
                    {savedRecipes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
          Food Verse AI
        </div>
      </div>
    </aside>
  );
}
