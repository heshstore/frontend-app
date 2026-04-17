function isAdminUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.role === 'Admin';
  } catch {
    return false;
  }
}

/**
 * usePermission(key)
 * Returns true if the currently logged-in user has the given permission key.
 * Permissions are stored in localStorage at login time (from /auth/login response).
 *
 * Usage:
 *   const canApprove = usePermission('order.approve');
 *   const canSeeStaff = usePermission('staff.view');
 */
export function usePermission(key) {
  if (isAdminUser()) return true;
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(perms) && perms.includes(key);
  } catch {
    return false;
  }
}

/**
 * hasAnyPermission(...keys)
 * Returns true if the user has at least one of the given permission keys.
 *
 * Usage:
 *   const canSeeAccounts = hasAnyPermission('invoice.view', 'payment.view');
 */
export function hasAnyPermission(...keys) {
  if (isAdminUser()) return true;
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
    if (!Array.isArray(perms)) return false;
    return keys.some(k => perms.includes(k));
  } catch {
    return false;
  }
}
