import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff') => ({
  background: bg,
  color,
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const th = {
  padding: '10px 12px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 13,
  verticalAlign: 'middle',
};

const STATUS_COLORS = {
  pending: { bg: '#dbeafe', color: '#1d4ed8' },
  processing: { bg: '#fef9c3', color: '#854d0e' },
  sent: { bg: '#dcfce7', color: '#166534' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
  skipped: { bg: '#f3f4f6', color: '#6b7280' },
};

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const c = STATUS_COLORS[s] || { bg: '#e2e8f0', color: '#374151' };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      {status || '—'}
    </span>
  );
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function truncate(str, n = 40) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function WaQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skippingId, setSkippingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/queue/pending?limit=100');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setItems(Array.isArray(d) ? d : []);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15 seconds — queue changes fast
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const skipItem = async (item) => {
    setSkippingId(item.id);
    try {
      // PATCH or POST to skip — using PATCH on the queue item
      const res = await apiFetch(`/marketing/whatsapp-engine/queue/${item.id}/skip`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'skipped' }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      showFeedback(`Item ${item.id} skipped`);
      await load();
    } catch (e) {
      showFeedback(e?.message || 'Failed to skip item', true);
    } finally {
      setSkippingId(null);
    }
  };

  const priorityLabel = (p) => {
    if (p >= 10) return { label: 'High', color: '#dc3545' };
    if (p >= 5) return { label: 'Med', color: '#fd7e14' };
    return { label: 'Low', color: '#6c757d' };
  };

  return (
    <PageLayout
      title="Queue Monitor"
      subtitle="Pending messages — system sends automatically. Auto-refreshes every 15 s."
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && (
            <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>
              {feedback.msg}
            </span>
          )}
          {/* Count badge */}
          {!loading && !error && (
            <span
              style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {items.length} pending
            </span>
          )}
          <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Info banner */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>ℹ️</span>
          <span>
            This view shows <strong>pending</strong> queue items only. Messages are dispatched automatically by the engine — no manual action needed. Use "Skip" to cancel a specific item.
          </span>
        </div>

        {lastRefreshed && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 16,
              color: '#dc3545',
            }}
          >
            {error}{' '}
            <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>
              Retry
            </button>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>Loading queue…</div>
        ) : !loading && items.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: 8,
              padding: 40,
              textAlign: 'center',
              color: '#6c757d',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Queue is empty</div>
            <div style={{ fontSize: 13 }}>No pending messages. All messages have been dispatched.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Scheduled Time</th>
                  <th style={th}>Customer Phone</th>
                  <th style={th}>Status</th>
                  <th style={th}>Template ID</th>
                  <th style={th}>Attempts</th>
                  <th style={th}>Priority</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const p = priorityLabel(item.priority ?? 0);
                  return (
                    <tr
                      key={item.id}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ ...td, color: '#9ca3af', fontSize: 12 }}>{item.id}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {formatTime(item.scheduled_at || item.created_at)}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{item.customer_phone || '—'}</span>
                      </td>
                      <td style={td}>
                        <StatusBadge status={item.status || 'pending'} />
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                        {truncate(item.template_id || item.templateId, 30)}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (item.attempt_count || 0) > 0 ? '#fd7e14' : '#6c757d',
                          }}
                        >
                          {item.attempt_count ?? 0}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 700, color: p.color, fontSize: 12 }}>{p.label}</span>
                      </td>
                      <td style={td}>
                        {(item.status || 'pending') === 'pending' && (
                          <button
                            style={btn('#f3f4f6', '#374151')}
                            onClick={() => skipItem(item)}
                            disabled={skippingId === item.id}
                            title="Skip this queued item"
                          >
                            {skippingId === item.id ? '…' : 'Skip'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Showing up to 100 pending items. Auto-refreshes every 15 s.
        </div>
      </div>
    </PageLayout>
  );
}
