import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { usePermission, hasAnyPermission } from '../../utils/usePermission';
import { getUserCapabilities } from '../../config/roleCapabilities';

// ── Theme ─────────────────────────────────────────────────────────────────────

const NAV_BG    = '#0f172a';
const NAV_TEXT  = 'rgba(255,255,255,0.82)';
const NAV_MUTED = 'rgba(255,255,255,0.38)';

const CloseCtx = createContext(() => {});

// ── Pipeline config ───────────────────────────────────────────────────────────

const PIPELINE = [
  { key: 'leads',      label: 'Leads',      icon: '👥', href: '/crm/leads',           color: '#f97316', permKey: 'crm'             },
  { key: 'quotations', label: 'Quotations', icon: '📝', href: '/quotations',           color: '#3b82f6', permKey: 'quotation.view'  },
  { key: 'orders',     label: 'Orders',     icon: '📦', href: '/orders',               color: '#6366f1', permKey: 'order.view'      },
  { key: 'production', label: 'Production', icon: '⚙️', href: '/production/queue',     color: '#dc2626', permKey: 'production.view' },
  { key: 'dispatch',   label: 'Dispatch',   icon: '🚚', href: '/dispatch',             color: '#8b5cf6', permKey: 'dispatch.view'   },
  { key: 'payments',   label: 'Payments',   icon: '💰', href: '/accounts/outstanding', color: '#d97706', permKey: 'accounts'        },
];

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function getPriority(key, count) {
  if ((key === 'production' || key === 'leads') && count > 0)          return 'HIGH';
  if ((key === 'payments'   || key === 'dispatch') && count > 0)       return 'MEDIUM';
  return 'LOW';
}

function getMicroText(key, count, rawAmount) {
  if (!count && !rawAmount) return null;
  switch (key) {
    case 'leads':      return count ? `${count} hot lead${count !== 1 ? 's' : ''}` : null;
    case 'production': return count ? `${count} delayed job${count !== 1 ? 's' : ''}` : null;
    case 'payments':   {
      if (!rawAmount) return null;
      const lakh = rawAmount / 100_000;
      return lakh >= 1
        ? `₹${lakh.toFixed(1)}L pending`
        : `₹${Math.round(rawAmount / 1000)}k pending`;
    }
    case 'dispatch':   return count ? `${count} pending` : null;
    case 'orders':     return count ? `${count} active` : null;
    case 'quotations': return count ? `${count} open` : null;
    default:           return null;
  }
}

// ── Pipeline item ─────────────────────────────────────────────────────────────

const BADGE_STYLE = {
  HIGH:   { background: '#ef4444', color: '#fff' },
  MEDIUM: { background: '#f59e0b', color: '#fff' },
  LOW:    { background: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.7)' },
};

