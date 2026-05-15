import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useNotifications } from '../../context/NotificationContext';
import PageLayout from '../../components/layout/PageLayout';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: '',           label: 'All',        icon: '🔔' },
  { key: 'CRM',        label: 'CRM',        icon: '👥' },
  { key: 'PRODUCTION', label: 'Production', icon: '⚙️' },
  { key: 'ACCOUNTS',   label: 'Accounts',   icon: '💰' },
  { key: 'DISPATCH',   label: 'Dispatch',   icon: '🚚' },
  { key: 'SYSTEM',     label: 'System',     icon: '⚠️' },
];

const PRIORITIES = [
  { key: '',         label: 'All Priority' },
  { key: 'CRITICAL', label: 'Critical'     },
  { key: 'HIGH',     label: 'High'         },
  { key: 'MEDIUM',   label: 'Medium'       },
  { key: 'LOW',      label: 'Low'          },
];

const PRIORITY_CONFIG = {
  CRITICAL: { color: '#dc2626', bg: '#fff1f2', border: '#fecaca', dot: '#dc2626',  label: 'CRITICAL' },
  HIGH:     { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', dot: '#ea580c',  label: 'HIGH'     },
  MEDIUM:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#d97706',  label: 'MED'      },
  LOW:      { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af',  label: 'LOW'      },
};

const ENTITY_ROUTE = {
  job:     () => '/production/execution',
  order:   (id) => `/orders/${id}`,
  payment: (id) => `/accounts/history/${id}`,
  lead:    (id) => `/crm/leads/${id}`,
};

const CATEGORY_ICON = {
  CRM: '👥', PRODUCTION: '⚙️', ACCOUNTS: '💰', DISPATCH: '🚚', SYSTEM: '⚠️',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)        return 'just now';
  if (diff < 3_600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400)    return `${Math.floor(diff / 3_600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function resolveActionUrl(notif) {
  if (notif.action_url) return notif.action_url;
  if (notif.entity_type && notif.entity_id) {
    return ENTITY_ROUTE[notif.entity_type]?.(notif.entity_id) ?? null;
  }
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterBar({ category, setCategory, priority, setPriority, unreadOnly, setUnreadOnly, categoryCounts }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: '#f4f6f9',
      paddingBottom: 10,
      borderBottom: '1px solid #e9ecef',
      marginBottom: 12,
    }}>
      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        paddingBottom: 4, scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => {
          const count = cat.key ? (categoryCounts[cat.key] ?? 0) : 0;
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 20, border: 'none',
                background: active ? '#1d4ed8' : '#fff',
                color: active ? '#fff' : '#374151',
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: active ? '0 2px 8px #1d4ed833' : '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'background 0.12s',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.3)' : '#dc2626',
                  color: '#fff', fontSize: 10, fontWeight: 800,
                  padding: '1px 5px', borderRadius: 99,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Priority + unread row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer',
          }}
        >
          {PRIORITIES.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>

        <button
          onClick={() => setUnreadOnly(v => !v)}
          style={{
            padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${unreadOnly ? '#1d4ed8' : '#d1d5db'}`,
            background: unreadOnly ? '#eff6ff' : '#fff',
            color: unreadOnly ? '#1d4ed8' : '#374151',
            fontSize: 12, fontWeight: unreadOnly ? 700 : 500, cursor: 'pointer',
          }}
        >
          Unread only
        </button>
      </div>
    </div>
  );
}

