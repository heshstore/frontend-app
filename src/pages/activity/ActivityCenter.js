import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  CRITICAL: { dot: '#dc2626', bg: '#fee2e2', text: '#b91c1c' },
  ERROR:    { dot: '#ea580c', bg: '#fff1ee', text: '#c2410c' },
  WARNING:  { dot: '#d97706', bg: '#fffbeb', text: '#92400e' },
  INFO:     { dot: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' },
};

const SOURCE_ICON = { USER: '👤', SYSTEM: '⚙️', AUTOMATION: '🤖', WHATSAPP: '💬' };

const ACTION_ICON = {
  LEAD_CREATED: '✨', LEAD_ASSIGNED: '👤', STATUS_CHANGED: '🔄',
  FOLLOWUP_COMPLETED: '✅', NOTE_ADDED: '📝',
  QUOTATION_CREATED: '📄', QUOTATION_GENERATED: '📨',
  ORDER_CREATED: '📦', JOB_ASSIGNED: '🔧', JOB_COMPLETED: '✅', JOB_DELAYED: '⏰',
  PAYMENT_RECEIVED: '💰', DISPATCH_CREATED: '🚚', DISPATCH_DELIVERED: '📬',
  WHATSAPP_DOWN: '🔴', WHATSAPP_UP: '🟢', USER_LOGIN: '🔑',
  SLA_WARNING: '⚠️', SLA_ESCALATED: '🚨', SLA_RESOLVED: '✅',
};

const MODULE_ICON = {
  CRM: '👥', PRODUCTION: '🔧', ACCOUNTS: '💰', DISPATCH: '🚚',
  SYSTEM: '⚙️', AUTH: '🔑', SLA: '⏱️', ORDERS: '📦',
};

const ENTITY_ROUTES = {
  lead:      (id) => `/crm/leads/${id}`,
  quotation: (id) => `/quotations`,
  order:     (id) => `/orders/${id}`,
  job:       (id) => `/production/jobs/${id}`,
  dispatch:  (_)  => `/dispatch`,
};

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Feed card ─────────────────────────────────────────────────────────────────

