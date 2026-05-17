/**
 * Phase 17 — operational cockpit helpers (reuse existing lead fields only).
 */

export function computeSlaStatus(nextActionDueAt) {
  if (!nextActionDueAt) return 'NONE';
  const diffMs = new Date(nextActionDueAt) - Date.now();
  if (diffMs > 2 * 3_600_000) return 'ON_TIME';
  if (diffMs >= 0) return 'DUE_SOON';
  if (diffMs >= -24 * 3_600_000) return 'OVERDUE';
  return 'CRITICAL';
}

export function slaCountdown(nextActionDueAt) {
  if (!nextActionDueAt) return null;
  const diffMs = new Date(nextActionDueAt) - Date.now();
  const absMins = Math.abs(Math.round(diffMs / 60_000));
  const absHours = Math.floor(absMins / 60);
  const absDays = Math.floor(absHours / 24);
  if (diffMs > 0) {
    if (absMins < 60) return `Due in ${absMins}m`;
    if (absMins < 1440) return `Due in ${absHours}h`;
    return `Due in ${absDays}d`;
  }
  if (absMins < 60) return `Overdue by ${absMins}m`;
  if (absMins < 1440) return `Overdue by ${absHours}h`;
  return `Overdue by ${absDays}d`;
}

export const SLA_STATUS_STYLE = {
  ON_TIME: { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'On Time' },
  DUE_SOON: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Due Soon' },
  OVERDUE: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'Overdue' },
  CRITICAL: { bg: '#4c0519', color: '#fecdd3', border: '#9f1239', label: 'Critical' },
  NONE: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: '' },
};

export const WF_STATE_LABEL = {
  FIRST_CALL: '📞 First Call',
  FOLLOW_UP: '🔄 Follow Up',
  NO_ANSWER_1: '📵 No Answer ×1',
  NO_ANSWER_2: '📵 No Answer ×2',
  NO_ANSWER_ESC: '🚨 Escalated',
  CALLBACK_WAIT: '⏰ Callback Wait',
  SEND_QUOTATION: '📄 Send Quotation',
  CHASE_QUOTATION: '📋 Chase Quotation',
  NEGOTIATING: '🤝 Negotiating',
  NURTURE: '🌱 Nurture',
  CONVERTED: '✅ Converted',
  LOST: '❌ Lost',
};

export const MISSION_CTA = {
  FIRST_CALL: { label: '📞 Make First Call', kind: 'call' },
  FOLLOW_UP: { label: '📞 Follow Up Now', kind: 'call' },
  NO_ANSWER_1: { label: '📞 Retry Call', kind: 'call' },
  NO_ANSWER_2: { label: '📞 Retry Call', kind: 'call' },
  NO_ANSWER_ESC: { label: '⚠ Manager Review Required', kind: 'manager' },
  CALLBACK_WAIT: { label: '📞 Callback Now', kind: 'call' },
  SEND_QUOTATION: { label: '📄 Create Quotation', kind: 'quotation' },
  CHASE_QUOTATION: { label: '📞 Follow-up on Quotation', kind: 'call' },
  NEGOTIATING: { label: '💬 Negotiate Pricing', kind: 'call' },
  NURTURE: { label: '📞 Re-engage Lead', kind: 'call' },
};

const MANAGER_TAGS = new Set([
  'needs_manager_review',
  'stale_lead',
  'callback_abuse_risk',
  'esc_final_warning',
]);

export function leadTags(lead) {
  return Array.isArray(lead?.tags) ? lead.tags : [];
}

export function needsManagerIntervention(lead) {
  const tags = leadTags(lead);
  return (
    lead?.workflow_state === 'NO_ANSWER_ESC' ||
    tags.some((t) => MANAGER_TAGS.has(t))
  );
}

export function managerInterventionReasons(lead) {
  const tags = leadTags(lead);
  const reasons = [];
  if (tags.includes('needs_manager_review')) reasons.push('Manager review flagged');
  if (tags.includes('stale_lead')) reasons.push('Stale — no recent activity');
  if (tags.includes('callback_abuse_risk')) reasons.push('Callback abuse risk');
  if (tags.includes('esc_final_warning')) reasons.push('Final escalation warning');
  if (lead?.workflow_state === 'NO_ANSWER_ESC') reasons.push('No-answer escalation limit reached');
  if ((lead?.no_answer_count ?? 0) >= 5) reasons.push('Blocked — 5+ no answers');
  return reasons;
}

export function computeLeadHealth(lead, slaStatus) {
  const tags = leadTags(lead);
  if (
    lead?.workflow_state === 'NO_ANSWER_ESC' ||
    tags.includes('needs_manager_review') ||
    tags.includes('esc_final_warning')
  ) {
    return 'BLACK';
  }
  if (slaStatus === 'CRITICAL' || (lead?.no_answer_count ?? 0) >= 5) return 'RED';
  if (slaStatus === 'OVERDUE' || tags.includes('callback_abuse_risk')) return 'ORANGE';
  if (slaStatus === 'DUE_SOON' || tags.includes('stale_lead')) return 'YELLOW';
  return 'GREEN';
}

