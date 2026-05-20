import React, { useEffect, useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

import { SOURCE_LABELS } from './crmSourceLabels';

function hasPermission(key) {
  try { return JSON.parse(localStorage.getItem('permissions') || '[]').includes(key); } catch { return false; }
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8,
      padding: '14px 18px', textAlign: 'center', flex: '1 1 120px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || theme.primary }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DailyChart({ data }) {
  if (!data || data.length < 2) return <p style={{ color: theme.textMuted, fontSize: 13 }}>Not enough data to chart.</p>;

  const W = 600, H = 160, PAD = { top: 12, right: 16, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const n = data.length;

  const xScale = (i) => PAD.left + (i / (n - 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  const totalPoints = data.map((d, i) => `${xScale(i)},${yScale(d.total)}`).join(' ');
  const convertedPoints = data.map((d, i) => `${xScale(i)},${yScale(d.converted)}`).join(' ');

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxVal / tickCount) * i));

  const labelStep = Math.max(1, Math.floor(n / 6));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', fontFamily: 'inherit' }}>
        {/* Y grid lines + labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={yScale(v)} y2={yScale(v)}
              stroke="#e5e7eb" strokeWidth={1}
            />
            <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill={theme.textMuted}>{v}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#d1d5db" strokeWidth={1} />

        {/* Total line */}
        <polyline points={totalPoints} fill="none" stroke={theme.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Converted line */}
        <polyline points={convertedPoints} fill="none" stroke="#198754" strokeWidth={1.5} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots + x labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.total)} r={3} fill={theme.primary} />
            {i % labelStep === 0 && (
              <text
                x={xScale(i)} y={H - 6}
                textAnchor="middle" fontSize={9} fill={theme.textMuted}
              >
                {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: theme.textMuted }}>
        <span><span style={{ display: 'inline-block', width: 16, height: 2, background: theme.primary, verticalAlign: 'middle', marginRight: 4 }} />Total leads</span>
        <span><span style={{ display: 'inline-block', width: 16, height: 2, background: '#198754', verticalAlign: 'middle', marginRight: 4, borderTop: '2px dashed #198754' }} />Converted</span>
      </div>
    </div>
  );
}

