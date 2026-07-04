import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { usePermission, hasAnyPermission } from '../../utils/usePermission';
import { Ic } from '../ui/NavIcon';
import { loadPins, savePins } from '../../utils/navPins';
import { useDeployedVersion } from '../../utils/useDeployedVersion';

// ── Theme ─────────────────────────────────────────────────────────────────────

const NAV_BG     = '#0f172a';
const NAV_TEXT   = 'rgba(255,255,255,0.70)';   // muted — so active items visually pop
const NAV_MUTED  = 'rgba(255,255,255,0.32)';
const GRP_BG     = '#162340';                  // clearly distinct from NAV_BG
const GRP_DIV    = 'rgba(255,255,255,0.07)';   // divider line above each section header
const ACTIVE_BG  = 'rgba(96,165,250,0.20)';   // strong active highlight
const ACTIVE_CLR = '#ddeeff';                  // active item text — brighter than normal

const CloseCtx = createContext(() => {});

// ── LocalStorage helpers ──────────────────────────────────────────────────────

// PINS_KEY, loadPins, savePins imported from utils/navPins
// Ic imported from components/ui/NavIcon

const SECTIONS_KEY = 'saachu_sections';

// All collapsed by default — expand only on click; auto-expands for active route
const DEFAULT_SECTIONS = {
  crm: false, sales: false, production: false, dispatch: false,
  database: false, whatsapp: false, email: false, service: false, workforce: false,
  analytics: false, items: false, settings: false,
};

const SECTION_ROUTE_MAP = {
  crm:        ['/crm/', '/customers', '/whatsapp'],
  sales:      ['/quotations', '/orders', '/pending-approval', '/accounts/', '/finance/', '/set-credit-limit', '/invoice/'],
  production: ['/production/', '/departments', '/inventory', '/purchase-', '/vendors', '/manufacturing/'],
  dispatch:   ['/dispatch'],
  whatsapp:   ['/marketing/whatsapp/', '/marketing/whatsapp'],
  email:      ['/marketing/email/'],
  database:   ['/database/'],
  service:    ['/service/'],
  workforce:  ['/workforce/', '/commission'],
  analytics:  ['/kpi', '/sla', '/activity'],
  items:      ['/items', '/add-item', '/edit-item', '/shopify-items'],
  settings:   ['/staff', '/rbac', '/admin/', '/settings/'],
};

function loadSections() {
  try { return { ...DEFAULT_SECTIONS, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_SECTIONS }; }
}
function saveSections(s) { localStorage.setItem(SECTIONS_KEY, JSON.stringify(s)); }

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ label, href, icon }) {
  const navigate    = useNavigate();
  const { pathname} = useLocation();
  const onClose     = useContext(CloseCtx);
  const [hov, setHov] = useState(false);
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <button
      onClick={() => { navigate(href); onClose(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '8px 10px 8px 12px',
        background: active ? ACTIVE_BG : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? '#60a5fa' : 'transparent'}`,
        color: active ? ACTIVE_CLR : NAV_TEXT,
        fontSize: 12, fontWeight: active ? 700 : 400,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s', minHeight: 36,
        borderRadius: '0 6px 6px 0', marginBottom: 1,
      }}
    >
      {icon && (
        <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name={icon} size={13} />
        </span>
      )}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}

// ── PinnableItem ──────────────────────────────────────────────────────────────

function PinnableItem({ label, href, icon, pins, onTogglePin }) {
  const navigate    = useNavigate();
  const { pathname} = useLocation();
  const onClose     = useContext(CloseCtx);
  const [hov, setHov] = useState(false);
  const active   = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const isPinned = pins.some(p => p.href === href);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button
        onClick={() => { navigate(href); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px 8px 12px', paddingRight: 28,
          background: active ? ACTIVE_BG : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${active ? '#60a5fa' : 'transparent'}`,
          color: active ? ACTIVE_CLR : NAV_TEXT,
          fontSize: 12, fontWeight: active ? 700 : 400,
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.1s', minHeight: 36,
          borderRadius: '0 6px 6px 0', marginBottom: 1,
        }}
      >
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name={icon} size={13} />
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin({ label, href, icon }); }}
        title={isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
        style={{
          position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: isPinned ? '#fbbf24' : hov ? 'rgba(255,255,255,0.35)' : 'transparent',
          fontSize: 13, padding: '3px 5px', lineHeight: 1,
          transition: 'color 0.15s',
          pointerEvents: hov || isPinned ? 'auto' : 'none',
        }}
      >
        {isPinned ? '★' : '☆'}
      </button>
    </div>
  );
}

// ── SectionGroup ──────────────────────────────────────────────────────────────

