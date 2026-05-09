import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const PRIORITY_COLOR = {
  CRITICAL: { bg: '#fff1f2', border: '#fecaca', dot: '#dc2626' },
  HIGH:     { bg: '#fff7ed', border: '#fed7aa', dot: '#ea580c' },
  MEDIUM:   { bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  LOW:      { bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af' },
};

const ENTITY_ROUTE = {
  job:     (id) => `/production/jobs/${id}`,
  order:   (id) => `/orders/${id}`,
  payment: (id) => `/accounts/history/${id}`,
  lead:    (id) => `/crm/leads/${id}`,
};

const TYPE_ICON = {
  ACTION:     '⚡',
  REMINDER:   '⏰',
  INFO:       'ℹ️',
  MOTIVATION: '🎉',
};

const TABS = [
  { key: '',           label: 'All',        icon: '🔔' },
  { key: 'CRM',        label: 'CRM',        icon: '👥' },
  { key: 'PRODUCTION', label: 'Production', icon: '⚙️' },
  { key: 'ACCOUNTS',   label: 'Accounts',   icon: '💰' },
  { key: 'DISPATCH',   label: 'Dispatch',   icon: '🚚' },
  { key: 'SYSTEM',     label: 'System',     icon: '⚠️' },
];

const RANK = { CRITICAL: -1, HIGH: 0, MEDIUM: 1, LOW: 2 };

function buildGroups(notifications) {
  const map = new Map();
  for (const n of notifications) {
    const key = n.entity_type && n.entity_id
      ? `${n.entity_type}:${n.entity_id}`
      : `solo:${n.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  return [...map.values()].sort((ga, gb) => {
    const pa = Math.min(...ga.map(n => RANK[n.priority] ?? 2));
    const pb = Math.min(...gb.map(n => RANK[n.priority] ?? 2));
    if (pa !== pb) return pa - pb;
    const ta = Math.max(...ga.map(n => new Date(n.created_at).getTime()));
    const tb = Math.max(...gb.map(n => new Date(n.created_at).getTime()));
    return tb - ta;
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3_600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function NotifGroup({ group, onClose, onDismissGroup }) {
  const navigate   = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const lead    = group[0];
  const colors  = PRIORITY_COLOR[lead.priority] ?? PRIORITY_COLOR.LOW;
  const route   = lead.action_url
    ?? (lead.entity_type && lead.entity_id
      ? ENTITY_ROUTE[lead.entity_type]?.(lead.entity_id)
      : null);
  const unread  = group.filter(n => !n.is_read).length;
  const primary = group.reduce((best, n) =>
    (RANK[n.priority] ?? 2) < (RANK[best.priority] ?? 2) ? n : best
  , group[0]);

  const handleNavigate = () => {
    if (route) { navigate(route); onClose(); }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismissGroup(group.map(n => n.id));
  };

  return (
    <div style={{
      background:   colors.bg,
      border:       `1px solid ${colors.border}`,
      borderLeft:   `3px solid ${colors.dot}`,
      borderRadius: 10,
      overflow:     'hidden',
    }}>
      <div
        onClick={handleNavigate}
        style={{ padding: '10px 12px', cursor: route ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: colors.dot, marginTop: 5, flexShrink: 0,
          }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12 }}>{TYPE_ICON[primary.type] || '🔔'}</span>
              <strong style={{ fontSize: 12, flex: '1 1 0', color: '#111827', lineHeight: 1.3 }}>
                {primary.title}
              </strong>
              {unread > 0 && (
                <span style={{
                  background: '#dc2626', color: '#fff',
                  fontSize: 9, padding: '1px 5px', borderRadius: 99,
                }}>
                  {unread}
                </span>
              )}
            </div>

            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6b7280', lineHeight: 1.45 }}>
              {primary.message}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{timeAgo(primary.created_at)}</span>
              {group.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 10, color: '#2563eb', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {expanded ? '▲ Hide' : `▼ +${group.length - 1} more`}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              background: 'none', border: 'none', padding: '2px 4px',
              fontSize: 13, color: '#d1d5db', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && group.slice(1).map((n) => (
        <div key={n.id} style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '8px 12px 8px 28px',
          background: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
            {TYPE_ICON[n.type] || '🔔'} {n.title}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{n.message}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const {
    notifications, panelOpen, setPanel,
    markAllRead, markOneRead, hideNotification,
    unreadCount, categoryCounts,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('');

  // Reset tab when panel closes
  useEffect(() => {
    if (!panelOpen) setActiveTab('');
  }, [panelOpen]);

  // ESC to close
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setPanel(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelOpen, setPanel]);

  const oneHourAgo = Date.now() - 3_600_000;
  const visible = notifications.filter(n =>
    !n.is_read || new Date(n.created_at).getTime() > oneHourAgo,
  );

  const tabFiltered = activeTab
    ? visible.filter(n => n.category === activeTab)
    : visible;

  const sorted = [...tabFiltered].sort((a, b) => {
    const p = (RANK[a.priority] ?? 2) - (RANK[b.priority] ?? 2);
    if (p !== 0) return p;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const groups = buildGroups(sorted.slice(0, 30));

  const handleDismissGroup = (ids) => {
    for (const id of ids) {
      hideNotification(id);
    }
  };

  const panelWidth = Math.min(window.innerWidth, 400);

  return (
    <>
      {panelOpen && (
        <div
          onClick={() => setPanel(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 998 }}
        />
      )}

      <div style={{
        position:      'fixed',
        top:           0,
        right:         0,
        height:        '100dvh',
        width:         panelWidth,
        background:    '#fff',
        boxShadow:     '-4px 0 24px rgba(0,0,0,0.14)',
        zIndex:        999,
        display:       'flex',
        flexDirection: 'column',
        transform:     panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition:    'transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 14px 0',
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#dc2626', color: '#fff',
                  fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none', border: '1px solid #2563eb',
                    color: '#2563eb', borderRadius: 6,
                    padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  All read
                </button>
              )}
              <button
                onClick={() => setPanel(false)}
                style={{
                  background: '#f3f4f6', border: 'none', borderRadius: 6,
                  padding: '5px 9px', fontSize: 14, cursor: 'pointer', lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: 4, overflowX: 'auto',
            scrollbarWidth: 'none', paddingBottom: 1,
          }}>
            {TABS.map(tab => {
              const count  = tab.key ? (categoryCounts[tab.key] ?? 0) : 0;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '5px 10px', borderRadius: 6, border: 'none',
                    background: active ? '#2563eb' : 'transparent',
                    color: active ? '#fff' : '#6b7280',
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: 12 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.3)' : '#dc2626',
                      color: '#fff', fontSize: 9, fontWeight: 800,
                      padding: '1px 4px', borderRadius: 99,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 60 }}>
              <div style={{ fontSize: 40 }}>🔔</div>
              <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: '#374151' }}>All caught up</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {activeTab ? `No ${activeTab} notifications` : 'No recent notifications'}
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <NotifGroup
                key={group[0].id}
                group={group}
                onClose={() => setPanel(false)}
                onDismissGroup={handleDismissGroup}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#d1d5db' }}>
            {visible.length > 30 ? `Showing 30 of ${visible.length}` : ''}
          </span>
          <button
            onClick={() => { setPanel(false); navigate('/notifications'); }}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, color: '#2563eb', fontWeight: 700, cursor: 'pointer',
            }}
          >
            View all →
          </button>
        </div>
      </div>
    </>
  );
}
