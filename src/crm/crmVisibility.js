/**
 * Phase 18 — role-based CRM visibility (frontend only).
 */
import { computeSlaStatus, computeLeadHealth, leadTags, slaCountdown } from './crmCockpit';

export const CRM_MODE = {
  TELECALLER: 'telecaller',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

const ADMIN_ROLES = new Set(['Admin', 'COO']);
const MANAGER_ROLES = new Set(['Sales Manager']);

export function getCrmVisibilityMode(user, hasPermission) {
  const role = user?.role || '';
  if (ADMIN_ROLES.has(role)) return CRM_MODE.ADMIN;
  if (MANAGER_ROLES.has(role)) return CRM_MODE.MANAGER;
  if (typeof hasPermission === 'function' && (hasPermission('lead.edit') || hasPermission('crm.analytics.team'))) {
    return CRM_MODE.MANAGER;
  }
  return CRM_MODE.TELECALLER;
}

export function isTelecallerMode(mode) {
  return mode === CRM_MODE.TELECALLER;
}

export function isManagerMode(mode) {
  return mode === CRM_MODE.MANAGER || mode === CRM_MODE.ADMIN;
}

export function isAdminMode(mode) {
  return mode === CRM_MODE.ADMIN;
}

/** Business-language workflow labels */
export const WF_HUMAN = {
  FIRST_CALL: 'First Call',
  FOLLOW_UP: 'Follow-up Required',
  NO_ANSWER_1: 'No Answer',
  NO_ANSWER_2: 'No Answer (2nd try)',
  NO_ANSWER_ESC: 'Needs Attention',
  CALLBACK_WAIT: 'Callback Scheduled',
  SEND_QUOTATION: 'Quotation Pending',
  CHASE_QUOTATION: 'Quotation Follow-up',
  NEGOTIATING: 'Negotiation in Progress',
  NURTURE: 'Re-engagement',
  CONVERTED: 'Converted',
  LOST: 'Closed',
};

export const MISSION_CTA_HUMAN = {
  FIRST_CALL: { label: '📞 Make First Call', kind: 'call' },
  FOLLOW_UP: { label: '📞 Follow Up Now', kind: 'call' },
  NO_ANSWER_1: { label: '📞 Try Again', kind: 'call' },
  NO_ANSWER_2: { label: '📞 Try Again', kind: 'call' },
  NO_ANSWER_ESC: { label: '⚠ Needs Attention', kind: 'manager' },
  CALLBACK_WAIT: { label: '📞 Callback Now', kind: 'call' },
  SEND_QUOTATION: { label: '📄 Create Quotation', kind: 'quotation' },
  CHASE_QUOTATION: { label: '📞 Quotation Follow-up', kind: 'call' },
  NEGOTIATING: { label: '💬 Discuss Pricing', kind: 'call' },
  NURTURE: { label: '📞 Re-engage', kind: 'call' },
};

export function wfStateLabel(wf, mode = CRM_MODE.TELECALLER) {
  if (!wf) return null;
  if (isAdminMode(mode)) return wf;
  return WF_HUMAN[wf] || wf.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slaLabel(slaStatus, mode = CRM_MODE.TELECALLER) {
  if (!slaStatus || slaStatus === 'NONE') return null;
  if (isTelecallerMode(mode)) {
    if (slaStatus === 'ON_TIME') return null;
    if (slaStatus === 'DUE_SOON') return 'Follow up soon';
    return 'Urgent follow-up';
  }
  const map = {
    ON_TIME: 'On Time',
    DUE_SOON: 'Due Soon',
    OVERDUE: 'Overdue',
    CRITICAL: 'Critical',
  };
  return map[slaStatus] || slaStatus;
}

export function healthForMode(lead, mode) {
  const sla = computeSlaStatus(lead?.next_action_due_at);
  const raw = computeLeadHealth(lead, sla);
  if (!isTelecallerMode(mode)) return { level: raw, label: HEALTH_LABEL_FULL[raw] };
  const simple =
    raw === 'GREEN' ? 'GREEN' :
    raw === 'YELLOW' ? 'YELLOW' : 'RED';
  const label =
    simple === 'GREEN' ? 'On track' :
    simple === 'YELLOW' ? 'Follow up soon' : 'Urgent';
  return { level: simple, label };
}

const HEALTH_LABEL_FULL = {
  GREEN: 'Healthy',
  YELLOW: 'Attention',
  ORANGE: 'At risk',
  RED: 'Critical',
  BLACK: 'Manager review',
};

const HEALTH_COLORS_SIMPLE = {
  GREEN: '#16a34a',
  YELLOW: '#ca8a04',
  RED: '#dc2626',
};

export function healthColor(level, mode) {
  if (isTelecallerMode(mode)) return HEALTH_COLORS_SIMPLE[level] || HEALTH_COLORS_SIMPLE.GREEN;
  const map = { GREEN: '#16a34a', YELLOW: '#ca8a04', ORANGE: '#ea580c', RED: '#dc2626', BLACK: '#0f172a' };
  return map[level] || '#16a34a';
}

export function urgencyLabel(urgency, mode) {
  if (isTelecallerMode(mode)) {
    if (urgency === 'HIGH') return 'Urgent';
    if (urgency === 'MEDIUM') return 'Soon';
    return null;
  }
  return urgency;
}

export function humanizeNextAction(label, mode) {
  if (!label || isAdminMode(mode)) return label;
  return label
    .replace(/SLA\s*breach/gi, 'Urgent follow-up')
    .replace(/NO_ANSWER_ESC/gi, 'Needs Attention')
    .replace(/SEND_QUOTATION/gi, 'Quotation Pending')
    .replace(/CHASE_QUOTATION/gi, 'Quotation Follow-up')
    .replace(/CALLBACK_WAIT/gi, 'Callback Scheduled')
    .replace(/NEGOTIATING/gi, 'Negotiation in Progress')
    .replace(/FIRST_CALL/gi, 'First Call')
    .replace(/FOLLOW_UP/gi, 'Follow-up Required');
}

export function getMissionConfigHuman(lead, decision, mode) {
  const wf = lead?.workflow_state;
  const base = MISSION_CTA_HUMAN[wf] || { label: '📞 Take Action', kind: 'call' };
  const na = decision?.nextAction;
  return {
    cta: base.label,
    kind: base.kind,
    urgency: na?.urgency || 'MEDIUM',
    nextLabel: humanizeNextAction(na?.label, mode) || wfStateLabel(wf, mode) || 'Next step',
    script: na?.script || null,
  };
}

/**
 * Priority-ordered badges. Returns { visible, overflow } max 3 on card surfaces.
 */
export function buildPriorityBadges(lead, { slaStatus, lockInfo, currentUserId, queueTier } = {}, mode) {
  const tags = leadTags(lead);
  const wf = lead?.workflow_state;
  const sla = slaStatus ?? computeSlaStatus(lead?.next_action_due_at);
  const all = [];

  if (isManagerMode(mode)) {
    if (tags.includes('needs_manager_review') || wf === 'NO_ANSWER_ESC') {
      all.push({ key: 'MGR', label: 'Manager Review', bg: '#4c0519', color: '#fecdd3', priority: 1 });
    }
    if (sla === 'OVERDUE' || sla === 'CRITICAL') {
      all.push({ key: 'OVERDUE', label: 'Overdue', bg: '#fee2e2', color: '#b91c1c', priority: 2 });
    } else if (wf === 'CALLBACK_WAIT' && (sla === 'DUE_SOON' || sla === 'OVERDUE')) {
      all.push({ key: 'CALLBACK', label: 'Callback Due', bg: '#fef3c7', color: '#92400e', priority: 3 });
    }
    if (wf === 'SEND_QUOTATION' || wf === 'CHASE_QUOTATION') {
      all.push({ key: 'QUOTE', label: 'Quotation Pending', bg: '#ede9fe', color: '#6d28d9', priority: 4 });
    }
    if (wf === 'NEGOTIATING') {
      all.push({ key: 'NEG', label: 'Negotiation', bg: '#fef9c3', color: '#713f12', priority: 5 });
    }
    if (tags.includes('stale_lead')) {
      all.push({ key: 'STALE', label: 'Stale', bg: '#fef9c3', color: '#854d0e', priority: 6 });
    }
    if (sla === 'ON_TIME' && !tags.length) {
      all.push({ key: 'OK', label: 'Healthy', bg: '#dcfce7', color: '#15803d', priority: 7 });
    }
    if (lockInfo?.userId && lockInfo.userId !== currentUserId) {
      all.push({ key: 'LOCK', label: `Locked · ${lockInfo.userName || 'User'}`, bg: '#dbeafe', color: '#1e40af', priority: 0 });
    }
    if (tags.includes('callback_abuse_risk')) {
      all.push({ key: 'ABUSE', label: 'Callback abuse', bg: '#fff7ed', color: '#c2410c', priority: 2 });
    }
    if (isAdminMode(mode) && queueTier != null) {
      all.push({ key: 'TIER', label: `Tier ${queueTier}`, bg: '#f1f5f9', color: '#475569', priority: 8 });
    }
    if (isAdminMode(mode) && wf) {
      all.push({ key: 'WF', label: wf, bg: '#f1f5f9', color: '#64748b', priority: 9 });
    }
    if (isAdminMode(mode) && sla && sla !== 'NONE') {
      all.push({ key: 'SLA', label: sla, bg: '#f1f5f9', color: '#64748b', priority: 9 });
    }
  } else {
    if (wf === 'NO_ANSWER_ESC' || tags.includes('needs_manager_review')) {
      all.push({ key: 'ATTN', label: 'Needs Attention', bg: '#fee2e2', color: '#b91c1c', priority: 1 });
    } else if (sla === 'OVERDUE' || sla === 'CRITICAL' || sla === 'DUE_SOON') {
      all.push({ key: 'URGENT', label: 'Urgent follow-up', bg: '#fef3c7', color: '#92400e', priority: 2 });
    } else if (wf === 'CALLBACK_WAIT') {
      all.push({ key: 'CB', label: 'Callback due', bg: '#dbeafe', color: '#1d4ed8', priority: 3 });
    } else if (wf === 'SEND_QUOTATION' || wf === 'CHASE_QUOTATION') {
      all.push({ key: 'QUOTE', label: 'Quotation pending', bg: '#ede9fe', color: '#6d28d9', priority: 4 });
    }
  }

  all.sort((a, b) => a.priority - b.priority);
  const visible = all.slice(0, 3);
  const overflow = all.slice(3);
  return { visible, overflow, countdown: slaCountdown(lead?.next_action_due_at) };
}

/** Queue section labels — telecallers see calm language, not SLA jargon */
export const QUEUE_TIER_SECTIONS = {
  telecaller: [
    { tier: 1, label: '📞 Callback due now', color: '#dc2626' },
    { tier: 2, label: '📄 Quotation needed', color: '#ea580c' },
    { tier: 3, label: '⏰ Urgent follow-up', color: '#d97706' },
    { tier: 4, label: '👨‍💼 Needs attention', color: '#7c3aed' },
    { tier: 5, label: '📞 Active pipeline', color: '#0369a1' },
    { tier: 6, label: '🌱 Re-engage', color: '#16a34a' },
  ],
  manager: [
    { tier: 1, label: '🚨 Callback Due Now', color: '#dc2626' },
    { tier: 2, label: '🔥 Send Quotation Immediately', color: '#ea580c' },
    { tier: 3, label: '⚠ SLA Breached', color: '#d97706' },
    { tier: 4, label: '👨‍💼 Manager Attention Required', color: '#7c3aed' },
    { tier: 5, label: '📞 Active Pipeline', color: '#0369a1' },
    { tier: 6, label: '🌱 Re-Engagement Due', color: '#16a34a' },
  ],
};

export function queueTierSections(mode) {
  if (isAdminMode(mode)) return QUEUE_TIER_SECTIONS.manager;
  if (isTelecallerMode(mode)) return QUEUE_TIER_SECTIONS.telecaller;
  return QUEUE_TIER_SECTIONS.manager;
}
