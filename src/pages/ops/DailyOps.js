import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const fmt    = (n) => Number(n || 0).toLocaleString('en-IN');
const rupee  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// ── Priority alert badge ───────────────────────────────────────────────────────

const URGENCY_COLORS = {
  critical: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', dot: '#dc2626' },
  warning:  { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', dot: '#d97706' },
  info:     { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', dot: '#0284c7' },
  dispatch: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  purple:   { bg: '#f3e8ff', color: '#7c3aed', border: '#ddd6fe', dot: '#7c3aed' },
};

function AlertBadge({ count, label, urgency, to, navigate }) {
  const c = URGENCY_COLORS[urgency] || URGENCY_COLORS.info;
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20,
        background: c.bg, border: `1px solid ${c.border}`,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{fmt(count)}</span>
      <span style={{ fontSize: 12, color: c.color, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, icon, children, actionLabel, actionPath, navigate, highlight }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${highlight ? '#fca5a5' : '#e2e8f0'}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 16px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: highlight ? '#fff5f5' : '#fafbfc',
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
          {icon} {title}
        </div>
        {actionLabel && (
          <button
            onClick={() => navigate(actionPath)}
            style={{ background: 'none', border: 'none', fontSize: 12, color: '#0369a1', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {actionLabel} →
          </button>
        )}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ value, label, color = '#111827', bg = '#f8fafc', onClick, urgent }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: urgent ? '#fee2e2' : bg,
        border: `1px solid ${urgent ? '#fca5a5' : '#e2e8f0'}`,
        borderRadius: 8, padding: '10px 14px', textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 72,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: urgent ? '#991b1b' : color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: urgent ? '#991b1b' : '#6b7280', fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Campaign row ──────────────────────────────────────────────────────────────

const CAMP_STATUS_COLORS = {
  running:   { bg: '#dcfce7', color: '#166534' },
  paused:    { bg: '#fef9c3', color: '#854d0e' },
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
  completed: { bg: '#f0fdf4', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

function CampRow({ c, navigate }) {
  const sc = CAMP_STATUS_COLORS[c.status] || CAMP_STATUS_COLORS.draft;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
        {c.status}
      </span>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {c.campaign_name}
      </div>
      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
        {c.daily_target ? `${fmt(c.daily_target)}/day` : '—'}
      </span>
      {['running', 'paused'].includes(c.status) && (
        <button
          onClick={() => navigate(`/marketing/whatsapp-engine/queue?campaign=${c.id}`)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: '#eff6ff', color: '#1d4ed8', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Queue
        </button>
      )}
    </div>
  );
}

// ── WA Number row ─────────────────────────────────────────────────────────────

function WaNumRow({ n }) {
  const ok = n.status === 'CONNECTED';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ok ? '#16a34a' : '#dc2626' }} />
      <div style={{ flex: 1, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {n.name || n.phone}
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{n.daily_sent ?? 0}/{n.daily_limit ?? '—'}</span>
      {(n.risk_score ?? 0) > 60 && (
        <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
          Risk {n.risk_score}
        </span>
      )}
      {!ok && n.is_active && (
        <span style={{ fontSize: 11, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
          {n.status || 'OFFLINE'}
        </span>
      )}
    </div>
  );
}

// ── Mode tabs ─────────────────────────────────────────────────────────────────

function ModeTabs({ mode, setMode }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
      {[['MORNING', '🌅 Morning'], ['EVENING', '🌆 Evening']].map(([key, label]) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          style={{
            padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: mode === key ? '#fff' : 'transparent',
            color: mode === key ? '#111827' : '#6b7280',
            boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Review checklist ──────────────────────────────────────────────────────────

const MORNING_ITEMS = [
  { icon: '📞', text: 'Overdue follow-ups cleared',     link: '/crm/follow-ups' },
  { icon: '📣', text: 'Campaign readiness checked',     link: '/marketing/whatsapp-engine/campaigns' },
  { icon: '📱', text: 'WA numbers all connected',       link: '/marketing/whatsapp-engine/numbers' },
  { icon: '💰', text: 'Overdue collections reviewed',   link: '/finance' },
  { icon: '🚚', text: 'Dispatch queue cleared',         link: '/dispatch' },
  { icon: '🛡️', text: 'Governance check passed',       link: '/marketing/whatsapp-engine/governance' },
];

const EVENING_ITEMS = [
  { icon: '📣', text: 'Campaign results reviewed',      link: '/marketing/whatsapp-engine/analytics' },
  { icon: '💰', text: 'Today collections confirmed',    link: '/finance' },
  { icon: '🚚', text: 'Pending dispatches handled',     link: '/dispatch' },
  { icon: '📓', text: 'Incidents logged in Ops Log',    link: '/pilot/log' },
  { icon: '📞', text: "Tomorrow's follow-ups set",      link: '/crm/follow-ups' },
  { icon: '🛡️', text: 'WA engine stable',              link: '/marketing/whatsapp-engine/governance' },
];

function ReviewChecklist({ mode, navigate }) {
  const items = mode === 'MORNING' ? MORNING_ITEMS : EVENING_ITEMS;
  const heading = mode === 'MORNING' ? '🌅 Morning Review Checklist' : '🌆 Evening Review Checklist';
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>{heading}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 6 }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.link)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', textAlign: 'left',
              fontSize: 12, color: '#374151', fontWeight: 500,
            }}
          >
            <span>{item.icon}</span><span>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const AUTO_REFRESH_SECS = 300; // 5 minutes

export default function DailyOps() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => new Date().getHours() < 13 ? 'MORNING' : 'EVENING');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECS);
  const [data, setData] = useState({ dash: null, finance: null, warnings: [], crm: null, campaigns: [], numbers: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const [dash, fin, warn, crm, camps, nums] = await Promise.allSettled([
      apiFetch('/dashboard/summary').then(r => r.ok ? r.json() : null),
      apiFetch('/finance-ops/dashboard').then(r => r.ok ? r.json() : null),
      apiFetch('/finance-ops/warnings').then(r => r.ok ? r.json() : []),
      apiFetch('/crm/analytics/overview').then(r => r.ok ? r.json() : null),
      apiFetch('/marketing/whatsapp-engine/campaigns').then(r => r.ok ? r.json() : []),
      apiFetch('/marketing/whatsapp-engine/numbers').then(r => r.ok ? r.json() : []),
    ]);
    const campVal = camps.status === 'fulfilled' ? camps.value : [];
    setData({
      dash:      dash.status  === 'fulfilled' ? dash.value  : null,
      finance:   fin.status   === 'fulfilled' ? fin.value   : null,
      warnings:  warn.status  === 'fulfilled' && Array.isArray(warn.value) ? warn.value : [],
      crm:       crm.status   === 'fulfilled' ? crm.value   : null,
      campaigns: Array.isArray(campVal) ? campVal : (campVal?.campaigns ?? []),
      numbers:   nums.status  === 'fulfilled' && Array.isArray(nums.value) ? nums.value : [],
    });
    setLastRefresh(new Date());
    setCountdown(AUTO_REFRESH_SECS);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(); return AUTO_REFRESH_SECS; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  // ── Derived values ────────────────────────────────────────────────────────

  const overdueFollowUps  = data.crm?.overdueFollowUps  ?? 0;
  const dueToday          = data.crm?.dueToday          ?? 0;
  const todayNew          = data.crm?.todayNew          ?? 0;
  const convertedToday    = data.crm?.convertedToday    ?? 0;

  const overdueRecCount   = data.finance?.overdue_receivables_count  ?? 0;
  const overdueRecAmt     = data.finance?.overdue_receivables_amount ?? 0;
  const totalOutstanding  = data.finance?.total_receivables_outstanding ?? 0;

  const readyDispatch     = data.dash?.orders?.ready_for_dispatch ?? 0;
  const dispatchedToday   = data.dash?.orders?.dispatched         ?? 0;
  const todayCollection   = data.dash?.today_collection           ?? 0;
  const jobsDoneToday     = data.dash?.jobs_completed_today       ?? 0;

  const runningCamps      = data.campaigns.filter(c => c.status === 'running');
  const pausedCamps       = data.campaigns.filter(c => c.status === 'paused');
  const completedCamps    = data.campaigns.filter(c => c.status === 'completed');
  const activeCamps       = data.campaigns.filter(c => ['running', 'paused'].includes(c.status));

  const waConnected       = data.numbers.filter(n => n.status === 'CONNECTED');
  const waIssues          = data.numbers.filter(n => n.is_active && n.status !== 'CONNECTED');

  // ── Priority strip ────────────────────────────────────────────────────────

  const alerts = [
    overdueFollowUps > 0 && { count: overdueFollowUps, label: 'overdue follow-ups', urgency: 'critical',  to: '/crm/follow-ups' },
    overdueRecCount  > 0 && { count: overdueRecCount,  label: 'overdue collections', urgency: 'warning',  to: '/finance' },
    pausedCamps.length > 0 && { count: pausedCamps.length, label: 'paused campaigns', urgency: 'info',    to: '/marketing/whatsapp-engine/campaigns' },
    readyDispatch    > 0 && { count: readyDispatch,    label: 'pending dispatch',    urgency: 'dispatch', to: '/dispatch' },
    waIssues.length  > 0 && { count: waIssues.length,  label: 'WA number issues',   urgency: 'purple',   to: '/marketing/whatsapp-engine/numbers' },
  ].filter(Boolean);

  return (
    <PageLayout
      title="Daily Operations"
      subtitle={lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <ModeTabs mode={mode} setMode={setMode} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            {loading ? '' : `↻ ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`}
          </span>
          <button
            onClick={() => { load(); }}
            disabled={loading}
            style={{
              padding: '7px 14px', borderRadius: 6, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#e5e7eb' : '#0d6efd',
              color: loading ? '#9ca3af' : '#fff',
              fontSize: 12, fontWeight: 600,
            }}
          >
            {loading ? 'Loading…' : '↻ Now'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Priority strip */}
        {!loading && alerts.length > 0 && (
          <div style={{
            background: '#fff', border: '1px solid #fca5a5',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', marginBottom: 8, letterSpacing: '0.06em' }}>
              ⚡ TODAY NEEDS ATTENTION
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {alerts.map((a, i) => <AlertBadge key={i} {...a} navigate={navigate} />)}
            </div>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            fontSize: 13, color: '#166534', fontWeight: 600,
          }}>
            ✓ All clear — no critical operational issues right now.
          </div>
        )}

        {/* Backend finance warnings */}
        {data.warnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {data.warnings.map((w, i) => (
              <div key={i} style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#854d0e' }}>
                ⚠ {w.message}
              </div>
            ))}
          </div>
        )}

        {/* Sections grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

          {/* CRM Health */}
          <Section
            title="CRM / Telecaller" icon="📞"
            actionLabel="Open CRM" actionPath="/crm"
            navigate={navigate}
            highlight={overdueFollowUps > 0}
          >
            {data.crm ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <StatTile value={fmt(todayNew)}         label="New today"        onClick={() => navigate('/crm?status=NEW')} />
                  <StatTile value={fmt(dueToday)}         label="Follow-ups today"  color="#0369a1" onClick={() => navigate('/crm/follow-ups')} />
                  <StatTile value={fmt(overdueFollowUps)} label="Overdue"          urgent={overdueFollowUps > 0} onClick={() => navigate('/crm/follow-ups')} />
                  <StatTile value={fmt(convertedToday)}   label="Converted today"  color="#166534" bg="#f0fdf4" />
                </div>
                {overdueFollowUps > 0 && (
                  <div style={{ fontSize: 12, color: '#991b1b', background: '#fee2e2', padding: '7px 10px', borderRadius: 6, fontWeight: 600 }}>
                    ⚠ {overdueFollowUps} overdue follow-up{overdueFollowUps !== 1 ? 's' : ''} — action needed now
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>CRM data unavailable</div>
            )}
          </Section>

          {/* Campaigns */}
          <Section
            title="Campaigns" icon="📣"
            actionLabel="Manage" actionPath="/marketing/whatsapp-engine/campaigns"
            navigate={navigate}
            highlight={pausedCamps.length > 0}
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatTile value={runningCamps.length}  label="Running"   color="#166534" bg="#dcfce7" />
              <StatTile value={pausedCamps.length}   label="Paused"    urgent={pausedCamps.length > 0} />
              <StatTile value={completedCamps.length} label="Completed" color="#6b7280" />
            </div>
            {activeCamps.length > 0
              ? activeCamps.slice(0, 4).map(c => <CampRow key={c.id} c={c} navigate={navigate} />)
              : <div style={{ fontSize: 12, color: '#9ca3af' }}>No active campaigns right now</div>
            }
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Governance', path: '/marketing/whatsapp-engine/governance' },
                { label: 'Queue',      path: '/marketing/whatsapp-engine/queue' },
                { label: 'Logs',       path: '/marketing/whatsapp-engine/logs' },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => navigate(path)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#f0f9ff', color: '#0369a1', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Collections */}
          <Section
            title="Collections" icon="💰"
            actionLabel="Finance" actionPath="/finance"
            navigate={navigate}
            highlight={overdueRecCount > 0}
          >
            {data.finance ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <StatTile value={fmt(overdueRecCount)}   label="Overdue"        urgent={overdueRecCount > 0} onClick={() => navigate('/finance')} />
                  <StatTile value={rupee(overdueRecAmt)}   label="Overdue amount" urgent={overdueRecAmt > 0} />
                  <StatTile value={rupee(todayCollection)} label="Collected today" color="#166534" bg="#f0fdf4" />
                </div>
                {overdueRecCount > 0 && (
                  <div style={{ fontSize: 12, color: '#991b1b', background: '#fee2e2', padding: '7px 10px', borderRadius: 6, fontWeight: 600, marginBottom: 8 }}>
                    ⚠ {overdueRecCount} overdue — {rupee(overdueRecAmt)} pending
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Total outstanding: <strong style={{ color: '#111827' }}>{rupee(totalOutstanding)}</strong>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Finance data unavailable</div>
            )}
          </Section>

          {/* Dispatch */}
          <Section
            title="Dispatch" icon="🚚"
            actionLabel="View orders" actionPath="/dispatch"
            navigate={navigate}
            highlight={readyDispatch > 0}
          >
            {data.dash ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <StatTile value={fmt(readyDispatch)}  label="Ready to dispatch" urgent={readyDispatch > 0} onClick={() => navigate('/dispatch')} />
                  <StatTile value={fmt(dispatchedToday)} label="Dispatched"       color="#166534" bg="#f0fdf4" />
                  <StatTile value={fmt(jobsDoneToday)}  label="Jobs done today"   color="#0369a1" />
                </div>
                {readyDispatch > 0 && (
                  <div style={{ fontSize: 12, color: '#166534', background: '#dcfce7', padding: '7px 10px', borderRadius: 6, fontWeight: 600 }}>
                    {readyDispatch} order{readyDispatch !== 1 ? 's' : ''} waiting to be dispatched
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>Dispatch data unavailable</div>
            )}
          </Section>

          {/* WA Numbers */}
          <Section
            title="WhatsApp Numbers" icon="📱"
            actionLabel="Manage" actionPath="/marketing/whatsapp-engine/numbers"
            navigate={navigate}
            highlight={waIssues.length > 0}
          >
            {data.numbers.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>No WA numbers configured</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <StatTile value={waConnected.length}  label="Connected"  color="#166534" bg="#f0fdf4" />
                  <StatTile value={waIssues.length}     label="Issues"     urgent={waIssues.length > 0} />
                  <StatTile value={data.numbers.length} label="Total"      color="#6b7280" />
                </div>
                {data.numbers.slice(0, 5).map(n => <WaNumRow key={n.id} n={n} />)}
              </>
            )}
          </Section>

          {/* Ops Log quick entry */}
          <Section title="Operations Log" icon="📓" actionLabel="Open" actionPath="/pilot/log" navigate={navigate}>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 12 }}>
              Log friction, incidents, or confusion as they happen during daily operations.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/pilot/log')}
                style={{ padding: '8px 14px', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                📓 Log Incident
              </button>
              <button
                onClick={() => navigate('/marketing/whatsapp-engine/governance')}
                style={{ padding: '8px 14px', borderRadius: 6, background: '#f3e8ff', color: '#7c3aed', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                🛡️ Governance
              </button>
            </div>
          </Section>

        </div>

        {/* Review checklist */}
        <ReviewChecklist mode={mode} navigate={navigate} />

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'right' }}>
          Data refreshes manually · Last: {lastRefresh?.toLocaleTimeString('en-IN') ?? '—'}
        </div>
      </div>
    </PageLayout>
  );
}
