import React from 'react';

export default function LoadingIndicator({ message = 'Analyzing image with AI model...', subtext = 'Decomposing ingredients and calculating nutritional metrics' }) {
  return (
    <div className="loading-wrapper" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.98rem' }}>
          {message}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
