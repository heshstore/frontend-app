import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PageLayout({
  title,
  subtitle,
  children,
  onBack,
  hideBack = false,
  actions,
  onSearch,
}) {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {!hideBack && (
          <button
            onClick={onBack || (() => navigate(-1))}
            style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '0 14px',
              cursor: 'pointer',
              fontSize: 13,
              color: '#374151',
              fontWeight: 500,
              flexShrink: 0,
              minHeight: 40,        // touch-safe tap target (≥40px)
              minWidth: 60,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ← Back
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        {onSearch && (
          <input
            placeholder="Search..."
            onChange={(e) => onSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              width: 220,
              maxWidth: '100%',
              outline: 'none',
            }}
          />
        )}
        {actions}
      </div>
      {children}
    </div>
  );
}
