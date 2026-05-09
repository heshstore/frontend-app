import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const MODULE_ICON = {
  CRM:        '🎯',
  PRODUCTION: '⚙️',
  ACCOUNTS:   '💰',
  DISPATCH:   '🚚',
  SYSTEM:     '🖥️',
  AUTH:       '🔐',
  SLA:        '⏱',
  ORDERS:     '📋',
  QUOTATION:  '📄',
};

const SEVERITY_COLOR = {
  INFO:     '#6b7280',
  WARNING:  '#d97706',
  ERROR:    '#dc2626',
  CRITICAL: '#9333ea',
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityTimeline({ limit = 12, showTitle = true }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res  = await apiFetch(`/analytics/activity-feed?limit=${limit}`);
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '70%', height: 11, borderRadius: 4, background: '#f3f4f6', marginBottom: 5 }} />
              <div style={{ width: '40%', height: 9, borderRadius: 4, background: '#f3f4f6' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !items.length) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        {error ? 'Could not load activity' : 'No recent activity'}
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Recent activity
        </div>
      )}
      <div style={{ position: 'relative' }}>
        {items.map((item, i) => {
          const icon = MODULE_ICON[item.module] || '📝';
          const color = SEVERITY_COLOR[item.severity] || '#6b7280';
          const isLast = i === items.length - 1;

          return (
            <div key={item.id || i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
              {/* Vertical line */}
              {!isLast && (
                <div style={{
                  position: 'absolute', left: 13, top: 28, bottom: -2,
                  width: 1, background: '#f3f4f6',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, zIndex: 1,
                border: `1px solid ${color}30`,
              }}>
                {icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 14, borderBottom: isLast ? 'none' : '1px solid #f9fafb' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', lineHeight: 1.4 }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{timeAgo(item.timestamp)}</span>
                  {item.actor && (
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>· {item.actor}</span>
                  )}
                  {item.module && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                      background: color + '15', color,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {item.module}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
