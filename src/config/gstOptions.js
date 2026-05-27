/**
 * Canonical GST slab list for Saachu ERP.
 * New entries may only use 5% or 18%.
 * Existing items with legacy slabs (0%, 3%, 12%, 28%) are preserved in DB
 * and display safely; they are not offered as choices in forms.
 */
export const GST_OPTIONS = [
  { value: '',   label: 'Select GST %' },
  { value: '5',  label: '5%' },
  { value: '18', label: '18%' },
];

/** Returns GST options for an edit form, appending a legacy entry if the
 *  stored value is non-zero and not in the standard set. This ensures the
 *  form renders correctly for older items without silently zeroing the field. */
export function getEditGstOptions(storedGst) {
  const n = Number(storedGst ?? 0);
  if (n > 0 && n !== 5 && n !== 18) {
    return [...GST_OPTIONS, { value: String(n), label: `${n}% (legacy)` }];
  }
  return GST_OPTIONS;
}
