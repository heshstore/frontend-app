import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { getUserCapabilities } from './config/roleCapabilities';
import KpiCard from './components/dashboard/KpiCard';
import KpiGrid from './components/dashboard/KpiGrid';
import { isNumberConnected } from './pages/marketing/utils/whatsappStatus';

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg:     '#f4f6f9',
  card:   '#ffffff',
  border: '#e9ecef',
  text:   '#111827',
  muted:  '#6b7280',
  faint:  '#9ca3af',
  blue:   '#2563eb',
  green:  '#16a34a',
  orange: '#ea580c',
  red:    '#dc2626',
  purple: '#7c3aed',
  yellow: '#d97706',
  gold:   '#f59e0b',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

function fmtCurrency(val) {
  if (val == null) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function fmtDue(iso) {
  if (!iso) return 'Overdue';
  const d    = new Date(iso);
  const days = Math.round((Date.now() - d) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d overdue`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20, r = 8, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #e9ecef 25%, #f3f4f6 50%, #e9ecef 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: C.muted,
      textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function ProgressBar({ pct, color, h = 7 }) {
  return (
    <div style={{ height: h, background: '#e9ecef', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', width: `${Math.min(pct, 100)}%`,
        background: color, borderRadius: 99, transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

// ── Compact attention chip (Group 1) ─────────────────────────────────────────

function AttentionChip({ icon, label, value, color, onClick, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 12,
        background: hov ? color + '22' : color + '12',
        border: `1.5px solid ${color}44`,
        borderRadius: 12, padding: '12px 16px',
        cursor: 'pointer', transition: 'background 0.15s',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        {loading
          ? <Skeleton h={22} r={6} w="60px" />
          : <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        }
        <div style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickBtn({ icon, label, color, bg, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '14px 10px', borderRadius: 12, border: 'none',
        background: hov ? color : bg,
        color: hov ? '#fff' : color,
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        boxShadow: hov ? `0 4px 12px ${color}44` : 'none',
        minHeight: 72,
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Stage card ────────────────────────────────────────────────────────────────

function StageCard({ label, count, backlog, pct, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <Card
      onClick={onClick}
      style={{
        padding: '12px 14px', cursor: 'pointer',
        borderTop: `3px solid ${color}`,
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: hov ? `0 6px 14px ${color}28` : '0 1px 4px rgba(0,0,0,0.07)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color }}>
          {label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{count ?? '—'}</span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
        {backlog > 0
          ? <span style={{ color: C.orange, fontWeight: 700 }}>⚠ {backlog}d backlog</span>
          : <span style={{ color: C.green, fontWeight: 600 }}>● On track</span>
        }
      </div>
      <ProgressBar pct={pct} color={color} />
    </Card>
  );
}

// ── Delayed job row ───────────────────────────────────────────────────────────

function DelayedRow({ job, onView }) {
  const [hov, setHov] = useState(false);

  const dueLabel = fmtDue(job.due_date);
  const days     = job.due_date ? Math.round((Date.now() - new Date(job.due_date)) / 86_400_000) : 99;
  const critical = days >= 2;

  const STAGE_COLOR = {
    DESIGNING: C.blue, PRINTING: C.orange, LASER: C.red, ASSEMBLY: C.purple,
  };
  const stageColor = STAGE_COLOR[job.current_stage] ?? C.muted;

  return (
    <div
      onClick={() => onView(job)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: 9, marginBottom: 5,
        background: hov
          ? (critical ? '#ffe4e4' : '#fff3e0')
          : (critical ? '#fff5f5' : '#fffbf0'),
        border: `1px solid ${critical ? '#fecaca' : '#fed7aa'}`,
        cursor: 'pointer', transition: 'background 0.12s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {job.item_name || job.sku || `Job #${job.id}`}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.faint }}>
            {job.order_id ? `ORD-${job.order_id}` : `#${job.id}`}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: stageColor,
            background: stageColor + '18', padding: '1px 6px', borderRadius: 99,
          }}>
            {job.current_stage}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, color: '#fff',
          background: critical ? C.red : C.orange,
          padding: '2px 7px', borderRadius: 99,
        }}>
          DELAYED
        </span>
        <span style={{ fontSize: 11, color: critical ? C.red : C.orange, fontWeight: 600 }}>
          {dueLabel}
        </span>
      </div>
    </div>
  );
}

