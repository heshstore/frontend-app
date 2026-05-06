import React from 'react';
import { useNavigate } from 'react-router-dom';

const VARIANTS = {
  error: {
    icon:       '⚠️',
    background: '#fff1f0',
    border:     '#dc3545',
    color:      '#dc3545',
    btnBg:      '#dc3545',
  },
  warning: {
    icon:       '⚠️',
    background: '#fffbeb',
    border:     '#f59e0b',
    color:      '#b45309',
    btnBg:      '#f59e0b',
  },
  info: {
    icon:       'ℹ️',
    background: '#eff6ff',
    border:     '#3b82f6',
    color:      '#1d4ed8',
    btnBg:      '#3b82f6',
  },
};

/**
 * InlineAlert — drop into any screen to surface a contextual warning.
 *
 * Props:
 *   variant     'error' | 'warning' | 'info'  (default: 'warning')
 *   message     string
 *   actionLabel string                         (default: 'View Now')
 *   to          string  — navigate route       (optional)
 *   onClick     fn      — custom handler       (optional, takes priority over `to`)
 */
export default function InlineAlert({
  variant     = 'warning',
  message,
  actionLabel = 'View Now',
  to,
  onClick,
}) {
  const navigate = useNavigate();
  const style    = VARIANTS[variant] ?? VARIANTS.warning;

  const handleAction = onClick ?? (to ? () => navigate(to) : null);

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      background:   style.background,
      border:       `1px solid ${style.border}`,
      borderRadius: 10,
      padding:      '12px 14px',
      marginBottom: 14,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{style.icon}</span>
      <span style={{ flex: 1, fontSize: 14, color: style.color, fontWeight: 500 }}>
        {message}
      </span>
      {handleAction && (
        <button
          onClick={handleAction}
          style={{
            background:   style.btnBg,
            color:        '#fff',
            border:       'none',
            borderRadius: 7,
            padding:      '8px 14px',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            flexShrink:   0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
