import React from 'react';

export default function ResultCard({
  title,
  subtitle,
  badge,
  badgeType = 'core', // 'core' | 'optional' | 'success'
  children,
  actions,
  className = '',
}) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header-clean">
        <div>
          <h3>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span
            className="ai-pill-tag"
            style={{
              background: badgeType === 'success' ? 'var(--color-success-bg)' : undefined,
              color: badgeType === 'success' ? 'var(--color-success)' : undefined,
              borderColor: badgeType === 'success' ? 'var(--green-border)' : undefined,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div style={{ marginBottom: actions ? '1.5rem' : 0 }}>
        {children}
      </div>

      {actions && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
