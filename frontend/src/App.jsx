import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/common/Sidebar';
import Topbar from './components/common/Topbar';

// Core Features
import FoodAnalyzerView from './views/FoodAnalyzerView';
import CookingAssistantView from './views/CookingAssistantView';
import NutritionPlannerView from './views/NutritionPlannerView';
import MealHistoryView from './views/MealHistoryView';

function AppContent() {
  const [activeView, setActiveView] = useState('analyzer');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeView) {
      case 'analyzer':
        return <FoodAnalyzerView setActiveView={setActiveView} />;
      case 'cooking':
        return <CookingAssistantView setActiveView={setActiveView} initialTab="generator" />;
      case 'favorites':
        return <CookingAssistantView setActiveView={setActiveView} initialTab="favorites" />;
      case 'nutrition':
        return <NutritionPlannerView />;
      case 'history':
        return <MealHistoryView setActiveView={setActiveView} />;
      default:
        return <FoodAnalyzerView setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Responsive Sidebar Navigation with 3 Core Features */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="content-wrapper">
        <Topbar
          activeView={activeView}
          setActiveView={setActiveView}
          toggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
        />

        <main className="page-container" id="main-content">
          {renderActiveView()}
        </main>

        <footer
          style={{
            borderTop: '1px solid var(--border-light)',
            padding: '1.25rem 2rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            background: '#ffffff',
          }}
        >
          <div>Food Verse AI — Intelligent Culinary &amp; Nutritional Platform</div>
          <div style={{ marginTop: '0.2rem', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
            1. Food Image Analysis • 2. Recipe Generation • 3. Basic Nutrition Information
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
