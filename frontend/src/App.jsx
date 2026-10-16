import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/common/Sidebar';
import Topbar from './components/common/Topbar';

// Page Views
import DashboardView from './views/DashboardView';
import FoodAnalyzerView from './views/FoodAnalyzerView';
import CookingAssistantView from './views/CookingAssistantView';
import NutritionPlannerView from './views/NutritionPlannerView';
import FreshnessCheckerView from './views/FreshnessCheckerView';
import HygieneAnalyzerView from './views/HygieneAnalyzerView';
import MealHistoryView from './views/MealHistoryView';
import AboutProjectView from './views/AboutProjectView';

function AppContent() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView setActiveView={setActiveView} />;
      case 'analyzer':
        return <FoodAnalyzerView setActiveView={setActiveView} />;
      case 'cooking':
        return <CookingAssistantView />;
      case 'nutrition':
        return <NutritionPlannerView />;
      case 'freshness':
        return <FreshnessCheckerView />;
      case 'hygiene':
        return <HygieneAnalyzerView />;
      case 'history':
        return <MealHistoryView setActiveView={setActiveView} />;
      case 'about':
        return <AboutProjectView />;
      default:
        return <DashboardView setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Responsive Sidebar Navigation */}
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

        <footer style={{ borderTop: '1px solid var(--border-light)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', background: '#ffffff' }}>
          <div>Food Verse AI — NASSCOM FutureSkills Generative AI with Google Cloud Capstone</div>
          <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            Multi-Modal Vision • Smart Cooking Assistant • Grounded Nutrition Intelligence • Quality & Hygiene Screeners
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
