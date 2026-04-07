export const formatCustomer = (c) => {
  if (!c) return "";

  const name = c.companyName || "";
  const tag = c.tag || "";
  const city = c.city || "";

  return `${name} • ${tag} • ${city}`;
};