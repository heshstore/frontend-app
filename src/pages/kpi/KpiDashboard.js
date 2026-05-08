import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

// ── Palette ───────────────────────────────────────────────────────────────────

const COLOR = {
  blue:   '#2563eb',
  green:  '#16a34a',
  orange: '#ea580c',
  red:    '#dc2626',
  purple: '#7c3aed',
  gray:   '#6b7280',
  bg:     '#f4f6f9',
  card:   '#ffffff',
  border: '#e5e7eb',
};

const MODULE_COLOR = {
  SALES:      COLOR.blue,
  PRODUCTION: COLOR.orange,
  ACCOUNTS:   COLOR.green,
  DISPATCH:   COLOR.purple,
  SYSTEM:     COLOR.gray,
};

const MODULE_ICON = {
  SALES: '📈', PRODUCTION: '⚙️', ACCOUNTS: '💰', DISPATCH: '🚚', SYSTEM: '🖥️',
};

const LEADERBOARD_METRICS = [
  { key: 'leads_handled',        label: 'Leads Handled',       unit: '' },
  { key: 'followup_completion',  label: 'Follow-ups Done',     unit: '' },
  { key: 'response_time',        label: 'Fastest Response',    unit: 'min', ascending: true },
  { key: 'jobs_completed',       label: 'Jobs Completed',      unit: '' },
  { key: 'quotation_conversion', label: 'Quotation Conversion',unit: '%' },
];

