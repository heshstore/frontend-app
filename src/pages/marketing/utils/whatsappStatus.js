/**
 * Single source of truth for WhatsApp number connection status.
 *
 * Rule: a number is CONNECTED iff its live waState is 'ready'.
 * Everything else — idle, initializing, authenticating, failed,
 * disconnecting, awaiting_scan — is NOT CONNECTED.
 *
 * Do NOT use: is_active, status (DB enum), connected, engineActive,
 * wa_active, or any derived "session" flags.
 */

export function isNumberConnected(number) {
  return (number?.waState ?? number?.wa_state) === 'ready';
}

export function getWhatsappStatusLabel(number) {
  return isNumberConnected(number) ? 'connected' : 'not_connected';
}

// Returns a chip spec { label, bg, color } for inline status badges.
export function waStatusChip(number) {
  if (isNumberConnected(number)) {
    return { label: 'Connected',     bg: '#dcfce7', color: '#166534' };
  }
  return   { label: 'Not Connected', bg: '#f3f4f6', color: '#6b7280' };
}
