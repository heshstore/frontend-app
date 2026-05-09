import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../utils/api';

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  CRITICAL: { dot: '#dc2626', bg: '#fee2e2', label: 'Critical', badge: '#dc2626' },
  ERROR:    { dot: '#ea580c', bg: '#fff1ee', label: 'Error',    badge: '#ea580c' },
  WARNING:  { dot: '#d97706', bg: '#fffbeb', label: 'Warning',  badge: '#d97706' },
  INFO:     { dot: '#2563eb', bg: '#eff6ff', label: 'Info',     badge: '#2563eb' },
};

const SOURCE_ICON = {
  USER:       '👤',
  SYSTEM:     '⚙️',
  AUTOMATION: '🤖',
  WHATSAPP:   '💬',
};

const ACTION_ICON = {
  LEAD_CREATED:         '✨',
  LEAD_ASSIGNED:        '👤',
  STATUS_CHANGED:       '🔄',
  FOLLOWUP_COMPLETED:   '✅',
  NOTE_ADDED:           '📝',
  QUOTATION_CREATED:    '📄',
  QUOTATION_GENERATED:  '📨',
  QUOTATION_SENT:       '📨', // legacy alias
  QUOTATION_APPROVED:   '✅',
  QUOTATION_REJECTED:   '❌',
  ORDER_CREATED:        '📦',
  JOB_ASSIGNED:         '🔧',
  JOB_COMPLETED:        '✅',
  JOB_DELAYED:          '⏰',
  PAYMENT_RECEIVED:     '💰',
  DISPATCH_CREATED:     '🚚',
  DISPATCH_DELIVERED:   '📬',
  WHATSAPP_DOWN:        '🔴',
  WHATSAPP_UP:          '🟢',
  USER_LOGIN:           '🔑',
  SLA_WARNING:          '⚠️',
  SLA_ESCALATED:        '🚨',
  SLA_RESOLVED:         '✅',
};

// ── Time formatting ───────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullDate(dateStr) {
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Diff display ──────────────────────────────────────────────────────────────

function ValueDiff({ old_value, new_value }) {
  if (!old_value && !new_value) return null;

  const keys = [...new Set([
    ...Object.keys(old_value ?? {}),
    ...Object.keys(new_value ?? {}),
  ])];

  if (keys.length === 0) return null;

  return (
    <div style={{
      marginTop: 8,
      background: '#f9fafb',
      borderRadius: 6,
      padding: '8px 10px',
      fontSize: 12,
    }}>
      {keys.map(k => {
        const prev = old_value?.[k];
        const next = new_value?.[k];
        if (prev === next) return null;
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: '#6b7280', minWidth: 80 }}>{k}:</span>
            {prev !== undefined && (
              <span style={{
                background: '#fee2e2', color: '#b91c1c',
                padding: '1px 5px', borderRadius: 3, textDecoration: 'line-through',
              }}>
                {String(prev)}
              </span>
            )}
            {prev !== undefined && next !== undefined && (
              <span style={{ color: '#9ca3af' }}>→</span>
            )}
            {next !== undefined && (
              <span style={{
                background: '#dcfce7', color: '#166534',
                padding: '1px 5px', borderRadius: 3,
              }}>
                {String(next)}
              </span>
            )}
          </div>
        );
      }).filter(Boolean)}
    </div>
  );
}

// ── Single activity item ──────────────────────────────────────────────────────

function ActivityItem({ log, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const sev    = SEVERITY_CFG[log.severity] ?? SEVERITY_CFG.INFO;
  const icon   = ACTION_ICON[log.action] ?? SOURCE_ICON[log.source] ?? '📋';
  const hasDiff = log.old_value || log.new_value;
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
  const canExpand = hasDiff || hasMeta;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: sev.bg,
          border: `2px solid ${sev.dot}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: '#e5e7eb', minHeight: 20, marginTop: 4 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 16 }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: '#111827' }}>
              {log.title}
            </span>
            <span style={{
              background: sev.badge, color: '#fff',
              fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99,
              letterSpacing: 0.5, flexShrink: 0,
            }}>
              {log.severity}
            </span>
          </div>

          {/* Description */}
          {log.description && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
              {log.description}
            </p>
          )}

          {/* Meta row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 5, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }} title={fullDate(log.created_at)}>
              {relativeTime(log.created_at)}
            </span>
            {log.performed_by_name && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                by {log.performed_by_name}
                {log.performed_by_role && ` (${log.performed_by_role})`}
              </span>
            )}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {SOURCE_ICON[log.source]} {log.source}
            </span>
            {canExpand && (
              <button
                onClick={() => setExpanded(x => !x)}
                style={{
                  background: 'none', border: 'none', padding: 0, fontSize: 11,
                  color: '#2563eb', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto',
                }}
              >
                {expanded ? '▲ Less' : '▼ Details'}
              </button>
            )}
          </div>

          {/* Expandable: diff + metadata */}
          {expanded && (
            <div style={{ marginTop: 6 }}>
              {hasDiff && (
                <ValueDiff old_value={log.old_value} new_value={log.new_value} />
              )}
              {hasMeta && !log.metadata?._truncated && (
                <div style={{
                  marginTop: 6, fontSize: 11, color: '#6b7280',
                  background: '#f9fafb', borderRadius: 6, padding: '6px 10px',
                }}>
                  {Object.entries(log.metadata).map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: '#9ca3af' }}>{k}: </span>
                      <span>{String(v ?? '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Reusable vertical timeline.
 *
 * Props:
 * - entityType + entityId  — fetch entity-specific timeline
 * - userId                 — fetch user's activity
 * - items (array)          — render pre-fetched items directly (no fetch)
 * - maxHeight              — scroll container height (default '400px')
 * - realtime               — subscribe to activity.new via socket
 */
export default function ActivityTimeline({
  entityType,
  entityId,
  items: externalItems,
  maxHeight = '440px',
  compact = false,
}) {
  const [items,    setItems]    = useState(externalItems ?? []);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(!externalItems);
  const [error,    setError]    = useState(null);
  const seenIds = useRef(new Set());

  const fetchPage = useCallback(async (p) => {
    if (!entityType || entityId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await apiFetch(`/activity/entity/${entityType}/${entityId}?page=${p}`);
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      const newItems = (data.items ?? []).filter(i => {
        if (seenIds.current.has(i.id)) return false;
        seenIds.current.add(i.id);
        return true;
      });
      if (p === 1) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      setTotal(data.total ?? 0);
    } catch (e) {
      setError('Could not load activity history.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
    } else {
      seenIds.current = new Set();
      setPage(1);
      fetchPage(1);
    }
  }, [entityType, entityId, externalItems, fetchPage]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }

  const displayItems = items;

  if (loading && displayItems.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: '#dc2626', fontSize: 13 }}>{error}</div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 13 }}>No activity recorded yet</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        maxHeight,
        overflowY: 'auto',
        padding: compact ? '8px 0' : '12px 4px',
      }}>
        {displayItems.map((log, i) => (
          <ActivityItem
            key={log.id}
            log={log}
            isLast={i === displayItems.length - 1 && items.length >= total}
          />
        ))}
      </div>
      {items.length < total && (
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
              padding: '6px 16px', fontSize: 12, color: '#2563eb', cursor: 'pointer',
            }}
          >
            {loading ? 'Loading...' : `Load more (${total - items.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
