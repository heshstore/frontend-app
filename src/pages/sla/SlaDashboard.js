import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Active',    bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  WARNING:   { label: 'Warning',   bg: '#fef9c3', color: '#b45309', border: '#fde68a' },
  ESCALATED: { label: 'Escalated', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  RESOLVED:  { label: 'Resolved',  bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
};

const PRIORITY_COLOR = {
  CRITICAL: '#dc2626',
  HIGH:     '#ea580c',
  MEDIUM:   '#d97706',
  LOW:      '#6b7280',
};

const MODULE_ICON = {
  CRM:        '👥',
  PRODUCTION: '🔧',
  ACCOUNTS:   '💰',
  DISPATCH:   '🚚',
};

const ENTITY_ROUTES = {
  job:      () => '/production/execution',
  order:    (id) => `/orders/${id}`,
  dispatch: (_)  => `/dispatch`,
  lead:     (id) => `/crm/leads/${id}`,
  followup: (id) => `/crm/leads/${id}`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDeadline(deadline) {
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d - now;
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMs < 0) {
    const overMin = Math.abs(diffMin);
    if (overMin < 60) return { text: `${overMin}m overdue`, overdue: true };
    const h = Math.floor(overMin / 60);
    const m = overMin % 60;
    return { text: m ? `${h}h ${m}m overdue` : `${h}h overdue`, overdue: true };
  }
  if (diffMin < 60) return { text: `in ${diffMin}m`, overdue: false };
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return { text: m ? `in ${h}h ${m}m` : `in ${h}h`, overdue: false };
}

function formatDate(d) {
  return new Date(d).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 20px',
      borderLeft: `4px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function FilterBar({ filters, onChange }) {
  const sel = (field) => (e) => onChange({ ...filters, [field]: e.target.value, _page: 1 });
  const inputStyle = {
    border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px',
    fontSize: 13, background: '#fff', color: '#374151', cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select style={inputStyle} value={filters.status} onChange={sel('status')}>
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="WARNING">Warning</option>
        <option value="ESCALATED">Escalated</option>
        <option value="RESOLVED">Resolved</option>
      </select>
      <select style={inputStyle} value={filters.module} onChange={sel('module')}>
        <option value="">All modules</option>
        <option value="CRM">CRM</option>
        <option value="PRODUCTION">Production</option>
        <option value="ACCOUNTS">Accounts</option>
        <option value="DISPATCH">Dispatch</option>
      </select>
      <select style={inputStyle} value={filters.priority} onChange={sel('priority')}>
        <option value="">All priorities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
    </div>
  );
}

function SlaRow({ event, navigate }) {
  const status   = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.ACTIVE;
  const deadline = formatDeadline(event.sla_deadline);
  const route    = ENTITY_ROUTES[event.entity_type]?.(event.entity_id);

  return (
    <tr
      onClick={() => route && navigate(route)}
      style={{
        cursor: route ? 'pointer' : 'default',
        borderBottom: '1px solid #f3f4f6',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 16 }}>{MODULE_ICON[event.module] ?? '📋'}</span>
        {' '}
        <span style={{ fontSize: 12, color: '#6b7280' }}>{event.module}</span>
      </td>
      <td style={{ padding: '10px 14px', maxWidth: 240 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>
          {event.entity_label}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>{event.entity_type}</div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{
          background: status.bg, color: status.color,
          border: `1px solid ${status.border}`,
          borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700,
        }}>
          {status.label}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ color: PRIORITY_COLOR[event.priority], fontWeight: 700, fontSize: 12 }}>
          {event.priority}
        </span>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: deadline.overdue ? '#dc2626' : '#374151',
        }}>
          {deadline.text}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {formatDate(event.sla_deadline)}
        </div>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        {event.escalation_level > 0 ? (
          <span style={{
            background: event.escalation_level >= 2 ? '#fee2e2' : '#fef9c3',
            color: event.escalation_level >= 2 ? '#dc2626' : '#b45309',
            borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700,
          }}>
            L{event.escalation_level}
          </span>
        ) : (
          <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
        )}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SlaDashboard() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState({ byStatus: {}, byModule: {} });
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', module: '', priority: '' });

  const load = useCallback(async (f, p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p });
      if (f.status)   params.set('status',   f.status);
      if (f.module)   params.set('module',   f.module);
      if (f.priority) params.set('priority', f.priority);

      const [slaRes, statsRes] = await Promise.all([
        apiFetch(`/sla?${params}`).then(r => r.ok ? r.json() : { items: [], total: 0 }),
        apiFetch('/sla/stats').then(r => r.ok ? r.json() : { byStatus: {}, byModule: {} }),
      ]);

      setItems(slaRes.items ?? []);
      setTotal(slaRes.total ?? 0);
      setStats(statsRes);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(filters, 1);
  }, [filters, load]);

  function handleFilterChange(next) {
    const { _page, ...f } = next;
    setFilters(f);
  }

  function handlePage(next) {
    setPage(next);
    load(filters, next);
  }

  const escalatedCount = stats.byStatus?.ESCALATED ?? 0;
  const warningCount   = stats.byStatus?.WARNING   ?? 0;
  const activeCount    = stats.byStatus?.ACTIVE    ?? 0;
  const openTotal      = escalatedCount + warningCount + activeCount;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
          SLA Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          Workflow accountability — overdue tasks, escalations, and SLA status
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Open"      value={openTotal}      color="#2563eb" />
        <StatCard label="Escalated" value={escalatedCount} color="#dc2626" />
        <StatCard label="Warning"   value={warningCount}   color="#d97706" />
        <StatCard label="Active"    value={activeCount}    color="#16a34a" />
      </div>

      {/* Module breakdown */}
      {Object.keys(stats.byModule).length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 10, padding: '12px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20,
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>BY MODULE:</span>
          {Object.entries(stats.byModule).map(([mod, cnt]) => (
            <div key={mod} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 15 }}>{MODULE_ICON[mod] ?? '📋'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{mod}</span>
              <span style={{
                background: '#f3f4f6', color: '#374151',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>{cnt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters + table */}
      <div style={{
        background: '#fff', borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <FilterBar filters={filters} onChange={handleFilterChange} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            Loading SLA events...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 15, color: '#6b7280' }}>No SLA events found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Module', 'Entity', 'Status', 'Priority', 'Deadline', 'Level'].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#6b7280',
                      letterSpacing: 0.5, textTransform: 'uppercase',
                      borderBottom: '1px solid #e9ecef',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(event => (
                  <SlaRow key={event.id} event={event} navigate={navigate} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 25 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {total} total · page {page} of {Math.ceil(total / 25)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '4px 12px', fontSize: 12, cursor: page > 1 ? 'pointer' : 'not-allowed',
                  background: page > 1 ? '#fff' : '#f9fafb', color: page > 1 ? '#374151' : '#9ca3af',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= Math.ceil(total / 25)}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '4px 12px', fontSize: 12,
                  cursor: page < Math.ceil(total / 25) ? 'pointer' : 'not-allowed',
                  background: page < Math.ceil(total / 25) ? '#fff' : '#f9fafb',
                  color: page < Math.ceil(total / 25) ? '#374151' : '#9ca3af',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
