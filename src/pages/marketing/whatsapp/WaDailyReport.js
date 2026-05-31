import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';
import { isNumberConnected } from '../utils/whatsappStatus';

const card = (border = '#dee2e6', bg = '#fff') => ({
  background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 16, marginBottom: 14,
});

const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

function KpiBox({ label, value, color = '#111827', sub }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center', flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FunnelRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  );
}

function riskColor(score) {
  if (score > 60) return '#dc3545';
  if (score >= 30) return '#fd7e14';
  return '#198754';
}

export default function WaDailyReport() {
  const [report, setReport] = useState(null);
  const [audienceStats, setAudienceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, aRes] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/analytics/daily-report'),
        apiFetch('/marketing/whatsapp-engine/audience/stats/health'),
      ]);
      if (!rRes.ok) throw new Error(`Report error ${rRes.status}`);
      const [r, a] = await Promise.all([rRes.json(), aRes.ok ? aRes.json() : null]);
      setReport(r);
      setAudienceStats(a);
    } catch (e) {
      setError(e?.message || 'Failed to load daily report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) {
    return (
      <PageLayout title="Daily Report" hideBack>
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading report…</div>
      </PageLayout>
    );
  }

  if (error && !report) {
    return (
      <PageLayout title="Daily Report" hideBack>
        <div style={{ ...card('#fca5a5', '#fff5f5'), textAlign: 'center' }}>
          <div style={{ color: '#dc3545', fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>{error}</div>
          <button style={btn('#dc3545')} onClick={load}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  const r = report;
  const f = r.delivery_funnel;
  const funnelTotal = (f.sent || 0) + (f.failed || 0);

  return (
    <PageLayout
      title="Daily Operational Report"
      subtitle={`${r.date} — morning review for WhatsApp pilot`}
      hideBack
      actions={
        <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Mode banner */}
        <div style={{
          ...card('#e0e7ff', '#eef2ff'),
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20,
        }}>
          <span style={{ fontWeight: 700, color: '#3730a3', fontSize: 13 }}>Active mode:</span>
          {r.env.pilot_mode && <span style={{ background: '#c7d2fe', color: '#3730a3', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>PILOT</span>}
          {r.env.test_only && <span style={{ background: '#fde68a', color: '#92400e', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>TEST ONLY</span>}
          <span style={{ fontSize: 12, color: '#4f46e5' }}>Max audience/day: <strong>{r.env.max_daily_audience}</strong></span>
          {r.risk_alerts > 0 && (
            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              ⚠️ {r.risk_alerts} risk alert{r.risk_alerts > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Top KPIs */}
        <Section title="Today at a glance">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <KpiBox label="Sent" value={f.sent} color="#0d6efd" />
            <KpiBox label="Delivered" value={f.delivered} color="#0891b2" />
            <KpiBox label="Read" value={f.read} color="#7c3aed" />
            <KpiBox label="Replied" value={f.replied} color="#15803d" />
            <KpiBox label="Failed" value={f.failed} color="#dc3545" />
            <KpiBox label="CRM Leads" value={r.crm_leads_today} color="#f59e0b" />
          </div>
        </Section>

        {/* Delivery funnel */}
        <Section title="Delivery Funnel">
          <div style={card()}>
            <FunnelRow label="Delivery rate" value={f.delivered} total={funnelTotal} color="#0891b2" />
            <FunnelRow label="Read rate"     value={f.read}      total={f.sent || 1} color="#7c3aed" />
            <FunnelRow label="Reply rate"    value={f.replied}   total={f.sent || 1} color="#15803d" />
            <FunnelRow label="Fail rate"     value={f.failed}    total={funnelTotal || 1} color="#dc3545" />
          </div>
        </Section>

        {/* Audience health */}
        <Section title="Audience Health">
          <div style={card()}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <KpiBox label="Total" value={r.audience.total} />
              <KpiBox label="Eligible" value={r.audience.eligible} color="#15803d" sub="active, no cooldown" />
              <KpiBox label="In cooldown" value={r.audience.in_cooldown} color="#fd7e14" sub="temporarily suppressed" />
              <KpiBox label="Opted out" value={r.audience.opted_out} color="#dc3545" sub="permanent block" />
            </div>
            {audienceStats && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Score distribution</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {audienceStats.score_distribution.map((b) => (
                    <div key={b.bucket} style={{ background: '#f3f4f6', borderRadius: 6, padding: '6px 12px', textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{b.bucket}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{b.count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Number health */}
        <Section title="Number Health">
          <div style={card()}>
            {r.number_health.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>No numbers configured.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Number', 'Name', 'Sent/Limit', 'Risk', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.number_health.map((n) => (
                    <tr key={n.id}>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 12 }}>{n.phone}</td>
                      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{n.name}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontWeight: 700 }}>{n.daily_sent}</span>
                        <span style={{ color: '#9ca3af' }}> / {n.daily_limit}</span>
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: riskColor(n.risk_score) }}>
                        {n.risk_score.toFixed(0)}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ background: isNumberConnected(n) ? '#dcfce7' : '#f3f4f6', color: isNumberConnected(n) ? '#166534' : '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          {isNumberConnected(n) ? 'Connected' : 'Not Connected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* Top templates */}
        {r.top_templates.length > 0 && (
          <Section title="Top Performing Templates (30-day reply rate)">
            <div style={card()}>
              {r.top_templates.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: i < r.top_templates.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#d1d5db', minWidth: 20 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.template_name}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{t.replied} replies</span>
                  <span style={{
                    background: t.reply_rate_pct >= 10 ? '#dcfce7' : t.reply_rate_pct >= 5 ? '#fef9c3' : '#f3f4f6',
                    color: t.reply_rate_pct >= 10 ? '#166534' : t.reply_rate_pct >= 5 ? '#854d0e' : '#6b7280',
                    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  }}>
                    {t.reply_rate_pct}% reply
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Daily review checklist */}
        <div style={{ ...card('#e0e7ff', '#eef2ff'), marginTop: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 10 }}>Daily Review Checklist</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
            {[
              `Delivery > 80%?  (today: ${funnelTotal > 0 ? Math.round((f.delivered / funnelTotal) * 100) : 0}%)`,
              `Read rate > 30%? (today: ${f.sent > 0 ? Math.round((f.read / f.sent) * 100) : 0}%)`,
              `Reply rate > 5%? (today: ${f.sent > 0 ? Math.round((f.replied / f.sent) * 100) : 0}%)`,
              `Fail rate < 10%? (today: ${funnelTotal > 0 ? Math.round((f.failed / funnelTotal) * 100) : 0}%)`,
              `Risk alerts: ${r.risk_alerts === 0 ? 'none ✓' : r.risk_alerts + ' — review numbers'}`,
              `CRM leads: ${r.crm_leads_today} generated today`,
              `Cooldown system: ${r.audience.in_cooldown} contacts suppressed`,
              'WA session stable? Check numbers page',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: '#4338ca', background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #c7d2fe' }}>
                {item}
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
