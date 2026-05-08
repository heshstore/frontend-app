import React from 'react';

export default function EmptyState({ icon = '📋', title, subtitle, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '60px 24px',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1, opacity: 0.7 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24, maxWidth: 320, lineHeight: 1.6 }}>
          {subtitle}
        </div>
      )}
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            padding: '9px 22px', borderRadius: 8, border: 'none',
            background: '#2563eb', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
