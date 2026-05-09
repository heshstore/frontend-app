import React from 'react';

export default function KpiGrid({ children, minCardWidth = 160, gap = 12, style = {} }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
      gap,
      ...style,
    }}>
      {children}
    </div>
  );
}
