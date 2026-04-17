import React, { useEffect, useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

const SOURCE_LABELS = {
  INDIAMART:'IndiaMart', META_ADS:'Meta Ads', GOOGLE_ADS:'Google Ads',
  SHOPIFY:'Shopify', WHATSAPP:'WhatsApp', DIRECT_CALL:'Direct Call', MANUAL:'Manual',
};

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

export default function CrmAnalytics() {
  const [overview, setOverview] = useState(null);
  const [sources, setSources] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const canTeam = hasPermission('crm.analytics.team');
  const canAll = hasPermission('crm.analytics.all');

  useEffect(() => {
    const fetches = [];
    if (canTeam) fetches.push(apiFetch('/crm/analytics/overview').then((r) => r.json()).then(setOverview).catch(() => {}));
    if (canAll) fetches.push(apiFetch('/crm/analytics/sources').then((r) => r.json()).then(setSources).catch(() => {}));
    if (canTeam) fetches.push(apiFetch('/crm/analytics/leaderboard').then((r) => r.json()).then(setLeaderboard).catch(() => {}));
    fetches.push(apiFetch('/crm/analytics/my').then((r) => r.json()).then(setMyStats).catch(() => {}));
    Promise.all(fetches).finally(() => setLoading(false));
  }, [canTeam, canAll]);

  const card = { background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, marginBottom: 16 };
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${theme.border}` };
  const td = { padding: '9px 10px', fontSize: 13, borderBottom: `1px solid ${theme.border}` };

  if (loading) return <PageLayout title="CRM Analytics"><p style={{ color: theme.textMuted, padding: 20 }}>Loading...</p></PageLayout>;

  return (
    <PageLayout title="CRM Analytics">
      {/* My Stats (everyone sees this) */}
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

      {/* Overview (team/admin) */}
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

      {/* Source breakdown (admin/COO) */}
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
                    <td style={{ ...td, textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: s.conversionPct >= 20 ? '#d1e7dd' : s.conversionPct >= 10 ? '#fff3cd' : '#f8d7da',
                        color: s.conversionPct >= 20 ? '#0f5132' : s.conversionPct >= 10 ? '#856404' : '#842029',
                      }}>
                        {s.conversionPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leaderboard (team/admin — no revenue) */}
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
    </PageLayout>
  );
}
