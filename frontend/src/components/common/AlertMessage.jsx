import React from 'react';

const ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '⛔',
  success: '✅',
};

export default function AlertMessage({ type = 'info', title, message, onDismiss, children }) {
  return (
    <div className={`alert-component ${type}`} role="alert">
      <span style={{ fontSize: '1.15rem' }} aria-hidden="true">{ICONS[type] || 'ℹ️'}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: '700', marginBottom: '0.2rem' }}>{title}</div>}
        <div>{message || children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: 'inherit',
            opacity: 0.7,
            padding: '0 0.25rem',
          }}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}
