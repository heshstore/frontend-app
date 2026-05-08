import React, { useEffect } from 'react';

function ensureShimmer() {
  if (document.getElementById('saachu-shimmer')) return;
  const s = document.createElement('style');
  s.id = 'saachu-shimmer';
  s.textContent = '@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}';
  document.head.appendChild(s);
}

const shimmerStyle = {
  borderRadius: 4,
  background: 'linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

function Line({ width = '100%', height = 12, style = {} }) {
  return <div style={{ ...shimmerStyle, width, height, ...style }} />;
}

export function SkeletonCard() {
  useEffect(() => { ensureShimmer(); }, []);
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '14px 16px', marginBottom: 12, background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Line width={60} height={14} />
        <Line width={88} height={20} />
      </div>
      <Line width="65%" height={11} style={{ marginBottom: 7 }} />
      <Line width="42%" height={10} />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  useEffect(() => { ensureShimmer(); }, []);
  return <>{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}</>;
}
