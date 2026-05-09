import React from 'react';

function MiniBar({ data = [], color = '#2563eb', height = 60 }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, width: '100%' }}>
      {data.map((d, i) => {
        const pct = Math.max(0, (d.value / max) * 100);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: '100%', height: `${pct}%`, minHeight: 2,
              background: color, borderRadius: '3px 3px 0 0',
              opacity: 0.75 + (i / data.length) * 0.25,
              transition: 'height 0.5s ease',
            }} />
            {d.label && (
              <div style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {d.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChartCard({ title, subtitle, data = [], color = '#2563eb', height = 80, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>}
      </div>

      {children || (data.length > 0 && <MiniBar data={data} color={color} height={height} />)}
    </div>
  );
}
