import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e9ecef' : bg,
  color: disabled ? '#adb5bd' : color,
  border: 'none', borderRadius: 6, padding: '6px 12px',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

const th = {
  padding: '10px 12px', background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0', textAlign: 'left',
  fontWeight: 600, color: '#475569', fontSize: 12, whiteSpace: 'nowrap',
};

const td = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13, verticalAlign: 'middle' };

const STATUS_COLORS = {
  pending:    { bg: '#dbeafe', color: '#1d4ed8' },
  processing: { bg: '#fef9c3', color: '#854d0e' },
  sent:       { bg: '#dcfce7', color: '#166534' },
  delivered:  { bg: '#ccfbf1', color: '#0f766e' },
  read:       { bg: '#ede9fe', color: '#6d28d9' },
  replied:    { bg: '#f0fdf4', color: '#15803d' },
  failed:     { bg: '#fee2e2', color: '#991b1b' },
  skipped:    { bg: '#f3f4f6', color: '#6b7280' },
};

function StatusBadge({ status, reason }) {
  const s = (status || '').toLowerCase();
  const c = STATUS_COLORS[s] || { bg: '#e2e8f0', color: '#374151' };
  const label = s === 'skipped' && reason ? reason : (status || '—');
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

// Renders the sender cell for a queue row.
// Priority: denormalized actual_sender_* fields → numberMap fallback → "Waiting Assignment"
function SenderCell({ item, numberMap }) {
  const name  = item.actual_sender_name  || null;
  const phone = item.actual_sender_phone || null;

  if (name || phone) {
    return (
      <div title="Actual WhatsApp number used for sending">
        {name  && <div style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{name}</div>}
        {phone && <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{phone}</div>}
      </div>
    );
  }

  // Historical rows or fallback via number_id → live numbers list
  const n = item.number_id ? numberMap[item.number_id] : null;
  if (n) {
    return (
      <div title="Actual WhatsApp number used for sending">
        {n.name  && <div style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{n.name}</div>}
        {n.phone && <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{n.phone}</div>}
      </div>
    );
  }

  const isPending = !item.status || item.status === 'pending';
  if (isPending) {
    return <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Waiting Assignment</span>;
  }
  return <span style={{ color: '#9ca3af' }}>—</span>;
}

// Sender cell for log entries (failed tab) — uses number_id against live numbers list.
function LogSenderCell({ log, numberMap }) {
  const n = log.number_id ? numberMap[log.number_id] : null;
  if (n) {
    return (
      <div title="Actual WhatsApp number used for sending">
        {n.name  && <div style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{n.name}</div>}
        {n.phone && <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{n.phone}</div>}
      </div>
    );
  }
  return <span style={{ color: '#9ca3af' }}>—</span>;
}

function formatTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ts; }
}

function truncate(str, n = 30) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

const TABS = [
  { id: 'pending', label: 'Pending Queue' },
  { id: 'failed',  label: 'Failed Messages' },
];

