import React, { useState, useEffect, useCallback } from 'react';
import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthData, setHealthData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'healthy' | 'error'
  const [healthError, setHealthError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setHealthStatus('checking');
    setHealthError(null);
    try {
      const data = await api.checkHealth();
      setHealthData(data);
      setHealthStatus('healthy');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthData(null);
      setHealthStatus('error');
      setHealthError(err.message || 'Unable to connect to backend server');
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="navbar">
        <div className="nav-inner">
          <div className="brand-wrapper">
            <div className="brand-logo-icon" aria-hidden="true">🍳</div>
            <div>
              <div className="brand-text">Food Verse AI</div>
            </div>
            <span className="brand-badge">NASSCOM / GCP</span>
          </div>

          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${activeTab === 'vision' ? 'active' : ''}`}
                  onClick={() => setActiveTab('vision')}
                >
                  Vision Analysis
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${activeTab === 'recipes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('recipes')}
                >
                  Cooking Assistant
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
                  onClick={() => setActiveTab('nutrition')}
                >
                  Nutrition Planner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-item-btn ${activeTab === 'optional' ? 'active' : ''}`}
                  onClick={() => setActiveTab('optional')}
                >
                  Quality & Hygiene
                </button>
              </li>
            </ul>
          </nav>

          {/* System Health Status Indicator */}
          <div className="health-pill" title={`Last verified: ${lastChecked || 'Pending'}`}>
            <span className={`health-dot ${healthStatus}`} aria-hidden="true" />
            <span>
              {healthStatus === 'healthy' && 'Backend Connected'}
              {healthStatus === 'checking' && 'Checking API...'}
              {healthStatus === 'error' && 'Backend Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Connection Failure Notice if API is down */}
        {healthStatus === 'error' && (
          <div className="alert-box error" role="alert">
            <div>
              <strong>Backend Disconnected:</strong> {healthError}.
              <div style={{ marginTop: '0.4rem' }}>
                Ensure your FastAPI backend is running on <code>http://localhost:8000</code>.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={fetchHealth}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div>
            <section style={{ marginBottom: '2rem' }}>
              <h1>Culinary & Nutritional Intelligence</h1>
              <p style={{ marginTop: '0.5rem', fontSize: '1.05rem' }}>
                Internship Capstone Project for NASSCOM FutureSkills Generative AI with Google Cloud.
              </p>
            </section>

            <div className="dashboard-grid">
              {/* Live Backend Diagnostic Panel */}
              <div className="glass-panel card-padded col-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2>Backend Diagnostics</h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchHealth}
                    disabled={healthStatus === 'checking'}
                  >
                    {healthStatus === 'checking' ? 'Refreshing...' : 'Ping API'}
                  </button>
                </div>
                <p style={{ marginBottom: '1rem' }}>
                  Live response retrieved via the reusable API client from <code>/api/health</code>:
                </p>

                {healthData ? (
                  <pre className="code-block">
                    {JSON.stringify(healthData, null, 2)}
                  </pre>
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    {healthStatus === 'checking' ? 'Querying backend...' : 'No telemetry received.'}
                  </div>
                )}
              </div>

              {/* Architecture & Environment Card */}
              <div className="glass-panel card-padded col-4">
                <h2>System Overview</h2>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>FRONTEND</span>
                    <div style={{ fontWeight: '600' }}>React 19 + Vanilla CSS (Vite)</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>BACKEND</span>
                    <div style={{ fontWeight: '600' }}>FastAPI (Python 3.13)</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>AI PROVIDER MODE</span>
                    <div style={{ fontWeight: '600', color: 'var(--emerald-primary)' }}>
                      {healthData?.ai_provider || 'Configured via .env'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>DEPLOYMENT TARGET</span>
                    <div style={{ fontWeight: '600' }}>Google Cloud Run (Primary) / AWS Fallback</div>
                  </div>
                </div>
              </div>

              {/* Feature Roadmap & Status Grid */}
              <div className="glass-panel feature-tile col-4">
                <div>
                  <span className="status-badge badge-core">Core — P0</span>
                  <div className="tile-icon" style={{ marginTop: '0.75rem' }}>📸</div>
                  <h3>Food Image Recognition</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                    Multi-modal visual analysis to detect ingredients, portion sizes, and dietary classifications.
                  </p>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('vision')}
                  >
                    Open View
                  </button>
                </div>
              </div>

              <div className="glass-panel feature-tile col-4">
                <div>
                  <span className="status-badge badge-core">Core — P0</span>
                  <div className="tile-icon" style={{ marginTop: '0.75rem' }}>👨‍🍳</div>
                  <h3>Cooking Assistant</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                    Generate dynamic, zero-waste recipes strictly from your available pantry ingredients.
                  </p>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('recipes')}
                  >
                    Open View
                  </button>
                </div>
              </div>

              <div className="glass-panel feature-tile col-4">
                <div>
                  <span className="status-badge badge-core">Core — P0</span>
                  <div className="tile-icon" style={{ marginTop: '0.75rem' }}>🥗</div>
                  <h3>Nutrition Planner</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                    Track calories and macronutrients grounded against verified nutritional reference standards.
                  </p>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('nutrition')}
                  >
                    Open View
                  </button>
                </div>
              </div>

              <div className="glass-panel feature-tile col-6">
                <div>
                  <span className="status-badge badge-optional">Optional — P2</span>
                  <div className="tile-icon" style={{ marginTop: '0.75rem' }}>🌿</div>
                  <h3>Produce Freshness Inspector</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                    Visual assessment of produce spoilage cues, shelf life estimation, and storage recommendations.
                  </p>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('optional')}
                  >
                    Explore Module
                  </button>
                </div>
              </div>

              <div className="glass-panel feature-tile col-6">
                <div>
                  <span className="status-badge badge-optional">Optional — P2</span>
                  <div className="tile-icon" style={{ marginTop: '0.75rem' }}>🧼</div>
                  <h3>Kitchen Hygiene Screener</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
                    Visual sanitation and cleanliness risk factor audit for dining areas and food prep surfaces.
                  </p>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('optional')}
                  >
                    Explore Module
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Vision Analysis Placeholder */}
        {activeTab === 'vision' && (
          <div className="glass-panel card-padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="status-badge badge-core">Core Feature</span>
              <h2>Food Image Recognition & Ingredient Analysis</h2>
            </div>
            <div className="alert-box info">
              Scheduled for implementation in Phase 2 & 3. Architecture plan specifies multi-modal Gemini Vision with Pillow image validation and EXIF sanitization.
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Once integrated, you will be able to drag-and-drop a meal photo or capture via web camera to decompose individual food ingredients and portion sizes.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* Tab 3: Cooking Assistant Placeholder */}
        {activeTab === 'recipes' && (
          <div className="glass-panel card-padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="status-badge badge-core">Core Feature</span>
              <h2>Cooking Assistant & Recipe Generator</h2>
            </div>
            <div className="alert-box info">
              Scheduled for implementation in Phase 3. Architecture plan specifies pantry-matching algorithm and dietary restriction filters.
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Once integrated, you will be able to input available pantry items and generate custom recipes with preparation steps and substitute options.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* Tab 4: Nutrition Planner Placeholder */}
        {activeTab === 'nutrition' && (
          <div className="glass-panel card-padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="status-badge badge-core">Core Feature</span>
              <h2>Personalized Nutrition Planner</h2>
            </div>
            <div className="alert-box info">
              Scheduled for implementation in Phase 3 & 4. Architecture plan specifies daily macro budgeting grounded in verified USDA nutritional reference standards.
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Once integrated, you will track calories, protein, carbohydrates, and fats with personalized daily goals and meal history timelines.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        )}

        {/* Tab 5: Optional Modules Placeholder */}
        {activeTab === 'optional' && (
          <div className="glass-panel card-padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="status-badge badge-optional">Optional Features</span>
              <h2>Quality, Freshness & Hygiene Screening</h2>
            </div>
            <div className="alert-box warning">
              Optional features scheduled for Phase 5 after Core verification. All reports include safety disclaimers separating AI visual guidance from certified inspections.
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Includes Produce Freshness Inspector (visual spoilage markers and shelf-life estimates) and Kitchen Hygiene Audit Screener (cleanliness scorecards and risk factors).
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Food Verse AI — NASSCOM FutureSkills Generative AI with Google Cloud Capstone</p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Backend API: <code>/api/health</code> | Ready for Phase 1 & 2 Execution
        </p>
      </footer>
    </div>
  );
}
