import React from 'react';

/** Small pill showing how many times an action button has been used. Renders nothing at 0. */
export default function CountBadge({ n, color }) {
  if (!n) return null;
  return (
    <span style={{
      background: 'rgba(255,255,255,.95)', color,
      borderRadius: 999, fontSize: 10, fontWeight: 700,
      padding: '1px 5px', lineHeight: 1.4,
    }}>{n}</span>
  );
}