function ActivityCard({ log, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const sev     = SEVERITY_CFG[log.severity] ?? SEVERITY_CFG.INFO;
  const icon    = ACTION_ICON[log.action] ?? SOURCE_ICON[log.source] ?? '📋';
  const route   = log.entity_type && log.entity_id
    ? ENTITY_ROUTES[log.entity_type]?.(log.entity_id)
    : null;
  const hasDiff = log.old_value || log.new_value;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e9ecef',
      borderLeft: `3px solid ${sev.dot}`,
      padding: '10px 14px',
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: sev.bg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + severity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 600, fontSize: 13, color: '#111827', flex: 1,
              cursor: route ? 'pointer' : 'default',
              textDecoration: route ? 'underline' : 'none',
              textDecorationColor: '#2563eb22',
            }}
              onClick={() => route && navigate(route)}
            >
              {log.title}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
              background: sev.dot, color: '#fff', letterSpacing: 0.4, flexShrink: 0,
            }}>
              {log.severity}
            </span>
          </div>

          {/* Meta */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            marginTop: 3, alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{relTime(log.created_at)}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>
              {MODULE_ICON[log.module] ?? '📋'} {log.module}
            </span>
            {log.performed_by_name && (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                {SOURCE_ICON[log.source]} {log.performed_by_name}
              </span>
            )}
            {hasDiff && (
              <button
                onClick={() => setExpanded(x => !x)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 10, color: '#2563eb', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto',
                }}
              >
                {expanded ? '▲' : '▼ diff'}
              </button>
            )}
          </div>

          {/* Expandable diff */}
          {expanded && (hasDiff) && (
            <div style={{
              marginTop: 6, background: '#f9fafb', borderRadius: 6,
              padding: '6px 10px', fontSize: 11,
            }}>
              {[...new Set([
                ...Object.keys(log.old_value ?? {}),
                ...Object.keys(log.new_value ?? {}),
              ])].map(k => {
                const prev = log.old_value?.[k];
                const next = log.new_value?.[k];
                if (prev === next) return null;
                return (
                  <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
                    <span style={{ color: '#9ca3af', minWidth: 70 }}>{k}:</span>
                    {prev !== undefined && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '1px 4px', borderRadius: 3, textDecoration: 'line-through' }}>
                        {String(prev)}
                      </span>
                    )}
                    {prev !== undefined && <span style={{ color: '#9ca3af' }}>→</span>}
                    {next !== undefined && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 4px', borderRadius: 3 }}>
                        {String(next)}
                      </span>
                    )}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange }) {
  const set = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const sel = { border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: '#fff' };

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      padding: '10px 0',
    }}>
      <select style={sel} value={filters.module} onChange={set('module')}>
        <option value="">All modules</option>
        {['CRM','PRODUCTION','ACCOUNTS','DISPATCH','SYSTEM','AUTH','SLA','ORDERS'].map(m => (
          <option key={m} value={m}>{MODULE_ICON[m]} {m}</option>
        ))}
      </select>
      <select style={sel} value={filters.severity} onChange={set('severity')}>
        <option value="">All severities</option>
        <option value="CRITICAL">Critical</option>
        <option value="ERROR">Error</option>
        <option value="WARNING">Warning</option>
        <option value="INFO">Info</option>
      </select>
      <select style={sel} value={filters.source} onChange={set('source')}>
        <option value="">All sources</option>
        <option value="USER">👤 User</option>
        <option value="SYSTEM">⚙️ System</option>
        <option value="AUTOMATION">🤖 Automation</option>
        <option value="WHATSAPP">💬 WhatsApp</option>
      </select>
      <input
        type="date" style={sel} value={filters.from} onChange={set('from')}
        placeholder="From"
      />
      <input
        type="date" style={sel} value={filters.to} onChange={set('to')}
        placeholder="To"
      />
      {(filters.module || filters.severity || filters.source || filters.from || filters.to) && (
        <button
          onClick={() => onChange({ module: '', severity: '', source: '', from: '', to: '' })}
          style={{
            background: '#f3f4f6', border: 'none', borderRadius: 6,
            padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#374151',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActivityCenter() {
  const navigate = useNavigate();
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ module: '', severity: '', source: '', from: '', to: '' });
  const seenIds  = useRef(new Set());
  const PAGE = 30;

  const fetchPage = useCallback(async (f, p, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p });
      if (f.module)   params.set('module',   f.module);
      if (f.severity) params.set('severity', f.severity);
      if (f.source)   params.set('source',   f.source);
      if (f.from)     params.set('from',     f.from);
      if (f.to)       params.set('to',       new Date(f.to + 'T23:59:59').toISOString());

      const res  = await apiFetch(`/activity?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const newItems = (data.items ?? []).filter(i => {
        if (seenIds.current.has(i.id)) return false;
        seenIds.current.add(i.id);
        return true;
      });

      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        seenIds.current = new Set(newItems.map(i => i.id));
        setItems(newItems);
      }
      setTotal(data.total ?? 0);
    } catch {
      // keep showing existing items on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    seenIds.current = new Set();
    setPage(1);
    fetchPage(filters, 1, false);
  }, [filters, fetchPage]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(filters, next, true);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
          Activity Center
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          Company-wide audit trail — every action, who did it, when, and what changed
        </p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={f => setFilters(f)} />

      {/* Count */}
      {!loading && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          {total.toLocaleString()} events
          {total > PAGE && ` — showing page ${page} of ${Math.ceil(total / PAGE)}`}
        </div>
      )}

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          Loading activity...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>📋</div>
          <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>No activity found</div>
        </div>
      ) : (
        <>
          {items.map(log => (
            <ActivityCard key={log.id} log={log} navigate={navigate} />
          ))}

          {items.length < total && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '8px 20px', fontSize: 13, cursor: 'pointer',
                  background: '#fff', color: '#2563eb', fontWeight: 600,
                }}
              >
                {loading ? 'Loading...' : `Load more (${total - items.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
