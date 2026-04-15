export function formatCustomer(c) {
  if (!c) return '';
  const parts = [c.companyName];
  if (c.tag) parts.push(`[${c.tag}]`);
  if (c.city) parts.push(c.city);
  return parts.join(' — ');
}

export default formatCustomer;
