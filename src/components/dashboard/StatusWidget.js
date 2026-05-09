import React from 'react';

const STATUS_CONFIG = {
  ok:       { dot: '#16a34a', bg: '#f0fdf4', label: 'OK' },
  warning:  { dot: '#d97706', bg: '#fffbeb', label: 'Warning' },
  error:    { dot: '#dc2626', bg: '#fff1f2', label: 'Error' },
  unknown:  { dot: '#9ca3af', bg: '#f9fafb', label: 'Unknown' },
};

export default function StatusWidget({ label, status = 'unknown', detail, pulse = false }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 8,
      background: cfg.bg, border: `1px solid ${cfg.dot}22`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: cfg.dot,
        boxShadow: pulse && status !== 'unknown' ? `0 0 0 3px ${cfg.dot}33` : 'none',
        animation: pulse && status === 'ok' ? 'pulseDot 2s infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{detail}</div>}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.dot }}>{cfg.label}</span>
    </div>
  );
}
