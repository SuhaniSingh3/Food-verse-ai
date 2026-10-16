import React, { useState } from 'react';
import api from '../services/api';
import ImageUploader from '../components/common/ImageUploader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

const PROTOTYPE_HYGIENE_DATA = {
  stationType: 'Commercial Restaurant Prep Station & Stainless Work Table',
  hygieneScore: 96,
  riskTier: 'Low Risk — Excellent Sanitation Compliance',
  auditTimestamp: new Date().toISOString(),
  checklist: [
    { item: 'Stainless Steel Prep Surfaces', status: 'Compliant', score: '10/10', observation: 'Clean, degreased, zero residue or biological debris' },
    { item: 'Food Storage & Container Sealing', status: 'Compliant', score: '10/10', observation: 'Clear containers with airtight lids, labeled & stacked safely' },
    { item: 'Handwashing & Sink Accessibility', status: 'Compliant', score: '10/10', observation: 'Dedicated stainless hand sink with soap dispenser adjacent to station' },
    { item: 'Personnel Hygiene & PPE', status: 'Compliant', score: '9/10', observation: 'Hair restraint and clean food-prep apron in place' },
    { item: 'Cross-Contamination Prevention', status: 'Compliant', score: '10/10', observation: 'Raw produce segregated from ready-to-eat station' },
    { item: 'Floor Drainage & Sanitation', status: 'Compliant', score: '10/10', observation: 'Dry, slip-resistant tiling with clear floor drain grating' },
  ],
  keyRecommendations: [
    'Maintain 4-hour sanitization interval logging for all prep counter touchpoints.',
    'Ensure internal refrigeration temperature logs are recorded twice daily.',
  ],
};

export default function HygieneAnalyzerView() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [endpointUnavailable, setEndpointUnavailable] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleImageSelected = (file, url) => {
    setSelectedImage(file);
    setPreviewUrl(url);
    setAuditResult(null);
    setEndpointUnavailable(null);
    setNotification(null);
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAuditResult(null);
    setEndpointUnavailable(null);
    setNotification(null);
  };

  const handleRunAudit = async () => {
    if (!previewUrl) return;

    setIsAuditing(true);
    setEndpointUnavailable(null);
    setNotification(null);

    const formData = new FormData();
    try {
      if (selectedImage) {
        formData.append('file', selectedImage);
      } else {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        formData.append('file', blob, 'sample_kitchen.jpg');
      }

      // Real HTTP POST multipart dispatch to FastAPI backend
      const result = await api.auditHygiene(formData);
      setAuditResult(result);
      setNotification({
        type: 'success',
        message: 'Kitchen hygiene visual audit completed by backend API!',
      });
    } catch (err) {
      if (err.isUnavailable) {
        setEndpointUnavailable({
          endpoint: '/api/v1/optional/hygiene',
          status: err.status,
          message: err.message,
        });
      } else {
        setNotification({
          type: 'error',
          message: err.message,
        });
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleLoadPrototypeAudit = () => {
    setEndpointUnavailable(null);
    setAuditResult(PROTOTYPE_HYGIENE_DATA);
    setNotification({
      type: 'info',
      message: 'Displaying prototype commercial kitchen sanitation scorecard.',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>Restaurant & Kitchen Hygiene Screener</h2>
          <span className="nav-tag-opt">Optional Module (P2)</span>
        </div>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Vision-assisted sanitation audit for dining areas, preparation counters, and kitchen workstations.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Upload Card */}
      <div className="card">
        <ImageUploader
          selectedImage={selectedImage}
          previewUrl={previewUrl}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          sampleImageUrl="/kitchen_hygiene.jpg"
          sampleLabel="Load Demo Commercial Kitchen Photo"
          label="Upload kitchen or dining area photo for hygiene audit"
        />

        {previewUrl && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunAudit}
              disabled={isAuditing}
            >
              {isAuditing ? 'Transmitting to Backend...' : '🧼 Audit Kitchen Hygiene (HTTP POST)'}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isAuditing && (
        <div className="card">
          <LoadingIndicator
            message="Transmitting Image to Backend Hygiene Screener..."
            subtext="Endpoint: POST /api/v1/optional/hygiene. Evaluating surface cleanliness."
          />
        </div>
      )}

      {/* Endpoint Unavailable State */}
      {endpointUnavailable && !isAuditing && (
        <div className="card" style={{ borderColor: 'var(--orange-border)', background: 'var(--bg-orange-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }} aria-hidden="true">🚧</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--orange-primary)', marginBottom: '0.35rem' }}>
                Backend Hygiene Endpoint Under Development (HTTP {endpointUnavailable.status || 404})
              </h3>
              <p style={{ color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                The HTTP request reached the backend server, but route <code>{endpointUnavailable.endpoint}</code> is scheduled for Phase 5 (Optional Modules) in the project roadmap.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadPrototypeAudit}
              >
                💡 Preview Prototype Hygiene Scorecard UI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Results Card */}
      {auditResult && !isAuditing && (
        <div className="card">
          <div className="card-header-clean">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: 'var(--green-deep)',
                    background: 'var(--bg-accent-subtle)',
                    padding: '0.2rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--green-border)',
                  }}
                >
                  {auditResult.hygieneScore} / 100
                </span>
                <div>
                  <h3 style={{ fontSize: '1.15rem' }}>{auditResult.riskTier}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target: {auditResult.stationType}
                  </div>
                </div>
              </div>
            </div>

            <span className="ai-pill-tag" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--green-border)' }}>
              Pass: Commercial Grade
            </span>
          </div>

          {/* Checklist table */}
          <div style={{ margin: '1.25rem 0' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Sanitation Checklist Itemization:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {auditResult.checklist.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div>
                    <strong>{item.item}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.observation}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>{item.score}</span>
                    <span
                      style={{
                        fontWeight: '700',
                        color: 'var(--color-success)',
                        background: 'var(--color-success-bg)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                      }}
                    >
                      ✓ {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Practice Tips */}
          <div style={{ background: 'var(--bg-accent-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--green-deep)', marginBottom: '0.4rem' }}>
              📋 Recommended Action Items:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              {auditResult.keyRecommendations.map((rec, i) => (
                <li key={i} style={{ marginBottom: '0.35rem' }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Honest Empty State */}
      {!previewUrl && !isAuditing && !endpointUnavailable && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🧼</div>
          <h3>Kitchen Cleanliness Screener</h3>
          <p>
            Upload a photo of a food preparation counter, commercial kitchen, or dining area above to inspect visual cleanliness and sanitation risk cues.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleImageSelected(null, '/kitchen_hygiene.jpg')}
          >
            💡 Inspect Sample Commercial Kitchen Photo
          </button>
        </div>
      )}

      {/* Safety Disclaimer */}
      <AiDisclaimer category="hygiene" />
    </div>
  );
}
