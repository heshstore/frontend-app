/**
 * Returns quality tier for a lead based on contact data availability.
 *   GOOD   — phone present
 *   MEDIUM — email only (no phone)
 *   POOR   — neither phone nor email
 */
export function leadQuality(lead) {
  if (lead?.phone) {
    return {
      label:   'Good Lead',
      tooltip: 'Phone number available',
      bg:      '#DCFCE7',
      color:   '#15803D',
      border:  '#BBF7D0',
      dot:     '#16A34A',
    };
  }
  if (lead?.email) {
    return {
      label:   'Medium Lead',
      tooltip: 'Email only — no phone number',
      bg:      '#FEF9C3',
      color:   '#854D0E',
      border:  '#FDE047',
      dot:     '#CA8A04',
    };
  }
  return {
    label:   'Poor Lead',
    tooltip: 'No phone or email available',
    bg:      '#FEE2E2',
    color:   '#991B1B',
    border:  '#FECACA',
    dot:     '#DC2626',
  };
}