function NotifCard({ notif, onRead, onHide, onNavigate }) {
  const [hov, setHov] = useState(false);
  const cfg     = PRIORITY_CONFIG[notif.priority] ?? PRIORITY_CONFIG.LOW;
  const actionUrl = resolveActionUrl(notif);
  const unread  = !notif.is_read;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (unread ? cfg.bg : '#fafafa') : (unread ? cfg.bg : '#fff'),
        border: `1px solid ${unread ? cfg.border : '#e9ecef'}`,
        borderLeft: `4px solid ${cfg.dot}`,
        borderRadius: 10,
        padding: '12px 14px',
        transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      {/* Top row: priority badge + category + time + hide */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
          background: cfg.color, color: '#fff',
          padding: '2px 6px', borderRadius: 4,
        }}>
          {cfg.label}
        </span>

        {notif.category && (
          <span style={{
            fontSize: 10, color: '#6b7280',
            background: '#f3f4f6', padding: '2px 6px', borderRadius: 4,
          }}>
            {CATEGORY_ICON[notif.category] ?? ''} {notif.category}
          </span>
        )}

        {unread && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#2563eb', flexShrink: 0,
          }} />
        )}

        <span style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
          {timeAgo(notif.created_at)}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); onHide(notif.id); }}
          title="Hide"
          style={{
            background: 'none', border: 'none', padding: '2px 4px',
            fontSize: 13, color: '#d1d5db', cursor: 'pointer', lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13, fontWeight: unread ? 700 : 600,
        color: '#111827', marginBottom: 4, lineHeight: 1.35,
      }}>
        {notif.title}
      </div>

      {/* Message */}
      <div style={{
        fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 10,
      }}>
        {notif.message}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {actionUrl && (
          <button
            onClick={() => { onRead(notif.id); onNavigate(actionUrl); }}
            style={{
              padding: '7px 14px', borderRadius: 7,
              background: '#1d4ed8', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', minHeight: 34,
            }}
          >
            Go To →
          </button>
        )}
        {unread && (
          <button
            onClick={() => onRead(notif.id)}
            style={{
              padding: '7px 12px', borderRadius: 7,
              background: 'none', color: '#6b7280',
              border: '1px solid #d1d5db', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', minHeight: 34,
            }}
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const navigate  = useNavigate();
  const { categoryCounts, markAllRead, markOneRead, hideNotification, unreadCount } = useNotifications();
  const mountedRef = useRef(true);

  const [items,      setItems]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);

  const [category,   setCategory]   = useState('');
  const [priority,   setPriority]   = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Dedup map: prevents duplicate entries when realtime events fire
  const seenIds = useRef(new Set());

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const buildQuery = useCallback((pageNum) => {
    const params = new URLSearchParams({ page: String(pageNum) });
    if (category)  params.set('category', category);
    if (priority)  params.set('priority', priority);
    if (unreadOnly) params.set('unread', 'true');
    return `/notifications?${params.toString()}`;
  }, [category, priority, unreadOnly]);

  const loadPage = useCallback(async (pageNum, append = false) => {
    const ok = () => mountedRef.current;
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);

    try {
      const res = await apiFetch(buildQuery(pageNum));
      if (!res.ok || !ok()) return;
      const data = await res.json();
      const newItems = Array.isArray(data) ? data : (data.items ?? []);
      const newTotal = data.total ?? newItems.length;

      if (!ok()) return;

      if (append) {
        setItems(prev => {
          const merged = [...prev];
          for (const item of newItems) {
            if (!seenIds.current.has(item.id)) {
              seenIds.current.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
      } else {
        seenIds.current = new Set(newItems.map(n => n.id));
        setItems(newItems);
        setTotal(newTotal);
        setPage(1);
      }
    } catch {}
    finally {
      if (ok()) { setLoading(false); setLoadingMore(false); }
    }
  }, [buildQuery]);

  // Reload from page 1 whenever filters change
  useEffect(() => {
    mountedRef.current = true;
    loadPage(1, false);
    return () => { mountedRef.current = false; };
  }, [loadPage]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRead = useCallback(async (id) => {
    // Optimistic update in local list
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markOneRead(id);
  }, [markOneRead]);

  const handleHide = useCallback(async (id) => {
    setItems(prev => prev.filter(n => n.id !== id));
    seenIds.current.delete(id);
    await hideNotification(id);
  }, [hideNotification]);

  const handleMarkAllRead = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllRead();
  }, [markAllRead]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasMore = items.length < total;

  return (
    <PageLayout title="Notification Center">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Notification Center</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {total > 0 ? `${total} notification${total !== 1 ? 's' : ''}` : 'All caught up'}
                {unreadCount > 0 && ` · ${unreadCount} unread`}
              </div>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #d1d5db', background: '#fff',
                fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer',
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <FilterBar
          category={category}       setCategory={setCategory}
          priority={priority}       setPriority={setPriority}
          unreadOnly={unreadOnly}   setUnreadOnly={setUnreadOnly}
          categoryCounts={categoryCounts}
        />

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                height: 110, borderRadius: 10, border: '1px solid #e9ecef',
                background: 'linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>All caught up</div>
            <div style={{ fontSize: 13 }}>
              {unreadOnly ? 'No unread notifications' : 'No notifications match your filters'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(notif => (
                <NotifCard
                  key={notif.id}
                  notif={notif}
                  onRead={handleRead}
                  onHide={handleHide}
                  onNavigate={(url) => navigate(url)}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '10px 24px', borderRadius: 8,
                    border: '1px solid #d1d5db', background: '#fff',
                    fontSize: 13, fontWeight: 600, color: '#374151',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingMore ? 'Loading…' : `Load more (${total - items.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </PageLayout>
  );
}
