import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';
import { resolveWarmup, waSessionChip } from '../utils/whatsappStatus';

// ── Style tokens ──────────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '16px 20px',
};
const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 12,
};
const th = {
  padding: '9px 12px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: 11,
  whiteSpace: 'nowrap',
};
const td = {
  padding: '8px 12px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 12,
  verticalAlign: 'middle',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}
function fmtTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
}
function ago(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return fmt(ts);
}

// ── Section A: Engine Status ───────────────────────────────────────────────────
function SectionA({ data }) {
  if (!data) return null;
  const s = data;
  const runningColor = s.running ? '#16a34a' : '#dc3545';
  const runningBg    = s.running ? '#dcfce7'  : '#fee2e2';
  const runningLabel = s.running ? 'RUNNING'  : 'STOPPED';

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>A — AI Engine Status</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Kv label="AI Engine Status">
          <span style={{ background: runningBg, color: runningColor, padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
            {runningLabel}
          </span>
        </Kv>
        <Kv label="Last AI Run"       value={ago(s.last_ai_run)} />
        <Kv label="Next AI Run"       value={fmtTime(s.next_ai_run)} />
        <Kv label="Autonomous Mode">
          <span style={{ color: s.autonomous_mode ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
            {s.autonomous_mode ? 'Enabled' : 'Disabled'}
          </span>
        </Kv>
        <Kv label="Pilot Mode"        value={s.pilot_mode ? 'Yes' : 'No'} />
        <Kv label="Test-Only Mode"    value={s.test_only_mode ? 'Yes' : 'No'} />
        <Kv label="Total Numbers"     value={s.total_numbers} />
        <Kv label="Connected Numbers">
          <span style={{ color: s.connected_numbers > 0 ? '#16a34a' : '#dc3545', fontWeight: 700 }}>
            {s.connected_numbers} / {s.total_numbers}
          </span>
        </Kv>
      </div>
      {s.numbers?.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {s.numbers.map(n => {
            const chip = waSessionChip(n.wa_state, n.connected);
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: n.connected ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 10 }}>
                  {n.connected ? '●' : '○'}
                </span>
                <span style={{ fontWeight: 600, color: '#374151', minWidth: 100 }}>{n.name || n.phone}</span>
                <span style={{ background: chip.bg, color: chip.color, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                  {chip.label}
                </span>
                {n.partial_session && (
                  <span style={{ fontSize: 9, color: '#854d0e', background: '#fef9c3', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                    PARTIAL
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section B: Today's Activity ────────────────────────────────────────────────
function SectionB({ data }) {
  if (!data) return null;
  const cards = [
    { label: 'AI Campaigns Created', value: data.campaigns_created, color: '#0d6efd' },
    { label: 'Queue Items Generated', value: data.queue_items,       color: '#6d28d9' },
    { label: 'Messages Sent',         value: data.messages_sent,     color: '#16a34a' },
    { label: 'Replies',               value: data.replies,           color: '#0891b2' },
    { label: 'Leads Created',         value: data.leads_created,     color: '#d97706' },
    { label: 'Failures',              value: data.failures,          color: data.failures > 0 ? '#dc3545' : '#9ca3af' },
  ];
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>B — Today's AI Activity</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {cards.map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section C: AI Campaigns ────────────────────────────────────────────────────
function SectionC({ campaigns }) {
  if (!campaigns?.length) return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>C — AI Campaigns (Last 30 Days)</div>
      <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No AI promotion campaigns found.</div>
    </div>
  );

  const STATUS_COLORS = {
    running:              { bg: '#dcfce7', fg: '#166534' },
    completed:            { bg: '#eff6ff', fg: '#1d4ed8' },
    partially_completed:  { bg: '#fef9c3', fg: '#854d0e' },
    paused:               { bg: '#fff7ed', fg: '#c2410c' },
    failed:               { bg: '#fee2e2', fg: '#991b1b' },
    draft:                { bg: '#f3f4f6', fg: '#6b7280' },
    cancelled:            { bg: '#f3f4f6', fg: '#6b7280' },
  };

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>C — AI Campaigns (Last 30 Days)</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Promo ID', 'Campaign', 'Created', 'Queue', 'Sent', 'Failed', 'Replies', 'Status'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.draft;
              const sentPct = c.total_queue > 0 ? Math.round((c.sent / c.total_queue) * 100) : 0;
              return (
                <tr key={c.id}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0d6efd' }}>{c.promo_id}</td>
                  <td style={td}>
                    {c.campaign_name}
                    {c.test_mode && <span style={{ marginLeft: 5, fontSize: 9, background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>TEST</span>}
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>{ago(c.created_at)}</td>
                  <td style={td}>{c.total_queue}</td>
                  <td style={td}><span style={{ color: '#16a34a', fontWeight: 700 }}>{c.sent}</span> <span style={{ color: '#94a3b8', fontSize: 10 }}>({sentPct}%)</span></td>
                  <td style={td}><span style={{ color: c.failed > 0 ? '#dc3545' : '#94a3b8' }}>{c.failed}</span></td>
                  <td style={td}>{c.replies}</td>
                  <td style={td}>
                    <span style={{ background: sc.bg, color: sc.fg, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
                      {c.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section D: Live Queue ──────────────────────────────────────────────────────
function SectionD({ data }) {
  if (!data) return null;
  const { rows = [], oldest_pending_minutes = 0 } = data;

  // Aggregate by status
  const byStatus = {};
  const byNumber = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.count;
    if (!byNumber[r.number_phone]) byNumber[r.number_phone] = { name: r.number_name, statuses: {} };
    byNumber[r.number_phone].statuses[r.status] = (byNumber[r.number_phone].statuses[r.status] ?? 0) + r.count;
  }

  const STATUS_ORDER = ['pending', 'processing', 'sent', 'failed', 'skipped'];
  const STATUS_COLORS = {
    pending:    '#0d6efd',
    processing: '#d97706',
    sent:       '#16a34a',
    failed:     '#dc3545',
    skipped:    '#9ca3af',
  };

  const stuckWarning = oldest_pending_minutes > 15;

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>D — Live AI Queue</div>
        {stuckWarning && (
          <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
            ⚠ Queue stuck ({oldest_pending_minutes}m)
          </span>
        )}
      </div>

      {/* Status totals */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(s => (
          <div key={s} style={{ textAlign: 'center', padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 70 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_COLORS[s] }}>{byStatus[s] ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Per-number breakdown */}
      {Object.keys(byNumber).length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>BY NUMBER</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Number</th>
                  {STATUS_ORDER.map(s => <th key={s} style={{ ...th, textAlign: 'center' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byNumber).map(([phone, info]) => (
                  <tr key={phone}>
                    <td style={td}><span style={{ fontFamily: 'monospace' }}>{phone}</span> <span style={{ color: '#94a3b8' }}>{info.name !== '—' ? `(${info.name})` : ''}</span></td>
                    {STATUS_ORDER.map(s => (
                      <td key={s} style={{ ...td, textAlign: 'center', fontWeight: 600, color: STATUS_COLORS[s] }}>
                        {info.statuses[s] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!Object.keys(byNumber).length && (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No promotion queue items found.</div>
      )}
    </div>
  );
}

// ── Section E: Product Rotation ────────────────────────────────────────────────
function SectionE({ data }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>E — AI Product Rotation (Today)</div>
      {!data?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No product rotation data for today.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['SKU', 'Product', 'Times Used Today', 'Numbers Using'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.sku}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{p.sku}</td>
                <td style={td}>{p.product_name}</td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{p.times_used}</span>
                    {p.times_used > 3 && <span style={{ fontSize: 10, color: '#d97706', fontWeight: 700 }}>HIGH</span>}
                  </div>
                </td>
                <td style={td}>{p.number_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Section F: Number Utilization ─────────────────────────────────────────────
function SectionF({ data }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>F — AI Number Utilization</div>
      {!data?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No numbers found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Phone', 'Status', 'Warmup', 'Daily Cap', 'Sent', 'Remaining', 'Utilization', 'Fully Operational'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(n => {
              const barColor   = n.utilization_pct > 80 ? '#dc3545' : n.utilization_pct > 50 ? '#d97706' : '#16a34a';
              const stateChip  = waSessionChip(n.wa_state, n.connected);
              return (
                <tr key={n.id} style={{ opacity: n.is_active ? 1 : 0.5 }}>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{n.phone}</td>
                  <td style={td}>
                    <span style={{ background: stateChip.bg, color: stateChip.color, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
                      {stateChip.label}
                    </span>
                  </td>
                  <td style={td}>
                    {(() => { const w = resolveWarmup(n); return w.notStarted
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>NOT STARTED</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: '#0d6efd' }}>{w.label}</span>;
                    })()}
                  </td>
                  <td style={td}>{n.daily_cap}</td>
                  <td style={td}><span style={{ fontWeight: 700, color: '#0d6efd' }}>{n.daily_sent}</span></td>
                  <td style={td}>{n.remaining_today}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${n.utilization_pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>{n.utilization_pct}%</span>
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ color: n.fully_operational ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 11 }}>
                      {n.fully_operational ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Section G: Log Stream ──────────────────────────────────────────────────────
const LOG_COLORS = {
  QUEUE_CREATED:     '#0d6efd',
  AUDIENCE_SELECTED: '#7c3aed',
  TEMPLATE_SELECTED: '#0891b2',
  AUTO_PAUSE:        '#dc3545',
  HOURLY_CAP_HIT:    '#d97706',
  FINGERPRINT_SKIP:  '#9ca3af',
  HARD_LIMIT_HIT:    '#dc3545',
  LEAD_CREATED:      '#16a34a',
  RISK_BLOCKED:      '#dc3545',
  DRY_RUN_SEND:      '#6b7280',
  SCALE_UP:          '#0d6efd',
};

function SectionG({ logs }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>G — AI Engine Log Stream (Latest 50)</div>
      {!logs?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No log events found.</div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
          {logs.map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
              <span style={{ color: '#94a3b8', minWidth: 70, flexShrink: 0 }}>{fmtTime(l.created_at)}</span>
              <span style={{ color: LOG_COLORS[l.event] ?? '#374151', fontWeight: 700, minWidth: 160, flexShrink: 0 }}>{l.event}</span>
              <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.reason ?? (l.customer_phone ? `phone=${l.customer_phone}` : '')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Warnings Banner ────────────────────────────────────────────────────────────
function WarningsBanner({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, color: '#dc3545', fontSize: 13, marginBottom: 6 }}>⚠ Warnings</div>
      {warnings.map((w, i) => (
        <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>• {w}</div>
      ))}
    </div>
  );
}

// ── Key-Value cell helper ──────────────────────────────────────────────────────
function Kv({ label, value, children }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AiPromotionDashboard() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [secondsAgo,   setSecondsAgo]   = useState(0);
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/ai/dashboard');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setData(d);
      setLastUpdated(Date.now());
      setSecondsAgo(0);
      setError(null);
    } catch (e) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const runningStatus = data?.engine_status?.running;

  return (
    <PageLayout
      title="AI Promotion"
      subtitle="Live visibility into the autonomous promotion engine"
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {data?.engine_status && (
            <span style={{
              background: runningStatus ? '#dcfce7' : '#fee2e2',
              color:      runningStatus ? '#166534' : '#991b1b',
              fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20,
            }}>
              {runningStatus ? '● RUNNING' : '○ STOPPED'}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {loading ? 'Updating…' : lastUpdated ? `Updated ${secondsAgo}s ago` : '—'}
          </span>
        </div>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc3545', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 14 }}>Loading AI dashboard…</div>
        )}

        {data && (
          <>
            <WarningsBanner warnings={data.warnings} />
            <SectionA data={data.engine_status} />
            <SectionB data={data.today_activity} />
            <SectionC campaigns={data.campaigns} />
            <SectionD data={data.live_queue} />
            <SectionE data={data.product_rotation} />
            <SectionF data={data.number_utilization} />
            <SectionG logs={data.log_stream} />
          </>
        )}

        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          Auto-refreshes every 15s · Route: /marketing/whatsapp-engine/ai/dashboard · Source: engine_audit_logs, marketing_campaigns, whatsapp_message_queue, whatsapp_message_logs, whatsapp_replies, promotion_product_rotation
        </div>
      </div>
    </PageLayout>
  );
}