function SectionGroup({ id, label, icon, sections, onToggle, children }) {
  const isOpen = sections[id] ?? false;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 12px',
          background: GRP_BG,
          border: 'none',
          borderTop: `1px solid ${GRP_DIV}`,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.55 }}>
          <Ic name={icon} size={11} />
        </span>
        <span style={{
          flex: 1, textAlign: 'left',
          fontSize: 10, fontWeight: 500,
          color: 'rgba(255,255,255,0.42)',
          textTransform: 'uppercase', letterSpacing: 1.5,
        }}>{label}</span>
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,0.28)', flexShrink: 0,
          display: 'inline-block',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.18s',
        }}>▾</span>
      </button>
      {isOpen && (
        <div style={{ paddingBottom: 3 }}>{children}</div>
      )}
    </div>
  );
}

// ── Quick Access ──────────────────────────────────────────────────────────────

function QuickAccessSection({ pins, onTogglePin }) {
  if (!pins.length) return null;
  return (
    <>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#fbbf24',
        textTransform: 'uppercase', letterSpacing: 1.1,
        padding: '6px 12px 2px',
      }}>Quick Access ★</div>
      {pins.map(p => (
        <PinnableItem
          key={p.href}
          label={p.label}
          href={p.href}
          icon={p.icon}
          pins={pins}
          onTogglePin={onTogglePin}
        />
      ))}
    </>
  );
}

// ── ShopifyNavItem ────────────────────────────────────────────────────────────

