/**
 * Single source of truth for WhatsApp number connection status.
 *
 * Rule: prefer backend number_state. Legacy waState remains as fallback.
 *
 * Do NOT use: is_active, status (DB enum), connected, engineActive,
 * wa_active, or any derived "session" flags.
 */

export function isNumberConnected(number) {
  if (number?.number_state) return number.number_state === 'CONNECTED';
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

// WA session state → chip key (canonical mapping, single source of truth).
// waState is the live backend state string; connected is the precomputed boolean.
export function waStateToChipKey(waState, connected) {
  if (waState === 'CONNECTED') return 'connected';
  if (waState === 'RECONNECT_REQUIRED') return 'reconnect_required';
  if (waState === 'DISCONNECTED') return 'disconnected';
  if (connected || waState === 'ready')                                     return 'connected';
  if (waState === 'initializing' || waState === 'authenticating')           return 'connecting';
  if (waState === 'awaiting_scan')                                           return 'scan_required';
  if (waState === 'awaiting_manual_reconnect')                              return 'reconnect_required';
  if (waState === 'failed')                                                  return 'failed';
  return 'disconnected';
}

export const WA_SESSION_CHIP = {
  connected:          { bg: '#dcfce7', color: '#166534', label: 'Connected'          },
  connecting:         { bg: '#dbeafe', color: '#1d4ed8', label: 'Connecting'         },
  scan_required:      { bg: '#fef9c3', color: '#854d0e', label: 'Scan Required'      },
  reconnect_required: { bg: '#fff7ed', color: '#c2410c', label: 'Reconnect Required' },
  failed:             { bg: '#fee2e2', color: '#991b1b', label: 'Failed'             },
  disconnected:       { bg: '#f3f4f6', color: '#6b7280', label: 'Disconnected'       },
};

// Returns the full chip spec { bg, color, label } for a waState + connected pair.
export function waSessionChip(waState, connected) {
  return WA_SESSION_CHIP[waStateToChipKey(waState, connected)] ?? WA_SESSION_CHIP.disconnected;
}

// Warmup release allowances — must match backend shared/number-limits.ts
const WARMUP = {
  1: { label: 'L1 Cool',   daily: 20,  pacing: 'Slow'     },
  2: { label: 'L2 Warm',   daily: 50,  pacing: 'Moderate' },
  3: { label: 'L3 Hot',    daily: 100, pacing: 'Fast'      },
  4: { label: 'L4 Mature', daily: 150, pacing: 'Fast'      },
};

/**
 * Returns warmup display config for a number.
 * A number that has never connected has not earned any warmup level — show NOT STARTED.
 * Input: any object with last_connected_at and warmup_level fields.
 */
export function resolveWarmup(num) {
  if (!num?.last_connected_at) {
    return { notStarted: true, label: 'NOT STARTED', daily: 20, pacing: 'Slow' };
  }
  return { notStarted: false, ...(WARMUP[num.warmup_level] ?? WARMUP[1]) };
}
