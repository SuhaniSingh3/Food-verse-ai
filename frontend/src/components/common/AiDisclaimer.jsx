import React from 'react';

export default function AiDisclaimer({
  category = 'nutritional', // 'nutritional' | 'freshness' | 'hygiene'
}) {
  const messages = {
    nutritional: 'AI Visual Estimation: Portion sizes and calories are model approximations calibrated against standard reference benchmarks. Verify actual packaging labels for clinical dietary restrictions.',
    freshness: 'Visual Quality Aid: Freshness grades are exploratory visual assessments. Never consume food that emits unusual odors, tastes abnormal, or exhibits mold.',
    hygiene: 'Observational Screener: Cleanliness scores evaluate visible surface cues and do not replace official municipal public health inspections.',
  };

  return (
    <div className="ai-disclaimer-box" role="note">
      <span style={{ fontSize: '1.1rem' }} aria-hidden="true">⚠️</span>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <strong style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
            Model Limitation Notice
          </strong>
          <span className="ai-pill-tag">AI Generated</span>
        </div>
        <div>{messages[category] || messages.nutritional}</div>
      </div>
    </div>
  );
}
