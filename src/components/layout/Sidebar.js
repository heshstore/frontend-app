import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { usePermission, hasAnyPermission } from '../../utils/usePermission';
import { getUserCapabilities } from '../../config/roleCapabilities';

// ── Theme ─────────────────────────────────────────────────────────────────────

const NAV_BG     = '#0f172a';
const NAV_TEXT   = 'rgba(255,255,255,0.70)';   // muted — so active items visually pop
const NAV_MUTED  = 'rgba(255,255,255,0.32)';
const GRP_BG     = '#162340';                  // clearly distinct from NAV_BG
const GRP_DIV    = 'rgba(255,255,255,0.07)';   // divider line above each section header
const ACTIVE_BG  = 'rgba(96,165,250,0.20)';   // strong active highlight
const ACTIVE_CLR = '#ddeeff';                  // active item text — brighter than normal

const CloseCtx = createContext(() => {});

// ── Icon system ───────────────────────────────────────────────────────────────
// Feather/Lucide-style stroke paths. Single <path> per icon; subpaths via M.

const ICON_PATHS = {
  home:      'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  bolt:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  flame:     'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z',
  users:     'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  user:      'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  book:      'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z',
  bookmark:  'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
  building:  'M6 2h12a2 2 0 012 2v18H4V4a2 2 0 012-2zM8 8h2M14 8h2M8 12h2M14 12h2M10 22v-4h4v4',
  message:   'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  gear:      'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  doc:       'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4',
  pkg:       'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  clock:     'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  card:      'M1 4h22v16H1zM1 10h22',
  chart:     'M18 20V10M12 20V4M6 20v-6',
  dollar:    'M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6',
  shield:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  wrench:    'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  grid:      'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  trend:     'M22 7l-8.5 8.5-5-5L1 18M22 7h-6M22 7v6',
  box:       'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  cart:      'M9 22a1 1 0 100-2 1 1 0 000 2zM20 22a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-8.42H6',
  list:      'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  truck:     'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  rocket:    'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M15 19v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
  megaphone: 'M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14',
  inbox:     'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z',
  calendar:  'M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M1 10h22',
  phone:     'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  check:     'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  ticket:    'M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z',
  sun:       'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z',
  id:        'M2 5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM8 9a2 2 0 100-4 2 2 0 000 4zM12 7h4M12 11h4M5 14h6',
  activity:  'M22 12h-4l-3 9L9 3l-3 9H2',
  plus:      'M12 5v14M5 12h14',
  bag:       'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  lock:      'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  monitor:   'M2 3h20a1 1 0 011 1v13a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zM8 21h8M12 17v4',
  bell:      'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

function Ic({ name, size = 13 }) {
  const d = ICON_PATHS[name];
  if (!d) return <span style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }} />;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// ── LocalStorage helpers ──────────────────────────────────────────────────────

const PINS_KEY     = 'saachu_pins';
const SECTIONS_KEY = 'saachu_sections';

// All collapsed by default — expand only on click; auto-expands for active route
const DEFAULT_SECTIONS = {
  crm: false, sales: false, production: false, dispatch: false,
  marketing: false, service: false, workforce: false,
  analytics: false, items: false, settings: false,
};

const SECTION_ROUTE_MAP = {
  crm:        ['/crm/', '/customers', '/whatsapp'],
  sales:      ['/quotations', '/orders', '/pending-approval', '/accounts/', '/finance/', '/set-credit-limit', '/invoice/'],
  production: ['/production/', '/departments', '/inventory', '/purchase-', '/vendors', '/manufacturing/'],
  dispatch:   ['/dispatch'],
  marketing:  ['/marketing/'],
  service:    ['/service/'],
  workforce:  ['/workforce/', '/commission'],
  analytics:  ['/kpi', '/sla', '/activity'],
  items:      ['/items', '/add-item', '/edit-item', '/shopify-items'],
  settings:   ['/staff', '/rbac', '/admin/'],
};

function loadPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); } catch { return []; }
}
function savePins(pins) { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); }

function loadSections() {
  try { return { ...DEFAULT_SECTIONS, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_SECTIONS }; }
}
function saveSections(s) { localStorage.setItem(SECTIONS_KEY, JSON.stringify(s)); }

// ── Pipeline config ───────────────────────────────────────────────────────────