export const HEALTH_COLORS = {
  GREEN: '#16a34a',
  YELLOW: '#ca8a04',
  ORANGE: '#ea580c',
  RED: '#dc2626',
  BLACK: '#0f172a',
};

export function getMissionConfig(lead, decision) {
  const wf = lead?.workflow_state;
  const base = MISSION_CTA[wf] || { label: '📞 Take Action', kind: 'call' };
  const na = decision?.nextAction;
  return {
    cta: base.label,
    kind: base.kind,
    urgency: na?.urgency || (computeSlaStatus(lead?.next_action_due_at) === 'CRITICAL' ? 'HIGH' : 'MEDIUM'),
    nextLabel: na?.label || WF_STATE_LABEL[wf] || 'Next step',
    script: na?.script || null,
  };
}

export function getExecutionStateBadges(lead, { slaStatus, lockInfo, currentUserId } = {}) {
  const badges = [];
  const tags = leadTags(lead);
  const wf = lead?.workflow_state;

  if (lockInfo && lockInfo.userId && lockInfo.userId !== currentUserId) {
    badges.push({ key: 'LOCKED', label: '🔒 LOCKED', bg: '#dbeafe', color: '#1e40af' });
  }
  if (tags.includes('needs_manager_review') || wf === 'NO_ANSWER_ESC') {
    badges.push({ key: 'MGR', label: '⚠ MANAGER REVIEW', bg: '#4c0519', color: '#fecdd3' });
  }
  if (slaStatus === 'OVERDUE' || slaStatus === 'CRITICAL') {
    badges.push({ key: 'OVERDUE', label: '⏰ OVERDUE', bg: '#fee2e2', color: '#b91c1c' });
  } else if (wf === 'CALLBACK_WAIT' && slaStatus === 'DUE_SOON') {
    badges.push({ key: 'CALLBACK', label: '📞 CALLBACK DUE', bg: '#fef3c7', color: '#92400e' });
  }
  if (tags.includes('stale_lead')) {
    badges.push({ key: 'STALE', label: '⚠ STALE', bg: '#fef9c3', color: '#854d0e' });
  }
  if (wf === 'NEGOTIATING') {
    badges.push({ key: 'NEG', label: '🤝 NEGOTIATING', bg: '#fef9c3', color: '#713f12' });
  }
  if (wf === 'SEND_QUOTATION' || wf === 'CHASE_QUOTATION') {
    badges.push({ key: 'QUOTE', label: '📄 QUOTATION PENDING', bg: '#ede9fe', color: '#6d28d9' });
  }
  return badges;
}

export function computeQueueScorecard(items, userId) {
  const mine = userId
    ? items.filter((i) => Number(i.lead?.assigned_to) === Number(userId))
    : items;
  const n = mine.length;
  if (!n) {
    return { slaPct: 100, stale: 0, callbackAbuse: 0, quotePct: 0, avgResponseH: null };
  }
  const overdue = mine.filter((i) => ['OVERDUE', 'CRITICAL'].includes(i.slaStatus)).length;
  const stale = mine.filter((i) => leadTags(i.lead).includes('stale_lead')).length;
  const callbackAbuse = mine.filter((i) => leadTags(i.lead).includes('callback_abuse_risk')).length;
  const quoteStage = mine.filter((i) =>
    ['SEND_QUOTATION', 'CHASE_QUOTATION', 'NEGOTIATING'].includes(i.lead?.workflow_state),
  ).length;
  const ages = mine.map((i) => i.ageHours).filter((h) => h != null && h >= 0);
  const avgResponseH = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
  return {
    slaPct: Math.round(((n - overdue) / n) * 100),
    stale,
    callbackAbuse,
    quotePct: Math.round((quoteStage / n) * 100),
    avgResponseH,
  };
}

/** Activity log actions shown in Operational Logs tab only */
export const OPERATIONAL_LOG_ACTIONS = new Set([
  'LEAD_ASSIGNED',
  'STATUS_CHANGED',
  'SLA_WARNING',
  'SLA_ESCALATED',
  'SLA_RESOLVED',
  'AUTOMATION_PAUSED',
  'AUTOMATION_RESUMED',
  'AUTOMATION_SNOOZED',
  'SYSTEM_NOTE',
  'FOLLOWUP_CREATED',
  'FOLLOWUP_COMPLETED',
]);

export function isOperationalLog(log) {
  if (!log) return false;
  if (OPERATIONAL_LOG_ACTIONS.has(log.action)) return true;
  const src = log.source;
  if (src === 'AUTOMATION' || src === 'SYSTEM') return true;
  const title = (log.title || '').toLowerCase();
  const desc = (log.description || '').toLowerCase();
  return (
    title.includes('reassign') ||
    title.includes('escalat') ||
    title.includes('sla') ||
    title.includes('snooze') ||
    title.includes('override') ||
    title.includes('automation') ||
    desc.includes('breach') ||
    desc.includes('abuse')
  );
}