const GLOW_STYLE = {
  HIGH:   { border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 0 1px rgba(239,68,68,0.15) inset' },
  MEDIUM: { border: '1px solid rgba(245,158,11,0.30)' },
  LOW:    { border: '1px solid transparent' },
};

function PipelineItem({ item, count, priority, microText, active }) {
  const navigate = useNavigate();
  const onClose  = useContext(CloseCtx);
  const [hov, setHov] = useState(false);

  const isHigh   = priority === 'HIGH';
  const isMedium = priority === 'MEDIUM';
  const showBadge = count != null && count !== 0;

  return (
    <button
      onClick={() => { navigate(item.href); onClose(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: microText ? '7px 10px' : '8px 10px',
        background: active
          ? 'rgba(255,255,255,0.11)'
          : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeft: `3px solid ${active ? item.color : isHigh ? '#ef4444' : isMedium ? '#f59e0b' : 'transparent'}`,
        borderTop: 'none', borderBottom: 'none',
        borderRight: GLOW_STYLE[priority].border.replace('1px solid ', '').startsWith('rgba')
          ? `1px solid ${GLOW_STYLE[priority].border.match(/rgba[^)]+\)/)?.[0] ?? 'transparent'}`
          : 'none',
        boxShadow: isHigh && !active ? '2px 0 8px rgba(239,68,68,0.15)' : 'none',
        color: active ? '#fff' : NAV_TEXT,
        fontSize: 13, fontWeight: active ? 700 : isHigh ? 600 : 400,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s',
        minHeight: microText ? 44 : 40,
        borderRadius: '0 7px 7px 0',
        marginBottom: 2,
        animation: isHigh && !active ? 'sidebarPulse 2.5s ease-in-out infinite' : 'none',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>
        {item.icon}
      </span>

      {/* Label + micro text */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {microText && (
          <span style={{
            display: 'block', fontSize: 10,
            color: isHigh ? 'rgba(252,165,165,0.9)' : isMedium ? 'rgba(253,211,77,0.85)' : NAV_MUTED,
            marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {microText}
          </span>
        )}
      </span>

      {/* Count badge */}
      {showBadge && (
        <span style={{
          fontSize: 10, fontWeight: 800,
          padding: '1px 6px', borderRadius: 99, flexShrink: 0,
          ...BADGE_STYLE[priority],
        }}>
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  );
}

// ── Simple nav item ───────────────────────────────────────────────────────────

function NavItem({ label, href, icon }) {
  const navigate    = useNavigate();
  const { pathname} = useLocation();
  const onClose     = useContext(CloseCtx);
  const [hov, setHov] = useState(false);

  const active =
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <button
      onClick={() => { navigate(href); onClose(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 10px',
        background: active ? 'rgba(255,255,255,0.09)' : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? '#60a5fa' : 'transparent'}`,
        color: active ? '#fff' : NAV_TEXT,
        fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s', minHeight: 36,
        borderRadius: '0 7px 7px 0', marginBottom: 1,
      }}
    >
      {icon && <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}

function SideLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: NAV_MUTED,
      textTransform: 'uppercase', letterSpacing: 1.1,
      padding: '8px 12px 3px',
    }}>
      {children}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }) {
  const { pathname }   = useLocation();
  const navigate       = useNavigate();
  const isMobileDrawer = Boolean(onClose);
  const [moreOpen, setMoreOpen] = useState(false);
  const sidebarRef     = useRef(null);

  // ── Permissions ────────────────────────────────────────────────────────────
  const canSeeQuotations = usePermission('quotation.view');
  const canSeeOrders     = usePermission('order.view');
  const canSeeProduction = usePermission('production.view');
  const canSeeAccounts   = hasAnyPermission('invoice.view', 'payment.view');
  const canSeeDispatch   = usePermission('dispatch.view');
  const canSeeStaff      = hasAnyPermission('staff.view', 'rbac.manage');
  const canSeeCrm        = hasAnyPermission('lead.view', 'crm.analytics.self');
  const canSeeWhatsApp   = usePermission('whatsapp.manage');
  const canSeeItems      = usePermission('item.view');
  const canSeeCustomers  = usePermission('customer.view');

  const permMap = {
    crm:              canSeeCrm,
    'quotation.view': canSeeQuotations,
    'order.view':     canSeeOrders,
    'production.view':canSeeProduction,
    'dispatch.view':  canSeeDispatch,
    accounts:         canSeeAccounts,
  };

  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}

  // ── Counts + priority ──────────────────────────────────────────────────────
  const [counts,     setCounts]     = useState({});
  const [rawAmounts, setRawAmounts] = useState({});
  // Sorted order is frozen after first load — prevents jumping on 60s refresh
  const [sortedKeys, setSortedKeys] = useState(null);
  const initialLoadDone             = useRef(false);

  const fetchCounts = useCallback(async () => {
    const next    = {};
    const amounts = {};
    const safe    = async (key, fn) => { try { const v = await fn(); next[key] = v; } catch {} };
    // Read capabilities fresh each cycle so 60s refresh respects current perms
    const caps = getUserCapabilities();

    const tasks = [
      caps.canViewCrm && safe('leads', async () => {
        const r = await apiFetch('/crm/leads?filter=hot&limit=1');
        if (!r.ok) return 0;
        const d = await r.json();
        return d.total ?? (Array.isArray(d) ? d.length : 0);
      }),
      caps.canViewQuotations && safe('quotations', async () => {
        const r = await apiFetch('/quotations?limit=1');
        if (!r.ok) return 0;
        const d = await r.json();
        return d.total ?? (Array.isArray(d) ? d.length : 0);
      }),
      caps.canViewOrders && safe('orders', async () => {
        const r = await apiFetch('/orders?limit=1');
        if (!r.ok) return 0;
        const d = await r.json();
        return d.total ?? (Array.isArray(d) ? d.length : 0);
      }),
      caps.canViewProduction && safe('production', async () => {
        const r = await apiFetch('/production/queue?limit=1');
        if (!r.ok) return 0;
        const d = await r.json();
        return d.total ?? (Array.isArray(d) ? d.length : 0);
      }),
      caps.canViewDispatch && safe('dispatch', async () => {
        const r = await apiFetch('/dispatch?limit=1');
        if (!r.ok) return 0;
        const d = await r.json();
        return d.total ?? (Array.isArray(d) ? d.length : 0);
      }),
      caps.canViewAccounts && safe('payments', async () => {
        const r = await apiFetch('/accounts/pending-summary');
        if (!r.ok) return 0;
        const d = await r.json();
        const amt = d.total_amount ?? d.amount ?? 0;
        amounts.payments = amt;
        return amt > 0 ? 1 : 0;
      }),
    ].filter(Boolean);

    await Promise.allSettled(tasks);

    setCounts(prev => ({ ...prev, ...next }));
    if (Object.keys(amounts).length) setRawAmounts(prev => ({ ...prev, ...amounts }));

    // Sort pipeline by priority only once (initial load)
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      const withPriority = PIPELINE.map(item => ({
        key:      item.key,
        priority: getPriority(item.key, next[item.key] ?? 0),
      }));
      withPriority.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      setSortedKeys(withPriority.map(x => x.key));
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, 60_000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  // ── Build visible sorted pipeline ─────────────────────────────────────────
  const visiblePipeline = (sortedKeys ?? PIPELINE.map(p => p.key))
    .map(key => PIPELINE.find(p => p.key === key))
    .filter(Boolean)
    .filter(p => permMap[p.permKey]);

  const handleLogout = () => {
    ['isLoggedIn','access_token','user','permissions'].forEach(k => localStorage.removeItem(k));
    navigate('/');
  };

  const hasMore =
    canSeeCrm || canSeeCustomers || canSeeItems ||
    canSeeOrders || canSeeProduction || canSeeAccounts || canSeeStaff;

  return (
    <CloseCtx.Provider value={onClose || (() => {})}>
      <div
        ref={sidebarRef}
        style={{
          width: 240, minWidth: 240, maxWidth: 240,
          height: '100vh',
          background: NAV_BG,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.12) transparent',
          paddingBottom: 12,
        }}
      >

        {/* ── Brand ── */}
        <div style={{
          padding: '12px 14px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            S
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>Saachu</span>
          {isMobileDrawer && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.09)', border: 'none', borderRadius: 6,
              padding: '4px 8px', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1,
            }}>
              ✕
            </button>
          )}
        </div>

        {/* ── User row ── */}
        <div style={{
          padding: '8px 12px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 99, flexShrink: 0,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.name || user.username || 'User'}
            </div>
            <div style={{ fontSize: 10, color: NAV_MUTED }}>{user.role || 'Staff'}</div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, paddingTop: 4, paddingBottom: 4 }}>

          <NavItem label="Dashboard" href="/dashboard" icon="🏠" />

          {/* ── Workflow pipeline ── */}
          {visiblePipeline.length > 0 && (
            <>
              <SideLabel>Workflow</SideLabel>
              {visiblePipeline.map(item => {
                const count    = counts[item.key] ?? null;
                const priority = getPriority(item.key, count ?? 0);
                const micro    = getMicroText(item.key, count, rawAmounts[item.key]);
                const active   =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <PipelineItem
                    key={item.key}
                    item={item}
                    count={count}
                    priority={priority}
                    microText={micro}
                    active={active}
                  />
                );
              })}
            </>
          )}

          {/* ── More (collapsible) ── */}
          {hasMore && (
            <>
              <button
                onClick={() => setMoreOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '7px 12px',
                  background: 'transparent', border: 'none',
                  color: NAV_MUTED, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1,
                  cursor: 'pointer', marginTop: 4,
                }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>More</span>
                <span style={{
                  fontSize: 10, display: 'inline-block',
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  ▾
                </span>
              </button>

              {moreOpen && (
                <div style={{ animation: 'fadeIn 0.15s ease' }}>
                  {canSeeCrm && (
                    <>
                      <SideLabel>CRM</SideLabel>
                      <NavItem label="All Leads"  href="/crm/leads"     icon="👥" />
                      <NavItem label="Queue"      href="/crm/queue"     icon="🔥" />
                      <NavItem label="Follow-ups" href="/crm/followups" icon="📅" />
                      <NavItem label="Analytics"  href="/crm/analytics" icon="📊" />
                      {canSeeWhatsApp && <NavItem label="WhatsApp" href="/whatsapp" icon="💬" />}
                    </>
                  )}
                  {canSeeCustomers && (
                    <>
                      <SideLabel>Customers</SideLabel>
                      <NavItem label="All Customers" href="/customers"    icon="🏢" />
                      <NavItem label="Add Customer"  href="/add-customer" icon="➕" />
                    </>
                  )}
                  {canSeeItems && (
                    <>
                      <SideLabel>Items</SideLabel>
                      <NavItem label="Item List" href="/items"         icon="📋" />
                      <NavItem label="Add Item"  href="/add-item"      icon="➕" />
                      <NavItem label="Shopify"   href="/shopify-items" icon="🛍" />
                    </>
                  )}
                  {canSeeOrders && (
                    <>
                      <SideLabel>Orders</SideLabel>
                      <NavItem label="Pending Approval" href="/pending-approval" icon="⏳" />
                    </>
                  )}
                  {canSeeProduction && (
                    <>
                      <SideLabel>Production</SideLabel>
                      <NavItem label="My Jobs" href="/production/my-jobs" icon="🔧" />
                    </>
                  )}
                  {canSeeAccounts && (
                    <>
                      <SideLabel>Accounts</SideLabel>
                      <NavItem label="Credit Limits" href="/set-credit-limit" icon="🏦" />
                    </>
                  )}
                  {canSeeStaff && (
                    <>
                      <SideLabel>Settings</SideLabel>
                      <NavItem label="Staff"               href="/staff" icon="👤" />
                      <NavItem label="Roles & Permissions" href="/rbac"  icon="🔐" />
                      <NavItem label="SLA Dashboard"       href="/sla"      icon="⏱️" />
                      <NavItem label="Activity Center"     href="/activity" icon="📋" />
                      <NavItem label="KPI Dashboard"       href="/kpi"      icon="📊" />
                    </>
                  )}
                </div>
              )}
            </>
          )}

        </nav>

        {/* ── Logout ── */}
        <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '9px', border: 'none', borderRadius: 7,
              background: 'rgba(255,255,255,0.06)', color: NAV_TEXT,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Logout
          </button>
          {process.env.REACT_APP_VERSION && (
            <div style={{ marginTop: 6, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
              {process.env.REACT_APP_VERSION}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn      { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sidebarPulse {
          0%, 100% { box-shadow: 2px 0 8px rgba(239,68,68,0.15); }
          50%       { box-shadow: 2px 0 14px rgba(239,68,68,0.30); }
        }
      `}</style>
    </CloseCtx.Provider>
  );
}