const PIPELINE = [
  { key: 'leads',      label: 'Leads',      icon: 'users',   href: '/crm/leads',           color: '#f97316', permKey: 'crm'             },
  { key: 'quotations', label: 'Quotations', icon: 'doc',     href: '/quotations',           color: '#3b82f6', permKey: 'quotation.view'  },
  { key: 'orders',     label: 'Orders',     icon: 'pkg',     href: '/orders',               color: '#6366f1', permKey: 'order.view'      },
  { key: 'production', label: 'Production', icon: 'wrench',  href: '/production/execution', color: '#dc2626', permKey: 'production.view' },
  { key: 'dispatch',   label: 'Dispatch',   icon: 'truck',   href: '/dispatch',             color: '#8b5cf6', permKey: 'dispatch.view'   },
  { key: 'payments',   label: 'Payments',   icon: 'dollar',  href: '/accounts/outstanding', color: '#d97706', permKey: 'accounts'        },
];

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function getPriority(key, count) {
  if ((key === 'production' || key === 'leads') && count > 0)    return 'HIGH';
  if ((key === 'payments'   || key === 'dispatch') && count > 0) return 'MEDIUM';
  return 'LOW';
}

function getMicroText(key, count, rawAmount) {
  if (!count && !rawAmount) return null;
  switch (key) {
    case 'leads':      return count ? `${count} hot lead${count !== 1 ? 's' : ''}` : null;
    case 'production': return count ? `${count} delayed job${count !== 1 ? 's' : ''}` : null;
    case 'payments': {
      if (!rawAmount) return null;
      const lakh = rawAmount / 100_000;
      return lakh >= 1 ? `₹${lakh.toFixed(1)}L pending` : `₹${Math.round(rawAmount / 1000)}k pending`;
    }
    case 'dispatch':   return count ? `${count} pending` : null;
    case 'orders':     return count ? `${count} active` : null;
    case 'quotations': return count ? `${count} open` : null;
    default: return null;
  }
}

// ── Pipeline item ─────────────────────────────────────────────────────────────

const BADGE_STYLE = {
  HIGH:   { background: '#ef4444', color: '#fff' },
  MEDIUM: { background: '#f59e0b', color: '#fff' },
  LOW:    { background: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.7)' },
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
        background: active ? ACTIVE_BG : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeft: `3px solid ${active ? item.color : isHigh ? '#ef4444' : isMedium ? '#f59e0b' : 'transparent'}`,
        borderTop: 'none', borderBottom: 'none', borderRight: 'none',
        boxShadow: isHigh && !active ? '2px 0 8px rgba(239,68,68,0.15)' : 'none',
        color: active ? ACTIVE_CLR : NAV_TEXT,
        fontSize: 13, fontWeight: active ? 700 : isHigh ? 600 : 400,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s',
        minHeight: microText ? 44 : 40,
        borderRadius: '0 7px 7px 0', marginBottom: 2,
        animation: isHigh && !active ? 'sidebarPulse 2.5s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ic name={item.icon} size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        {microText && (
          <span style={{
            display: 'block', fontSize: 10,
            color: isHigh ? 'rgba(252,165,165,0.9)' : isMedium ? 'rgba(253,211,77,0.85)' : NAV_MUTED,
            marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{microText}</span>
        )}
      </span>
      {showBadge && (
        <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, flexShrink: 0, ...BADGE_STYLE[priority] }}>
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  );
}

// ── SideLabel ─────────────────────────────────────────────────────────────────

function SideLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: NAV_MUTED,
      textTransform: 'uppercase', letterSpacing: 1.1,
      padding: '6px 12px 2px',
    }}>{children}</div>
  );
}

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
    const id = setInterval(load, 120_000);
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

  // Pipeline counts
  const [counts,     setCounts]     = useState({});
  const [rawAmounts, setRawAmounts] = useState({});
  const [sortedKeys, setSortedKeys] = useState(null);
  const initialLoadDone = useRef(false);
  const fetchInFlight   = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    const next    = {};
    const amounts = {};
    const safe    = async (key, fn) => { try { const v = await fn(); next[key] = v; } catch {} };
    const caps    = getUserCapabilities();

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
        const r = await apiFetch('/production/execution/jobs');
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

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      const withPriority = PIPELINE.map(item => ({
        key: item.key, priority: getPriority(item.key, next[item.key] ?? 0),
      }));
      withPriority.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      setSortedKeys(withPriority.map(x => x.key));
    }
    fetchInFlight.current = false;
  }, []);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, 60_000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  const visiblePipeline = (sortedKeys ?? PIPELINE.map(p => p.key))
    .map(key => PIPELINE.find(p => p.key === key))
    .filter(Boolean)
    .filter(p => permMap[p.permKey]);

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
          }}>S</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>Saachu</span>
          {isMobileDrawer && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.09)', border: 'none', borderRadius: 6,
              padding: '4px 8px', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1,
            }}>✕</button>
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
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.username || 'User'}
            </div>
            <div style={{ fontSize: 10, color: NAV_MUTED }}>{user.role || 'Staff'}</div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, paddingTop: 4, paddingBottom: 4 }}>

          <NavItem label="Dashboard" href="/dashboard"  icon="home" />
          {canSeeOrders && <NavItem label="Daily Ops" href="/daily-ops" icon="bolt" />}

          <QuickAccessSection pins={pins} onTogglePin={togglePin} />

          {visiblePipeline.length > 0 && (
            <>
              <SideLabel>Pipeline</SideLabel>
              {visiblePipeline.map(item => {
                const count    = counts[item.key] ?? null;
                const priority = getPriority(item.key, count ?? 0);
                const micro    = getMicroText(item.key, count, rawAmounts[item.key]);
                const active   = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <PipelineItem key={item.key} item={item} count={count} priority={priority} microText={micro} active={active} />
                );
              })}
            </>
          )}

          <div style={{ height: 4 }} />

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

          {canSeeMarketing && (
            <SectionGroup id="marketing" label="Marketing" icon="megaphone" sections={sections} onToggle={toggleSection}>
              {pi('Engine Dashboard', '/marketing/whatsapp-engine',                  'rocket')}
              {pi('Campaigns',        '/marketing/whatsapp-engine/campaigns',        'megaphone')}
              {pi('Audience',         '/marketing/whatsapp-engine/audience',         'users')}
              {pi('Templates',        '/marketing/whatsapp-engine/templates',        'doc')}
              {pi('Inbox',            '/marketing/whatsapp-engine/inbox',            'inbox')}
              {pi('Daily Report',     '/marketing/whatsapp-engine/daily-report',     'calendar')}
              {pi('Analytics',        '/marketing/whatsapp-engine/analytics',        'chart')}
              {canSeeWhatsApp && pi('Queue Monitor', '/marketing/whatsapp-engine/queue',      'list')}
              {canSeeWhatsApp && pi('Message Logs',  '/marketing/whatsapp-engine/logs',       'doc')}
              {canSeeWhatsApp && pi('Numbers',       '/marketing/whatsapp-engine/numbers',    'phone')}
              {canSeeWhatsApp && pi('Governance',    '/marketing/whatsapp-engine/governance', 'shield')}
              {canSeeWhatsApp && pi('Validate',      '/marketing/whatsapp-engine/validate',   'check')}
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
              {pi('Item Master', '/items',    'list')}
              {pi('Add Item',    '/add-item', 'plus')}
              <ShopifyNavItem pins={pins} onTogglePin={togglePin} />
            </SectionGroup>
          )}

          {canSeeStaff && (
            <SectionGroup id="settings" label="Settings" icon="gear" sections={sections} onToggle={toggleSection}>
              {pi('Staff',               '/staff',          'user')}
              {pi('Roles & Permissions', '/rbac',           'lock')}
              {canSeeWhatsApp && pi('WA Monitor', '/admin/whatsapp', 'monitor')}
              {pi('Ops Log',             '/pilot/log',      'doc')}
            </SectionGroup>
          )}

        </nav>

        {/* ── My Workplace ── */}
        <div style={{ padding: '8px 10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: NAV_MUTED, marginBottom: 4, letterSpacing: '0.04em', paddingLeft: 2 }}>MY WORKPLACE</div>
          <NavItem label="Attendance"     href="/workforce/attendance" icon="clock"    />
          <NavItem label="Leave Requests" href="/workforce/leaves"     icon="calendar" />
          <NavItem label="Notifications"  href="/notifications"        icon="bell"     />
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
