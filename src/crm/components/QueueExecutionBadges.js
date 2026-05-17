import React from 'react';
import { getExecutionStateBadges } from '../crmCockpit';

export default function QueueExecutionBadges({ lead, slaStatus, lockInfo, currentUserId }) {
  const badges = getExecutionStateBadges(lead, { slaStatus, lockInfo, currentUserId });
  if (!badges.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {badges.map((b) => (
        <span
          key={b.key}
          style={{
            fontSize: 9,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 4,
            background: b.bg,
            color: b.color,
            letterSpacing: 0.2,
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
