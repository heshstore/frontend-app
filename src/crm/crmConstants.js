/**
 * HOT lead urgency windows per source.
 *
 * Backend mirror: LeadAutomationService.HOT_LEAD_WINDOWS in lead-automation.service.ts
 * These values MUST stay in sync with the backend static property.
 *
 * minMins — when the backend alert fires (salesman hasn't contacted yet)
 * maxMins — when the HOT badge and backend alert both expire (lead has gone cold)
 */
export const HOT_LEAD_WINDOWS = {
  META:      { minMins: 45,  maxMins: 240, shortLabel: 'Meta',      emoji: '🔥' },
  GOOGLE:    { minMins: 45,  maxMins: 240, shortLabel: 'Google',    emoji: '🔥' },
  INDIAMART: { minMins: 120, maxMins: 480, shortLabel: 'IndiaMart', emoji: '⚡' },
  LINKEDIN:  { minMins: 180, maxMins: 600, shortLabel: 'LinkedIn',  emoji: '⚡' },
};

/**
 * WAITING / OVERDUE escalation thresholds (minutes since customer last replied,
 * with no salesman response yet).
 *
 * < WAITING_L2_MINS  → level 1 (yellow)
 * < WAITING_L3_MINS  → level 2 (orange)
 * < OVERDUE_MINS     → level 3 (red)
 * ≥ OVERDUE_MINS     → OVERDUE  (solid red — no expiry)
 */
export const WAITING_L2_MINS  = 30;
export const WAITING_L3_MINS  = 120;
export const OVERDUE_MINS     = 240;
