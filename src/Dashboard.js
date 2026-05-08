import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { toast } from './utils/toast';
import { useRightPanel } from './components/layout/RightPanel';
import JobDetail from './pages/JobDetail';
import { getUserCapabilities } from './config/roleCapabilities';

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

// ── Priority action card ──────────────────────────────────────────────────────

function PriorityCard({ icon, label, value, sub, btnLabel, bgFrom, bgTo, onClick, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{
      borderRadius: 16, padding: '20px 22px',
      background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`,
      boxShadow: `0 4px 16px ${bgFrom}55`,
      display: 'flex', flexDirection: 'column', gap: 8,
      flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', opacity: 0.9 }}>{label}</span>
      </div>
      {loading
        ? <Skeleton h={42} r={8} style={{ background: 'rgba(255,255,255,0.25)' }} />
        : <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>{value}</div>
      }
      {sub && <div style={{ fontSize: 12, color: '#fff', opacity: 0.8 }}>{sub}</div>}
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          marginTop: 6, padding: '10px 0', borderRadius: 10, border: 'none',
          background: hov ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)',
          color: '#fff', fontSize: 13, fontWeight: 800,
          cursor: 'pointer', transition: 'background 0.15s',
          minHeight: 44,
        }}
      >
        {btnLabel} →
      </button>
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

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, title, value, trend, trendUp, color, loading }) {
  return (
    <Card style={{ padding: '14px 16px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {icon}
        </div>
        {trend !== undefined && !loading && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: trendUp ? C.green : C.red,
            background: trendUp ? '#f0fdf4' : '#fff1f2',
            padding: '2px 7px', borderRadius: 99,
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      {loading
        ? <Skeleton h={26} r={6} w="70%" />
        : <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value}</div>
      }
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{title}</div>
    </Card>
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const rightPanel = useRightPanel();
  const openPanel  = rightPanel?.openPanel;
  const mountedRef = useRef(true);

  const caps = useMemo(() => getUserCapabilities(), []);

  // ── Per-widget loading states ──────────────────────────────────────────────
  const [loadingSummary,  setLoadingSummary]  = useState(caps.canViewDashboardSummary);
  const [loadingDelayed,  setLoadingDelayed]  = useState(caps.canViewDelayedJobs);
  const [loadingLeads,    setLoadingLeads]    = useState(caps.canViewHotLeads);
  const [loadingPayments, setLoadingPayments] = useState(caps.canViewPendingPayments);

  const [summary,       setSummary]       = useState(null);
  const [delayedJobs,   setDelayedJobs]   = useState([]);
  const [hotLeadsCount, setHotLeadsCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  const [syncing,   setSyncing]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [syncPhase, setSyncPhase] = useState('idle');

  // ── Fetch — only APIs the current user is permitted to call ────────────────

  const fetchDashboard = useCallback(async () => {
    const t0 = Date.now();
    const ok = () => mountedRef.current;
    // Re-read capabilities fresh so the 60s refresh interval uses current perms
    const c = getUserCapabilities();

    if (c.canViewDashboardSummary) setLoadingSummary(true);
    if (c.canViewDelayedJobs)      setLoadingDelayed(true);
    if (c.canViewHotLeads)         setLoadingLeads(true);
    if (c.canViewPendingPayments)  setLoadingPayments(true);

    const tasks = [];

    if (c.canViewDashboardSummary) {
      tasks.push(
        apiFetch('/dashboard/summary')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && ok()) setSummary(d); })
          .catch(() => {})
          .finally(() => { if (ok()) setLoadingSummary(false); })
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

  // ── Shopify sync ───────────────────────────────────────────────────────────

  const handleSync = () => {
    setSyncing(true); setProgress(0); setSyncPhase('fetching');
    apiFetch('/shopify/sync').catch(() => {});
    const iv = setInterval(async () => {
      try {
        const res = await apiFetch('/shopify/sync-status');
        const st  = await res.json();
        setSyncPhase(st.phase || (st.status === 'done' ? 'done' : 'fetching'));
        if (st.total > 0) setProgress(Math.min(Math.round((st.processed / st.total) * 100), 99));
        if (st.status === 'done') {
          clearInterval(iv); setProgress(100); setSyncPhase('done');
          const parts = [];
          if (st.inserted > 0) parts.push(`${st.inserted} new`);
          if (st.updated  > 0) parts.push(`${st.updated} updated`);
          if (st.skipped  > 0) parts.push(`${st.skipped} skipped`);
          if (st.errors   > 0) parts.push(`${st.errors} errors`);
          const summary = parts.length > 0 ? parts.join(' · ') : '0 items synced';
          if (st.errors > 0) {
            toast.warn(`Sync done: ${summary}`);
          } else {
            toast.success(`Sync done: ${summary}`);
          }
          setSyncing(false); setSyncPhase('idle');
        }
      } catch {}
    }, 2000);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDelayedJobClick = (job) => {
    if (openPanel) {
      openPanel(`Job #${job.id}`, <JobDetail jobId={job.id} />);
    } else {
      navigate('/production/queue');
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalOrders   = summary?.total_orders ?? '—';
  const todaySales    = fmtCurrency(summary?.today_sales);
  const pendingAmtFmt = fmtCurrency(pendingAmount || summary?.pending_amount);
  const delayedCount  = summary?.delayed_jobs ?? delayedJobs.length;

  // ── Role-aware widget configs ──────────────────────────────────────────────

  const priorityCards = [
    caps.canViewDelayedJobs && {
      key: 'delayed',
      icon: '⚠️', label: 'Delayed Jobs',
      value: delayedCount, sub: 'Jobs stuck in production',
      btnLabel: 'View Jobs',
      bgFrom: '#dc2626', bgTo: '#ef4444',
      loading: loadingSummary || loadingDelayed,
      onClick: () => navigate('/production/queue'),
    },
    caps.canViewHotLeads && {
      key: 'leads',
      icon: '🔥', label: 'HOT Leads',
      value: hotLeadsCount, sub: 'Leads need follow-up today',
      btnLabel: 'View Leads',
      bgFrom: '#ea580c', bgTo: '#f97316',
      loading: loadingLeads,
      onClick: () => navigate('/crm/leads?filter=hot'),
    },
    caps.canViewPendingPayments && {
      key: 'payments',
      icon: '💰', label: 'Pending Payments',
      value: pendingAmtFmt, sub: 'Outstanding from customers',
      btnLabel: 'View Accounts',
      bgFrom: '#d97706', bgTo: '#f59e0b',
      loading: loadingPayments,
      onClick: () => navigate('/accounts/outstanding'),
    },
  ].filter(Boolean);

  const quickActions = [
    caps.canViewCrm        && { key: 'leads', icon: '📞', label: 'Call HOT Leads',  color: C.red,    bg: '#fff5f5', href: '/crm/queue'       },
    caps.canViewProduction  && { key: 'jobs',  icon: '✅', label: 'Complete Jobs',   color: C.green,  bg: '#f0fdf4', href: '/production/queue' },
    caps.canViewQuotations  && { key: 'quot',  icon: '📝', label: 'Send Quotation',  color: C.blue,   bg: '#eff6ff', href: '/quotation'        },
    caps.canViewOrders      && { key: 'order', icon: '📦', label: 'Add Order',       color: C.purple, bg: '#f5f3ff', href: '/order'            },
  ].filter(Boolean);

  const summaryCards = [
    caps.canViewOrders          && { key: 'orders',  icon: '📦', title: 'Total Orders',    value: totalOrders,                      color: C.blue,   loading: loadingSummary  },
    caps.canViewPendingPayments && { key: 'pending', icon: '💰', title: 'Pending Amount',  value: pendingAmtFmt,                    color: C.red,    loading: loadingPayments },
    caps.canViewOrders          && { key: 'sales',   icon: '📈', title: "Today's Sales",   value: todaySales,                       color: C.green,  loading: loadingSummary  },
    caps.canViewProduction      && { key: 'prod',    icon: '⚙️', title: 'Production Jobs', value: summary?.production_jobs ?? '—', color: C.orange, loading: loadingSummary  },
  ].filter(Boolean);

  // ── Layout helpers ─────────────────────────────────────────────────────────

  const colSummary = isMobile ? '1fr 1fr' : `repeat(${Math.max(summaryCards.length, 1)}, 1fr)`;
  const colBt      = isMobile ? '1fr' : (caps.canViewDelayedJobs ? '1fr 280px' : '280px');

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',Arial,sans-serif", background: C.bg, minHeight: '100%', paddingBottom: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
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
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── Priority Actions — only visible cards for this role ── */}
        {priorityCards.length > 0 && (
          <>
            <SectionLabel>🔥 Priority Actions</SectionLabel>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              {priorityCards.map(card => (
                <PriorityCard key={card.key} {...card} />
              ))}
            </div>
          </>
        )}

        {/* ── Quick Actions — only actions this role can perform ── */}
        {quickActions.length > 0 && (
          <>
            <SectionLabel>⚡ Quick Actions</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : `repeat(${quickActions.length}, 1fr)`, gap: 10, marginBottom: 20 }}>
              {quickActions.map(a => (
                <QuickBtn key={a.key} icon={a.icon} label={a.label} color={a.color} bg={a.bg} onClick={() => navigate(a.href)} />
              ))}
            </div>
          </>
        )}

        {/* ── Overview — only cards for visible data ── */}
        {summaryCards.length > 0 && (
          <>
            <SectionLabel>📊 Overview</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: colSummary, gap: 10, marginBottom: 20 }}>
              {summaryCards.map(card => (
                <SummaryCard key={card.key} {...card} />
              ))}
            </div>
          </>
        )}

        {/* ── Production Stages — production role only ── */}
        {caps.canViewProduction && (
          <>
            <SectionLabel>⚙️ Production Stages</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              <StageCard label="Designing" count={summary?.stage_designing} backlog={0} pct={60} color={C.blue}   onClick={() => navigate('/production/queue')} />
              <StageCard label="Printing"  count={summary?.stage_printing}  backlog={2} pct={45} color={C.orange} onClick={() => navigate('/production/queue')} />
              <StageCard label="Laser"     count={summary?.stage_laser}     backlog={1} pct={30} color={C.red}    onClick={() => navigate('/production/queue')} />
              <StageCard label="Assembly"  count={summary?.stage_assembly}  backlog={0} pct={75} color={C.purple} onClick={() => navigate('/production/queue')} />
            </div>
          </>
        )}

        {/* ── Bottom row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: colBt, gap: 12, marginBottom: 20 }}>

          {/* Delayed jobs list — production role only */}
          {caps.canViewDelayedJobs && (
            <Card style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <SectionLabel>⚠ Needs Attention</SectionLabel>
                <button
                  onClick={() => navigate('/production/queue')}
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
                  <DelayedRow key={j.id} job={j} onView={handleDelayedJobClick} />
                ))
              )}
            </Card>
          )}

          {/* Top Performers — visible to all */}
          <Card style={{ padding: '16px 18px' }}>
            <SectionLabel>🏆 Top Performers</SectionLabel>
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.faint, fontSize: 12 }}>
              Coming soon
            </div>
            <button
              onClick={() => navigate('/staff')}
              style={{
                marginTop: 8, width: '100%', padding: '10px',
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                minHeight: 44,
              }}
            >
              View All Staff →
            </button>
          </Card>

        </div>

        {/* ── Shopify sync — item managers only ── */}
        {caps.canSyncShopify && (
          <Card style={{ padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>🛍 Shopify Items</div>
                <div style={{ fontSize: 12, color: C.muted }}>Sync product catalogue from Shopify</div>
              </div>
              <button
                onClick={syncing ? undefined : handleSync}
                disabled={syncing}
                style={{
                  padding: '10px 18px', borderRadius: 8, border: 'none',
                  background: syncing ? '#f3f4f6' : C.green,
                  color: syncing ? C.muted : '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: syncing ? 'default' : 'pointer',
                  minWidth: 120, minHeight: 44, transition: 'background 0.15s',
                }}
              >
                {syncing ? `⏳ ${progress}%` : '↻ Sync Now'}
              </button>
            </div>
            {syncing && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                  {syncPhase === 'fetching' ? (
                    <div style={{
                      position: 'absolute', height: '100%', width: '40%',
                      background: C.green, borderRadius: 99,
                      animation: 'dash 1.4s ease-in-out infinite',
                    }} />
                  ) : (
                    <div style={{ height: '100%', width: `${progress}%`, background: C.green, borderRadius: 99, transition: 'width 0.4s' }} />
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  {syncPhase === 'fetching' ? 'Fetching from Shopify…' : `Saving items… ${progress}%`}
                </div>
              </div>
            )}
          </Card>
        )}

      </div>

      <style>{`
        @keyframes dash     { 0% { left: -40%; } 100% { left: 100%; } }
        @keyframes shimmer  { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
