import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const PRIORITY_COLOR = {
  URGENT: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  HIGH:   { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  MEDIUM: { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
  LOW:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

const STATUS_STYLE = {
  ASSIGNED:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Assigned' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706', label: 'Working' },
  ON_HOLD:     { bg: '#fef9c3', color: '#a16207', label: 'On Hold' },
};

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

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.ASSIGNED;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '14px 18px', flex: 1, minWidth: 110,
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? '#1e293b' }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onStart, onComplete, onHold, onResume, busy }) {
  const overdue = isOverdue(task.due_date);
  const [remarks, setRemarks] = useState('');
  const [showRemarks, setShowRemarks] = useState(false);

  const isAssigned    = task.status === 'ASSIGNED';
  const isInProgress  = task.status === 'IN_PROGRESS';
  const isOnHold      = task.status === 'ON_HOLD';

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${overdue ? '#fca5a5' : '#e2e8f0'}`,
      borderRadius: 12,
      padding: '16px 18px',
      marginBottom: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{task.order_no}</span>
          <PriorityBadge priority={task.priority} />
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Item info */}
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>
        {task.item_name}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
        {task.customer_name} · Qty: <strong>{task.qty}</strong>
        {task.unit ? ` ${task.unit}` : ''}
      </div>

      {/* Due date */}
      <div style={{ fontSize: 11, color: overdue ? '#dc2626' : '#94a3b8', marginBottom: 12, fontWeight: overdue ? 700 : 400 }}>
        {overdue ? '⚠ Overdue: ' : 'Due: '}{fmtDate(task.due_date)}
      </div>

      {/* Remarks input for complete/hold */}
      {showRemarks && (
        <input
          placeholder="Remarks (optional)…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 13, color: '#1e293b', marginBottom: 10, boxSizing: 'border-box',
          }}
        />
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isAssigned && (
          <button
            disabled={busy}
            onClick={() => onStart(task.id)}
            style={btn('#22c55e')}
          >
            ▶ START
          </button>
        )}

        {isInProgress && (
          <>
            <button
              disabled={busy}
              onClick={() => {
                setShowRemarks(true);
                if (showRemarks) {
                  onComplete(task.id, remarks);
                  setShowRemarks(false);
                  setRemarks('');
                }
              }}
              style={btn('#6366f1')}
            >
              ✓ COMPLETE
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setShowRemarks(true);
                if (showRemarks) {
                  onHold(task.id, remarks);
                  setShowRemarks(false);
                  setRemarks('');
                }
              }}
              style={btn('#f59e0b')}
            >
              ⏸ HOLD
            </button>
          </>
        )}

        {isOnHold && (
          <button
            disabled={busy}
            onClick={() => onResume(task.id)}
            style={btn('#0ea5e9')}
          >
            ▶ RESUME
          </button>
        )}

        {showRemarks && (
          <button
            onClick={() => { setShowRemarks(false); setRemarks(''); }}
            style={{ ...btn('#94a3b8'), background: '#f1f5f9', color: '#475569' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function btn(color) {
  return {
    padding: '8px 18px', borderRadius: 8, border: 'none', background: color,
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DepartmentWorkspacePage() {
  const [departments, setDepts]   = useState([]);
  const [selectedDept, setDept]   = useState('');
  const [queue, setQueue]         = useState([]);
  const [kpis, setKpis]           = useState({});
  const [loading, setLoading]     = useState(false);
  const [busy, setBusy]           = useState(false);

  // Load departments on mount
  useEffect(() => {
    apiFetch('/departments').then(setDepts).catch(() => {});
  }, []);

  const loadQueue = useCallback(async (deptId) => {
    if (!deptId) return;
    setLoading(true);
    try {
      const [q, d] = await Promise.all([
        apiFetch(`/production/board/dept/${deptId}/queue`),
        apiFetch(`/production/board/dept/${deptId}/dashboard`),
      ]);
      setQueue(q);
      setKpis(d);
    } catch (err) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedDept) loadQueue(selectedDept); }, [selectedDept, loadQueue]);

  async function action(fn, successMsg) {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      loadQueue(selectedDept);
    } catch (err) {
      toast.error(err.message ?? 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function handleStart(taskId) {
    action(
      () => apiFetch(`/production/board/tasks/${taskId}/start`, { method: 'PATCH' }),
      'Work started',
    );
  }

  function handleComplete(taskId, remarks) {
    action(
      () => apiFetch(`/production/board/tasks/${taskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ remarks: remarks || undefined }),
      }),
      'Task completed — item returned to Production Board',
    );
  }

  function handleHold(taskId, remarks) {
    action(
      () => apiFetch(`/production/board/tasks/${taskId}/hold-work`, {
        method: 'PATCH',
        body: JSON.stringify({ remarks: remarks || undefined }),
      }),
      'Task put on hold',
    );
  }

  function handleResume(taskId) {
    action(
      () => apiFetch(`/production/board/tasks/${taskId}/resume`, { method: 'PATCH' }),
      'Work resumed',
    );
  }

  const deptName = departments.find((d) => String(d.id) === String(selectedDept))?.name;

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
          Department Workspace
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Start, complete, or hold your assigned production tasks
        </p>
      </div>

      {/* Department selector */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <select
          value={selectedDept}
          onChange={(e) => setDept(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
            fontSize: 14, color: '#1e293b', background: '#fff', minWidth: 220,
          }}
        >
          <option value="">Select Department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {selectedDept && (
          <button
            onClick={() => loadQueue(selectedDept)}
            style={{
              padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569',
            }}
          >
            ↺ Refresh
          </button>
        )}
      </div>

      {!selectedDept ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15 }}>
          Select a department to view its queue
        </div>
      ) : (
        <>
          {/* KPIs */}
          {deptName && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                {deptName} — Today's Overview
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <KpiCard label="Active Queue"     value={kpis.todayQueue}          color="#6366f1" />
                <KpiCard label="Delayed"          value={kpis.delayed}             color="#ef4444" />
                <KpiCard label="High Priority"    value={kpis.highPriority}        color="#f59e0b" />
                <KpiCard label="Completed Today"  value={kpis.completedToday}      color="#10b981" />
                <KpiCard
                  label="Avg. Completion (min)"
                  value={kpis.avgCompletionMinutes != null ? Math.round(kpis.avgCompletionMinutes) : '—'}
                  color="#64748b"
                />
              </div>
            </div>
          )}

          {/* Queue */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading queue…</div>
          ) : queue.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 15,
              background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
            }}>
              No tasks assigned to this department
            </div>
          ) : (
            <div style={{ maxWidth: 600 }}>
              {queue.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busy}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  onHold={handleHold}
                  onResume={handleResume}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
