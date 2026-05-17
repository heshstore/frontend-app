import React, { useState } from 'react';

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
  level = 2,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bg = level === 1 ? '#fff' : '#f8fafc';
  const border = level === 1 ? '#e2e8f0' : '#e5e7eb';

  return (
    <div style={{ borderBottom: `1px solid ${border}`, background: bg }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge}
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && <div style={{ padding: '0 16px 12px' }}>{children}</div>}
    </div>
  );
}
