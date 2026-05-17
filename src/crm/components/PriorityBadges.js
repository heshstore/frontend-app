import React, { useState } from 'react';
import { buildPriorityBadges, isAdminMode, isManagerMode, isTelecallerMode } from '../crmVisibility';

export default function PriorityBadges({ lead, mode, slaStatus, lockInfo, currentUserId, queueTier, showCountdown = false }) {
  const [open, setOpen] = useState(false);
  const { visible, overflow, countdown } = buildPriorityBadges(
    lead,
    { slaStatus, lockInfo, currentUserId, queueTier },
    mode,
  );

  if (!visible.length && !showCountdown) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {visible.map((b) => (
        <span
          key={b.key}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 4,
            background: b.bg,
            color: b.color,
          }}
        >
          {b.label}
        </span>
      ))}
      {showCountdown && countdown && !isTelecallerMode(mode) && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', fontFamily: isAdminMode(mode) ? 'monospace' : 'inherit' }}>
          {isAdminMode(mode) ? countdown : countdown.replace(/^Overdue by /, '').replace(/^Due in /, '')}
        </span>
      )}
      {overflow.length > 0 && isManagerMode(mode) && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#64748b', cursor: 'pointer' }}
          >
            +{overflow.length} more
          </button>
          {open && (
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {overflow.map((b) => (
                <span key={b.key} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: b.bg, color: b.color, opacity: 0.9 }}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
