import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const PRIORITY_COLOR = {
  CRITICAL: { bg: '#fff1f2', border: '#dc2626', dot: '#dc2626' },
  HIGH:     { bg: '#fff1f0', border: '#dc3545', dot: '#dc3545' },
  MEDIUM:   { bg: '#fffbeb', border: '#f59e0b', dot: '#f59e0b' },
  LOW:      { bg: '#f0fff4', border: '#28a745', dot: '#28a745' },
};

const ENTITY_ROUTE = {
  job:    (id) => `/production/jobs/${id}`,
  order:  (id) => `/orders/${id}`,
  payment:(id) => `/accounts/history/${id}`,
  lead:   (id) => `/crm/leads/${id}`,
};

const TYPE_ICON = {
  ACTION:     '⚡',
  REMINDER:   '⏰',
  INFO:       'ℹ️',
  MOTIVATION: '🎉',
};

const RANK = { CRITICAL: -1, HIGH: 0, MEDIUM: 1, LOW: 2 };

// Group notifications by entity_type:entity_id. Notifications with no entity are solo groups.
function buildGroups(notifications) {
  const map = new Map();
  for (const n of notifications) {
    const key = n.entity_type && n.entity_id
      ? `${n.entity_type}:${n.entity_id}`
      : `solo:${n.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  // Sort groups: by highest-priority item in group, then by most-recent item
  return [...map.values()].sort((ga, gb) => {
    const pa = Math.min(...ga.map(n => RANK[n.priority] ?? 2));
    const pb = Math.min(...gb.map(n => RANK[n.priority] ?? 2));
    if (pa !== pb) return pa - pb;
    const ta = Math.max(...ga.map(n => new Date(n.created_at).getTime()));
    const tb = Math.max(...gb.map(n => new Date(n.created_at).getTime()));
    return tb - ta;
  });
}

function AutoLabel({ isAutomated }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
      background: isAutomated ? '#e0f2fe' : '#f3f4f6',
      color:      isAutomated ? '#0369a1' : '#6b7280',
      padding: '1px 5px', borderRadius: 3,
    }}>
      {isAutomated ? 'AUTO' : 'MANUAL'}
    </span>
  );
}

function NotifGroup({ group, onClose, onDismissGroup }) {
  const navigate  = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const lead      = group[0];
  const colors    = PRIORITY_COLOR[lead.priority] ?? PRIORITY_COLOR.LOW;
  // Prefer explicit action_url, fall back to entity-based route
  const route     = lead.action_url
    ?? (lead.entity_type && lead.entity_id
      ? ENTITY_ROUTE[lead.entity_type]?.(lead.entity_id)
      : null);
  const unread    = group.filter(n => !n.is_read).length;
  const hasMultiple = group.length > 1;

  const handleNavigate = () => {
    if (route) { navigate(route); onClose(); }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismissGroup(group.map(n => n.id));
  };

  // Collapsed view — shows the most-important notification in the group
  const primary = group.reduce((best, n) =>
    (RANK[n.priority] ?? 2) < (RANK[best.priority] ?? 2) ? n : best
  , group[0]);

  return (
    <div style={{
      background:   colors.bg,
      border:       `1px solid ${colors.border}`,
      borderRadius: 10,
      overflow:     'hidden',
    }}>
      {/* Primary row */}
      <div
        onClick={handleNavigate}
        style={{
          padding:  '10px 12px',
          cursor:   route ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          {/* Priority dot */}
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: colors.dot, marginTop: 5, flexShrink: 0,
          }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontSize: 13 }}>{TYPE_ICON[primary.type] || '🔔'}</span>
              <strong style={{ fontSize: 13, flex: '1 1 0' }}>{primary.title}</strong>
              <AutoLabel isAutomated={primary.is_automated} />
              {unread > 0 && (
                <span style={{
                  background: '#dc3545', color: '#fff',
                  fontSize: 10, padding: '1px 5px', borderRadius: 99, flexShrink: 0,
                }}>
                  {unread}
                </span>
              )}
            </div>

            <p style={{ margin: '0 0 3px', fontSize: 12, color: '#555', lineHeight: 1.4 }}>
              {primary.message}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#999' }}>
                {new Date(primary.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {hasMultiple && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 11, color: '#0369a1', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {expanded ? '▲ Hide' : `▼ +${group.length - 1} more`}
                </button>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              background: 'none', border: 'none', padding: '2px 4px',
              fontSize: 14, color: '#aaa', cursor: 'pointer', lineHeight: 1,
              flexShrink: 0, marginTop: -2,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded additional items */}
      {expanded && group.slice(1).map((n, i) => (
        <div key={n.id} style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '8px 12px 8px 30px',
          background: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 12 }}>{TYPE_ICON[n.type] || '🔔'}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{n.title}</span>
            <AutoLabel isAutomated={n.is_automated} />
            {!n.is_read && (
              <span style={{
                background: '#dc3545', color: '#fff',
                fontSize: 9, padding: '1px 4px', borderRadius: 99,
              }}>New</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#666', lineHeight: 1.4 }}>{n.message}</p>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationPanel() {
  const navigate = useNavigate();
  const {
    notifications, panelOpen, setPanel,
    markAllRead, markOneRead, unreadCount,
  } = useNotifications();

  // Only show active notifications — read ones are filtered after 1h to reduce noise
  const oneHourAgo = Date.now() - 3_600_000;
  const visible = notifications.filter(n =>
    !n.is_read || new Date(n.created_at).getTime() > oneHourAgo,
  );

  const sorted = [...visible].sort((a, b) => {
    const p = (RANK[a.priority] ?? 2) - (RANK[b.priority] ?? 2);
    if (p !== 0) return p;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const groups = buildGroups(sorted.slice(0, 30));

  const handleDismissGroup = (ids) => {
    for (const id of ids) markOneRead(id);
  };

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={() => setPanel(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }}
        />
      )}

      {/* Slide-in panel */}
      <div style={{
        position:      'fixed',
        top:           0,
        right:         0,
        height:        '100dvh',
        width:         Math.min(window.innerWidth, 400),
        background:    '#fff',
        boxShadow:     '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex:        999,
        display:       'flex',
        flexDirection: 'column',
        transform:     panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition:    'transform 0.28s ease',
      }}>
        {/* Header */}
        <div style={{
          padding:        '14px 16px',
          borderBottom:   '1px solid #eee',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#dc3545', color: '#fff',
                fontSize: 11, padding: '2px 7px', borderRadius: 99,
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: '1px solid #007bff',
                  color: '#007bff', borderRadius: 6,
                  padding: '4px 9px', fontSize: 12, cursor: 'pointer',
                }}
              >
                All read
              </button>
            )}
            <button
              onClick={() => setPanel(false)}
              style={{
                background: '#f0f0f0', border: 'none', borderRadius: 6,
                padding: '5px 10px', fontSize: 15, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: 60 }}>
              <div style={{ fontSize: 36 }}>🔔</div>
              <p style={{ marginTop: 10, fontSize: 14 }}>All caught up</p>
            </div>
          ) : (
            groups.map((group, i) => (
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
          padding: '8px 14px', borderTop: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#aaa' }}>
            {notifications.filter(n => n.is_read).length > 5 ? 'Read items older than 1h are hidden' : ''}
          </span>
          <button
            onClick={() => { setPanel(false); navigate('/notifications'); }}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, color: '#2563eb', fontWeight: 600, cursor: 'pointer',
            }}
          >
            View all →
          </button>
        </div>
      </div>
    </>
  );
}
