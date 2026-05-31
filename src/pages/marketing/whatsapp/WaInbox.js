import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';
import { waStatusChip } from '../utils/whatsappStatus';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return String(ts); }
}

function getInitials(name, phone) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (phone) return phone.slice(-2);
  return '??';
}

// ── Thread panel (right pane) ────────────────────────────────────────────────

function ThreadPanel({ phone, customerName, numberMap, onClose, onThreadChange }) {
  const navigate = useNavigate();
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [replyError, setReplyError] = useState(null);
  const [fb, setFb] = useState(null);
  const bottomRef = useRef(null);
  const isFirstLoad = useRef(true);
  // Ref keeps onThreadChange always current without being a dep of loadThread,
  // preventing the interval from being recreated on every parent render.
  const onThreadChangeRef = useRef(onThreadChange);
  useEffect(() => { onThreadChangeRef.current = onThreadChange; });
  // Inflight guard: prevents concurrent fetch calls from stacking up.
  const loadInFlightRef = useRef(false);

  const loadThread = useCallback(async (silent = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const r = await apiFetch(
        `/marketing/whatsapp-engine/inbox/conversation/${encodeURIComponent(phone)}`
      );
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const msgs = Array.isArray(d) ? d : [];
      setThread(msgs);
      msgs
        .filter(m => m.direction === 'INBOUND' && !m.is_read)
        .forEach(m =>
          apiFetch(`/marketing/whatsapp-engine/inbox/${m.id}/read`, { method: 'PATCH' }).catch(() => {})
        );
      if (onThreadChangeRef.current) onThreadChangeRef.current();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [phone]); // onThreadChange intentionally omitted — accessed via ref

  useEffect(() => {
    isFirstLoad.current = true;
    loadThread();
  }, [loadThread]);

  // Auto-scroll to bottom on first load and when thread grows
  useEffect(() => {
    if (thread.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'instant' : 'smooth' });
      isFirstLoad.current = false;
    }
  }, [thread]);

  // Single stable interval — recreated only when phone changes (not on every parent render).
  useEffect(() => {
    const t = setInterval(() => loadThread(true), 15000);
    return () => clearInterval(t);
  }, [loadThread]);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true); setReplyError(null);
    const lastInbound = [...thread].reverse().find(m => m.direction === 'INBOUND');
    if (!lastInbound) {
      setReplyError('No inbound message found to reply to');
      setSending(false);
      return;
    }
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/inbox/${lastInbound.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || `Error ${r.status}`);
      }
      setReplyText('');
      setFb('Message sent');
      setTimeout(() => setFb(null), 2000);
      await loadThread(true);
    } catch (e) {
      setReplyError(e.message);
    } finally {
      setSending(false);
    }
  };

  const lastInbound = [...thread].reverse().find(m => m.direction === 'INBOUND');
  const hasLead = lastInbound?.crm_lead_created || lastInbound?.crm_lead_id;
  const viaPhone =
    lastInbound?.number_phone ??
    (lastInbound?.number_id ? numberMap[lastInbound.number_id] : null);
  const displayName = customerName || phone;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: '#0d6efd', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13,
          }}>
            {getInitials(customerName, phone)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{displayName}</div>
            {customerName && (
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{phone}</div>
            )}
            {viaPhone && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>via {viaPhone}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {!hasLead && (
            <button
              style={{
                background: '#198754', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
              onClick={() => {
                const clean = (phone || '').replace(/^\+91/, '');
                navigate(`/crm/leads/new?phone=${encodeURIComponent(clean)}`);
              }}
            >
              + CRM Lead
            </button>
          )}
          {hasLead && lastInbound?.crm_lead_id && (
            <span style={{
              fontSize: 11, background: '#dcfce7', color: '#166534',
              padding: '3px 8px', borderRadius: 10, fontWeight: 700,
            }}>
              Lead #{lastInbound.crm_lead_id}
            </span>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages (scrollable flex-1) */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        background: '#f9fafb',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingTop: 24 }}>Loading…</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: '#dc3545', background: '#fff5f5', padding: '8px 12px', borderRadius: 6 }}>
            {error}
          </div>
        )}
        {!loading && thread.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingTop: 40 }}>No messages yet</div>
        )}
        {thread.map(msg => {
          const isOut = msg.direction === 'OUTBOUND';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                background: isOut ? '#0d6efd' : '#fff',
                color: isOut ? '#fff' : '#111827',
                padding: '9px 13px',
                borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                border: isOut ? 'none' : '1px solid #e5e7eb',
              }}>
                {msg.body}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                {isOut ? 'You' : 'Customer'} · {formatTime(msg.timestamp)}
                {msg.number_phone && !isOut && (
                  <span style={{ marginLeft: 5 }}>via {msg.number_phone}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box — sticky at bottom */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 12px', background: '#fff', flexShrink: 0 }}>
        {replyError && (
          <div style={{ fontSize: 11, color: '#dc3545', marginBottom: 5 }}>{replyError}</div>
        )}
        {fb && (
          <div style={{ fontSize: 11, color: '#198754', marginBottom: 5 }}>✓ {fb}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            style={{
              flex: 1, padding: '8px 10px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 13, resize: 'none', height: 60,
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.45,
            }}
            placeholder="Type a reply…"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendReply();
              }
            }}
          />
          <button
            style={{
              background: sending || !replyText.trim() ? '#e5e7eb' : '#0d6efd',
              color: sending || !replyText.trim() ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: 8,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', alignSelf: 'flex-end',
            }}
            disabled={sending || !replyText.trim()}
            onClick={sendReply}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Ctrl+Enter to send</div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all',          label: 'All'          },
  { value: 'awaiting',     label: 'Awaiting'     },
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'unread',       label: 'Unread'       },
];