const TREND_METRICS = {
  SALES:      [
    { key: 'leads_total',               label: 'Leads' },
    { key: 'quotation_conversion_rate', label: 'Conversion Rate' },
    { key: 'followup_completion_rate',  label: 'Follow-up Rate' },
  ],
  PRODUCTION: [
    { key: 'jobs_completed',   label: 'Jobs Completed' },
    { key: 'delayed_job_rate', label: 'Delay Rate' },
  ],
  ACCOUNTS:   [
    { key: 'total_revenue',     label: 'Revenue' },
    { key: 'total_outstanding', label: 'Outstanding' },
  ],
  DISPATCH:   [
    { key: 'ontime_rate',      label: 'On-time Rate' },
    { key: 'total_dispatches', label: 'Total Dispatches' },
  ],
  SYSTEM:     [
    { key: 'whatsapp_uptime_percent', label: 'WA Uptime' },
    { key: 'sla_breach_rate',         label: 'SLA Breach Rate' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value, unit) {
  if (value == null) return '—';
  if (unit === 'INR') return `₹${Number(value).toLocaleString('en-IN')}`;
  if (unit === '%')   return `${Number(value).toFixed(1)}%`;
  if (unit === 'min') return `${Math.round(value)}m`;
  if (unit === 'hours') return `${Number(value).toFixed(1)}h`;
  if (unit === 'days')  return `${Number(value).toFixed(1)}d`;
  return Number(value).toLocaleString('en-IN');
}

function pctBar(value, max = 100, color = COLOR.blue) {
  const w = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ── Mini SVG sparkline ────────────────────────────────────────────────────────

function Sparkline({ data, color = COLOR.blue, height = 40, width = 120 }) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height}><line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e5e7eb" strokeWidth={1} /></svg>;
  }
  const vals = data.map(d => Number(d.metric_value));
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;
  const pad   = 4;
  const pts   = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  const area = `M${pts.join(' L')} L${width - pad},${height - pad} L${pad},${height - pad} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${color.replace('#','')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, sub, color = COLOR.blue, trend }) {
  return (
    <div style={{
      background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 10,
      padding: '16px 20px', minWidth: 160, flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 12, color: COLOR.gray, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: -0.5 }}>{fmt(value, unit)}</div>
      {sub && <div style={{ fontSize: 11, color: COLOR.gray, marginTop: 2 }}>{sub}</div>}
      {trend && <div style={{ marginTop: 8 }}><Sparkline data={trend} color={color} /></div>}
    </div>
  );
}

function SectionHeader({ title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 24 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{title}</span>
    </div>
  );
}

function LeaderboardTable({ entries, metricLabel, unit, ascending }) {
  if (!entries?.length) return <div style={{ color: COLOR.gray, fontSize: 13, padding: '12px 0' }}>No data</div>;
  const max = Math.max(...entries.map(e => e.value), 1);
  return (
    <div>
      {entries.map((e, i) => (
        <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < entries.length - 1 ? `1px solid ${COLOR.border}` : 'none' }}>
          <div style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : '#9ca3af' }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{e.user_name}</div>
            <div style={{ marginTop: 3 }}>{pctBar(ascending ? max - e.value + 1 : e.value, max, ascending ? COLOR.green : COLOR.blue)}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.blue, minWidth: 48, textAlign: 'right' }}>
            {fmt(e.value, unit || '')}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ module, metricKey, metricLabel, days }) {
  const [data, setData] = useState(null);
  const color = MODULE_COLOR[module] || COLOR.blue;

  useEffect(() => {
    apiFetch(`/kpi/snapshots?module=${module}&metric=${metricKey}&days=${days}`)
      .then(r => setData(r))
      .catch(() => setData([]));
  }, [module, metricKey, days]);

  if (!data) return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.gray, fontSize: 12 }}>Loading…</div>;
  if (!data.length) return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR.gray, fontSize: 12 }}>No snapshot data yet</div>;

  const vals = data.map(d => Number(d.metric_value));
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLOR.gray }}>{metricLabel} — last {days}d</span>
        <span style={{ fontSize: 12, color }}>Latest: {fmt(vals[vals.length - 1], data[0]?.metric_unit)}</span>
      </div>
      <Sparkline data={data} color={color} height={60} width={380} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: COLOR.gray }}>min {fmt(min, data[0]?.metric_unit)}</span>
        <span style={{ fontSize: 10, color: COLOR.gray }}>max {fmt(max, data[0]?.metric_unit)}</span>
      </div>
    </div>
  );
}

// ── Module panels ─────────────────────────────────────────────────────────────

function SalesPanel({ data, days }) {
  const s = data?.sales;
  if (!s) return null;
  const trendMetrics = TREND_METRICS.SALES;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Leads"       value={s.leads_total}               color={COLOR.blue} />
        <StatCard label="Contacted"         value={s.leads_contacted}            color={COLOR.green} />
        <StatCard label="Quotations Sent"   value={s.quotations_sent}            color={COLOR.orange} />
        <StatCard label="Avg Response"      value={s.avg_response_minutes}       unit="min" color={s.avg_response_minutes > 30 ? COLOR.red : COLOR.green} />
        <StatCard label="Conversion Rate"   value={s.quotation_conversion_rate}  unit="%" color={COLOR.purple} />
        <StatCard label="Follow-up Rate"    value={s.followup_completion_rate}   unit="%" color={COLOR.blue} />
        <StatCard label="SLA Compliance"    value={s.sla_compliance_rate}        unit="%" color={s.sla_compliance_rate < 80 ? COLOR.red : COLOR.green} />
      </div>

      {s.by_user?.length > 0 && (
        <>
          <SectionHeader title="By Sales Rep" color={COLOR.blue} />
          <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px', marginBottom: 20 }}>
            {s.by_user.map(u => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${COLOR.border}` }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{u.user_name}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: COLOR.gray }}>Leads <b style={{ color: '#111' }}>{u.leads}</b></span>
                  <span style={{ fontSize: 12, color: COLOR.gray }}>FU <b style={{ color: '#111' }}>{u.followups}</b></span>
                  <span style={{ fontSize: 12, color: COLOR.gray }}>Quot <b style={{ color: '#111' }}>{u.quotations}</b></span>
                  <span style={{ fontSize: 12, color: COLOR.gray }}>Conv <b style={{ color: COLOR.green }}>{u.conversions}</b></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Trends" color={COLOR.blue} />
      <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
        {trendMetrics.map((m, i) => (
          <div key={m.key} style={{ borderBottom: i < trendMetrics.length - 1 ? `1px solid ${COLOR.border}` : 'none', padding: '4px 0' }}>
            <TrendChart module="SALES" metricKey={m.key} metricLabel={m.label} days={days} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionPanel({ data, days }) {
  const p = data?.production;
  if (!p) return null;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Jobs Completed"     value={p.jobs_completed}       color={COLOR.green} />
        <StatCard label="Active Jobs"        value={p.active_jobs}          color={COLOR.blue} />
        <StatCard label="Avg Completion"     value={p.avg_completion_hours} unit="hours" color={COLOR.orange} />
        <StatCard label="Delayed Job Rate"   value={p.delayed_job_rate}     unit="%" color={p.delayed_job_rate > 20 ? COLOR.red : COLOR.green} />
        <StatCard label="SLA Compliance"     value={p.sla_compliance_rate}  unit="%" color={p.sla_compliance_rate < 80 ? COLOR.red : COLOR.green} />
      </div>
      <SectionHeader title="Trends" color={COLOR.orange} />
      <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
        {TREND_METRICS.PRODUCTION.map((m, i, arr) => (
          <div key={m.key} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : 'none', padding: '4px 0' }}>
            <TrendChart module="PRODUCTION" metricKey={m.key} metricLabel={m.label} days={days} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountsPanel({ data, days }) {
  const a = data?.accounts;
  if (!a) return null;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Revenue"           value={a.total_revenue}       unit="INR" color={COLOR.green} />
        <StatCard label="Outstanding"       value={a.total_outstanding}   unit="INR" color={a.total_outstanding > 0 ? COLOR.orange : COLOR.green} />
        <StatCard label="Today's Collection" value={a.today_collection}   unit="INR" color={COLOR.blue} />
        <StatCard label="Avg Collection"    value={a.avg_collection_days} unit="days" color={COLOR.purple} />
        <StatCard label="Overdue Rate"      value={a.overdue_rate}        unit="%" color={a.overdue_rate > 20 ? COLOR.red : COLOR.green} />
      </div>
      <SectionHeader title="Trends" color={COLOR.green} />
      <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
        {TREND_METRICS.ACCOUNTS.map((m, i, arr) => (
          <div key={m.key} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : 'none', padding: '4px 0' }}>
            <TrendChart module="ACCOUNTS" metricKey={m.key} metricLabel={m.label} days={days} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DispatchPanel({ data, days }) {
  const d = data?.dispatch;
  if (!d) return null;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Dispatches" value={d.total_dispatches}   color={COLOR.purple} />
        <StatCard label="Delivered"        value={d.delivered}          color={COLOR.green} />
        <StatCard label="Avg Dispatch Time" value={d.avg_dispatch_hours} unit="hours" color={COLOR.orange} />
        <StatCard label="On-time Rate"     value={d.ontime_rate}        unit="%" color={d.ontime_rate < 80 ? COLOR.red : COLOR.green} />
      </div>
      <SectionHeader title="Trends" color={COLOR.purple} />
      <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
        {TREND_METRICS.DISPATCH.map((m, i, arr) => (
          <div key={m.key} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : 'none', padding: '4px 0' }}>
            <TrendChart module="DISPATCH" metricKey={m.key} metricLabel={m.label} days={days} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemPanel({ data, days }) {
  const s = data?.system;
  if (!s) return null;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="WhatsApp Uptime"   value={s.whatsapp_uptime_percent} unit="%" color={s.whatsapp_uptime_percent < 95 ? COLOR.red : COLOR.green} />
        <StatCard label="SLA Breach Rate"   value={s.sla_breach_rate}         unit="%" color={s.sla_breach_rate > 10 ? COLOR.red : COLOR.green} />
        <StatCard label="Admin Escalations" value={s.escalation_count}        color={s.escalation_count > 0 ? COLOR.orange : COLOR.gray} />
        <StatCard label="Automation Actions" value={s.automation_actions}     color={COLOR.blue} />
      </div>
      <SectionHeader title="Trends" color={COLOR.gray} />
      <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
        {TREND_METRICS.SYSTEM.map((m, i, arr) => (
          <div key={m.key} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${COLOR.border}` : 'none', padding: '4px 0' }}>
            <TrendChart module="SYSTEM" metricKey={m.key} metricLabel={m.label} days={days} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

const MODULES = ['SALES', 'PRODUCTION', 'ACCOUNTS', 'DISPATCH', 'SYSTEM'];

export default function KpiDashboard() {
  const [days, setDays]       = useState(30);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState('SALES');
  const [lbMetric, setLbMetric] = useState('leads_handled');
  const [leaderboard, setLb]    = useState(null);
  const lbRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary] = await Promise.all([
        apiFetch(`/kpi/summary?days=${days}`),
      ]);
      setData(summary);
    } catch (e) {
      setError(e?.message ?? 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const lb = await apiFetch(`/kpi/leaderboard?metric=${lbMetric}&days=${days}`);
      setLb(lb);
    } catch {
      setLb([]);
    }
  }, [lbMetric, days]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const lbMeta = LEADERBOARD_METRICS.find(m => m.key === lbMetric) || LEADERBOARD_METRICS[0];

  return (
    <PageLayout title="KPI Dashboard">
      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: '5px 14px', borderRadius: 6, border: `1px solid ${days === d ? COLOR.blue : COLOR.border}`,
            background: days === d ? COLOR.blue : '#fff', color: days === d ? '#fff' : '#374151',
            fontWeight: days === d ? 600 : 400, fontSize: 13, cursor: 'pointer',
          }}>
            {d}d
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: COLOR.gray }}>
          {data?.period?.label}
        </span>
        <button onClick={load} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${COLOR.border}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: COLOR.red, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: 60, color: COLOR.gray }}>Loading KPIs…</div>
      )}

      {data && (
        <>
          {/* Quick summary row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            <StatCard label="Total Leads"      value={data.sales?.leads_total}             color={COLOR.blue} />
            <StatCard label="Revenue"          value={data.accounts?.total_revenue}         unit="INR" color={COLOR.green} />
            <StatCard label="Jobs Completed"   value={data.production?.jobs_completed}      color={COLOR.orange} />
            <StatCard label="Dispatches"       value={data.dispatch?.total_dispatches}      color={COLOR.purple} />
            <StatCard label="WA Uptime"        value={data.system?.whatsapp_uptime_percent} unit="%" color={data.system?.whatsapp_uptime_percent < 95 ? COLOR.red : COLOR.green} />
          </div>

          {/* Module tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${COLOR.border}`, marginBottom: 20 }}>
            {MODULES.map(m => (
              <button key={m} onClick={() => setTab(m)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: tab === m ? 600 : 400,
                color: tab === m ? MODULE_COLOR[m] : COLOR.gray,
                background: 'none', border: 'none', borderBottom: tab === m ? `2px solid ${MODULE_COLOR[m]}` : '2px solid transparent',
                marginBottom: -2, cursor: 'pointer',
              }}>
                {MODULE_ICON[m]} {m}
              </button>
            ))}
          </div>

          {tab === 'SALES'      && <SalesPanel      data={data} days={days} />}
          {tab === 'PRODUCTION' && <ProductionPanel data={data} days={days} />}
          {tab === 'ACCOUNTS'   && <AccountsPanel   data={data} days={days} />}
          {tab === 'DISPATCH'   && <DispatchPanel   data={data} days={days} />}
          {tab === 'SYSTEM'     && <SystemPanel     data={data} days={days} />}

          {/* Leaderboard */}
          <div style={{ marginTop: 32 }} ref={lbRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <SectionHeader title="Leaderboard" color={COLOR.blue} />
              <select value={lbMetric} onChange={e => setLbMetric(e.target.value)} style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: `1px solid ${COLOR.border}`,
                fontSize: 12, background: '#fff',
              }}>
                {LEADERBOARD_METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div style={{ background: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '0 16px' }}>
              <LeaderboardTable
                entries={leaderboard}
                metricLabel={lbMeta.label}
                unit={lbMeta.unit}
                ascending={lbMeta.ascending}
              />
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
