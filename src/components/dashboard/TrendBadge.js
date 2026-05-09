import React from 'react';

export default function TrendBadge({ value, label, inverse = false, size = 'sm' }) {
  if (value == null) return null;

  const num = Number(value);
  const isPositive = num >= 0;
  const good = inverse ? !isPositive : isPositive;

  const color  = good  ? '#16a34a' : '#dc2626';
  const bg     = good  ? '#f0fdf4' : '#fff1f2';
  const arrow  = num === 0 ? '→' : isPositive ? '↑' : '↓';
  const display = `${arrow} ${Math.abs(num)}${label || '%'}`;

  return (
    <span style={{
      fontSize: size === 'xs' ? 10 : 11,
      fontWeight: 700,
      color,
      background: bg,
      padding: size === 'xs' ? '1px 5px' : '2px 7px',
      borderRadius: 99,
      whiteSpace: 'nowrap',
    }}>
      {display}
    </span>
  );
}
