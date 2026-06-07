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
  try { return new Date(ts).toLocaleString('en-IN'); } catch { return ts; }
}
function fmtTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
}
function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return ts; }
}
function ago(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return fmtDate(ts);
}
function pill(label, bg, fg) {
  return (
    <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
      {label}
    </span>
  );
}

const STATUS_COLORS = {
  running:             { bg: '#dcfce7', fg: '#166534' },
  completed:           { bg: '#eff6ff', fg: '#1d4ed8' },
  partially_completed: { bg: '#fef9c3', fg: '#854d0e' },
  paused:              { bg: '#fff7ed', fg: '#c2410c' },
  failed:              { bg: '#fee2e2', fg: '#991b1b' },
  draft:               { bg: '#f3f4f6', fg: '#6b7280' },
  cancelled:           { bg: '#f3f4f6', fg: '#6b7280' },
  sent:                { bg: '#dcfce7', fg: '#166534' },
  pending:             { bg: '#dbeafe', fg: '#1d4ed8' },
  skipped:             { bg: '#f3f4f6', fg: '#6b7280' },
};
function StatusPill({ status }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return pill(status.toUpperCase().replace(/_/g, ' '), c.bg, c.fg);
}

// ── Section A: Engine Status ───────────────────────────────────────────────────
function SectionA({ data }) {
  if (!data) return null;
  const s = data;
  const runningColor = s.running ? '#16a34a' : '#dc3545';
  const runningBg    = s.running ? '#dcfce7'  : '#fee2e2';

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>A — AI Engine Status</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Kv label="Engine">
          <span style={{ background: runningBg, color: runningColor, padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
            {s.running ? '● RUNNING' : '○ STOPPED'}
          </span>
        </Kv>
        <Kv label="Last AI Run"      value={ago(s.last_ai_run)} />
        <Kv label="Next AI Run"      value={fmtTime(s.next_ai_run)} />
        <Kv label="Engine Ran Today">
          <span style={{ color: s.engine_ran_today ? '#16a34a' : '#dc3545', fontWeight: 700, fontSize: 12 }}>
            {s.engine_ran_today ? 'Yes' : 'No'}
          </span>
        </Kv>
        <Kv label="Autonomous Mode">
          <span style={{ color: s.autonomous_mode ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
            {s.autonomous_mode ? 'ON' : 'OFF'}
          </span>
        </Kv>
        <Kv label="Test-Only Mode"   value={s.test_only_mode ? 'Yes' : 'No'} />
        <Kv label="Validation Mode">
          <span style={{ color: s.validation_mode_on ? '#d97706' : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
            {s.validation_mode_on ? 'ON' : 'OFF'}
          </span>
        </Kv>
        {s.validation_mode_on && (
          <Kv label="Validation Contacts">
            <span style={{ color: '#d97706', fontWeight: 700, fontSize: 12 }}>
              {s.validation_contacts_active} active
            </span>
          </Kv>
        )}
        <Kv label="Numbers">
          <span style={{ color: s.connected_numbers > 0 ? '#16a34a' : '#dc3545', fontWeight: 700 }}>
            {s.connected_numbers} / {s.total_numbers} connected
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
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151', minWidth: 110 }}>{n.phone}</span>
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
    { label: 'Queue Items Built',  value: data.queue_items,       color: '#6d28d9' },
    { label: 'Messages Sent',      value: data.messages_sent,     color: '#16a34a' },
    { label: 'Replies',            value: data.replies,           color: '#0891b2' },
    { label: 'Leads Created',      value: data.leads_created,     color: '#d97706' },
    { label: 'Failures',           value: data.failures,          color: data.failures > 0 ? '#dc3545' : '#9ca3af' },
    { label: 'Skipped',            value: data.skipped,           color: '#9ca3af' },
  ];
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>B — Today's Activity</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        {cards.map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>
      {data.queue_items > 0 && data.campaigns_created === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#854d0e', background: '#fef9c3', padding: '6px 10px', borderRadius: 6 }}>
          Queue rows exist but no autonomous campaigns created yet — campaigns will be created on next engine run.
        </div>
      )}
    </div>
  );
}

// ── Section C: AI Campaigns ────────────────────────────────────────────────────
function SectionC({ campaigns, todayQueueByTelecaller, isInconsistent }) {
  const today = campaigns?.filter(c => c.is_today) ?? [];
  const history = campaigns?.filter(c => !c.is_today) ?? [];

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>C — AI Campaigns</div>

      {/* TODAY block */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8 }}>
          TODAY — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {/* DASHBOARD DATA INCONSISTENT banner */}
        {isInconsistent && (
          <div style={{ marginBottom: 12, background: '#fff7ed', border: '2px solid #f97316', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 13, marginBottom: 4 }}>
              ⚠ DASHBOARD DATA INCONSISTENT
            </div>
            <div style={{ fontSize: 12, color: '#7c2d12', marginBottom: todayQueueByTelecaller?.length > 0 ? 10 : 0 }}>
              Queue rows exist today but 0 AI campaigns were created. Every AI queue row must belong to a campaign.
              Campaigns will be auto-created and linked on the next engine run (08:30 IST) or server restart.
            </div>
            {todayQueueByTelecaller?.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 700, marginBottom: 6 }}>
                  TODAY'S QUEUE ACTIVITY — direct from queue table (campaign ID not yet assigned)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Telecaller', 'Queue', 'Sent', 'Pending', 'Failed', 'Skipped', 'Products'].map(h => (
                          <th key={h} style={{ ...th, background: '#ffedd5', color: '#9a3412' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayQueueByTelecaller.map(r => (
                        <tr key={r.number_id} style={{ background: '#fff7ed' }}>
                          <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>
                            {r.telecaller_phone}
                          </td>
                          <td style={td}>{r.total}</td>
                          <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>{r.sent}</td>
                          <td style={{ ...td, color: '#0d6efd' }}>{r.pending}</td>
                          <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
                          <td style={{ ...td, color: '#9ca3af' }}>{r.skipped}</td>
                          <td style={{ ...td, color: '#7c3aed' }}>
                            {r.product_skus?.length > 0
                              ? `${r.product_skus.length} SKU${r.product_skus.length > 1 ? 's' : ''}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {today.length === 0 && !isInconsistent ? (
          <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>
            No autonomous campaigns created today — engine will create them on next run at 8:30 AM IST.
          </div>
        ) : today.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Campaign ID', 'Status', 'Telecaller', 'Created', 'Queue', 'Sent', 'Replies', 'Failed', 'Products Used'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {today.map(c => (
                  <CampaignRow key={c.id} c={c} highlight />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* History block */}
      {history.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 11, color: '#64748b', fontWeight: 700, userSelect: 'none', marginBottom: 8 }}>
            PREVIOUS CAMPAIGNS ({history.length})
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Campaign ID', 'Status', 'Telecaller', 'Date', 'Queue', 'Sent', 'Replies', 'Failed', 'Products Used'].map(h => (
                    <th key={h} style={{ ...th, background: '#fafafa' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(c => (
                  <CampaignRow key={c.id} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function CampaignRow({ c, highlight }) {
  const sentPct = c.total_queue > 0 ? Math.round((c.sent / c.total_queue) * 100) : 0;
  return (
    <tr style={{ background: highlight ? '#f0fdf4' : undefined }}>
      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0d6efd' }}>
        {c.promo_id}
        {c.test_mode && <span style={{ marginLeft: 5, fontSize: 9, background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>TEST</span>}
      </td>
      <td style={td}><StatusPill status={c.status} /></td>
      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>
        {c.telecaller_phone ?? <span style={{ color: '#9ca3af' }}>—</span>}
      </td>
      <td style={{ ...td, color: '#64748b', fontSize: 11 }}>
        {highlight ? fmtTime(c.created_at) : fmtDate(c.created_at)}
      </td>
      <td style={td}>{c.total_queue}</td>
      <td style={td}>
        <span style={{ color: '#16a34a', fontWeight: 700 }}>{c.sent}</span>
        <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 3 }}>({sentPct}%)</span>
      </td>
      <td style={td}>{c.replies}</td>
      <td style={td}><span style={{ color: c.failed > 0 ? '#dc3545' : '#94a3b8' }}>{c.failed}</span></td>
      <td style={td}>
        {c.products_used > 0
          ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{c.products_used} SKU{c.products_used > 1 ? 's' : ''}</span>
          : <span style={{ color: '#9ca3af' }}>—</span>}
      </td>
    </tr>
  );
}

// ── Section D: Campaign Queue Detail ──────────────────────────────────────────
function SectionD({ data }) {
  if (!data?.length) return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>D — Campaign Queue Detail (Today)</div>
      <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>No queue items for today.</div>
    </div>
  );

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>D — Campaign Queue Detail (Today)</div>
        <span style={{ fontSize: 11, color: '#64748b' }}>{data.length} messages</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Customer', 'Product SKU', 'Product Title', 'Status', 'Sent Time', 'Read', 'Replied', 'Lead', 'Telecaller'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.queue_id} style={{ background: r.replied ? '#f0fdf4' : r.lead_created ? '#fffbeb' : undefined }}>
                <td style={td}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{r.customer_name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{r.customer_phone}</div>
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6d28d9' }}>{r.product_sku}</td>
                <td style={{ ...td, maxWidth: 160 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {r.product_title !== r.product_sku ? r.product_title : '—'}
                  </div>
                </td>
                <td style={td}><StatusPill status={r.queue_status} /></td>
                <td style={{ ...td, color: '#64748b', fontSize: 11 }}>{r.sent_at ? fmtTime(r.sent_at) : '—'}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.read ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.replied ? (
                    <span title={r.reply_message ?? ''} style={{ color: '#0d6efd', fontWeight: 700, cursor: 'help' }}>✓</span>
                  ) : (
                    <span style={{ color: '#d1d5db' }}>—</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.lead_created ? <span style={{ color: '#d97706', fontWeight: 700 }}>✓</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.telecaller_phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section E: Telecaller Performance ─────────────────────────────────────────
function SectionE({ data }) {
  if (!data?.length) return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>E — Telecaller Performance (Today)</div>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>No telecaller data.</div>
    </div>
  );

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>E — Telecaller Performance (Today)</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Telecaller', 'Campaign ID', 'Queue', 'Sent', 'Replied', 'Skipped', 'Failed', 'Daily Cap', 'Capacity Remaining'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r => {
              const capPct = r.daily_cap > 0 ? Math.round(((r.daily_cap - r.capacity_remaining) / r.daily_cap) * 100) : 0;
              const barColor = capPct > 80 ? '#dc3545' : capPct > 50 ? '#d97706' : '#16a34a';
              return (
                <tr key={r.number_id}>
                  <td style={td}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{r.phone}</div>
                    {r.name && <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.name}</div>}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#0d6efd' }}>
                    {r.promo_id ?? <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={td}>{r.total}</td>
                  <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>{r.sent}</td>
                  <td style={{ ...td, color: '#0891b2', fontWeight: 700 }}>{r.pending}</td>
                  <td style={{ ...td, color: '#9ca3af' }}>{r.skipped}</td>
                  <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
                  <td style={td}>{r.daily_cap}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${capPct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: barColor, fontSize: 11 }}>{r.capacity_remaining} left</span>
                    </div>
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

// ── Section F: Live Queue ──────────────────────────────────────────────────────
function SectionF({ data }) {
  if (!data) return null;
  const { rows = [], oldest_pending_minutes = 0 } = data;

  const byStatus = {};
  const byNumber = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.count;
    if (!byNumber[r.number_phone]) byNumber[r.number_phone] = { name: r.number_name, statuses: {} };
    byNumber[r.number_phone].statuses[r.status] = (byNumber[r.number_phone].statuses[r.status] ?? 0) + r.count;
  }

  const STATUS_ORDER = ['pending', 'processing', 'sent', 'failed', 'skipped'];
  const STATUS_CLR   = { pending: '#0d6efd', processing: '#d97706', sent: '#16a34a', failed: '#dc3545', skipped: '#9ca3af' };
  const stuckWarning = oldest_pending_minutes > 15;

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>F — Live Queue (All-Time)</div>
        {stuckWarning && (
          <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
            ⚠ Queue stuck ({oldest_pending_minutes}m)
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(s => (
          <div key={s} style={{ textAlign: 'center', padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 70 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_CLR[s] }}>{byStatus[s] ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.toUpperCase()}</div>
          </div>
        ))}
      </div>
      {Object.keys(byNumber).length > 0 && (
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
                  <td style={td}><span style={{ fontFamily: 'monospace' }}>{phone}</span></td>
                  {STATUS_ORDER.map(s => (
                    <td key={s} style={{ ...td, textAlign: 'center', fontWeight: 600, color: STATUS_CLR[s] }}>
                      {info.statuses[s] ?? 0}
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

// ── Section G: Product Rotation ────────────────────────────────────────────────
function SectionG({ data }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>G — Product Rotation (Today)</div>
      {!data?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No product rotation data for today.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Campaign ID', 'Telecaller', 'SKU', 'Product', 'Customers Reached'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#0d6efd' }}>
                    {p.promo_id ?? <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{p.telecaller_phone}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6d28d9' }}>{p.sku}</td>
                  <td style={td}>{p.product_name}</td>
                  <td style={td}>
                    <span style={{ fontWeight: 700, color: '#0d6efd' }}>{p.customers_reached}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Section H: Number Utilization ─────────────────────────────────────────────
function SectionH({ data }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>H — Number Utilization</div>
      {!data?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No numbers found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Phone', 'State', 'Warmup', 'Daily Cap', 'Sent', 'Remaining', 'Utilization'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(n => {
              const barColor  = n.utilization_pct > 80 ? '#dc3545' : n.utilization_pct > 50 ? '#d97706' : '#16a34a';
              const stateChip = waSessionChip(n.wa_state, n.connected);
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
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Section I: Log Stream ──────────────────────────────────────────────────────
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
  NUMBER_RECOVERED:  '#059669',
};

function SectionI({ logs }) {
  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>I — Engine Log Stream (Latest 60)</div>
      {!logs?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No log events found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['Date', 'Time', 'Campaign ID', 'Telecaller', 'Action', 'Message'].map(h => (
                  <th key={h} style={{ ...th, fontFamily: 'sans-serif', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{l.log_date}</td>
                  <td style={{ ...td, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{l.log_time}</td>
                  <td style={{ ...td, fontSize: 10, color: '#0d6efd', whiteSpace: 'nowrap' }}>
                    {l.promo_id ?? (l.campaign_id ? l.campaign_id.slice(0, 8) + '…' : '—')}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: '#374151', whiteSpace: 'nowrap' }}>
                    {l.telecaller_phone ?? '—'}
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: LOG_COLORS[l.event] ?? '#374151', whiteSpace: 'nowrap' }}>
                    {l.event}
                  </td>
                  <td style={{ ...td, color: '#475569', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.reason || (l.customer_phone ? `phone=${l.customer_phone}` : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo,  setSecondsAgo]  = useState(0);
  const [error,       setError]       = useState(null);

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
      subtitle="Operational visibility — what ran, who received it, what products were used"
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
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
            <SectionC
              campaigns={data.campaigns}
              todayQueueByTelecaller={data.today_queue_by_telecaller}
              isInconsistent={data.is_inconsistent}
            />
            <SectionD data={data.campaign_queue_detail} />
            <SectionE data={data.telecaller_performance} />
            <SectionF data={data.live_queue} />
            <SectionG data={data.product_rotation} />
            <SectionH data={data.number_utilization} />
            <SectionI logs={data.log_stream} />
          </>
        )}

        <div style={{ fontSize: 11, color: '#9ca3af', paddingBottom: 24 }}>
          Auto-refreshes every 15s · {data?.as_of ? `As of ${fmt(data.as_of)}` : ''}
          <br />
          Sections: A Engine Status · B Today Activity · C AI Campaigns · D Queue Detail · E Telecaller Performance · F Live Queue · G Product Rotation · H Number Utilization · I Log Stream
        </div>
      </div>
    </PageLayout>
  );
}
