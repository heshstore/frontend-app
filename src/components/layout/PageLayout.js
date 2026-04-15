import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../theme';
import UniversalSearch from '../UniversalSearch';

export default function PageLayout({ title, children, hideBack = false, hideSearch = false }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        fontFamily: theme.fontFamily,
        background: theme.background,
        minHeight: '100vh',
        padding: '0 0 40px',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: theme.primary,
          color: '#fff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {!hideBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: '#fff',
              borderRadius: theme.borderRadiusSm,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ← Back
          </button>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {title}
        </h2>
        {!hideSearch && <UniversalSearch />}
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '16px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