// ── Attendance widget (Admin/COO only) ────────────────────────────────────────

function AttendanceWidget({ data, isMobile }) {
  const cells = [
    { label: 'Present',        value: data.present        ?? '—', color: C.green  },
    { label: 'Absent',         value: data.absent         ?? '—', color: C.red    },
    { label: 'Pending Leaves', value: data.pending_leaves ?? '—', color: C.yellow },
    { label: 'Overtime',       value: data.overtime       ?? '—', color: C.blue   },
  ];
  return (
    <>
      <SectionLabel>👥 Today's Attendance</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {cells.map(c => (
          <div key={c.label} style={{
            background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: '12px 14px', borderTop: `3px solid ${c.color}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Top seller items (Admin/COO only) ─────────────────────────────────────────

function TopSellerItems({ items, isMobile }) {
  return (
    <>
      <SectionLabel>🏆 Top Sellers (by qty)</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {items.map((item, idx) => (
          <Card key={item.sku} style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.faint }}>#{idx + 1}</span>
              {item.image
                ? <img src={item.image} alt="" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6 }} />
                : <div style={{ width: 38, height: 38, borderRadius: 6, background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
              }
            </div>
            <div style={{ fontSize: 10, color: C.faint, fontFamily: 'monospace', marginBottom: 2 }}>{item.sku}</div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 6,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.item_name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: C.blue,  fontWeight: 700 }}>{item.total_qty} qty</span>
              <span style={{ color: C.green, fontWeight: 700 }}>{fmtCurrency(item.total_value)}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// ── Status panel (compact chips, top-right of dashboard) ─────────────────────

function StatusDot({ status, pulse }) {
  const colors = { ok: '#16a34a', warning: '#d97706', error: '#dc2626', unknown: '#9ca3af' };
  const c = colors[status] || colors.unknown;
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: c, display: 'inline-block', flexShrink: 0,
      boxShadow: pulse && status === 'ok' ? `0 0 0 2px ${c}44` : 'none',
      animation: pulse && status === 'ok' ? 'pulseDot 2s infinite' : 'none',
    }} />
  );
}

function StatusChip({ label, status, detail, onClick }) {
  const bgMap = { ok: '#f0fdf4', warning: '#fffbeb', error: '#fff1f2', unknown: '#f9fafb' };
  const bdMap = { ok: '#bbf7d0', warning: '#fde68a', error: '#fecaca', unknown: '#e5e7eb' };
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: bgMap[status] || bgMap.unknown,
        border: `1px solid ${bdMap[status] || bdMap.unknown}`,
        borderRadius: 6, padding: '4px 9px',
        fontSize: 11, fontWeight: 600, color: '#374151',
        whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <StatusDot status={status} pulse={status === 'ok'} />
      <span>{label}</span>
      {detail && <span style={{ color: '#9ca3af', fontWeight: 400 }}>{detail}</span>}
    </div>
  );
}

function StatusPanel({ kpis, waNumbers, navigate }) {
  const crmWaStatus = !kpis ? 'unknown'
    : (kpis.whatsapp_status === 'AUTHENTICATED' || kpis.whatsapp_status === 'CONNECTED') ? 'ok'
    : kpis.whatsapp_status === 'NO_SESSION' ? 'warning'
    : 'error';

  const activeNums    = waNumbers.filter(n => n.is_active);
  const connectedNums = activeNums.filter(n => isNumberConnected(n));
  const engStatus = activeNums.length === 0 ? 'unknown'
    : connectedNums.length === activeNums.length ? 'ok'
    : connectedNums.length > 0 ? 'warning'
    : 'error';

  // Sync runs daily at 2:30 AM IST; ok = verified within 26h, warning = 26-72h, error = stale > 3d
  // shopify_configured=false means env vars are missing on the server — show distinct warning
  const shopifyNotConfigured = kpis && kpis.shopify_configured === false;
  const shopifyStatus = shopifyNotConfigured ? 'warning'
    : !kpis || kpis.shopify_sync_minutes == null ? 'unknown'
    : kpis.shopify_sync_minutes < 1560  ? 'ok'      // < 26 h
    : kpis.shopify_sync_minutes < 4320  ? 'warning'  // < 72 h
    : 'error';
  const shopifyDetail = shopifyNotConfigured ? 'not configured'
    : kpis?.shopify_sync_minutes != null
    ? (shopifyStatus === 'ok'
        ? (kpis.shopify_sync_minutes < 60
            ? `verified ${kpis.shopify_sync_minutes}m ago`
            : `verified ${Math.round(kpis.shopify_sync_minutes / 60)}h ago`)
        : (kpis.shopify_sync_minutes < 60
            ? `last verified ${kpis.shopify_sync_minutes}m ago`
            : `last verified ${Math.round(kpis.shopify_sync_minutes / 60)}h ago`))
    : null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <StatusChip label="CRM WA" status={crmWaStatus} onClick={() => navigate('/whatsapp')} />
      {activeNums.length > 0 && (
        <StatusChip
          label={`Connected ${connectedNums.length}/${activeNums.length}`}
          status={engStatus}
          onClick={() => navigate('/marketing/whatsapp-engine/numbers')}
        />
      )}
      <StatusChip label="Shopify" status={shopifyStatus} detail={shopifyDetail} onClick={() => navigate('/shopify-items')} />
      <StatusChip label="DB" status="ok" />
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const mountedRef = useRef(true);

  const caps = useMemo(() => getUserCapabilities(), []);

  // ── Per-widget loading states ──────────────────────────────────────────────
  const [loadingDelayed,  setLoadingDelayed]  = useState(caps.canViewDelayedJobs);
  const [loadingLeads,    setLoadingLeads]    = useState(caps.canViewHotLeads);
  const [loadingPayments, setLoadingPayments] = useState(caps.canViewPendingPayments);

  const [summary,       setSummary]       = useState(null);
  const [delayedJobs,   setDelayedJobs]   = useState([]);
  const [hotLeadsCount, setHotLeadsCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  const [kpis,        setKpis]        = useState(null);
  const [kpisLoading, setKpisLoading] = useState(caps.canViewDashboardSummary);

  const [waNumbers, setWaNumbers]   = useState([]);
  const [workforce, setWorkforce]   = useState(null);
  const [topItems,  setTopItems]    = useState([]);

  // ── Fetch — only APIs the current user is permitted to call ────────────────

  const fetchDashboard = useCallback(async () => {
    const t0 = Date.now();
    const ok = () => mountedRef.current;
    // Re-read capabilities fresh so the 60s refresh interval uses current perms
    const c = getUserCapabilities();

    if (c.canViewDelayedJobs)     setLoadingDelayed(true);
    if (c.canViewHotLeads)        setLoadingLeads(true);
    if (c.canViewPendingPayments) setLoadingPayments(true);

    const tasks = [];

    if (c.canViewDashboardSummary) {
      setKpisLoading(true);
      tasks.push(
        apiFetch('/analytics/kpis')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && ok()) setKpis(d); })
          .catch(() => {})
          .finally(() => { if (ok()) setKpisLoading(false); })
      );
      tasks.push(
        apiFetch('/dashboard/summary')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && ok()) setSummary(d); })
          .catch(() => {})
      );
    }

    if (c.canViewDelayedJobs) {
      tasks.push(
        apiFetch('/production/delayed?limit=5')
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d || !ok()) return;
            const arr = Array.isArray(d) ? d : (d.jobs ?? []);
            setDelayedJobs(arr.slice(0, 5));
          })
          .catch(() => {})
          .finally(() => { if (ok()) setLoadingDelayed(false); })
      );
    }

    if (c.canViewHotLeads) {
      tasks.push(
        apiFetch('/crm/leads?filter=hot&limit=1')
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d || !ok()) return;
            setHotLeadsCount(d.total ?? (Array.isArray(d) ? d.length : 0));
          })
          .catch(() => {})
          .finally(() => { if (ok()) setLoadingLeads(false); })
      );
    }

    if (c.canViewPendingPayments) {
      tasks.push(
        apiFetch('/accounts/pending-summary')
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d || !ok()) return;
            setPendingAmount(d.total_amount ?? d.amount ?? 0);
          })
          .catch(() => {})
          .finally(() => { if (ok()) setLoadingPayments(false); })
      );
    }

    // Marketing WA numbers — small fetch, no spinner needed
    apiFetch('/marketing/whatsapp-engine/numbers')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (ok()) setWaNumbers(Array.isArray(d) ? d : []); })
      .catch(() => {});

    // Admin/COO-only fetches — attendance + top sellers
    if (c.isAdminOrCoo) {
      tasks.push(
        apiFetch('/workforce-ops/dashboard')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && ok()) setWorkforce(d); })
          .catch(() => {})
      );
      tasks.push(
        apiFetch('/dashboard/top-items')
          .then(r => r.ok ? r.json() : [])
          .then(d => { if (ok()) setTopItems(Array.isArray(d) ? d : []); })
          .catch(() => {})
      );
    }

    await Promise.allSettled(tasks);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DASHBOARD] ${tasks.length} widget${tasks.length !== 1 ? 's' : ''} loaded in ${Date.now() - t0}ms`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    fetchDashboard();
    return () => { mountedRef.current = false; };
  }, [fetchDashboard]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const pendingAmtFmt = fmtCurrency(pendingAmount);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',Arial,sans-serif", background: C.bg, minHeight: '100%', paddingBottom: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>Dashboard</h2>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={fetchDashboard}
              style={{
                padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.card, color: C.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              ↻ Refresh
            </button>
          </div>
          {caps.isAdminOrCoo && <StatusPanel kpis={kpis} waNumbers={waNumbers} navigate={navigate} />}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP 1 — ATTENTION REQUIRED                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {(caps.canViewHotLeads || caps.canViewPendingPayments || caps.canViewOrders || caps.canViewDelayedJobs) && (
          <SectionLabel>⚠️ Attention Required</SectionLabel>
        )}

        {(caps.canViewHotLeads || caps.canViewPendingPayments || caps.canViewOrders) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {caps.canViewHotLeads && (
              <AttentionChip icon="🔥" label="Hot Leads" value={hotLeadsCount} color={C.orange} loading={loadingLeads} onClick={() => navigate('/crm/leads?filter=hot')} />
            )}
            {caps.canViewOrders && (kpis?.pending_approvals ?? 0) > 0 && (
              <AttentionChip icon="⏳" label="Pending Approvals" value={kpis.pending_approvals} color={C.red} onClick={() => navigate('/pending-approval')} />
            )}
            {caps.canViewPendingPayments && (
              <AttentionChip icon="💰" label="Outstanding" value={pendingAmtFmt} color={C.yellow} loading={loadingPayments} onClick={() => navigate('/accounts/outstanding')} />
            )}
          </div>
        )}

        {caps.canViewDelayedJobs && (
          <Card style={{ padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionLabel>⚠ Delayed Jobs</SectionLabel>
              <button
                onClick={() => navigate('/production/execution')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.blue, fontWeight: 700, padding: 0 }}
              >
                View All →
              </button>
            </div>
            {loadingDelayed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} h={52} r={9} />)}
              </div>
            ) : delayedJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: C.green, fontSize: 13, fontWeight: 600 }}>
                ✅ No delayed jobs right now
              </div>
            ) : (
              delayedJobs.map(j => (
                <DelayedRow key={j.id} job={j} onView={() => navigate('/production/execution')} />
              ))
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP 2 — DAILY OPERATIONS                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {caps.canViewDashboardSummary && (
          <>
            <SectionLabel>📋 Daily Operations</SectionLabel>
            <KpiGrid minCardWidth={148} gap={10} style={{ marginBottom: 20 }}>
              {caps.canViewQuotations && <KpiCard icon="📄" title="Quotations today"  value={kpis?.quotations_today ?? '—'}  color="#0891b2" path="/quotations"        loading={kpisLoading} />}
              {caps.canViewOrders     && <KpiCard icon="📋" title="Orders today"       value={kpis?.orders_today ?? '—'}       color="#2563eb" path="/orders"            loading={kpisLoading} />}
              {caps.canViewOrders     && <KpiCard icon="⏳" title="Pending approvals"  value={kpis?.pending_approvals ?? '—'}  color="#f59e0b" path="/pending-approval"  loading={kpisLoading} alert={(kpis?.pending_approvals ?? 0) > 0} />}
              {caps.canViewDispatch   && <KpiCard icon="🚚" title="Pending dispatch"   value={kpis?.pending_dispatch ?? '—'}   color="#7c3aed" path="/dispatch"          loading={kpisLoading} />}
              {caps.canViewAccounts   && <KpiCard icon="💵" title="Collections today"  value={kpis?.collections_today != null ? `₹${Number(kpis.collections_today).toLocaleString('en-IN')}` : '—'} color="#16a34a" path="/accounts/outstanding" loading={kpisLoading} />}
              {caps.canViewAccounts   && <KpiCard icon="🔴" title="Overdue payments"   value={kpis?.overdue_payments ?? '—'}   color="#dc2626" path="/accounts/outstanding" loading={kpisLoading} trendInverse alert={(kpis?.overdue_payments ?? 0) > 0} />}
              {caps.canViewProduction && <KpiCard icon="⚙️" title="Production pending" value={kpis?.production_pending ?? '—'} color="#ea580c" path="/production/execution" loading={kpisLoading} />}
              {caps.canViewCrm        && <KpiCard icon="🎯" title="Active leads"        value={kpis?.active_leads ?? '—'}       color="#6366f1" path="/crm/leads"         loading={kpisLoading} />}
            </KpiGrid>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP 3 — PERFORMANCE                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {(caps.isAdminOrCoo || caps.canViewProduction || caps.canViewAccounts) && (
          <SectionLabel>📊 Performance</SectionLabel>
        )}

        {caps.isAdminOrCoo && workforce && (
          <AttendanceWidget data={workforce} isMobile={isMobile} />
        )}

        {caps.canViewProduction && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <StageCard label="Designing" count={summary?.stage_designing} backlog={0} pct={60} color={C.blue}   onClick={() => navigate('/production/execution')} />
            <StageCard label="Printing"  count={summary?.stage_printing}  backlog={2} pct={45} color={C.orange} onClick={() => navigate('/production/execution')} />
            <StageCard label="Laser"     count={summary?.stage_laser}     backlog={1} pct={30} color={C.red}    onClick={() => navigate('/production/execution')} />
            <StageCard label="Assembly"  count={summary?.stage_assembly}  backlog={0} pct={75} color={C.purple} onClick={() => navigate('/production/execution')} />
          </div>
        )}

        {caps.canViewAccounts && summary?.finance_ops && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
              {[
                { k: 'tro', label: 'Receivables',      v: fmtCurrency(summary.finance_ops.total_receivables_outstanding), color: C.blue,   href: '/accounts/outstanding' },
                { k: 'orc', label: 'Overdue',           v: fmtCurrency(summary.finance_ops.overdue_receivables_amount),    color: C.red,    href: '/accounts/outstanding' },
                { k: 'exi', label: 'Expected in (30d)', v: fmtCurrency(summary.finance_ops.expected_incoming_30d),         color: C.green,  href: '/finance' },
                { k: 'ce',  label: 'Customer exposure', v: fmtCurrency(summary.finance_ops.customer_exposure),             color: C.orange, href: '/finance' },
              ].map(x => (
                <div key={x.k} onClick={() => navigate(x.href)} style={{
                  background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
                  padding: '12px 14px', cursor: 'pointer', borderTop: `3px solid ${x.color}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{x.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: x.color, marginTop: 4 }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20, textAlign: 'right' }}>
              <button type="button" onClick={() => navigate('/finance')} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12, color: C.muted }}>
                Finance dashboard →
              </button>
            </div>
          </>
        )}

        {caps.isAdminOrCoo && topItems.length > 0 && (
          <TopSellerItems items={topItems} isMobile={isMobile} />
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP 4 — QUICK TOOLS                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {(caps.canViewCrm || caps.canViewProduction || caps.canViewQuotations || caps.canViewOrders || caps.canViewItems) && (
          <>
            <SectionLabel>⚡ Quick Tools</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {caps.canViewCrm        && <QuickBtn icon="📞" label="Call HOT Leads"  color={C.red}    bg="#fff5f5" onClick={() => navigate('/crm/queue')}            />}
              {caps.canViewProduction  && <QuickBtn icon="✅" label="Complete Jobs"   color={C.green}  bg="#f0fdf4" onClick={() => navigate('/production/execution')} />}
              {caps.canViewQuotations  && <QuickBtn icon="📝" label="Send Quotation"  color={C.blue}   bg="#eff6ff" onClick={() => navigate('/quotation')}            />}
              {caps.canViewOrders      && <QuickBtn icon="📦" label="Add Order"       color={C.purple} bg="#f5f3ff" onClick={() => navigate('/order')}                />}
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes dash      { 0% { left: -40%; } 100% { left: 100%; } }
        @keyframes shimmer   { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulseDot  { 0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; } 50% { box-shadow: 0 0 0 4px currentColor; opacity: 0.6; } }
      `}</style>
    </div>
  );
}
