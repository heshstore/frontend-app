import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    if (diffHours < 48) return 'Yesterday';
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

function avatarColor(name, phone) {
  const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316'];
  const key = (name || phone || '?').charCodeAt(0);
  return COLORS[key % COLORS.length];
}

function shortPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 4 ? '…' + digits.slice(-4) : phone;
}

// +919176852555 → +91 9176••2555  (shows first 4, masks middle 2, shows last 4)
function maskedPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (local.length !== 10) return local.length > 0 ? `+91 ${local}` : '';
  return `+91 ${local.slice(0, 4)}••${local.slice(-4)}`;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1047, ctx.currentTime);
    osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function showBrowserNotification(count, name) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('WhatsApp Inbox', {
      body: `${count} new message${count > 1 ? 's' : ''}${name ? ` from ${name}` : ''}`,
      icon: '/logo192.png',
      tag: 'wa-inbox',
      renotify: true,
    });
    setTimeout(() => n.close(), 5000);
  } catch {}
}

// ── Thread panel (right pane) ────────────────────────────────────────────────

function ThreadPanel({ phone, customerName, numberMap, telecallerMap, onClose, onThreadChange, onMarkLinked, isMobile }) {
  const navigate = useNavigate();
  const [thread, setThread]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const [replyError, setReplyError] = useState(null);
  const [fb, setFb]               = useState(null);

  // Product search
  const [prodOpen, setProdOpen]       = useState(false);
  const [prodQuery, setProdQuery]     = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);

  const bottomRef       = useRef(null);
  const isFirstLoad     = useRef(true);
  const onThreadChangeRef = useRef(onThreadChange);
  useEffect(() => { onThreadChangeRef.current = onThreadChange; });
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
  }, [phone]);

  useEffect(() => {
    isFirstLoad.current = true;
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (thread.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'instant' : 'smooth' });
      isFirstLoad.current = false;
    }
  }, [thread]);

  useEffect(() => {
    const t = setInterval(() => loadThread(true), 15000);
    return () => clearInterval(t);
  }, [loadThread]);

  // Product search with 300ms debounce
  const fetchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProdResults([]); return; }
    setProdLoading(true);
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/inbox/products?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setProdResults(await r.json());
    } catch {} finally {
      setProdLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!prodOpen) return;
    const t = setTimeout(() => fetchProducts(prodQuery), 300);
    return () => clearTimeout(t);
  }, [prodQuery, prodOpen, fetchProducts]);

  const insertProduct = (p) => {
    const handle = p.handle ? `https://heshstore.in/products/${p.handle}` : '';
    const price  = p.retailPrice > 0 ? `₹${Number(p.retailPrice).toLocaleString('en-IN')}` : '';
    const lines  = [`*${p.itemName}*`, p.sku ? `SKU: ${p.sku}` : null, price, handle].filter(Boolean);
    setReplyText(lines.join('\n'));
    setProdOpen(false);
    setProdQuery('');
    setProdResults([]);
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true); setReplyError(null);
    const lastInbound = [...thread].reverse().find(m => m.direction === 'INBOUND');
    if (!lastInbound) { setReplyError('No inbound message to reply to'); setSending(false); return; }
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
      setFb('Sent');
      setTimeout(() => setFb(null), 2000);
      await loadThread(true);
    } catch (e) {
      setReplyError(e.message);
    } finally {
      setSending(false);
    }
  };

  const lastInbound = [...thread].reverse().find(m => m.direction === 'INBOUND');
  const hasLead     = thread.some(m => m.direction === 'INBOUND' && (m.crm_lead_created || m.crm_lead_id));
  const viaPhone    = lastInbound?.number_phone ?? (lastInbound?.number_id ? numberMap[lastInbound.number_id] : null);
  const activeTc    = lastInbound?.number_id && telecallerMap ? telecallerMap[lastInbound.number_id] : null;
  const displayName = customerName || phone;
  const color       = avatarColor(customerName, phone);
  const cleanPhone  = (phone || '').replace(/^\+91/, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* Header */}
      <div style={{
        padding: isMobile ? '10px 12px' : '12px 14px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc', flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: '#0d6efd',
                cursor: 'pointer', padding: '4px 0', fontSize: 20,
                lineHeight: 1, flexShrink: 0, minWidth: 28, minHeight: 40,
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Back to inbox"
            >←</button>
          )}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13,
          }}>
            {getInitials(customerName, phone)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{displayName}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 6, alignItems: 'center' }}>
              {customerName && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phone}</span>}
              {viaPhone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  {activeTc && (
                    <span style={{ background: activeTc.color, color: '#fff', padding: '0 5px', borderRadius: 3, fontWeight: 800, fontSize: 9, lineHeight: '14px' }}>
                      {activeTc.label}
                    </span>
                  )}
                  <span style={{ color: activeTc ? activeTc.color : '#9ca3af', fontWeight: activeTc ? 600 : 400 }}>
                    {maskedPhone(viaPhone)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!hasLead && (
            <>
              <button
                style={{
                  background: '#198754', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', minHeight: 30,
                }}
                onClick={() => navigate(`/crm/leads/new?phone=${encodeURIComponent(cleanPhone)}`)}
              >+ Lead</button>
              <button
                style={{
                  background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', minHeight: 30,
                }}
                onClick={() => navigate(`/crm/customers/new?phone=${encodeURIComponent(cleanPhone)}&name=${encodeURIComponent(customerName || '')}`)}
              >+ Customer</button>
              {lastInbound && (
                <button
                  style={{
                    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                    borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 30,
                  }}
                  onClick={() => onMarkLinked && onMarkLinked(lastInbound.id)}
                >Link</button>
              )}
            </>
          )}
          {hasLead && lastInbound?.crm_lead_id && (
            <span style={{
              fontSize: 11, background: '#dcfce7', color: '#166534',
              padding: '4px 8px', borderRadius: 10, fontWeight: 700,
            }}>Lead #{lastInbound.crm_lead_id}</span>
          )}
          {!isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                color: '#9ca3af', lineHeight: 1, padding: 4,
                minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Close thread"
            >✕</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
        background: '#f9fafb',
      }}>
        {loading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingTop: 32 }}>Loading…</div>}
        {error   && <div style={{ fontSize: 12, color: '#dc3545', background: '#fff5f5', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
        {!loading && thread.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingTop: 48 }}>No messages yet</div>}
        {thread.map(msg => {
          const isOut = msg.direction === 'OUTBOUND';
          const tc    = msg.number_id && telecallerMap ? telecallerMap[msg.number_id] : null;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%',
                background: isOut ? '#0d6efd' : '#fff',
                color: isOut ? '#fff' : '#111827',
                padding: '8px 12px',
                borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                border: isOut ? 'none' : '1px solid #e5e7eb',
              }}>{msg.body}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, paddingLeft: 4, paddingRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{isOut ? 'You' : 'Customer'} · {formatTime(msg.timestamp)}</span>
                {tc && (
                  <span style={{
                    background: tc.color, color: '#fff',
                    padding: '0 5px', borderRadius: 3,
                    fontWeight: 800, fontSize: 9, lineHeight: '15px',
                  }}>{tc.label}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Product search panel — slides in above reply box */}
      {prodOpen && (
        <div style={{
          borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0,
          maxHeight: 220, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '7px 12px 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              placeholder="Search by name or SKU…"
              value={prodQuery}
              onChange={e => setProdQuery(e.target.value)}
              style={{
                flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
                fontSize: 12, outline: 'none', background: '#fff',
              }}
            />
            <button
              onClick={() => { setProdOpen(false); setProdQuery(''); setProdResults([]); }}
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#9ca3af', padding: '4px 6px' }}
            >✕</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 8px' }}>
            {prodLoading && (
              <div style={{ padding: 12, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>Searching…</div>
            )}
            {!prodLoading && prodQuery && prodResults.length === 0 && (
              <div style={{ padding: 12, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>No products found</div>
            )}
            {prodResults.map(p => (
              <div
                key={p.id}
                onClick={() => insertProduct(p)}
                style={{
                  display: 'flex', gap: 8, alignItems: 'center', padding: '5px 4px',
                  borderBottom: '1px solid #f1f5f9', cursor: 'pointer', borderRadius: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {p.image ? (
                  <img src={p.image} alt="" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: 38, height: 38, background: '#f1f5f9', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.itemName}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>
                    {p.sku && <span style={{ marginRight: 6 }}>{p.sku}</span>}
                    {p.retailPrice > 0 && <span style={{ color: '#059669', fontWeight: 600 }}>₹{Number(p.retailPrice).toLocaleString('en-IN')}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>Use →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply box */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 12px', background: '#fff', flexShrink: 0 }}>
        {replyError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#dc3545' }}>✗ {replyError}</span>
            <button
              onClick={sendReply}
              disabled={sending}
              style={{
                fontSize: 11, color: '#dc3545', background: 'none',
                border: '1px solid #dc3545', borderRadius: 4,
                padding: '1px 8px', cursor: 'pointer', fontWeight: 600,
              }}
            >↺ Retry</button>
          </div>
        )}
        {fb        && <div style={{ fontSize: 11, color: '#198754', marginBottom: 5 }}>✓ {fb}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button
            title="Search products"
            onClick={() => setProdOpen(o => !o)}
            style={{
              background: prodOpen ? '#eff6ff' : '#f3f4f6',
              border: `1px solid ${prodOpen ? '#93c5fd' : '#d1d5db'}`,
              borderRadius: 8, padding: '0 12px', fontSize: 16,
              cursor: 'pointer', height: 56, flexShrink: 0,
              color: prodOpen ? '#1d4ed8' : '#6b7280',
            }}
          >📦</button>
          <textarea
            style={{
              flex: 1, padding: '8px 10px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 13, resize: 'none', height: 56,
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.45,
              WebkitAppearance: 'none',
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
              padding: '0 18px', fontSize: 13, fontWeight: 600,
              cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', height: 56, minWidth: 60,
            }}
            disabled={sending || !replyText.trim()}
            onClick={sendReply}
          >{sending ? '…' : 'Send'}</button>
        </div>
        {!isMobile && <div style={{ fontSize: 10, color: '#b0b7c0', marginTop: 3 }}>Ctrl+Enter to send</div>}
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TELECALLER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

const FILTER_OPTIONS = [
  { value: 'all',          label: 'All'      },
  { value: 'awaiting',     label: 'Awaiting' },
  { value: 'lead_created', label: 'Leads'    },
  { value: 'unread',       label: 'Unread'   },
  { value: 'archived',     label: 'Archived' },
];

// ── Telecaller status bar ─────────────────────────────────────────────────────

function TelecallerBar({ numbers, telecallerMap }) {
  if (!numbers.length) return null;
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '7px 12px',
      borderBottom: '1px solid #e8edf2',
      background: '#f8fafc', flexShrink: 0, flexWrap: 'wrap',
    }}>
      {numbers.map(n => {
        const tc = telecallerMap[n.id];
        if (!tc) return null;
        const connected = n.waState === 'ready';
        return (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{
              background: tc.color, color: '#fff',
              padding: '3px 7px', borderRadius: 4,
              fontWeight: 800, fontSize: 11, lineHeight: '16px',
              flexShrink: 0, marginTop: 1,
            }}>{tc.label}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{tc.name}</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{maskedPhone(n.phone)}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: connected ? '#16a34a' : '#9ca3af' }}>
                {connected ? '●' : '○'} {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Conversation card ─────────────────────────────────────────────────────────

function ConvCard({ item, isActive, isPinned, isArchived, numberMap, telecallerMap, feedback, onOpen, onPin, onArchive }) {
  const hasLead    = item.crm_lead_created || item.crm_lead_id;
  const isUnread   = item.unread_count > 0;
  const numberPhone = item.number_id ? (numberMap[item.number_id] ?? null) : null;
  const fb         = feedback[item.latest_reply_id];
  const color      = avatarColor(item.customer_name, item.customer_phone);
  const src        = item.customer_source;
  const srcBadge   = src === 'CUSTOMER_DB'
    ? { label: 'Customer', bg: '#dcfce7', fg: '#166534' }
    : src === 'PROMO_DB'
    ? { label: 'Promo',    bg: '#fff7ed', fg: '#c2410c' }
    : { label: 'Unknown',  bg: '#f1f5f9', fg: '#64748b' };
  const numTc = item.number_id && telecallerMap ? telecallerMap[item.number_id] : null;

  return (
    <div
      onClick={onOpen}
      style={{
        overflow: 'hidden',
        padding: '10px 12px',
        cursor: 'pointer',
        background: isActive ? '#eff6ff' : (isArchived ? '#fafafa' : '#fff'),
        borderBottom: '1px solid #f1f5f9',
        borderLeft: `3px solid ${
          isPinned  ? '#f59e0b'
          : hasLead   ? '#16a34a'
          : isUnread  ? '#3b82f6'
          : isActive  ? '#0d6efd'
          : 'transparent'
        }`,
        opacity: isArchived ? 0.72 : 1,
        transition: 'background 0.1s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#eff6ff' : (isArchived ? '#fafafa' : '#fff'); }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

        {/* Avatar with unread badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: isUnread ? color : '#e5e7eb',
            color: isUnread ? '#fff' : '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14,
          }}>
            {getInitials(item.customer_name, item.customer_phone)}
          </div>
          {isUnread && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16,
              background: '#3b82f6', borderRadius: 8,
              border: '2px solid #fff',
              fontSize: 9, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, padding: '0 3px', lineHeight: 1,
            }}>
              {item.unread_count > 9 ? '9+' : item.unread_count}
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1: Name + time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
            <div style={{
              fontWeight: isUnread ? 700 : 600, fontSize: 13, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>
              {isPinned   && <span style={{ marginRight: 3, fontSize: 10 }}>📌</span>}
              {isArchived && <span style={{ marginRight: 3, fontSize: 10 }}>📁</span>}
              {item.customer_name || item.customer_phone}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatTime(item.latest_message_at)}
            </div>
          </div>

          {/* Row 2: Preview */}
          <div style={{
            fontSize: 12,
            color: isUnread ? '#374151' : '#6b7280',
            fontWeight: isUnread ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 4,
          }}>
            {item.latest_message || <span style={{ color: '#b0b7c0', fontStyle: 'italic' }}>No message</span>}
          </div>

          {/* Row 3: Badges + actions */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
            {hasLead ? (
              <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {item.crm_lead_id ? `Lead #${item.crm_lead_id}` : 'Lead'}
              </span>
            ) : (
              <span style={{ background: srcBadge.bg, color: srcBadge.fg, padding: '1px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {srcBadge.label}
              </span>
            )}
            {numberPhone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f1f5f9', color: '#64748b', padding: '1px 5px 1px 4px', borderRadius: 6, fontSize: 10, flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
                {numTc && (
                  <span style={{ background: numTc.color, color: '#fff', padding: '0 4px', borderRadius: 3, fontWeight: 800, fontSize: 9, lineHeight: '13px' }}>{numTc.label}</span>
                )}
                {maskedPhone(numberPhone)}
              </span>
            )}
            {fb && (
              <span style={{ fontSize: 10, color: fb.ok ? '#198754' : '#dc3545', fontWeight: 600 }}>
                {fb.ok ? '✓' : '✗'} {fb.msg}
              </span>
            )}
            {/* Pin */}
            <button
              title={isPinned ? 'Unpin' : 'Pin (max 10)'}
              onClick={e => { e.stopPropagation(); onPin(); }}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 2px', fontSize: 12,
                color: isPinned ? '#f59e0b' : '#d1d5db',
                opacity: isPinned ? 1 : 0.5,
                minWidth: 22, minHeight: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >📌</button>
            {/* Archive */}
            <button
              title={isArchived ? 'Unarchive' : 'Archive'}
              onClick={e => { e.stopPropagation(); onArchive(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 2px', fontSize: 12,
                color: isArchived ? '#6366f1' : '#d1d5db',
                opacity: isArchived ? 1 : 0.5,
                minWidth: 22, minHeight: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >📁</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main inbox ────────────────────────────────────────────────────────────────

export default function WaInbox() {
  // Data
  const [replies, setReplies] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Filters
  const [filter, setFilter]             = useState('all');
  const [numberFilter, setNumberFilter] = useState('');
  const [search, setSearch]             = useState('');

  // Selected conversation
  const [activePhone, setActivePhone]               = useState(null);
  const [activeCustomerName, setActiveCustomerName] = useState(null);

  // Per-item feedback
  const [feedback, setFeedback] = useState({});

  // Persistent pins — localStorage backed, max 10
  const [pinnedPhones, setPinnedPhones] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wa_inbox_pins') || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch { return new Set(); }
  });

  // Persistent archives — localStorage backed
  const [archivedPhones, setArchivedPhones] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wa_inbox_archives') || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch { return new Set(); }
  });

  // New-message notification tracking
  const prevUnreadRef = useRef(-1);

  // Responsive
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768);
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Request browser notification permission once on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

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
      const newReplies = Array.isArray(rd) ? rd : [];
      const newTotal   = newReplies.reduce((s, r) => s + Number(r.unread_count || 0), 0);

      // Notify on new messages since last poll
      if (prevUnreadRef.current >= 0 && newTotal > prevUnreadRef.current) {
        const delta  = newTotal - prevUnreadRef.current;
        playChime();
        const latest = newReplies.filter(r => Number(r.unread_count) > 0)[0];
        showBrowserNotification(delta, latest?.customer_name || latest?.customer_phone);
      }
      prevUnreadRef.current = newTotal;

      setReplies(newReplies);
      setNumbers(Array.isArray(nd) ? nd : []);
    } catch (e) {
      setError(e?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), 90000);
    return () => clearInterval(t);
  }, [load]);

  // ── Derived counts + document title ──────────────────────────────────────

  const unreadCount   = replies.filter(r => r.unread_count > 0).length;
  const awaitingCount = replies.filter(r => !r.crm_lead_created && !r.crm_lead_id).length;

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) WhatsApp Inbox` : 'WhatsApp Inbox';
    return () => { document.title = 'WhatsApp Inbox'; };
  }, [unreadCount]);

  // ── Derived maps ──────────────────────────────────────────────────────────

  const numberMap     = Object.fromEntries(numbers.map(n => [n.id, n.phone]));
  const sortedNumbers = [...numbers].sort((a, b) =>
    (a.name || a.phone || '').localeCompare(b.name || b.phone || '')
  );
  const telecallerMap = Object.fromEntries(
    sortedNumbers.map((n, i) => [n.id, {
      label:     `T${i + 1}`,
      color:     TELECALLER_COLORS[i] ?? '#9ca3af',
      name:      n.name || shortPhone(n.phone) || `T${i + 1}`,
      connected: n.waState === 'ready',
    }])
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const markLinkedById = async (replyId) => {
    if (!replyId) return;
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
      setFeedback(prev => ({ ...prev, [replyId]: { ok: true, msg: leadId ? `Linked #${leadId}` : 'Handled' } }));
      await load(true);
    } catch (e2) {
      setFeedback(prev => ({ ...prev, [replyId]: { ok: false, msg: e2?.message || 'Failed' } }));
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

  const togglePin = (phone) => {
    setPinnedPhones(prev => {
      const n = new Set(prev);
      if (n.has(phone)) {
        n.delete(phone);
      } else {
        if (n.size >= 10) return prev; // max 10 pinned
        n.add(phone);
      }
      localStorage.setItem('wa_inbox_pins', JSON.stringify([...n]));
      return n;
    });
  };

  const toggleArchive = (phone) => {
    setArchivedPhones(prev => {
      const n = new Set(prev);
      n.has(phone) ? n.delete(phone) : n.add(phone);
      localStorage.setItem('wa_inbox_archives', JSON.stringify([...n]));
      return n;
    });
  };

  // ── Filtering + sorting ───────────────────────────────────────────────────

  const filtered = replies
    .filter(r => {
      if (filter === 'archived' && !archivedPhones.has(r.customer_phone)) return false;
      if (filter !== 'archived' &&  archivedPhones.has(r.customer_phone)) return false;
      if (filter === 'awaiting'     && (r.crm_lead_created || r.crm_lead_id)) return false;
      if (filter === 'lead_created' && !r.crm_lead_created && !r.crm_lead_id) return false;
      if (filter === 'unread'       && !r.unread_count) return false;
      if (numberFilter && r.number_id !== numberFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.customer_name  || '').toLowerCase().includes(q) &&
            !(r.customer_phone || '').includes(q) &&
            !(r.latest_message || '').toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ap = pinnedPhones.has(a.customer_phone) ? 0 : 1;
      const bp = pinnedPhones.has(b.customer_phone) ? 0 : 1;
      return ap - bp;
    });

  // ── Layout ────────────────────────────────────────────────────────────────

  const showList   = !isMobile || mobileView === 'list';
  const showThread = !isMobile || mobileView === 'thread';
  const paneHeight = isMobile ? 'calc(100dvh - 170px)' : 'calc(100vh - 150px)';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="WhatsApp Inbox"
      subtitle="Customer replies from campaigns"
      hideBack
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              {unreadCount} unread
            </span>
          )}
          {!isMobile && awaitingCount > 0 && (
            <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              {awaitingCount} new
            </span>
          )}
          <button
            style={{
              background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, minHeight: 32,
            }}
            onClick={() => load()} disabled={loading}
          >{loading ? '…' : '↻'}</button>
        </div>
      }
    >
      <div style={{
        display: 'flex', height: paneHeight,
        border: '1px solid #e2e8f0', borderRadius: isMobile ? 8 : 10,
        overflow: 'hidden', background: '#fff',
      }}>

        {/* ── LEFT: Conversation list ── */}
        {showList && (
          <div style={{
            width: isMobile ? '100%' : (activePhone ? 320 : '100%'),
            minWidth: isMobile ? undefined : (activePhone ? 280 : undefined),
            maxWidth: isMobile ? undefined : (activePhone ? 360 : undefined),
            display: 'flex', flexDirection: 'column',
            borderRight: !isMobile && activePhone ? '1px solid #e2e8f0' : 'none',
            background: '#fff', flexShrink: 0,
          }}>

            <TelecallerBar numbers={sortedNumbers} telecallerMap={telecallerMap} />

            {/* Search + filters */}
            <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 20,
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  marginBottom: 8, background: '#f8fafc', WebkitAppearance: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
                <div style={{
                  display: 'flex', gap: 2, flexShrink: 0,
                  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: 2,
                }}>
                  {FILTER_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setFilter(o.value)} style={{
                      background: filter === o.value ? '#fff' : 'transparent',
                      color: filter === o.value ? '#0d6efd' : '#6c757d',
                      border: filter === o.value ? '1px solid #dee2e6' : '1px solid transparent',
                      borderRadius: 6, padding: '4px 10px', fontSize: 11,
                      fontWeight: filter === o.value ? 700 : 500,
                      cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 28,
                    }}>{o.label}</button>
                  ))}
                </div>
                {numbers.length > 1 && (
                  <select
                    style={{
                      padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6,
                      fontSize: 11, color: '#374151', background: '#f8fafc', flexShrink: 0, minHeight: 32,
                    }}
                    value={numberFilter}
                    onChange={e => setNumberFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {numbers.map(n => (
                      <option key={n.id} value={n.id}>{shortPhone(n.phone) || n.id.slice(0, 8) + '…'}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                margin: '0 10px 8px', background: '#fff5f5', border: '1px solid #fca5a5',
                borderRadius: 6, padding: '8px 12px', color: '#dc3545', fontSize: 12,
              }}>
                {error}
                <button style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }} onClick={() => load()}>Retry</button>
              </div>
            )}

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {loading && replies.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#6c757d', fontSize: 13 }}>Loading…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#374151' }}>
                    {search ? 'No results'
                      : filter === 'awaiting'     ? 'No replies awaiting'
                      : filter === 'lead_created' ? 'No leads created yet'
                      : filter === 'unread'       ? 'All caught up'
                      : filter === 'archived'     ? 'No archived conversations'
                      : 'Inbox is empty'}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {search ? 'Try a different search term.' : filter === 'all' ? 'Customer replies will appear here.' : 'Try switching the filter.'}
                  </div>
                </div>
              )}

              {filtered.map(item => (
                <ConvCard
                  key={item.conversation_key || item.latest_reply_id}
                  item={item}
                  isActive={activePhone === item.customer_phone}
                  isPinned={pinnedPhones.has(item.customer_phone)}
                  isArchived={archivedPhones.has(item.customer_phone)}
                  numberMap={numberMap}
                  telecallerMap={telecallerMap}
                  feedback={feedback}
                  onOpen={() => handleOpenThread(item)}
                  onPin={() => togglePin(item.customer_phone)}
                  onArchive={() => toggleArchive(item.customer_phone)}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '5px 12px', borderTop: '1px solid #f1f5f9', fontSize: 10, color: '#b0b7c0', flexShrink: 0 }}>
              {filtered.length > 0 ? `${filtered.length} conversation${filtered.length !== 1 ? 's' : ''} · ` : ''}
              auto-refreshes 30s
              {pinnedPhones.size > 0 && ` · ${pinnedPhones.size} pinned`}
            </div>
          </div>
        )}

        {/* ── RIGHT: Thread panel ── */}
        {showThread && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {activePhone ? (
              <ThreadPanel
                key={activePhone}
                phone={activePhone}
                customerName={activeCustomerName}
                numberMap={numberMap}
                telecallerMap={telecallerMap}
                onClose={handleCloseThread}
                onThreadChange={() => load(true)}
                onMarkLinked={markLinkedById}
                isMobile={isMobile}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#9ca3af' }}>
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Select a conversation</div>
                  <div style={{ fontSize: 12 }}>Tap any conversation to open the thread</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