export default function WaQueue() {
  const [searchParams] = useSearchParams();
  const initCampaign = searchParams.get('campaign') || '';

  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignFilter, setCampaignFilter] = useState(initCampaign);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skippingId, setSkippingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load campaigns + numbers once on mount
  useEffect(() => {
    apiFetch('/marketing/whatsapp-engine/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCampaigns(Array.isArray(d) ? d : []))
      .catch(() => {});

    apiFetch('/marketing/whatsapp-engine/numbers')
      .then(r => r.ok ? r.json() : [])
      .then(d => setNumbers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let res;
      if (tab === 'pending') {
        if (campaignFilter) {
          res = await apiFetch(`/marketing/whatsapp-engine/queue/campaign/${campaignFilter}?limit=200`);
        } else {
          res = await apiFetch('/marketing/whatsapp-engine/queue/pending?limit=100');
        }
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        setItems(Array.isArray(await res.clone().json()) ? await res.json() : []);
      } else {
        const params = new URLSearchParams({ status: 'failed', limit: 100 });
        if (campaignFilter) params.set('campaignId', campaignFilter);
        res = await apiFetch(`/marketing/whatsapp-engine/analytics/logs?${params}`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        setItems(Array.isArray(await res.clone().json()) ? await res.json() : []);
      }
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, campaignFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = tab === 'pending' ? 15000 : 60000;
    const t = setInterval(load, interval);
    return () => clearInterval(t);
  }, [load, tab]);

  const skipItem = async (item) => {
    setSkippingId(item.id);
    try {
      const res = await apiFetch(`/marketing/whatsapp-engine/queue/${item.id}/skip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'UNKNOWN_ERROR' }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      showFeedback('Item skipped');
      await load();
    } catch (e) {
      showFeedback(e?.message || 'Failed to skip', true);
    } finally {
      setSkippingId(null);
    }
  };

  const priorityLabel = (p) => {
    if (p >= 10) return { label: 'High', color: '#dc2626' };
    if (p >= 5)  return { label: 'Med',  color: '#d97706' };
    return { label: 'Low', color: '#6b7280' };
  };

  // id → campaign name
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.campaign_name]));
  // id → { phone, name }
  const numberMap   = Object.fromEntries(numbers.map(n => [n.id, { phone: n.phone, name: n.name }]));

  const pendingCount = tab === 'pending' ? items.filter(i => (i.status || 'pending') === 'pending').length : null;
  const failedItems  = tab === 'pending' ? [] : items;

  return (
    <PageLayout
      title="Queue Monitor"
      subtitle={tab === 'pending' ? 'Pending messages — engine dispatches automatically' : 'Failed messages — requires investigation'}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>{feedback.msg}</span>}
          {tab === 'pending' && !loading && !error && pendingCount != null && (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              {pendingCount} pending
            </span>
          )}
          {tab === 'failed' && !loading && !error && (
            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              {items.length} failed
            </span>
          )}
          <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setItems([]); }}
              style={{
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? (t.id === 'failed' ? '#991b1b' : '#0d6efd') : '#6c757d',
                border: tab === t.id ? '1px solid #dee2e6' : '1px solid transparent',
                borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Campaign filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Campaign filter:</label>
          <select
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' }}
          >
            <option value="">{tab === 'pending' ? 'All pending (no campaign filter)' : 'All campaigns'}</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.campaign_name} ({c.status})</option>
            ))}
          </select>
          {campaignFilter && (
            <button style={btn('#f3f4f6', '#374151')} onClick={() => setCampaignFilter('')}>Clear ✕</button>
          )}
        </div>

        {tab === 'pending' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#1e40af' }}>
            Messages dispatch automatically. Use <strong>Skip</strong> to cancel a specific item.
            {campaignFilter && ' Showing all statuses for this campaign.'}
          </div>
        )}

        {tab === 'failed' && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#be123c' }}>
            Failed messages were not delivered. Check WhatsApp connection status, number health, and message payload.
          </div>
        )}

        {lastRefreshed && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
            Last refreshed: {lastRefreshed.toLocaleTimeString()} · Auto-refreshes every {tab === 'pending' ? 15 : 60}s
          </div>
        )}

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 14, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{tab === 'pending' ? '✅' : '✓'}</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {tab === 'pending' ? 'Queue is empty' : 'No failed messages'}
            </div>
            <div style={{ fontSize: 13 }}>
              {tab === 'pending'
                ? 'No pending messages. All messages have been dispatched.'
                : campaignFilter ? 'No failed messages for this campaign.' : 'No failed messages found.'}
            </div>
          </div>
        ) : tab === 'pending' ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Scheduled</th>
                  <th style={th}>Recipient</th>
                  <th style={{ ...th, minWidth: 120 }}>
                    Sender
                    <span
                      title="Actual WhatsApp number used for sending"
                      style={{ marginLeft: 4, cursor: 'help', color: '#94a3b8', fontSize: 11, fontWeight: 400 }}
                    >ⓘ</span>
                  </th>
                  <th style={th}>Status</th>
                  <th style={th}>Campaign</th>
                  <th style={th}>Template</th>
                  <th style={th}>Attempts</th>
                  <th style={th}>Priority</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const p = priorityLabel(item.priority ?? 0);
                  const isFailed = (item.status || '') === 'failed';
                  return (
                    <tr key={item.id} style={{ background: isFailed ? '#fff9f9' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>{formatTime(item.scheduled_at || item.created_at)}</td>
                      <td style={td}><span style={{ fontWeight: 600 }}>{item.customer_phone || '—'}</span></td>
                      <td style={td}><SenderCell item={item} numberMap={numberMap} /></td>
                      <td style={td}><StatusBadge status={item.status || 'pending'} reason={item.error_message} /></td>
                      <td style={{ ...td, fontSize: 12, color: '#475569' }}>
                        {item.campaign_id ? (campaignMap[item.campaign_id] || truncate(item.campaign_id, 12)) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                        {truncate(item.template_id, 12)}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: (item.attempt_count || 0) > 0 ? '#d97706' : '#6c757d' }}>
                          {item.attempt_count ?? 0}
                        </span>
                      </td>
                      <td style={td}><span style={{ fontWeight: 700, color: p.color, fontSize: 12 }}>{p.label}</span></td>
                      <td style={td}>
                        {(item.status || 'pending') === 'pending' && (
                          <button style={btn('#f3f4f6', '#374151')} onClick={() => skipItem(item)} disabled={skippingId === item.id}>
                            {skippingId === item.id ? '…' : 'Skip'}
                          </button>
                        )}
                        {isFailed && item.error_message && (
                          <span style={{ fontSize: 11, color: '#991b1b' }} title={item.error_message}>{truncate(item.error_message, 20)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Failed tab — uses log entries */
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Sent At</th>
                  <th style={th}>Recipient</th>
                  <th style={{ ...th, minWidth: 120 }}>
                    Sender
                    <span
                      title="Actual WhatsApp number used for sending"
                      style={{ marginLeft: 4, cursor: 'help', color: '#94a3b8', fontSize: 11, fontWeight: 400 }}
                    >ⓘ</span>
                  </th>
                  <th style={th}>Message Preview</th>
                  <th style={th}>Campaign</th>
                </tr>
              </thead>
              <tbody>
                {failedItems.map((log, idx) => (
                  <tr key={log.id || idx} style={{ background: '#fff9f9' }}>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12, color: '#6c757d' }}>{formatTime(log.sent_at)}</td>
                    <td style={td}><span style={{ fontWeight: 600 }}>{log.customer_phone || '—'}</span></td>
                    <td style={td}><LogSenderCell log={log} numberMap={numberMap} /></td>
                    <td style={{ ...td, maxWidth: 280, color: '#374151' }}>
                      <span title={log.message_body || ''}>
                        {log.message_body ? truncate(log.message_body, 60) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: '#475569' }}>
                      {log.campaign_id ? (campaignMap[log.campaign_id] || truncate(log.campaign_id, 12)) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} shown.
          {tab === 'pending' && ' Showing up to 100 pending items.'}
          {tab === 'failed' && ' Showing up to 100 failed messages from logs.'}
        </div>
      </div>
    </PageLayout>
  );
}
