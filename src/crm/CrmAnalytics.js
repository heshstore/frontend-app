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
    </PageLayout>
  );
}
