import React from 'react';
import { managerInterventionReasons, slaCountdown } from '../crmCockpit';

export default function ManagerInterventionPanel({
  lead,
  decision,
  canEdit,
  onReassign,
  onOverride,
  onMarkLost,
  onSnooze,
  onForceQuotation,
}) {
  const reasons = managerInterventionReasons(lead);
  if (!reasons.length) return null;

  const countdown = slaCountdown(lead?.next_action_due_at);
  const attempts = decision?.outcomeHistory?.noAnswerCount ?? lead?.no_answer_count ?? 0;

  return (
    <div style={{ margin: '0 0 12px', padding: '12px 14px', background: '#fff1f2', border: '1.5px solid #9f1239', borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#7f1d1d', marginBottom: 8 }}>
        ⚠ Manager Intervention Required
      </div>
      <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div style={{ fontSize: 11, color: '#374151', marginBottom: 10, display: 'grid', gap: 4 }}>
        <span><strong>Attempts:</strong> {attempts}</span>
        {countdown && <span><strong>SLA:</strong> {countdown}</span>}
        <span><strong>Stage:</strong> {lead?.workflow_state || lead?.status}</span>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" onClick={onReassign} style={mgrBtn()}>Reassign</button>
          <button type="button" onClick={onOverride} style={mgrBtn()}>Override workflow</button>
          <button type="button" onClick={onMarkLost} style={mgrBtn('#fee2e2', '#b91c1c')}>Mark lost</button>
          <button type="button" onClick={onSnooze} style={mgrBtn()}>Extend callback</button>
          <button type="button" onClick={onForceQuotation} style={mgrBtn('#ede9fe', '#6d28d9')}>Force quotation</button>
        </div>
      )}
    </div>
  );
}

function mgrBtn(bg = '#fff', color = '#374151') {
  return {
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 5,
    border: '1px solid #e5e7eb',
    background: bg,
    color,
    cursor: 'pointer',
  };
}
