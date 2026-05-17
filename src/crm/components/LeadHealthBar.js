import React from 'react';
import { slaCountdown } from '../crmCockpit';
import { healthForMode, healthColor } from '../crmVisibility';
import { isTelecallerMode, isAdminMode, isManagerMode } from '../crmVisibility';

export default function LeadHealthBar({ lead, mode }) {
  const { level, label } = healthForMode(lead, mode);
  const color = healthColor(level, mode);
  const countdown = slaCountdown(lead?.next_action_due_at);
  const pct = level === 'GREEN' ? 100 : level === 'YELLOW' ? 65 : 30;

  if (isTelecallerMode(mode)) {
    return (
      <div style={{ padding: '6px 16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#64748b' }}>
          <span>{label}</span>
          {countdown && level !== 'GREEN' && (
            <span>{countdown.replace(/^Overdue by /, 'Due ').replace(/^Due in /, '')}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 0.5 }}>
          {isAdminMode(mode) ? 'LEAD HEALTH' : 'STATUS'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      {countdown && isManagerMode(mode) && (
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontFamily: isAdminMode(mode) ? 'monospace' : 'inherit' }}>
          {countdown}
        </div>
      )}
    </div>
  );
}
