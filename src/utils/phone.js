/**
 * Normalizes an Indian phone number for use in a wa.me URL.
 *
 * Handles:
 *   +919884052555  → 919884052555  (strips +, already has country code)
 *   919884052555   → 919884052555  (already correct)
 *   9884052555     → 919884052555  (10-digit local, prefix 91)
 *   09884052555    → 919884052555  (0-prefixed, strip 0 then prefix 91)
 */
export function normalizePhoneForWhatsApp(phone) {
  const clean = String(phone || '').replace(/\D/g, '');
  if (!clean) return '';
  // Already has country code — 12+ digits starting with 91
  if (clean.length >= 11 && clean.startsWith('91')) return clean;
  // Strip leading trunk zero (e.g. 09884052555 → 9884052555)
  const local = clean.startsWith('0') ? clean.slice(1) : clean;
  return `91${local}`;
}
