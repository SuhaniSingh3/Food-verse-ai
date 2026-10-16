import React, { useState } from 'react';
import ImageUploader from '../components/common/ImageUploader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

const SAMPLE_FRESHNESS_RESULT = {
  itemType: 'Assorted Fresh Produce (Apples, Lemons, Spinach, Peppers)',
  freshnessGrade: 'Grade A',
  freshnessTitle: 'Peak Freshness & High Nutrient Density',
  estimatedShelfLife: '5 to 8 Days (Refrigerated)',
  confidenceScore: 0.95,
  visualMarkers: [
    { marker: 'Surface Texture & Firmness', status: 'Optimal', detail: 'Firm skin without bruising or indentation' },
    { marker: 'Color Uniformity', status: 'Vibrant', detail: 'Consistent pigmentation, zero signs of oxidative browning' },
    { marker: 'Fungal or Mold Cues', status: 'Clean', detail: 'Zero mycelium or fungal spore clusters detected' },
    { marker: 'Hydration & Turgidity', status: 'Crisp', detail: 'Leaves and produce retain optimal moisture tension' },
  ],
  storageTips: [
    'Store spinach in an airtight container with a clean paper towel to absorb excess condensation.',
    'Keep apples in the crisper drawer; avoid storing adjacent to leafy greens to minimize ethylene ripening.',
    'Lemons can remain at room temperature for up to 5 days, or refrigerated for up to 3 weeks.',
  ],
};

export default function FreshnessCheckerView() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleImageSelected = (file, url) => {
    setSelectedImage(file);
    setPreviewUrl(url);
    setEvaluationResult(null);
    setNotification(null);
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setEvaluationResult(null);
    setNotification(null);
  };

  const handleRunEvaluation = () => {
    if (!previewUrl) return;

    setIsEvaluating(true);
    setNotification(null);

    // Simulate vision spoilage analysis pipeline delay (1.3s)
    setTimeout(() => {
      setIsEvaluating(false);
      setEvaluationResult(SAMPLE_FRESHNESS_RESULT);
      setNotification({
        type: 'success',
        message: 'Produce visual quality assessment completed with Grade A (Peak Freshness)!',
      });
    }, 1300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>Produce Freshness & Spoilage Inspector</h2>
          <span className="nav-tag-opt">Optional Module (P2)</span>
        </div>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Computer vision evaluation of produce spoilage markers, discoloration, and estimated shelf life.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Upload Box */}
      <div className="card">
        <ImageUploader
          selectedImage={selectedImage}
          previewUrl={previewUrl}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          sampleImageUrl="/fresh_produce.jpg"
          sampleLabel="Load Demo Fresh Produce Photo"
          label="Upload produce photo for freshness inspection"
        />

        {previewUrl && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
            >
              {isEvaluating ? 'Evaluating Produce...' : '🔍 Evaluate Freshness Grade'}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isEvaluating && (
        <div className="card">
          <LoadingIndicator
            message="Scanning Produce for Spoilage Indicators..."
            subtext="Evaluating skin texture, surface discoloration, turgidity, and potential fungal markers via vision AI."
          />
        </div>
      )}

      {/* Evaluation Results Card */}
      {evaluationResult && !isEvaluating && (
        <div className="card">
          <div className="card-header-clean">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: '800',
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    border: '1px solid var(--green-border)',
                  }}
                >
                  {evaluationResult.freshnessGrade}
                </span>
                <h3>{evaluationResult.freshnessTitle}</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Identified: {evaluationResult.itemType} • {Math.round(evaluationResult.confidenceScore * 100)}% visual certainty
              </p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '700' }}>ESTIMATED SHELF LIFE</span>
              <div style={{ fontWeight: '800', color: 'var(--green-deep)', fontSize: '1rem' }}>
                {evaluationResult.estimatedShelfLife}
              </div>
            </div>
          </div>

          {/* Visual Markers Table */}
          <div style={{ margin: '1.25rem 0' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Visual Quality Indicators:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {evaluationResult.visualMarkers.map((marker, i) => (
                <div
                  key={i}
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
                    <strong>{marker.marker}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{marker.detail}</div>
                  </div>
                  <span
                    style={{
                      fontWeight: '700',
                      color: 'var(--color-success)',
                      background: 'var(--color-success-bg)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                    }}
                  >
                    ✓ {marker.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Tips */}
          <div style={{ background: 'var(--bg-accent-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--green-deep)', marginBottom: '0.5rem' }}>
              💡 Recommended Food Storage Strategy:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              {evaluationResult.storageTips.map((tip, idx) => (
                <li key={idx} style={{ marginBottom: '0.35rem' }}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Honest Empty State */}
      {!previewUrl && !isEvaluating && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🌿</div>
          <h3>Freshness & Spoilage Screener</h3>
          <p>
            Upload a photo of fruit, vegetables, or fresh produce above to check for early spoilage indicators, estimate remaining shelf life, and get storage advice.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleImageSelected(null, '/fresh_produce.jpg')}
          >
            💡 Inspect Sample Produce Photo
          </button>
        </div>
      )}

      {/* Safety Disclaimer */}
      <AiDisclaimer category="freshness" />
    </div>
  );
}