function FunnelBar({ label, count, pct, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: theme.text, fontWeight: 500 }}>{label}</span>
        <span style={{ color: theme.textMuted }}>{count} &nbsp;<strong style={{ color }}>{pct}%</strong></span>
      </div>
      <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function inr(n) {
  if (!n || n === 0) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

const SEVERITY_STYLE = {
  HIGH:   { bg: '#fff1f2', border: '#fca5a5', color: '#991b1b', dot: '#dc2626' },
  MEDIUM: { bg: '#fff7ed', border: '#fdba74', color: '#9a3412', dot: '#f97316' },
  LOW:    { bg: '#fefce8', border: '#fde68a', color: '#854d0e', dot: '#eab308' },
};

const WF_LABEL = {
  FIRST_CALL: 'First Call', NO_ANSWER_1: 'No Answer ×1', NO_ANSWER_2: 'No Answer ×2',
  NO_ANSWER_ESC: 'No Answer (Esc)', CALLBACK_WAIT: 'Callback Wait', FOLLOW_UP: 'Follow Up',
  SEND_QUOTATION: 'Send Quotation', CHASE_QUOTATION: 'Chase Quotation',
  NEGOTIATING: 'Negotiating', NURTURE: 'Nurture', CONVERTED: 'Converted', LOST: 'Lost',
  PIPELINE: 'Pipeline',
};

export default function CrmAnalytics() {
  const [overview, setOverview] = useState(null);
  const [sources, setSources] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [daily, setDaily] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [responseSpeed, setResponseSpeed] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [riskSignals, setRiskSignals] = useState(null);
  const [responseBuckets, setResponseBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyDays, setDailyDays] = useState(30);

  // ── Commercial intelligence state ────────────────────────────────────────────
  const [objections, setObjections] = useState([]);
  const [workflowFunnel, setWorkflowFunnel] = useState([]);
  const [quotationPerf, setQuotationPerf] = useState(null);
  const [productConv, setProductConv] = useState([]);
  const [pipelineLeaks, setPipelineLeaks] = useState([]);
  // ── Source health state ───────────────────────────────────────────────────────
  const [sourceHealth, setSourceHealth] = useState(null);
  // ── Today by source + webhook health ─────────────────────────────────────────
  const [todayBySource, setTodayBySource] = useState(null);
  const [webhookHealth, setWebhookHealth] = useState(null);
  // ── Google stack analytics ────────────────────────────────────────────────────
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [conversionFunnel, setConversionFunnel] = useState(null);

  const canTeam = hasPermission('crm.analytics.team');
  const canAll = hasPermission('crm.analytics.all');

  useEffect(() => {
    const fetches = [];
    if (canTeam) fetches.push(apiFetch('/crm/analytics/overview').then((r) => r.json()).then(setOverview).catch(() => {}));
    if (canAll) fetches.push(apiFetch('/crm/analytics/sources').then((r) => r.json()).then(setSources).catch(() => {}));
    if (canAll) fetches.push(apiFetch('/crm/analytics/contexts').then((r) => r.json()).then(setContexts).catch(() => {}));
    if (canTeam) fetches.push(apiFetch(`/crm/analytics/daily?days=${dailyDays}`).then((r) => r.json()).then(setDaily).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/leaderboard').then((r) => r.json()).then(setLeaderboard).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/response-speed').then((r) => r.json()).then(setResponseSpeed).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/funnel').then((r) => r.json()).then(setFunnel).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/risk-signals').then((r) => r.json()).then(setRiskSignals).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/response-buckets').then((r) => r.json()).then(setResponseBuckets).catch(() => {}));
    // Commercial intelligence — manager-visible
    if (canTeam) fetches.push(apiFetch('/crm/analytics/objections').then((r) => r.json()).then(setObjections).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/workflow-funnel').then((r) => r.json()).then(setWorkflowFunnel).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/quotation-performance').then((r) => r.json()).then(setQuotationPerf).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/product-conversion').then((r) => r.json()).then(setProductConv).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/pipeline-leaks').then((r) => r.json()).then(setPipelineLeaks).catch(() => {}));
    if (canAll) fetches.push(apiFetch('/crm/analytics/source-health').then((r) => r.json()).then(setSourceHealth).catch(() => {}));
    if (canAll) fetches.push(apiFetch('/crm/analytics/today-by-source').then((r) => r.json()).then(setTodayBySource).catch(() => {}));
    if (canAll) fetches.push(
      apiFetch('/leads/webhook/health')
        .then((r) => r.json())
        .then((data) => {
          console.log('[WebhookHealth]', data);
          if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data) ||
            data.success === false ||
            data.errorCode ||
            data.statusCode
          ) {
            console.error('[WebhookHealth] Invalid response', data);
            setWebhookHealth({});
            return;
          }
          setWebhookHealth(data);
        })
        .catch(() => {})
    );
    if (canTeam) fetches.push(apiFetch('/crm/analytics/top-campaigns').then((r) => r.json()).then(setTopCampaigns).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/conversion-funnel').then((r) => r.json()).then(setConversionFunnel).catch(() => {}));
    fetches.push(apiFetch('/crm/analytics/my').then((r) => r.json()).then(setMyStats).catch(() => {}));
    Promise.all(fetches).finally(() => setLoading(false));
  }, [canTeam, canAll, dailyDays]);

  const card = { background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, marginBottom: 16 };
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` };
  const td = { padding: '9px 10px', fontSize: 13, borderBottom: `1px solid ${theme.border}` };

  const ConvBadge = ({ pct }) => (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
      background: pct >= 20 ? '#d1e7dd' : pct >= 10 ? '#fff3cd' : '#f8d7da',
      color: pct >= 20 ? '#0f5132' : pct >= 10 ? '#856404' : '#842029',
    }}>{pct}%</span>
  );

  if (loading) return <PageLayout title="CRM Analytics"><p style={{ color: theme.textMuted, padding: 20 }}>Loading...</p></PageLayout>;

  return (
    <PageLayout title="CRM Analytics">

      {/* My Stats */}
      {myStats && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>My Performance</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="My Leads" value={myStats.total} />
            <StatCard label="Converted" value={myStats.converted} color="#198754" />
            <StatCard label="Lost" value={myStats.lost} color="#dc3545" />
            <StatCard label="Due Today" value={myStats.dueToday} color="#ffc107" />
            <StatCard label="Overdue Follow-ups" value={myStats.overdueFollowUps} color="#dc3545" />
          </div>
        </div>
      )}

      {/* Overview */}
      {canTeam && overview && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Overview</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Total Leads" value={overview.total} />
            <StatCard label="New Today" value={overview.todayNew} color="#0d6efd" />
            <StatCard label="New" value={overview.byStatus?.new} color="#ffc107" />
            <StatCard label="Interested" value={overview.byStatus?.interested} color="#0f5132" />
            <StatCard label="Converted" value={overview.byStatus?.converted} color="#198754" />
            <StatCard label="Lost" value={overview.byStatus?.lost} color="#dc3545" />
          </div>
        </div>
      )}

      {/* Daily trend chart */}
      {canTeam && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Daily Lead Volume</h4>
            <select
              value={dailyDays}
              onChange={(e) => setDailyDays(Number(e.target.value))}
              style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: `1px solid ${theme.border}`, color: theme.text, background: '#fff' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </div>
          <DailyChart data={daily} />
        </div>
      )}

      {/* Lead Sources Today */}
      {canAll && todayBySource && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Lead Sources Today</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>Leads ingested today vs. last 7 days, by source.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Source</th>
                <th style={{ ...th, textAlign: 'right' }}>Today</th>
                <th style={{ ...th, textAlign: 'right' }}>Last 7 Days</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys({ ...todayBySource.today, ...todayBySource.last7Days })
                .sort((a, b) => (todayBySource.last7Days[b] || 0) - (todayBySource.last7Days[a] || 0))
                .map((src) => (
                  <tr key={src}>
                    <td style={td}>{SOURCE_LABELS[src] || src}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: (todayBySource.today[src] || 0) > 0 ? '#0f5132' : theme.textMuted }}>
                      {todayBySource.today[src] || 0}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{todayBySource.last7Days[src] || 0}</td>
                  </tr>
                ))}
              {Object.keys({ ...todayBySource.today, ...todayBySource.last7Days }).length === 0 && (
                <tr><td colSpan={3} style={{ ...td, color: theme.textMuted, textAlign: 'center' }}>No leads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhook Health */}
      {canAll && webhookHealth && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Webhook Health</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            Last webhook received per source this session. Resets on server restart.
            Amber = no webhook received since restart. Red = received but &gt; 24 h ago.
          </p>
          {(() => {
            const ALLOWED_SOURCES = ['META', 'GOOGLE', 'SHOPIFY', 'INDIAMART'];
            const entries = Object.entries(webhookHealth).filter(([key]) => ALLOWED_SOURCES.includes(key));
            if (entries.length === 0) {
              return <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>No webhook activity yet</p>;
            }
            return (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {entries.map(([src, info]) => {
                  const h = info;
                  const dot = h.last_received_at === null
                    ? '#f59e0b'
                    : h.healthy ? '#22c55e' : '#ef4444';
                  const label = h.last_received_at === null
                    ? 'No data this session'
                    : h.healthy
                      ? `${h.minutes_ago}m ago`
                      : `${h.minutes_ago}m ago — stale`;
                  return (
                    <div key={src} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f8fafc', border: `1px solid ${theme.border}`,
                      borderRadius: 7, padding: '8px 14px', flex: '1 1 160px',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{SOURCE_LABELS[src] || src}</div>
                        <div style={{ fontSize: 11, color: theme.textMuted }}>{label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Conversion Funnel */}
      {canTeam && conversionFunnel && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Conversion Funnel</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>Active leads → submitted quotations → live orders.</p>
          {(() => {
            const steps = [
              { label: 'Active Leads',  value: conversionFunnel.leads,      color: theme.primary },
              { label: 'Quotations',    value: conversionFunnel.quotations,  color: '#6f42c1'     },
              { label: 'Orders',        value: conversionFunnel.orders,      color: '#198754'     },
            ];
            const top = conversionFunnel.leads || 1;
            return steps.map((s) => (
              <FunnelBar
                key={s.label}
                label={s.label}
                count={s.value}
                pct={Math.round((s.value / top) * 100)}
                color={s.color}
              />
            ));
          })()}
        </div>
      )}

      {/* Top Campaigns */}
      {canTeam && topCampaigns.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Top Campaigns (Last 30 Days)</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>Leads by UTM campaign + source from <code>raw_payload</code>.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Campaign</th>
                  <th style={th}>Source</th>
                  <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{c.campaign}</td>
                    <td style={td}>{SOURCE_LABELS[c.source] || c.source}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Source breakdown */}
      {canAll && sources.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Lead Sources</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Source</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                  <th style={{ ...th, textAlign: 'right' }}>To Quotation</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td style={td}>{SOURCE_LABELS[s.source] || s.source}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{s.total}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{s.toQuotation}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 600 }}>{s.converted}</td>
                    <td style={{ ...td, textAlign: 'right' }}><ConvBadge pct={s.conversionPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Context breakdown */}
      {canAll && contexts.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Lead Origins (Context)</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>Where exactly each lead came from — e.g. META – Lead Form, SHOPIFY – WhatsApp Click.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Origin</th>
                  <th style={{ ...th, textAlign: 'right' }}>Total</th>
                  <th style={{ ...th, textAlign: 'right' }}>To Quotation</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {contexts.map((c) => (
                  <tr key={c.context}>
                    <td style={{ ...td, fontWeight: 500 }}>{c.context}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.total}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{c.toQuotation}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 600 }}>{c.converted}</td>
                    <td style={{ ...td, textAlign: 'right' }}><ConvBadge pct={c.conversionPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {canTeam && leaderboard.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Telecaller Leaderboard</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>Ranked by conversions. Response time = avg minutes to first note after lead assigned.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Name</th>
                  <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...th, textAlign: 'right' }}>Contacted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg Response</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, idx) => (
                  <tr key={r.userId} style={{ background: idx === 0 ? '#fffbeb' : 'transparent' }}>
                    <td style={td}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.totalLeads}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.contacted}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 700 }}>{r.converted}</td>
                    <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>
                      {r.avgResponseMin != null ? `${r.avgResponseMin} min` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Signals */}
      {canTeam && riskSignals && (riskSignals.overdueCount > 0 || riskSignals.waitingCriticalCount > 0 || riskSignals.staleNewCount > 0 || riskSignals.staleInterestedCount > 0) && (
        <div style={{ ...card, border: '1px solid #fca5a5', background: '#fff5f5' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#991b1b', textTransform: 'uppercase' }}>Risk Signals</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {riskSignals.overdueCount > 0 && (
              <div style={{ flex: '1 1 130px', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{riskSignals.overdueCount}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>OVERDUE replies</div>
              </div>
            )}
            {riskSignals.waitingCriticalCount > 0 && (
              <div style={{ flex: '1 1 130px', background: '#f87171', color: '#fff', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{riskSignals.waitingCriticalCount}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>WAITING &gt; 2h</div>
              </div>
            )}
            {riskSignals.staleNewCount > 0 && (
              <div style={{ flex: '1 1 130px', background: '#fbbf24', color: '#78350f', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{riskSignals.staleNewCount}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>NEW &gt; 3 days</div>
              </div>
            )}
            {riskSignals.staleInterestedCount > 0 && (
              <div style={{ flex: '1 1 130px', background: '#e9d5ff', color: '#6b21a8', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{riskSignals.staleInterestedCount}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>INTERESTED &gt; 7 days</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      {canTeam && funnel && funnel.total > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Conversion Funnel</h4>
          <FunnelBar label="All leads" count={funnel.total} pct={100} color="#6b7280" />
          <FunnelBar label="Contacted" count={funnel.contacted} pct={funnel.rates.contactedPct} color="#3b82f6" />
          <FunnelBar label="Interested" count={funnel.interested} pct={funnel.rates.interestedPct} color="#0ea5e9" />
          <FunnelBar label="Quotation sent" count={funnel.quotation} pct={funnel.rates.quotationPct} color="#8b5cf6" />
          <FunnelBar label="Converted" count={funnel.converted} pct={funnel.rates.convertedPct} color="#16a34a" />
          <div style={{ marginTop: 8, fontSize: 12, color: theme.textMuted }}>
            Lost: {funnel.lost} &nbsp;·&nbsp; Percentages are relative to total leads in scope.
          </div>
        </div>
      )}

      {/* WhatsApp Response Speed */}
      {canTeam && responseSpeed && responseSpeed.totalWithReply > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>WhatsApp Response Speed</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <StatCard label="Avg Reply Time" value={responseSpeed.avgReplyMin != null ? `${responseSpeed.avgReplyMin} min` : '—'} color="#0ea5e9" />
            <StatCard label="Within 30 min" value={responseSpeed.within30MinPct != null ? `${responseSpeed.within30MinPct}%` : '—'} color="#16a34a" />
            <StatCard label="Within 2 h" value={responseSpeed.within2hPct != null ? `${responseSpeed.within2hPct}%` : '—'} color="#0f5132" />
            <StatCard label="Currently Unanswered" value={responseSpeed.currentlyUnanswered} color={responseSpeed.currentlyUnanswered > 0 ? '#dc3545' : theme.textMuted} />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: theme.textMuted }}>
            Based on {responseSpeed.totalWithReply} leads with a customer WhatsApp reply on record.
            Times measured from <code>last_customer_reply_at</code> → <code>last_salesman_reply_at</code>.
          </p>
        </div>
      )}

      {/* Response Bucket / Badge Effectiveness */}
      {canTeam && responseBuckets.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Response Speed vs Conversion</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            For leads with a customer WhatsApp reply — how salesman response time correlates with conversion.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Response time</th>
                  <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {responseBuckets.map((b) => (
                  <tr key={b.bucket} style={{ background: b.bucket === 'unanswered' ? '#fff5f5' : 'transparent' }}>
                    <td style={{ ...td, fontWeight: b.bucket === 'under_30min' ? 600 : 400, color: b.bucket === 'unanswered' ? '#dc2626' : theme.text }}>
                      {b.label}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{b.total}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 600 }}>{b.converted}</td>
                    <td style={{ ...td, textAlign: 'right' }}><ConvBadge pct={b.conversionPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COMMERCIAL INTELLIGENCE SECTION ──────────────────────────────────── */}

      {/* 1. Pipeline Leaks — shown first as most actionable for managers */}
      {canTeam && pipelineLeaks.length > 0 && (
        <div style={{ ...card, border: '1px solid #fca5a5', background: '#fffafa' }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: '#991b1b', textTransform: 'uppercase' }}>Pipeline Leaks</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            Deterministic signals showing where leads are dying and why.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipelineLeaks.map((leak, i) => {
              const s = SEVERITY_STYLE[leak.severity] || SEVERITY_STYLE.LOW;
              return (
                <div key={i} style={{
                  background: s.bg, border: `1px solid ${s.border}`,
                  borderRadius: 7, padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: s.dot,
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>
                        {WF_LABEL[leak.stage] || leak.stage}
                      </span>
                      <span style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>— {leak.leakReason}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#111', marginLeft: 'auto' }}>
                        {leak.affectedCount} lead{leak.affectedCount > 1 ? 's' : ''}
                        {leak.avgAgingHours ? ` · avg ${leak.avgAgingHours < 24 ? `${leak.avgAgingHours}h` : `${Math.round(leak.avgAgingHours / 24)}d`}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563', fontStyle: 'italic' }}>{leak.operationalCause}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Top Objections */}
      {canTeam && objections.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Objection Intelligence</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            Which objections kill deals vs which are recoverable. Fatal = &lt;10% conversion after objection.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Objection</th>
                  <th style={{ ...th, textAlign: 'right' }}>Count</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Conv. %</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg Days</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg Quotation</th>
                  <th style={th}>Exit State</th>
                </tr>
              </thead>
              <tbody>
                {objections.map((o) => (
                  <tr key={o.objection} style={{ background: o.isFatal ? '#fff5f5' : 'transparent' }}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {o.isFatal && <span style={{ color: '#dc2626', marginRight: 4 }}>⚡</span>}
                      {o.objection}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{o.totalCount}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 600 }}>{o.convertedCount}</td>
                    <td style={{ ...td, textAlign: 'right' }}><ConvBadge pct={o.conversionPct} /></td>
                    <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>
                      {o.avgDaysToConversion !== null ? `${o.avgDaysToConversion}d` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>
                      {o.avgQuotationValue !== null ? inr(o.avgQuotationValue) : '—'}
                    </td>
                    <td style={{ ...td, fontSize: 11, color: theme.textMuted }}>
                      {WF_LABEL[o.commonExitState] || o.commonExitState || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: theme.textMuted }}>⚡ = Fatal objection (&lt;10% recovery rate)</p>
        </div>
      )}

      {/* 3. Stage Funnel (workflow_state-driven) */}
      {canTeam && workflowFunnel.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Workflow Stage Funnel</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            Current lead distribution across workflow stages. Avg time = how long leads have been in this state.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Stage</th>
                  <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...th, textAlign: 'right' }}>% Active</th>
                  <th style={{ ...th, textAlign: 'right' }}>Overdue</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg Time</th>
                  <th style={{ ...th, textAlign: 'right' }}>Stale</th>
                </tr>
              </thead>
              <tbody>
                {workflowFunnel.map((s) => {
                  const isTerminal = ['CONVERTED', 'LOST'].includes(s.state);
                  const isRisk = s.overdueCount > 0 || s.staleCount > 0;
                  const avgLabel = s.avgHoursInState !== null
                    ? s.avgHoursInState < 24 ? `${s.avgHoursInState}h` : `${Math.round(s.avgHoursInState / 24)}d`
                    : '—';
                  return (
                    <tr key={s.state} style={{
                      background: isTerminal ? '#f9fafb' : isRisk ? '#fffbeb' : 'transparent',
                      opacity: isTerminal ? 0.7 : 1,
                    }}>
                      <td style={{ ...td, fontWeight: 600 }}>{WF_LABEL[s.state] || s.state}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{s.currentCount}</td>
                      <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>
                        {s.pctOfActive !== null ? `${s.pctOfActive}%` : '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: s.overdueCount > 0 ? '#dc2626' : theme.textMuted, fontWeight: s.overdueCount > 0 ? 700 : 400 }}>
                        {s.overdueCount > 0 ? s.overdueCount : '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>{avgLabel}</td>
                      <td style={{ ...td, textAlign: 'right', color: s.staleCount > 0 ? '#d97706' : theme.textMuted, fontWeight: s.staleCount > 0 ? 700 : 400 }}>
                        {s.staleCount > 0 ? s.staleCount : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Quotation Performance */}
      {canTeam && quotationPerf && quotationPerf.total > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Quotation Performance</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <StatCard label="Total Quotations" value={quotationPerf.total} />
            <StatCard label="Converted" value={quotationPerf.converted} color="#198754" />
            <StatCard label="Conv. % (of sent)" value={`${quotationPerf.conversionPctOfSent}%`} color={quotationPerf.conversionPctOfSent >= 30 ? '#198754' : quotationPerf.conversionPctOfSent >= 15 ? '#856404' : '#dc3545'} />
            <StatCard label="Stalled" value={quotationPerf.stalled} color={quotationPerf.stalled > 0 ? '#d97706' : theme.textMuted} />
            <StatCard label="Negotiating" value={quotationPerf.negotiating} color="#6d28d9" />
            <StatCard label="Cancelled" value={quotationPerf.cancelled} color={quotationPerf.cancelled > 0 ? '#dc3545' : theme.textMuted} />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: theme.textMuted }}>
            {quotationPerf.avgHoursToQuote !== null && (
              <span>⏱ Avg time to quote: <strong style={{ color: theme.text }}>{quotationPerf.avgHoursToQuote < 24 ? `${quotationPerf.avgHoursToQuote}h` : `${Math.round(quotationPerf.avgHoursToQuote / 24)}d`}</strong></span>
            )}
            {quotationPerf.avgDaysToConvert !== null && (
              <span>📅 Avg days to convert: <strong style={{ color: theme.text }}>{quotationPerf.avgDaysToConvert}d</strong></span>
            )}
            {quotationPerf.avgConvertedValue !== null && (
              <span>💰 Avg converted value: <strong style={{ color: '#198754' }}>{inr(quotationPerf.avgConvertedValue)}</strong></span>
            )}
            {quotationPerf.avgAllValue !== null && (
              <span>📊 Avg all-quote value: <strong style={{ color: theme.text }}>{inr(quotationPerf.avgAllValue)}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* 5. Top Converting Products */}
      {canTeam && productConv.length > 0 && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>Product Conversion Intelligence</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: theme.textMuted }}>
            Which products close, at what value, and on what sales cycle. Grouped by product_interest text.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Product</th>
                  <th style={{ ...th, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...th, textAlign: 'right' }}>Quoted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Converted</th>
                  <th style={{ ...th, textAlign: 'right' }}>Conv. %</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg Order</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cycle</th>
                  <th style={th}>Top Objection</th>
                </tr>
              </thead>
              <tbody>
                {productConv.slice(0, 15).map((p) => (
                  <tr key={p.product}>
                    <td style={{ ...td, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.product}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{p.leadCount}</td>
                    <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>{p.quotationCount}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754', fontWeight: 700 }}>{p.convertedCount}</td>
                    <td style={{ ...td, textAlign: 'right' }}><ConvBadge pct={p.conversionPct} /></td>
                    <td style={{ ...td, textAlign: 'right', color: '#198754' }}>
                      {p.avgOrderValue !== null ? inr(p.avgOrderValue) : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>
                      {p.avgSalesCycleDays !== null ? `${p.avgSalesCycleDays}d` : '—'}
                    </td>
                    <td style={{ ...td, fontSize: 11, color: theme.textMuted }}>{p.mostCommonObjection ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ── Lead Source Reliability ────────────────────────────────────────────── */}
      {canAll && sourceHealth && (
        <div style={card}>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, color: theme.textMuted, textTransform: 'uppercase' }}>
            Lead Source Reliability
          </h4>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: theme.textMuted }}>
            Ingestion quality across all platforms — covers active, archived, and historical leads.
            Identity rate = leads with phone or email. Noise rate = tracking-only + junk.
          </p>

          {/* Issues list */}
          {sourceHealth.issues && sourceHealth.issues.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Integration Issues
              </div>
              {sourceHealth.issues.map((issue, i) => {
                const s = SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.LOW;
                return (
                  <div key={i} style={{
                    background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6,
                    padding: '8px 12px', marginBottom: 6, fontSize: 12, color: s.color,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0, marginTop: 3 }} />
                    <span>{issue.message}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Per-source cards grid */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(sourceHealth.sources || []).map((s) => {
              const rel = s.reliability;
              const relStyle = rel === 'CRITICAL'
                ? { bg: '#fff1f2', border: '#fca5a5', badge: '#b91c1c', badgeBg: '#fee2e2' }
                : rel === 'WARNING'
                ? { bg: '#fffbeb', border: '#fde68a', badge: '#92400e', badgeBg: '#fef3c7' }
                : { bg: '#f0fdf4', border: '#86efac', badge: '#15803d', badgeBg: '#dcfce7' };

              return (
                <div key={s.source} style={{
                  flex: '1 1 200px', minWidth: 180, maxWidth: 280,
                  border: `1px solid ${relStyle.border}`,
                  background: relStyle.bg, borderRadius: 8, padding: '12px 14px',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                      {SOURCE_LABELS[s.source] || s.source}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                      background: relStyle.badgeBg, color: relStyle.badge,
                    }}>
                      {rel}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 12 }}>
                    <span style={{ color: theme.textMuted }}>Total</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{s.totalLeadCount}</span>

                    <span style={{ color: theme.textMuted }}>Identity</span>
                    <span style={{
                      fontWeight: 700, textAlign: 'right',
                      color: s.identityRate >= 60 ? '#15803d' : s.identityRate >= 30 ? '#92400e' : '#b91c1c',
                    }}>
                      {s.identityRate}%
                    </span>

                    <span style={{ color: theme.textMuted }}>Converted</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', color: '#15803d' }}>{s.conversionRate}%</span>

                    <span style={{ color: theme.textMuted }}>Noise</span>
                    <span style={{
                      fontWeight: 600, textAlign: 'right',
                      color: s.noiseRate > 50 ? '#b91c1c' : s.noiseRate > 20 ? '#92400e' : theme.textMuted,
                    }}>
                      {s.noiseRate}%
                    </span>

                    {s.archivedInvalidCount > 0 && (
                      <>
                        <span style={{ color: '#b91c1c', fontSize: 11 }}>Archived</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: '#b91c1c', fontSize: 11 }}>
                          {s.archivedInvalidCount}
                        </span>
                      </>
                    )}

                    {s.avgResponseMinutes !== null && (
                      <>
                        <span style={{ color: theme.textMuted }}>Avg Response</span>
                        <span style={{ textAlign: 'right', color: theme.textMuted, fontSize: 11 }}>
                          {s.avgResponseMinutes < 60
                            ? `${s.avgResponseMinutes}m`
                            : `${Math.round(s.avgResponseMinutes / 60)}h`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duplicate phone patterns */}
          {sourceHealth.duplicatePatterns && sourceHealth.duplicatePatterns.suspectedDuplicateCount > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Duplicate Phone Patterns ({sourceHealth.duplicatePatterns.suspectedDuplicateCount} phones with multiple leads)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Phone</th>
                      <th style={{ ...th, textAlign: 'right' }}>Count</th>
                      <th style={{ ...th, textAlign: 'right' }}>Sources</th>
                      <th style={th}>First Seen</th>
                      <th style={th}>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceHealth.duplicatePatterns.patterns.slice(0, 10).map((p, i) => (
                      <tr key={i}>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{p.phone}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: p.occurrenceCount >= 5 ? '#b91c1c' : '#92400e' }}>
                          {p.occurrenceCount}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: theme.textMuted }}>{p.sourceCount}</td>
                        <td style={{ ...td, fontSize: 11, color: theme.textMuted }}>
                          {new Date(p.firstSeen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td style={{ ...td, fontSize: 11, color: theme.textMuted }}>
                          {new Date(p.lastSeen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </PageLayout>
  );
}
