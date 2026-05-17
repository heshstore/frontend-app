import { WAITING_L2_MINS, WAITING_L3_MINS, OVERDUE_MINS } from './crmConstants';

/**
 * Compact human-readable duration from a millisecond count.
 * Examples: 45000 → "0m", 90000 → "1m", 5400000 → "1h 30m", 90000000 → "1d"
 */
export function compactAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
  const days   = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

/**
 * Returns a WAITING or OVERDUE badge descriptor for a lead, or null if none applies.
 *
 * Conditions for a badge:
 *   • last_customer_reply_at exists
 *   • lead status is not CONVERTED or LOST
 *   • last_salesman_reply_at IS NULL or strictly < last_customer_reply_at
 *     (same-second timestamps → treated as "salesman replied" → no badge)
 *
 * Priority: OVERDUE (≥ OVERDUE_MINS) → WAITING L3 (≥ L3) → WAITING L2 (≥ L2) → WAITING L1
 *
 * Return shape: { text, bg, color, border, cardBorder }
 * Consumers that don't use cardBorder (e.g. LeadQueue) can ignore it.
 */
export function getWaitingBadge(lead) {
  const replyAt    = lead.last_customer_reply_at ? +new Date(lead.last_customer_reply_at) : null;
  const salesmanAt = lead.last_salesman_reply_at ? +new Date(lead.last_salesman_reply_at) : null;
  if (!replyAt || ['CONVERTED', 'LOST'].includes(lead.status)) return null;
  if (salesmanAt && salesmanAt >= replyAt) return null;
  const waitMs = Date.now() - replyAt;
  if (waitMs <= 0) return null;  // server clock ahead of browser — suppress
  const waitMins = Math.floor(waitMs / 60000);
  const age      = compactAge(waitMs);
  if (waitMins >= OVERDUE_MINS) {
    return { text: `OVERDUE · ${age}`, bg: '#dc2626', color: '#fff',     border: 'transparent', cardBorder: '#dc2626' };
  }
  if (waitMins >= WAITING_L3_MINS) {
    return { text: `WAITING · ${age}`, bg: '#fee2e2', color: '#991b1b', border: '#fca5a5',    cardBorder: '#f87171' };
  }
  if (waitMins >= WAITING_L2_MINS) {
    return { text: `WAITING · ${age}`, bg: '#ffedd5', color: '#9a3412', border: '#fb923c',    cardBorder: '#fb923c' };
  }
  return { text: `WAITING · ${age}`, bg: '#fef9c3', color: '#854d0e', border: '#fde047',    cardBorder: '#fde047' };
}
