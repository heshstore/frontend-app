import { apiFetch } from './api';

/**
 * Fire-and-forget click tracking for document action buttons (View / Edit /
 * Print / WhatsApp). PDF and Email are tracked server-side already, so they
 * don't need a client-side call. Never blocks or surfaces errors to the user
 * — a failed tracking beacon should never get in the way of the real action.
 */
const TYPE_PATH = {
  quotation: 'quotations',
  order: 'orders',
  invoice: 'invoice',
};

export function trackDocAction(type, id, action) {
  const path = TYPE_PATH[type];
  if (!path || !id) return;
  apiFetch(`/${path}/${id}/track`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  }).catch(() => {
    // Best-effort only.
  });
}
