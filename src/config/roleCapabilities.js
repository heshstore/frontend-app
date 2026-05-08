/**
 * Reads the logged-in user's role and permissions from localStorage and returns
 * a flat capabilities map. Call this inside any component or callback — it reads
 * fresh values each time, so it is safe to call on each fetch cycle.
 */
export function getUserCapabilities() {
  let user = {};
  let permissions = [];
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
  try { permissions = JSON.parse(localStorage.getItem('permissions') || '[]'); } catch {}

  const isAdmin = user?.role === 'Admin';
  const has    = (p)       => isAdmin || permissions.includes(p);
  const hasAny = (...ps)   => isAdmin || ps.some(p => permissions.includes(p));

  return {
    isAdmin,

    // ── Module-level access (mirrors Sidebar permission checks) ───────────────
    canViewOrders:      has('order.view'),
    canViewProduction:  has('production.view'),
    canViewCrm:         hasAny('lead.view', 'crm.analytics.self'),
    canViewAccounts:    hasAny('invoice.view', 'payment.view'),
    canViewQuotations:  has('quotation.view'),
    canViewDispatch:    has('dispatch.view'),
    canViewCustomers:   has('customer.view'),
    canViewItems:       has('item.view'),
    canViewStaff:       hasAny('staff.view', 'rbac.manage'),
    canManageWhatsApp:  has('whatsapp.manage'),

    // ── Dashboard widget gates ─────────────────────────────────────────────────
    canViewDashboardSummary: hasAny('order.view', 'production.view', 'payment.view', 'invoice.view'),
    canViewDelayedJobs:      has('production.view'),
    canViewHotLeads:         hasAny('lead.view', 'crm.analytics.self'),
    canViewPendingPayments:  hasAny('invoice.view', 'payment.view'),
    canSyncShopify:          has('item.view'),
  };
}