// ── Main inbox ────────────────────────────────────────────────────────────────

export default function WaInbox() {
  const navigate = useNavigate();

  // Data
  const [replies, setReplies] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Filters
  const [filter, setFilter]           = useState('all');
  const [numberFilter, setNumberFilter] = useState('');
  const [search, setSearch]           = useState('');

  // Selected conversation
  const [activePhone, setActivePhone]           = useState(null);
  const [activeCustomerName, setActiveCustomerName] = useState(null);

  // Per-item feedback after "Mark Linked"
  const [creatingLeadId, setCreatingLeadId] = useState(null);
  const [feedback, setFeedback]             = useState({});

  // Responsive
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'thread'

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  // Inflight guard: prevents concurrent inbox+numbers fetches from stacking up when
  // the 30s interval fires while a manual refresh or thread-close fetch is in progress.
  const loadInFlightRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [rr, nr] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/inbox'),
        apiFetch('/marketing/whatsapp-engine/numbers'),
      ]);
      if (!rr.ok) throw new Error(`Server error ${rr.status}`);
      const [rd, nd] = await Promise.all([rr.json(), nr.ok ? nr.json() : []]);
      setReplies(Array.isArray(rd) ? rd : []);
      setNumbers(Array.isArray(nd) ? nd : []);
    } catch (e) {
      setError(e?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 s (silent — no loading flash)
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  // ── Derived maps ──────────────────────────────────────────────────────────

  const numberMap       = Object.fromEntries(numbers.map(n => [n.id, n.phone]));
  const numberStatusMap = Object.fromEntries(numbers.map(n => [n.id, n.waState]));
  const replyNumberIds  = [...new Set(replies.map(r => r.number_id).filter(Boolean))];

  // ── Actions ───────────────────────────────────────────────────────────────

  const openInCrm = (item, e) => {
    e.stopPropagation();
    const phone = (item.customer_phone || '').replace(/^\+91/, '');
    navigate(`/crm/leads/new?phone=${encodeURIComponent(phone)}`);
  };

  const markLinked = async (item, e) => {
    e.stopPropagation();
    const replyId = item.latest_reply_id;
    setCreatingLeadId(replyId);
    try {
      const leadIdStr = window.prompt('Enter the CRM lead ID to link (or 0 to mark as handled):');
      if (leadIdStr === null) return;
      const leadId = parseInt(leadIdStr, 10) || 0;
      const res = await apiFetch(`/marketing/whatsapp-engine/inbox/${replyId}/lead`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setFeedback(prev => ({
        ...prev,
        [replyId]: { ok: true, msg: leadId ? `Linked to Lead #${leadId}` : 'Marked handled' },
      }));
      await load(true);
    } catch (e2) {
      setFeedback(prev => ({ ...prev, [replyId]: { ok: false, msg: e2?.message || 'Failed' } }));
    } finally {
      setCreatingLeadId(null);
    }
  };

  const handleOpenThread = (item) => {
    setActivePhone(item.customer_phone);
    setActiveCustomerName(item.customer_name || null);
    if (isMobile) setMobileView('thread');
  };

  const handleCloseThread = () => {
    setActivePhone(null);
    setActiveCustomerName(null);
    setMobileView('list');
    load(true);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = replies.filter(r => {
    if (filter === 'awaiting'     && (r.crm_lead_created || r.crm_lead_id)) return false;
    if (filter === 'lead_created' && !r.crm_lead_created && !r.crm_lead_id) return false;
    if (filter === 'unread'       && !r.unread_count) return false;
    if (numberFilter && r.number_id !== numberFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch  = (r.customer_name  || '').toLowerCase().includes(q);
      const phoneMatch = (r.customer_phone || '').includes(q);
      const msgMatch   = (r.latest_message || '').toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !msgMatch) return false;
    }
    return true;
  });

  const unreadCount   = replies.filter(r => r.unread_count > 0).length;
  const awaitingCount = replies.filter(r => !r.crm_lead_created && !r.crm_lead_id).length;

  // ── Layout visibility ─────────────────────────────────────────────────────

  const showList   = !isMobile || mobileView === 'list';
  const showThread = !isMobile || mobileView === 'thread';

  const paneHeight = isMobile ? 'calc(100vh - 215px)' : 'calc(100vh - 160px)';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="WhatsApp Inbox"
      subtitle="Customer replies from campaigns"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span style={{
              background: '#dbeafe', color: '#1d4ed8',
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            }}>
              {unreadCount} unread
            </span>
          )}
          {awaitingCount > 0 && (
            <span style={{
              background: '#fef9c3', color: '#854d0e',
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            }}>
              {awaitingCount} awaiting
            </span>
          )}
          <button
            style={{
              background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      {/* Two-pane container */}
      <div style={{
        display: 'flex',
        height: paneHeight,
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
      }}>

        {/* ── LEFT: Conversation list ── */}
        {showList && (
          <div style={{
            width: isMobile ? '100%' : (activePhone ? 360 : '100%'),
            minWidth: isMobile ? undefined : (activePhone ? 300 : undefined),
            maxWidth: isMobile ? undefined : (activePhone ? 400 : undefined),
            display: 'flex',
            flexDirection: 'column',
            borderRight: !isMobile && activePhone ? '1px solid #e2e8f0' : 'none',
            background: '#fff',
            flexShrink: 0,
          }}>

            {/* Search + filters */}
            <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search by name, phone, or message…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <div style={{
                  display: 'flex', gap: 2,
                  background: '#f8fafc', border: '1px solid #dee2e6',
                  borderRadius: 7, padding: 2,
                }}>
                  {FILTER_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setFilter(o.value)} style={{
                      background: filter === o.value ? '#fff' : 'transparent',
                      color: filter === o.value ? '#0d6efd' : '#6c757d',
                      border: filter === o.value ? '1px solid #dee2e6' : '1px solid transparent',
                      borderRadius: 5, padding: '4px 10px', fontSize: 11,
                      fontWeight: filter === o.value ? 700 : 500, cursor: 'pointer',
                    }}>{o.label}</button>
                  ))}
                </div>
                {numbers.length > 0 && (
                  <select
                    style={{
                      padding: '5px 8px', border: '1px solid #d1d5db',
                      borderRadius: 6, fontSize: 11, color: '#374151',
                    }}
                    value={numberFilter}
                    onChange={e => setNumberFilter(e.target.value)}
                  >
                    <option value="">All numbers</option>
                    {numbers.map(n => (
                      <option key={n.id} value={n.id}>{n.phone || n.id.slice(0, 8) + '…'}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                margin: '0 12px 8px',
                background: '#fff5f5', border: '1px solid #fca5a5',
                borderRadius: 6, padding: '8px 12px', color: '#dc3545', fontSize: 12,
              }}>
                {error}
                <button
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
                  onClick={() => load()}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && replies.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d', fontSize: 13 }}>
                  Loading inbox…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {search
                      ? 'No results'
                      : filter === 'awaiting'     ? 'No replies awaiting action'
                      : filter === 'lead_created' ? 'No leads created yet'
                      : filter === 'unread'       ? 'All caught up'
                      : 'Inbox is empty'}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {search
                      ? 'Try a different search term.'
                      : filter === 'all'
                      ? 'Customer replies from campaigns will appear here.'
                      : 'Try switching the filter.'}
                  </div>
                </div>
              )}

              {filtered.map(item => {
                const hasLead    = item.crm_lead_created || item.crm_lead_id;
                const isUnread   = item.unread_count > 0;
                const isActive   = activePhone === item.customer_phone;
                const chip       = waStatusChip(item.number_id ? { waState: numberStatusMap[item.number_id] } : null);
                const fb         = feedback[item.latest_reply_id];
                const numberPhone = item.number_id ? (numberMap[item.number_id] ?? null) : null;

                return (
                  <div
                    key={item.conversation_key || item.latest_reply_id}
                    onClick={() => handleOpenThread(item)}
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: isActive ? '#eff6ff' : '#fff',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: `3px solid ${
                        hasLead   ? '#16a34a'
                        : isUnread  ? '#3b82f6'
                        : isActive  ? '#0d6efd'
                        : 'transparent'
                      }`,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

                      {/* Avatar with unread badge */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: isUnread ? '#dbeafe' : '#e5e7eb',
                          color: isUnread ? '#1d4ed8' : '#374151',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                        }}>
                          {getInitials(item.customer_name, item.customer_phone)}
                        </div>
                        {isUnread && (
                          <span style={{
                            position: 'absolute', top: -1, right: -1,
                            minWidth: 14, height: 14,
                            background: '#3b82f6', borderRadius: 7,
                            border: '2px solid #fff',
                            fontSize: 8, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, padding: '0 2px',
                          }}>
                            {item.unread_count > 9 ? '9+' : item.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 1 }}>
                          <div style={{
                            fontWeight: isUnread ? 800 : 600, fontSize: 13, color: '#111827',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {item.customer_name || item.customer_phone}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                            {formatTime(item.latest_message_at)}
                          </div>
                        </div>
                        {item.customer_name && (
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                            {item.customer_phone}
                          </div>
                        )}
                        <div style={{
                          fontSize: 12,
                          color: isUnread ? '#374151' : '#6b7280',
                          fontWeight: isUnread ? 600 : 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.latest_message || <span style={{ color: '#9ca3af' }}>(no message)</span>}
                        </div>

                        {/* Status chips */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            background: chip.bg, color: chip.color,
                            padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          }}>{chip.label}</span>
                          {hasLead ? (
                            <span style={{
                              background: '#dcfce7', color: '#166534',
                              padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                            }}>
                              {item.crm_lead_id ? `Lead #${item.crm_lead_id}` : 'Lead Created'}
                            </span>
                          ) : (
                            <span style={{
                              background: '#fef9c3', color: '#854d0e',
                              padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                            }}>New Reply</span>
                          )}
                          {numberPhone && (
                            <span style={{
                              background: '#f1f5f9', color: '#475569',
                              padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                            }}>via {numberPhone}</span>
                          )}
                          {item.message_count > 1 && (
                            <span style={{
                              background: '#ede9fe', color: '#6d28d9',
                              padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                            }}>{item.message_count} msgs</span>
                          )}
                        </div>

                        {/* Inline feedback */}
                        {fb && (
                          <div style={{ fontSize: 10, color: fb.ok ? '#198754' : '#dc3545', fontWeight: 600, marginTop: 3 }}>
                            {fb.ok ? '✓' : '✗'} {fb.msg}
                          </div>
                        )}

                        {/* Quick actions (only when no lead) */}
                        {!hasLead && (
                          <div
                            style={{ display: 'flex', gap: 5, marginTop: 7 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              style={{
                                background: '#198754', color: '#fff', border: 'none',
                                borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              }}
                              onClick={e => openInCrm(item, e)}
                            >
                              Open in CRM
                            </button>
                            <button
                              style={{
                                background: '#f3f4f6', color: '#374151', border: 'none',
                                borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600,
                                cursor: creatingLeadId === item.latest_reply_id ? 'not-allowed' : 'pointer',
                                opacity: creatingLeadId === item.latest_reply_id ? 0.6 : 1,
                              }}
                              disabled={creatingLeadId === item.latest_reply_id}
                              onClick={e => markLinked(item, e)}
                            >
                              {creatingLeadId === item.latest_reply_id ? 'Saving…' : 'Mark Linked'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '6px 12px', borderTop: '1px solid #f1f5f9',
              fontSize: 11, color: '#9ca3af', flexShrink: 0,
            }}>
              {filtered.length > 0
                ? `${filtered.length} conversation${filtered.length !== 1 ? 's' : ''} · `
                : ''}
              Auto-refreshes every 30s
            </div>
          </div>
        )}

        {/* ── RIGHT: Thread panel ── */}
        {showThread && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Mobile back button */}
            {isMobile && mobileView === 'thread' && (
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button
                  style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  onClick={() => { setMobileView('list'); }}
                >
                  ← Back to inbox
                </button>
              </div>
            )}

            {activePhone ? (
              <ThreadPanel
                key={activePhone}
                phone={activePhone}
                customerName={activeCustomerName}
                numberMap={numberMap}
                onClose={handleCloseThread}
                onThreadChange={() => load(true)}
              />
            ) : (
              /* Empty-state placeholder (desktop only — on mobile this pane is hidden) */
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', color: '#9ca3af',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Select a conversation
                  </div>
                  <div style={{ fontSize: 12 }}>Click any conversation to open the thread</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
