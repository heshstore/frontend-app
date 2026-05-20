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

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Replies' },
  { value: 'awaiting', label: 'Awaiting Action' },
  { value: 'lead_created', label: 'Lead Created' },
];

export default function WaInbox() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [creatingLeadId, setCreatingLeadId] = useState(null);
  const [feedback, setFeedback] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/inbox');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setReplies(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const createLead = async (item) => {
    setCreatingLeadId(item.id);
    try {
      const res = await apiFetch(`/marketing/whatsapp-engine/inbox/${item.id}/lead`, {
        method: 'PATCH',
        body: JSON.stringify({ leadId: 0 }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setFeedback((prev) => ({ ...prev, [item.id]: { ok: true, msg: 'Lead created in CRM' } }));
      await load();
    } catch (e) {
      setFeedback((prev) => ({
        ...prev,
        [item.id]: { ok: false, msg: e?.message || 'Failed to create lead' },
      }));
    } finally {
      setCreatingLeadId(null);
    }
  };

  const filtered = replies.filter((r) => {
    if (filter === 'awaiting') return !r.crm_lead_created && !r.crm_lead_id;
    if (filter === 'lead_created') return r.crm_lead_created || r.crm_lead_id;
    return true;
  });

  const awaitingCount = replies.filter((r) => !r.crm_lead_created && !r.crm_lead_id).length;

  return (
    <PageLayout
      title="WhatsApp Inbox"
      subtitle="Customer replies from WhatsApp campaigns — auto-refreshes every 30 s"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {awaitingCount > 0 && (
            <span
              style={{
                background: '#fef9c3',
                color: '#854d0e',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {awaitingCount} awaiting action
            </span>
          )}
          <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            background: '#f8fafc',
            border: '1px solid #dee2e6',
            borderRadius: 8,
            padding: 4,
            width: 'fit-content',
          }}
        >
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter(o.value)}
              style={{
                background: filter === o.value ? '#fff' : 'transparent',
                color: filter === o.value ? '#0d6efd' : '#6c757d',
                border: filter === o.value ? '1px solid #dee2e6' : '1px solid transparent',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: filter === o.value ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

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

        {loading && replies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>Loading inbox…</div>
        ) : !loading && filtered.length === 0 ? (
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
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {filter === 'awaiting'
                ? 'No replies awaiting action'
                : filter === 'lead_created'
                ? 'No leads created yet'
                : 'Inbox is empty'}
            </div>
            <div style={{ fontSize: 13 }}>
              {filter === 'all'
                ? 'Customer replies from WhatsApp campaigns will appear here.'
                : 'Try switching the filter to see other replies.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => {
              const hasLead = item.crm_lead_created || item.crm_lead_id;
              const fb = feedback[item.id];
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#fff',
                    border: `1px solid ${hasLead ? '#bbf7d0' : '#dee2e6'}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    position: 'relative',
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
                        {item.customer_name || item.customer_phone || '—'}
                      </span>
                      {item.customer_name && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#6c757d' }}>
                          {item.customer_phone}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {formatTime(item.received_at)}
                      </span>
                      {hasLead ? (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {item.crm_lead_id ? `Lead #${item.crm_lead_id}` : 'Lead Created'}
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#fef9c3',
                            color: '#854d0e',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          New Reply
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message body */}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#374151',
                      lineHeight: 1.5,
                      background: '#f8fafc',
                      borderRadius: 6,
                      padding: '10px 12px',
                      marginBottom: fb || !hasLead ? 10 : 0,
                      borderLeft: '3px solid #d1d5db',
                    }}
                  >
                    {item.message || <span style={{ color: '#9ca3af' }}>(no message text)</span>}
                  </div>

                  {/* Feedback */}
                  {fb && (
                    <div
                      style={{
                        fontSize: 12,
                        color: fb.ok ? '#198754' : '#dc3545',
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      {fb.ok ? '✓' : '✗'} {fb.msg}
                    </div>
                  )}

                  {/* Action */}
                  {!hasLead && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        style={btn('#0d6efd')}
                        onClick={() => createLead(item)}
                        disabled={creatingLeadId === item.id}
                      >
                        {creatingLeadId === item.id ? 'Creating…' : '+ Create Lead'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
          {filtered.length > 0 && `${filtered.length} repl${filtered.length !== 1 ? 'ies' : 'y'} shown. `}
          Showing {filter === 'all' ? 'all' : filter === 'awaiting' ? 'awaiting action' : 'lead-created'} replies. Auto-refreshes every 30 s.
        </div>
      </div>
    </PageLayout>
  );
}