function ShopifyNavItem({ pins, onTogglePin }) {
  const navigate    = useNavigate();
  const { pathname} = useLocation();
  const onClose     = useContext(CloseCtx);
  const [hov, setHov] = useState(false);
  const [pendingCount, setPendingCount] = useState(null);
  const isPinned = pins.some(p => p.href === '/shopify-items');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await apiFetch('/items/stats');
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (!cancelled) setPendingCount(d.shopifyPending ?? null);
      } catch {}
    };
    load();
    const id = setInterval(load, 300_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const active = pathname.startsWith('/shopify-items');

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <button
        onClick={() => { navigate('/shopify-items'); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px 8px 12px', paddingRight: 28,
          background: active ? ACTIVE_BG : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${active ? '#60a5fa' : 'transparent'}`,
          color: active ? ACTIVE_CLR : NAV_TEXT,
          fontSize: 12, fontWeight: active ? 700 : 400,
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.1s', minHeight: 36,
          borderRadius: '0 6px 6px 0', marginBottom: 1,
        }}
      >
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name="bag" size={13} />
        </span>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Shopify Catalog</span>
        {pendingCount != null && pendingCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: '#f59e0b', color: '#fff', flexShrink: 0 }}>
            {pendingCount > 999 ? '999+' : pendingCount}
          </span>
        )}
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin({ label: 'Shopify Catalog', href: '/shopify-items', icon: 'bag' }); }}
        title={isPinned ? 'Unpin' : 'Pin to Quick Access'}
        style={{
          position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: isPinned ? '#fbbf24' : hov ? 'rgba(255,255,255,0.35)' : 'transparent',
          fontSize: 13, padding: '3px 5px', lineHeight: 1,
          transition: 'color 0.15s',
          pointerEvents: hov || isPinned ? 'auto' : 'none',
        }}
      >
        {isPinned ? '★' : '☆'}
      </button>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }) {
  const { pathname }   = useLocation();
  const navigate       = useNavigate();
  const isMobileDrawer = Boolean(onClose);
  const deployedVersion = useDeployedVersion();

  const canSeeQuotations = usePermission('quotation.view');
  const canSeeOrders     = usePermission('order.view');
  const canSeeProduction = usePermission('production.view');
  const canSeeAccounts   = hasAnyPermission('invoice.view', 'payment.view');
  const canSeeDispatch   = usePermission('dispatch.view');
  const canSeeStaff      = hasAnyPermission('staff.view', 'rbac.manage');
  const canViewWorkforce = usePermission('staff.view');
  const canSeeCrm        = hasAnyPermission('lead.view', 'crm.analytics.self');
  const canSeeWhatsApp   = usePermission('whatsapp.manage');
  const canSeeMarketing  = hasAnyPermission('whatsapp.manage', 'lead.view');
  const canSeeItems      = usePermission('item.view');
  const canSeeCustomers  = usePermission('customer.view');

  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}

  const [pins, setPins] = useState(loadPins);
  const togglePin = useCallback((item) => {
    setPins(prev => {
      const exists = prev.some(p => p.href === item.href);
      const next = exists ? prev.filter(p => p.href !== item.href) : [...prev, item];
      savePins(next);
      return next;
    });
  }, []);

  const [sections, setSections] = useState(loadSections);
  const toggleSection = useCallback((id) => {
    setSections(prev => {
      const wasOpen = prev[id];
      const next = Object.fromEntries(Object.keys(prev).map(k => [k, false]));
      if (!wasOpen) next[id] = true;
      saveSections(next);
      return next;
    });
  }, []);

  // Auto-open the section containing the current route
  const prevPathRef = useRef(null);
  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    setSections(prev => {
      for (const [sectionId, prefixes] of Object.entries(SECTION_ROUTE_MAP)) {
        if (prefixes.some(p => pathname.startsWith(p))) {
          if (prev[sectionId]) return prev;
          const next = Object.fromEntries(Object.keys(prev).map(k => [k, false]));
          next[sectionId] = true;
          saveSections(next);
          return next;
        }
      }
      return prev;
    });
  }, [pathname]);

  const handleLogout = () => {
    ['isLoggedIn','access_token','user','permissions'].forEach(k => localStorage.removeItem(k));
    navigate('/');
  };

  const pi = (label, href, icon) => (
    <PinnableItem label={label} href={href} icon={icon} pins={pins} onTogglePin={togglePin} />
  );

  return (
    <CloseCtx.Provider value={onClose || (() => {})}>
      <div
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

        {/* ── User row ── */}
        <div style={{
          padding: '10px 12px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 99, flexShrink: 0,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.username || 'User'}
            </div>
            <div style={{ fontSize: 10, color: NAV_MUTED }}>{user.role || 'Staff'}</div>
          </div>
          {isMobileDrawer && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.09)', border: 'none', borderRadius: 6,
              padding: '4px 8px', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1, flexShrink: 0,
            }}>✕</button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, paddingTop: 4, paddingBottom: 4 }}>

          <NavItem label="Dashboard" href="/dashboard"  icon="home" />
          {canSeeOrders && <NavItem label="Daily Ops" href="/daily-ops" icon="bolt" />}

          <QuickAccessSection pins={pins} onTogglePin={togglePin} />

          {(canSeeCrm || canSeeCustomers) && (
            <SectionGroup id="crm" label="CRM" icon="users" sections={sections} onToggle={toggleSection}>
              {canSeeCrm && pi('Today Tasks',    '/crm/queue',               'flame')}
              {canSeeCrm && pi('Leads',          '/crm/leads',               'users')}
              {canSeeCrm && pi('All Leads',      '/crm/all-leads',           'book')}
              {canSeeCrm && pi('Follow-ups',     '/crm/followups',           'bookmark')}
              {canSeeCustomers && pi('Customers','/customers',               'building')}
              {canSeeCrm && canSeeWhatsApp && pi('CRM WhatsApp', '/whatsapp','message')}
              {canSeeCrm && pi('Automation',     '/crm/automation-settings', 'gear')}
            </SectionGroup>
          )}

          {(canSeeQuotations || canSeeOrders || canSeeAccounts || canSeeCustomers) && (
            <SectionGroup id="sales" label="Sales" icon="dollar" sections={sections} onToggle={toggleSection}>
              {canSeeQuotations && pi('Quotations',        '/quotations',                'doc')}
              {canSeeOrders     && pi('Orders',            '/orders',                    'pkg')}
              {canSeeOrders     && pi('Order Approval',    '/pending-approval',          'clock')}
              {canSeeAccounts   && pi('Invoices',          '/invoices',                  'doc')}
              {canSeeAccounts   && pi('Outstanding',       '/accounts/outstanding',      'card')}
              {canSeeAccounts   && pi('Finance Dashboard', '/finance',                   'chart')}
              {canSeeAccounts   && pi('Customer Payments', '/finance/customer-payments', 'dollar')}
              {canSeeAccounts   && pi('Vendor Payments',   '/finance/vendor-payments',   'dollar')}
              {canSeeCustomers  && pi('Credit Limits',     '/set-credit-limit',          'shield')}
            </SectionGroup>
          )}

          {(canSeeProduction || canSeeItems) && (
            <SectionGroup id="production" label="Production" icon="wrench" sections={sections} onToggle={toggleSection}>
              {canSeeProduction && pi('Work Orders',           '/production/execution',    'wrench')}
              {canSeeProduction && pi('Departments',           '/departments',             'grid')}
              {canSeeProduction && pi('Mfg Analytics',         '/manufacturing/analytics', 'trend')}
              {canSeeItems      && pi('Inventory',             '/inventory',               'box')}
              {canSeeItems      && pi('Purchase Requirements', '/purchase-requirements',   'cart')}
              {canSeeItems      && pi('Purchase Orders',       '/purchase-orders',         'clipboard')}
              {canSeeItems      && pi('Vendors',               '/vendors',                 'truck')}
            </SectionGroup>
          )}

          {canSeeDispatch && (
            <SectionGroup id="dispatch" label="Dispatch" icon="truck" sections={sections} onToggle={toggleSection}>
              {pi('Ready for Dispatch', '/dispatch',      'pkg')}
              {pi('Dispatch List',      '/dispatch/list', 'list')}
            </SectionGroup>
          )}

          {(canSeeMarketing || canSeeCustomers) && (
            <SectionGroup id="database" label="Database" icon="box" sections={sections} onToggle={toggleSection}>
              {canSeeMarketing && pi('Promotional Contacts',  '/database/promotional',   'users')}
              {canSeeMarketing && pi('Visiting Card Reader', '/database/visiting-card', 'card')}
            </SectionGroup>
          )}

          {canSeeMarketing && (
            <SectionGroup id="whatsapp" label="WhatsApp Engine" icon="message" sections={sections} onToggle={toggleSection}>
              {pi('Dashboard',        '/marketing/whatsapp',              'rocket')}
              {pi('Inbox',            '/marketing/whatsapp/inbox',        'inbox')}
              {pi('AI Campaigns',     '/marketing/whatsapp/ai-campaigns', 'sparkles')}
              {pi('Manual Campaigns', '/marketing/whatsapp/campaigns',    'megaphone')}
              {canSeeWhatsApp && pi('Connections', '/marketing/whatsapp/connections', 'phone')}
              {pi('Analytics',        '/marketing/whatsapp/analytics',    'chart')}
            </SectionGroup>
          )}

          {canSeeMarketing && (
            <SectionGroup id="email" label="Email Engine" icon="mail" sections={sections} onToggle={toggleSection}>
              <div style={{ padding: '8px 12px 6px', fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                Coming soon
              </div>
            </SectionGroup>
          )}

          {canSeeCustomers && (
            <SectionGroup id="service" label="Service" icon="ticket" sections={sections} onToggle={toggleSection}>
              {pi('Service Dashboard', '/service/dashboard',   'clipboard')}
              {pi('Tickets',           '/service/tickets',     'ticket')}
              {pi('AMC Contracts',     '/service/amc',         'calendar')}
              {canSeeStaff && pi('Technicians', '/service/technicians', 'user')}
            </SectionGroup>
          )}

          {canViewWorkforce && (
            <SectionGroup id="workforce" label="Workforce" icon="id" sections={sections} onToggle={toggleSection}>
              {pi('HR Dashboard',   '/workforce/hr',        'users')}
              {pi('Profiles',       '/workforce/profiles',  'id')}
              {pi('Shifts',         '/workforce/shifts',    'sun')}
              {pi('Attendance',     '/workforce/attendance','clock')}
              {pi('Leave Requests', '/workforce/leaves',    'calendar')}
              {pi('Commission',     '/commission',          'dollar')}
            </SectionGroup>
          )}

          {(canSeeCrm || canSeeAccounts || canSeeProduction || canSeeStaff) && (
            <SectionGroup id="analytics" label="Analytics" icon="chart" sections={sections} onToggle={toggleSection}>
              {canSeeCrm   && pi('CRM Analytics', '/crm/analytics', 'chart')}
              {canSeeStaff && pi('KPI Dashboard', '/kpi',           'trend')}
              {canSeeStaff && pi('SLA Dashboard', '/sla',           'clock')}
              {canSeeStaff && pi('Activity Center','/activity',     'activity')}
            </SectionGroup>
          )}

          {canSeeItems && (
            <SectionGroup id="items" label="Catalog" icon="box" sections={sections} onToggle={toggleSection}>
              {pi('Service Item Master', '/items',    'list')}
              {pi('Add Item',    '/add-item', 'plus')}
              <ShopifyNavItem pins={pins} onTogglePin={togglePin} />
            </SectionGroup>
          )}

          {canSeeStaff && (
            <SectionGroup id="settings" label="Settings" icon="gear" sections={sections} onToggle={toggleSection}>
              {pi('Staff',               '/staff',                     'user')}
              {pi('Roles & Permissions', '/rbac',                      'lock')}
              {canSeeWhatsApp && pi('WA Monitor', '/admin/whatsapp',   'monitor')}
              {pi('Ops Log',             '/pilot/log',                 'doc')}
              {pi('System Health',        '/settings/system-health',    'monitor')}
              {pi('Perf Monitor',         '/settings/perf-monitor',     'monitor')}
            </SectionGroup>
          )}

        </nav>

        {/* ── My Workplace ── */}
        <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: NAV_MUTED, marginBottom: 4, letterSpacing: '0.04em', paddingLeft: 2 }}>MY WORKPLACE</div>
          <NavItem label="Attendance"     href="/workforce/attendance" icon="clock"    />
          <NavItem label="Leave Requests" href="/workforce/leaves"     icon="calendar" />
        </div>

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
          <div style={{ marginTop: 6, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            CRM {deployedVersion ?? '—'}
          </div>
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
