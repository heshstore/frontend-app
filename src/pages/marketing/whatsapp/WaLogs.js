import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e9ecef' : bg,
  color: disabled ? '#adb5bd' : color,
  border: 'none',
  borderRadius: 6,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
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
  sent: { bg: '#dbeafe', color: '#1d4ed8' },
  delivered: { bg: '#ccfbf1', color: '#0f766e' },
  read: { bg: '#ede9fe', color: '#6d28d9' },
  replied: { bg: '#dcfce7', color: '#166534' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'failed', label: 'Failed' },
];

const PAGE_SIZE = 50;

export default function WaLogs() {
  const [allLogs, setAllLogs] = useState([]);
  const [displayed, setDisplayed] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [debouncedPhone, setDebouncedPhone] = useState('');
  const debounceRef = useRef(null);

  // Debounce phone search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPhone(phoneSearch);
      setPage(1);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [phoneSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedPhone) params.set('phone', debouncedPhone);
      const res = await apiFetch(`/marketing/whatsapp-engine/analytics/logs?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      const arr = Array.isArray(d) ? d : [];
      setAllLogs(arr);
      setPage(1);
    } catch (e) {
      setError(e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedPhone]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Slice for pagination
  useEffect(() => {
    setDisplayed(allLogs.slice(0, page * PAGE_SIZE));
  }, [allLogs, page]);

  const hasMore = displayed.length < allLogs.length;

  const selectStyle = {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    background: '#fff',
    cursor: 'pointer',
  };

  const inputStyle = {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    width: 200,
    boxSizing: 'border-box',
  };

  return (
    <PageLayout
      title="Message Logs"
      subtitle="View and filter sent WhatsApp messages — auto-refreshes every 60 s"
      actions={
        <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Filter bar */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={selectStyle}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by phone…"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            style={inputStyle}
          />
          {(statusFilter || debouncedPhone) && (
            <button
              style={btn('#f3f4f6', '#374151')}
              onClick={() => { setStatusFilter(''); setPhoneSearch(''); setDebouncedPhone(''); setPage(1); }}
            >
              Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6c757d' }}>
            {!loading && `${allLogs.length} message${allLogs.length !== 1 ? 's' : ''} found`}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
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

        {loading && allLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>Loading logs…</div>
        ) : !loading && allLogs.length === 0 ? (
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
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No logs found</div>
            <div style={{ fontSize: 13 }}>
              {statusFilter || debouncedPhone
                ? 'No messages match the current filters. Try clearing the filters.'
                : 'No messages have been sent yet.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>Time</th>
                    <th style={th}>Phone</th>
                    <th style={th}>Message Preview</th>
                    <th style={th}>Status</th>
                    <th style={th}>Number ID</th>
                    <th style={th}>Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((log, idx) => (
                    <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 12, color: '#6c757d' }}>
                        {formatTime(log.sent_at)}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{log.customer_phone || '—'}</span>
                      </td>
                      <td style={{ ...td, maxWidth: 300, color: '#374151' }}>
                        <span title={log.message_body || ''}>
                          {log.message_body
                            ? log.message_body.slice(0, 60) + (log.message_body.length > 60 ? '…' : '')
                            : '—'}
                        </span>
                      </td>
                      <td style={td}>
                        <StatusBadge status={log.status} />
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                        {log.number_id
                          ? String(log.number_id).slice(0, 8) + (String(log.number_id).length > 8 ? '…' : '')
                          : '—'}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                        {log.campaign_id
                          ? String(log.campaign_id).slice(0, 8) + (String(log.campaign_id).length > 8 ? '…' : '')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  style={btn('#0d6efd')}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Load More ({allLogs.length - displayed.length} remaining)
                </button>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
              Showing {displayed.length} of {allLogs.length} messages. Auto-refreshes every 60 s.
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
