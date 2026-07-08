import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'WAITING',              label: 'Waiting Assignment',      color: '#6366f1', bg: '#eef2ff' },
  { key: 'IN_PROGRESS',         label: 'In Progress',              color: '#f59e0b', bg: '#fffbeb' },
  { key: 'WAITING_NEXT',        label: 'Waiting Next Assignment',  color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'PACKING',             label: 'Packing',                  color: '#0ea5e9', bg: '#f0f9ff' },
  { key: 'BILLING',             label: 'Ready for Billing',        color: '#10b981', bg: '#ecfdf5' },
  { key: 'DONE',                label: 'Completed',                color: '#64748b', bg: '#f8fafc' },
];

const PRIORITY_COLOR = {
  URGENT: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  HIGH:   { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  MEDIUM: { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  LOW:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

const ITEM_TYPE_COLOR = {
  MANUFACTURING: { bg: '#eff6ff', color: '#1d4ed8' },
  TRADING:       { bg: '#f0fdf4', color: '#15803d' },
  OTHER:         { bg: '#f8fafc', color: '#64748b' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getColumnKey(task) {
  if (task.stage === 'PACKING') return 'PACKING';
  if (task.stage === 'BILLING') return 'BILLING';
  if (task.stage === 'DONE')    return 'DONE';
  if (task.status === 'WAITING') return 'WAITING';
  if (task.status === 'COMPLETED') return 'WAITING_NEXT';
  if (['ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'ON_HOLD'].includes(task.status)) return 'IN_PROGRESS';
  return 'WAITING';
}

// ─── Components ───────────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.MEDIUM;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      textTransform: 'uppercase',
    }}>{priority}</span>
  );
}

function ProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0));
  return (
    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${p}%`, background: p === 100 ? '#10b981' : '#6366f1', borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  );
}

function StatusPill({ status }) {
  const MAP = {
    WAITING:     { bg: '#f1f5f9', color: '#475569', label: 'Waiting' },
    ASSIGNED:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Assigned' },
    IN_PROGRESS: { bg: '#fffbeb', color: '#d97706', label: 'Working' },
    COMPLETED:   { bg: '#ecfdf5', color: '#059669', label: 'Done' },
    ON_HOLD:     { bg: '#fef9c3', color: '#a16207', label: 'On Hold' },
    BLOCKED:     { bg: '#fef2f2', color: '#dc2626', label: 'Blocked' },
    CANCELLED:   { bg: '#f8fafc', color: '#94a3b8', label: 'Cancelled' },
  };
  const s = MAP[status] ?? MAP.WAITING;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

function BoardCard({ task, departments, onAction }) {
  const typeStyle = ITEM_TYPE_COLOR[task.item_type] ?? ITEM_TYPE_COLOR.OTHER;
  const overdue = isOverdue(task.due_date);

  return (
    <div
      onClick={() => onAction('detail', task)}
      style={{
        background: '#fff',
        border: '1px solid',
        borderColor: overdue ? '#fca5a5' : '#e2e8f0',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{task.order_no}</span>
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Item name */}
      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 2, lineHeight: 1.3 }}>
        {task.item_name}
      </div>

      {/* Customer */}
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{task.customer_name}</div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
          background: typeStyle.bg, color: typeStyle.color,
        }}>{task.item_type}</span>

        {task.sku && (
          <span style={{ fontSize: 10, color: '#94a3b8', padding: '1px 7px', background: '#f8fafc', borderRadius: 99 }}>
            {task.sku}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#64748b', padding: '1px 7px', background: '#f1f5f9', borderRadius: 99 }}>
          Qty: {task.qty}
        </span>
      </div>

      {/* Department / stage */}
      {task.department_name && (
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#94a3b8' }}>▶</span>
          <strong>{task.department_name}</strong>
          <StatusPill status={task.status} />
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
          <span>Progress</span>
          <span>{task.progressPct ?? 0}%</span>
        </div>
        <ProgressBar pct={task.progressPct} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: overdue ? '#dc2626' : '#94a3b8', fontWeight: overdue ? 700 : 400 }}>
          {overdue ? '⚠ Overdue: ' : 'Due: '}{fmtDate(task.due_date)}
        </span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Task #{task.task_no}</span>
      </div>
    </div>
  );
}

// ─── Manager Action Modal ──────────────────────────────────────────────────────

function ActionModal({ task, departments, onClose, onRefresh }) {
  const [departmentId, setDepartmentId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  async function doAction(fn) {
    setBusy(true);
    try {
      await fn();
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message ?? 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const canAssign = ['WAITING'].includes(task.status) ||
    (task.status === 'COMPLETED' && task.stage === 'DEPARTMENT');
  const canPack   = task.status === 'WAITING' ||
    (task.status === 'COMPLETED' && task.stage === 'DEPARTMENT');
  const canBill   = task.stage === 'PACKING' && task.status === 'COMPLETED';
  const canHold   = ['WAITING', 'ASSIGNED', 'IN_PROGRESS'].includes(task.status);
  const canCancel = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 2 }}>
                {task.order_no} · Task #{task.task_no}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{task.item_name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{task.customer_name} · Qty: {task.qty}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <StatusPill status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.department_name && (
              <span style={{ fontSize: 11, color: '#475569' }}>Current: <strong>{task.department_name}</strong></span>
            )}
          </div>

          {/* Progress */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
              <span>Progress</span><span>{task.progressPct ?? 0}%</span>
            </div>
            <ProgressBar pct={task.progressPct} />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 0 16px' }} />

        {/* Manager actions */}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Manager Actions
        </div>

        {canAssign && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Assign Department
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: 13, color: '#1e293b', background: '#fff',
                }}
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                disabled={!departmentId || busy}
                onClick={() => doAction(() => apiFetch(
                  `/production/board/order-items/${task.order_item_id}/assign`,
                  { method: 'POST', body: JSON.stringify({ departmentId: +departmentId, remarks: remarks || undefined }) },
                ))}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: departmentId ? '#6366f1' : '#e2e8f0',
                  color: departmentId ? '#fff' : '#94a3b8',
                  fontWeight: 600, fontSize: 13, cursor: departmentId ? 'pointer' : 'default',
                }}
              >
                Assign
              </button>
            </div>
          </div>
        )}

        <input
          placeholder="Remarks (optional)…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 13, color: '#1e293b', marginBottom: 14, boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canPack && (
            <button
              disabled={busy}
              onClick={() => doAction(() => apiFetch(
                `/production/board/order-items/${task.order_item_id}/packing`,
                { method: 'POST', body: JSON.stringify({ remarks: remarks || undefined }) },
              ))}
              style={actionBtn('#0ea5e9')}
            >
              → Packing
            </button>
          )}
          {canBill && (
            <button
              disabled={busy}
              onClick={() => doAction(() => apiFetch(
                `/production/board/order-items/${task.order_item_id}/billing`,
                { method: 'POST', body: JSON.stringify({ remarks: remarks || undefined }) },
              ))}
              style={actionBtn('#10b981')}
            >
              → Billing
            </button>
          )}
          {canHold && (
            <button
              disabled={busy}
              onClick={() => doAction(() => apiFetch(
                `/production/board/tasks/${task.id}/hold`,
                { method: 'PATCH', body: JSON.stringify({ remarks: remarks || undefined }) },
              ))}
              style={actionBtn('#f59e0b')}
            >
              Hold
            </button>
          )}
          {canCancel && (
            <button
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Cancel this task?')) return;
                doAction(() => apiFetch(
                  `/production/board/tasks/${task.id}/cancel`,
                  { method: 'PATCH', body: JSON.stringify({ remarks: remarks || undefined }) },
                ));
              }}
              style={actionBtn('#ef4444')}
            >
              Cancel Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function actionBtn(color) {
  return {
    padding: '7px 16px', borderRadius: 8, border: 'none', background: color,
    color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  };
}

// ─── Dashboard KPIs ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '14px 18px', minWidth: 110, flex: 1,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#1e293b' }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CentralProductionBoardPage() {
  const [tasks, setTasks]           = useState([]);
  const [kpis, setKpis]             = useState({});
  const [departments, setDepts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTask, setSelected] = useState(null);
  const [filterPriority, setFP]     = useState('');
  const [search, setSearch]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, dash, depts] = await Promise.all([
        apiFetch('/production/board/items'),
        apiFetch('/production/board/dashboard'),
        apiFetch('/departments'),
      ]);
      setTasks(items);
      setKpis(dash);
      setDepts(depts);
    } catch (err) {
      toast.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group tasks into columns
  const filtered = tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(t.item_name?.toLowerCase().includes(q) ||
            t.order_no?.toLowerCase().includes(q) ||
            t.customer_name?.toLowerCase().includes(q) ||
            t.sku?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const byColumn = {};
  COLUMNS.forEach((c) => (byColumn[c.key] = []));
  filtered.forEach((t) => {
    const col = getColumnKey(t);
    if (byColumn[col]) byColumn[col].push(t);
  });

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
          Central Production Board
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Single control center for all order items across manufacturing and trading workflows
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Waiting Assignment"    value={kpis.waitingAssignment}    color="#6366f1" />
        <KpiCard label="In Progress"           value={kpis.inProgress}           color="#f59e0b" />
        <KpiCard label="Waiting Next"          value={kpis.waitingNextAssignment} color="#8b5cf6" />
        <KpiCard label="Packing"               value={kpis.packing}              color="#0ea5e9" />
        <KpiCard label="Ready for Billing"     value={kpis.readyForBilling}      color="#10b981" />
        <KpiCard label="On Hold"               value={kpis.onHold}               color="#f59e0b" />
        <KpiCard label="Delayed"               value={kpis.delayed}              color="#ef4444" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          placeholder="Search order, item, customer, SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 13, color: '#1e293b', width: 280,
          }}
        />
        <select
          value={filterPriority}
          onChange={(e) => setFP(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          onClick={load}
          style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569',
          }}
        >
          ↺ Refresh
        </button>
      </div>

      {/* Board columns */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15 }}>Loading board…</div>
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 24 }}>
          {COLUMNS.map((col) => {
            const colTasks = byColumn[col.key] ?? [];
            return (
              <div key={col.key} style={{
                minWidth: 270, width: 270, flexShrink: 0,
                background: col.bg, borderRadius: 12, padding: 14,
                border: `1px solid ${col.color}22`,
              }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '1px 9px', borderRadius: 99,
                    background: col.color, color: '#fff',
                  }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                {colTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94a3b8' }}>
                    No items
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      departments={departments}
                      onAction={(action, t) => {
                        if (action === 'detail') setSelected(t);
                      }}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action modal */}
      {selectedTask && (
        <ActionModal
          task={selectedTask}
          departments={departments}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
