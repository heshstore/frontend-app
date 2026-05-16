/**
 * Normalize ownership fields from quotation / order / invoice API payloads.
 * Uses Phase 15.5 field names only — no client-side joins.
 */

export function normalizeOwnership(data = {}) {
  const d = data || {};
  const hasApproval =
    Boolean(d.approved_by_name || d.approved_by_id || d.approved_at);

  return {
    salesmanName: d.salesman_name || d.sales_person || null,
    salesmanRole: d.salesman_role || null,
    salesmanPhone: d.salesman_phone || null,
    approvedByName: d.approved_by_name || null,
    approvedByRole: d.approved_by_role || null,
    approvedAt: d.approved_at || null,
    hasApproval,
    createdByName: d.created_by_name || null,
    createdByRole: d.created_by_role || null,
    generatedByName: d.generated_by_name || d.invoice_created_by_name || null,
    generatedByRole: d.generated_by_role || null,
  };
}

/** Quotation: approval from linked order when present; otherwise pending. */
export function quotationApprovalLabel(data = {}) {
  const o = normalizeOwnership(data);
  if (o.hasApproval) {
    return {
      name: o.approvedByName,
      role: o.approvedByRole,
      at: o.approvedAt,
      pending: false,
    };
  }
  return { name: null, role: null, at: null, pending: true };
}

export function orderApprovalLabel(data = {}) {
  const o = normalizeOwnership(data);
  if (o.hasApproval) {
    return {
      name: o.approvedByName,
      role: o.approvedByRole,
      at: o.approvedAt,
      pending: false,
    };
  }
  const s = String(data?.status || "").toUpperCase();
  const pending =
    s === "PENDING_APPROVAL" ||
    s === "DRAFT" ||
    s === "GENERATED" ||
    s === "REJECTED";
  return { name: null, role: null, at: null, pending };
}

export function formatApprovalDisplay(approval) {
  if (approval?.pending) return "Pending Approval";
  if (!approval?.name) return "—";
  const role = approval.role ? ` (${approval.role})` : "";
  return `${approval.name}${role}`;
}

export function formatPersonLine(name, role, phone) {
  if (!name) return null;
  const parts = [name];
  if (role) parts.push(role);
  if (phone) parts.push(phone);
  return parts.join(" · ");
}
