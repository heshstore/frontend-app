import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff', active = false) => ({
  background: active ? bg : '#f3f4f6',
  color: active ? color : '#374151',
  border: active ? 'none' : '1px solid #e2e8f0',
  borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap',
});

const sectionCard = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '18px 20px', marginBottom: 20,
};

function PercentBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ color: '#6c757d', fontSize: 12 }}>
          {count.toLocaleString()} &nbsp;<strong style={{ color }}>{pct}%</strong>
        </span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, minWidth: pct > 0 ? 4 : 0, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function FunnelStep({ label, value, pct, color, isLast }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 2 }}>{label}</div>
      {pct != null && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{pct}% rate</div>}
      {!isLast && <div style={{ fontSize: 18, color: '#94a3b8', marginTop: 4 }}>→</div>}
    </div>
  );
}

export default function WaAnalytics() {
  const navigate = useNavigate();
  const [overallStats, setOverallStats] = useState(null);
  const [templatePerf, setTemplatePerf] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [historical, setHistorical] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [funnelDays, setFunnelDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [campaignFilter,   setCampaignFilter]   = useState('all'); // 'all' | 'ai' | 'manual'

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [statsRes, tplPerfRes, campRes, histRes] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/analytics/dashboard'),
        apiFetch('/marketing/whatsapp-engine/analytics/template-performance'),
        apiFetch('/marketing/whatsapp-engine/campaigns'),
        apiFetch('/marketing/whatsapp-engine/analytics/historical?days=90'),
      ]);
      if (!statsRes.ok) throw new Error(`Stats error ${statsRes.status}`);
      const [statsData, tplData, campData, histData] = await Promise.all([
        statsRes.json(),
        tplPerfRes.ok ? tplPerfRes.json() : [],
        campRes.ok ? campRes.json() : [],
        histRes.ok ? histRes.json() : null,
      ]);
      setOverallStats(statsData);
      setTemplatePerf(Array.isArray(tplData) ? tplData : []);
      setCampaigns(Array.isArray(campData) ? campData : []);
      setHistorical(histData);
    } catch (e) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFunnel = useCallback(async (days) => {
    setFunnelLoading(true);
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/analytics/conversion-funnel?days=${days}`);
      if (r.ok) setFunnel(await r.json());
    } catch { /* non-critical */ } finally {
      setFunnelLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFunnel(funnelDays); }, [loadFunnel, funnelDays]);

  // Inline campaign stats component
  function CampaignStats({ campaignId }) {
    const [stats, setStats] = useState(null);
    const [busy, setBusy] = useState(true);
    useEffect(() => {
      let cancelled = false;
      setBusy(true);
      apiFetch(`/marketing/whatsapp-engine/analytics/campaigns/${campaignId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!cancelled) { setStats(d); setBusy(false); } })
        .catch(() => { if (!cancelled) setBusy(false); });
      return () => { cancelled = true; };
    }, [campaignId]);
    if (busy) return <div style={{ padding: '10px 0', fontSize: 12, color: '#6c757d' }}>Loading…</div>;
    if (!stats) return <div style={{ fontSize: 12, color: '#9ca3af' }}>No data</div>;
    const total = stats.total || stats.sent || 1;
    return (
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
        <PercentBar label="Sent"      count={stats.sent      || 0} total={total} color="#1d4ed8" />
        <PercentBar label="Delivered" count={stats.delivered || 0} total={total} color="#0f766e" />
        <PercentBar label="Read"      count={stats.read      || 0} total={total} color="#6d28d9" />
        <PercentBar label="Replied"   count={stats.replied   || 0} total={total} color="#166534" />
        <PercentBar label="Failed"    count={stats.failed    || 0} total={total} color="#991b1b" />
      </div>
    );
  }

  const STATUS_COLORS = {
    draft: { bg: '#f3f4f6', color: '#6b7280' },
    running: { bg: '#dcfce7', color: '#166534' },
    paused: { bg: '#fef9c3', color: '#854d0e' },
    completed: { bg: '#dbeafe', color: '#1d4ed8' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
  };

  function MiniTable({ title, rows, columns }) {
    return (
      <div style={sectionCard}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>{title}</div>
        {!rows?.length ? (
          <div style={{ color: '#6c757d', fontSize: 13 }}>No records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {columns.map(c => <th key={c.key} style={{ padding: '8px 10px', background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    {columns.map(c => (
                      <td key={c.key} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                        {c.render ? c.render(r) : (r[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <PageLayout
      title="WhatsApp Analytics"
      subtitle="Delivery rates, template performance, and campaign stats"
      actions={
        <button style={{ ...btn('#0d6efd', '#fff', true), border: 'none' }} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ marginLeft: 12, ...btn('#dc3545', '#fff', true), border: 'none' }} onClick={load}>Retry</button>
          </div>
        )}

        {/* Conversion Funnel */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Conversion Funnel</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setFunnelDays(d)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: funnelDays === d ? '#0d6efd' : '#f8fafc',
                    color: funnelDays === d ? '#fff' : '#374151',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {funnelLoading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading funnel…</div>
          ) : funnel ? (
            <>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 }}>
                <FunnelStep label="Messaged" value={funnel.unique_messaged} pct={null} color="#0f172a" />
                <FunnelStep label="Replied" value={funnel.replied} pct={funnel.reply_rate_pct} color="#0369a1" />
                <FunnelStep label="CRM Leads" value={funnel.crm_leads} pct={funnel.lead_rate_pct} color="#6d28d9" />
                <FunnelStep label="Followed Up" value={funnel.telecaller_followed_up} pct={funnel.followup_rate_pct} color="#166534" isLast />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Since {funnel.since} · {funnel.messages_sent.toLocaleString()} messages sent
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => navigate('/marketing/whatsapp/inbox')}
                  style={{ ...btn('#f0fdf4', '#15803d', true), border: '1px solid #bbf7d0', fontSize: 11 }}
                >
                  View Inbox for follow-up →
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No funnel data available.</div>
          )}
        </div>

        {/* Overall Delivery Stats */}
        <div style={sectionCard}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>Overall Delivery Stats</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>All-time cumulative — for today&apos;s ops use the Engine or AI Campaigns dashboard.</div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading…</div>
          ) : overallStats ? (
            (() => {
              const total = overallStats.total || overallStats.sent || 1;
              return (
                <>
                  <PercentBar label="Sent"      count={overallStats.sent      || 0} total={total} color="#1d4ed8" />
                  <PercentBar label="Delivered"  count={overallStats.delivered || 0} total={total} color="#0f766e" />
                  <PercentBar label="Read"        count={overallStats.read     || 0} total={total} color="#6d28d9" />
                  <PercentBar label="Replied"     count={overallStats.replied  || 0} total={total} color="#166534" />
                  <PercentBar label="Failed"      count={overallStats.failed   || 0} total={total} color="#991b1b" />
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    Total tracked: {(overallStats.total || 0).toLocaleString()} messages
                  </div>
                </>
              );
            })()
          ) : (
            <div style={{ color: '#6c757d', fontSize: 13 }}>No stats available</div>
          )}
        </div>

        {/* Template Performance */}
        <div style={sectionCard}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>
            Template Performance (last 30 days)
          </div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading…</div>
          ) : templatePerf.length === 0 ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>No template performance data yet. Send campaigns first.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templatePerf.map((t, i) => (
                <div key={t.template_id || i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{t.template_name}</div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                      <span style={{ color: '#6b7280' }}>Sent: <strong style={{ color: '#1d4ed8' }}>{t.sent}</strong></span>
                      <span style={{ color: '#6b7280' }}>Read: <strong style={{ color: '#6d28d9' }}>{t.read_rate_pct}%</strong></span>
                      <span style={{ color: '#6b7280' }}>Reply: <strong style={{ color: '#166534' }}>{t.reply_rate_pct}%</strong></span>
                      <span style={{ color: '#6b7280' }}>Weight: <strong>{t.performance_weight}</strong></span>
                    </div>
                  </div>
                  {t.sent > 0 && (
                    <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ flex: t.read_rate_pct, background: '#6d28d9', minWidth: t.read_rate_pct > 0 ? 3 : 0 }} title={`Read: ${t.read_rate_pct}%`} />
                      <div style={{ flex: t.reply_rate_pct, background: '#166534', minWidth: t.reply_rate_pct > 0 ? 3 : 0 }} title={`Replied: ${t.reply_rate_pct}%`} />
                      <div style={{ flex: Math.max(0, 100 - t.read_rate_pct - t.reply_rate_pct), background: '#f1f5f9' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Stats */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
              Campaign Stats
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'all',    label: 'All'    },
                { key: 'ai',     label: 'AI'     },
                { key: 'manual', label: 'Manual' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCampaignFilter(key)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: campaignFilter === key ? 'none' : '1px solid #e2e8f0',
                    background: campaignFilter === key ? '#0d6efd' : '#f8fafc',
                    color: campaignFilter === key ? '#fff' : '#374151',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading…</div>
          ) : (() => {
            const filtered = campaigns.filter(c => {
              if (campaignFilter === 'ai')     return c.is_promotion === true  && c.test_mode === false;
              if (campaignFilter === 'manual') return c.is_promotion === false || c.test_mode === true;
              return true;
            });
            return filtered.length === 0 ? (
              <div style={{ color: '#6c757d', fontSize: 13 }}>No campaigns found.</div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</div>
              {filtered.map((camp, i) => {
                const sc = STATUS_COLORS[camp.status] || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <div key={camp.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: expandedCampaign === camp.id ? '#eff6ff' : '#f8fafc', cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}
                      onClick={() => camp.id && setExpandedCampaign(prev => prev === camp.id ? null : camp.id)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{camp.campaign_name}</div>
                        <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>{camp.created_at ? new Date(camp.created_at).toLocaleDateString('en-IN') : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{camp.status}</span>
                        {camp.id && (
                          <button
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: expandedCampaign === camp.id ? '#0d6efd' : '#fff', color: expandedCampaign === camp.id ? '#fff' : '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); setExpandedCampaign(prev => prev === camp.id ? null : camp.id); }}
                          >
                            {expandedCampaign === camp.id ? '▲ Hide' : '▼ Stats'}
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedCampaign === camp.id && camp.id && (
                      <div style={{ padding: '0 14px 14px' }}>
                        <CampaignStats campaignId={camp.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>

        <MiniTable
          title="Previous Campaigns"
          rows={historical?.previous_campaigns}
          columns={[
            { key: 'promo_id', label: 'Campaign ID' },
            { key: 'telecaller_phone', label: 'Telecaller' },
            { key: 'status', label: 'Status' },
            { key: 'queue_total', label: 'Queue' },
            { key: 'queue_pending', label: 'Pending' },
            { key: 'created_at', label: 'Created', render: r => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—' },
          ]}
        />

        <MiniTable
          title="Historical Queue"
          rows={historical?.historical_queue}
          columns={[
            { key: 'telecaller_phone', label: 'Telecaller' },
            { key: 'status', label: 'Status' },
            { key: 'skip_reason', label: 'Skip Reason' },
            { key: 'count', label: 'Count' },
          ]}
        />

        <MiniTable
          title="Product Rotation History"
          rows={historical?.product_rotation_history}
          columns={[
            { key: 'promo_id', label: 'Campaign ID' },
            { key: 'telecaller_phone', label: 'Telecaller' },
            { key: 'sku', label: 'SKU' },
            { key: 'product_name', label: 'Product' },
            { key: 'times_used', label: 'Used' },
            { key: 'last_sent_at', label: 'Last Sent', render: r => r.last_sent_at ? new Date(r.last_sent_at).toLocaleString('en-IN') : '—' },
          ]}
        />

        <MiniTable
          title="Validation History"
          rows={historical?.validation_history}
          columns={[
            { key: 'promo_id', label: 'Validation ID' },
            { key: 'status', label: 'Status' },
            { key: 'queue_total', label: 'Queue' },
            { key: 'sent', label: 'Sent' },
            { key: 'failed', label: 'Failed' },
            { key: 'skipped', label: 'Skipped' },
            { key: 'created_at', label: 'Created', render: r => r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—' },
          ]}
        />

        <MiniTable
          title="Warmup & Promotion History"
          rows={historical?.warmup_history}
          columns={[
            { key: 'created_at', label: 'When', render: r => r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—' },
            { key: 'telecaller_phone', label: 'Telecaller' },
            { key: 'event', label: 'Event' },
            { key: 'reason', label: 'Reason' },
          ]}
        />

        <MiniTable
          title="Health Warnings History"
          rows={historical?.promotion_history}
          columns={[
            { key: 'created_at', label: 'When', render: r => r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—' },
            { key: 'telecaller_phone', label: 'Telecaller' },
            { key: 'event', label: 'Warning' },
            { key: 'reason', label: 'Reason' },
          ]}
        />

        <MiniTable
          title="Daily Trends"
          rows={historical?.daily_trends}
          columns={[
            { key: 'period', label: 'Date', render: r => r.period ? new Date(r.period).toLocaleDateString('en-IN') : '—' },
            { key: 'sent', label: 'Sent' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'read', label: 'Read' },
            { key: 'replies', label: 'Replies' },
            { key: 'failed', label: 'Failed' },
          ]}
        />

        <MiniTable
          title="Weekly Trends"
          rows={historical?.weekly_trends}
          columns={[
            { key: 'period', label: 'Week', render: r => r.period ? new Date(r.period).toLocaleDateString('en-IN') : '—' },
            { key: 'sent', label: 'Sent' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'read', label: 'Read' },
            { key: 'replies', label: 'Replies' },
            { key: 'failed', label: 'Failed' },
          ]}
        />

        <MiniTable
          title="Monthly Trends"
          rows={historical?.monthly_trends}
          columns={[
            { key: 'period', label: 'Month', render: r => r.period ? new Date(r.period).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—' },
            { key: 'sent', label: 'Sent' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'read', label: 'Read' },
            { key: 'replies', label: 'Replies' },
            { key: 'failed', label: 'Failed' },
          ]}
        />
      </div>
    </PageLayout>
  );
}
