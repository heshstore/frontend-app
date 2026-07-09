import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const api = async (path, opts = {}) => {
  const res = await apiFetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#1e293b', background: '#fff', boxSizing: 'border-box',
};
const primaryBtn = { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const ghostBtn = { padding: '7px 14px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, cursor: 'pointer' };
const dangerBtn = { ...ghostBtn, color: '#dc2626', borderColor: '#fecaca' };

const DEPT_TYPES = ['Production', 'Packing', 'Quality', 'Warehouse', 'Administration'];
const MACHINE_STATUSES = ['READY', 'RUNNING', 'IDLE', 'BREAKDOWN', 'MAINTENANCE'];

const STATUS_STYLE = {
  READY:       { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  RUNNING:     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  IDLE:        { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  BREAKDOWN:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.IDLE;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

// ── Collapsible card ──────────────────────────────────────────────────────────
function Card({ title, right, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {right && <div onClick={e => e.stopPropagation()}>{right}</div>}
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>{children}</div>}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>;
}

function Grid({ cols = 3, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>{children}</div>;
}

// ══════════════════════════════════════════════════════════════════
// SECTION 1 — Department Information
// ══════════════════════════════════════════════════════════════════
function DeptInfoSection({ deptId, dept, ext, onExtSaved }) {
  const [form, setForm] = useState({
    description: ext?.description ?? '',
    deptType: ext?.deptType ?? 'Production',
    workingHoursPerDay: ext?.workingHoursPerDay ?? 8,
    managerName: ext?.managerName ?? '',
    supervisorName: ext?.supervisorName ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      description: ext?.description ?? '',
      deptType: ext?.deptType ?? 'Production',
      workingHoursPerDay: ext?.workingHoursPerDay ?? 8,
      managerName: ext?.managerName ?? '',
      supervisorName: ext?.supervisorName ?? '',
    });
  }, [ext]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api(`/departments/${deptId}/extension`, { method: 'PATCH', body: JSON.stringify(form) });
      onExtSaved(saved);
      toast.success('Department info saved');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Card title="Department Information">
      {/* Read-only existing fields */}
      <Grid cols={3}>
        <div>
          <Label>Department Name</Label>
          <div style={{ ...inp, background: '#f8fafc', color: '#475569' }}>{dept?.name ?? '—'}</div>
        </div>
        <div>
          <Label>Department Code</Label>
          <div style={{ ...inp, background: '#f8fafc', color: '#475569', fontFamily: 'monospace' }}>{dept?.code ?? '—'}</div>
        </div>
        <div>
          <Label>Department Type</Label>
          <select value={form.deptType} onChange={e => setForm(f => ({ ...f, deptType: e.target.value }))} style={inp}>
            {DEPT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Working Hours / Day</Label>
          <input type="number" min="1" max="24" value={form.workingHoursPerDay}
            onChange={e => setForm(f => ({ ...f, workingHoursPerDay: e.target.value }))} style={inp} />
        </div>
        <div>
          <Label>Department Manager</Label>
          <input value={form.managerName} onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))} style={inp} placeholder="Name" />
        </div>
        <div>
          <Label>Supervisor</Label>
          <input value={form.supervisorName} onChange={e => setForm(f => ({ ...f, supervisorName: e.target.value }))} style={inp} placeholder="Name" />
        </div>
      </Grid>
      <div style={{ marginTop: 14 }}>
        <Label>Description</Label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          style={{ ...inp, height: 70, resize: 'vertical' }} placeholder="Department purpose and scope…" />
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={primaryBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 2 — Machine Master
// ══════════════════════════════════════════════════════════════════
const EMPTY_MACHINE = { name: '', machineRefId: '', model: '', serialNumber: '', installationDate: '', operator: '' };

function MachinesSection({ deptId, machines, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_MACHINE);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editStatus, setEditStatus] = useState({});

  const addMachine = async () => {
    if (!form.name.trim()) { toast.error('Machine name is required'); return; }
    setSaving(true);
    try {
      await api(`/departments/${deptId}/machines`, { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY_MACHINE);
      setShowAdd(false);
      onRefresh();
      toast.success('Machine added');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (machineId, status) => {
    try {
      await api(`/departments/${deptId}/machines/${machineId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const toggleActive = async (m) => {
    try {
      await api(`/departments/${deptId}/machines/${m.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !m.isActive }) });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const readyToday = (m) => m.status === 'READY' && m.readyDate === new Date().toISOString().slice(0, 10);

  return (
    <Card title={`Machines (${machines?.length ?? 0})`} right={
      <button style={primaryBtn} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Machine'}</button>
    }>
      {showAdd && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Grid cols={3}>
            <div>
              <Label>Machine Name *</Label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Laser Cutter 1" />
            </div>
            <div>
              <Label>Machine Code</Label>
              <input value={form.machineRefId} onChange={e => setForm(f => ({ ...f, machineRefId: e.target.value }))} style={inp} placeholder="e.g. LC-001" />
            </div>
            <div>
              <Label>Model</Label>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} style={inp} placeholder="e.g. XL-500" />
            </div>
            <div>
              <Label>Serial Number</Label>
              <input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Installation Date</Label>
              <input type="date" value={form.installationDate} onChange={e => setForm(f => ({ ...f, installationDate: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Operator</Label>
              <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} style={inp} placeholder="Operator name" />
            </div>
          </Grid>
          <div style={{ marginTop: 12 }}>
            <button style={primaryBtn} onClick={addMachine} disabled={saving}>{saving ? 'Adding…' : 'Add Machine'}</button>
          </div>
        </div>
      )}

      {(!machines || machines.length === 0) && !showAdd && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>No machines added yet. Click "+ Add Machine" to get started.</div>
      )}

      {(machines ?? []).map(m => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
          border: `1px solid ${readyToday(m) ? '#bbf7d0' : '#e2e8f0'}`,
          background: readyToday(m) ? '#f0fdf4' : '#fff',
          borderRadius: 10, marginBottom: 8,
          opacity: m.isActive ? 1 : 0.5,
        }}>
          {/* Status indicator dot */}
          <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: STATUS_STYLE[m.status]?.color ?? '#94a3b8' }} />

          {/* Machine info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
              {m.name}
              {m.machineRefId && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6, fontFamily: 'monospace', fontSize: 12 }}>{m.machineRefId}</span>}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {[m.model, m.serialNumber].filter(Boolean).join(' · ')}
              {m.operator && <> · Operator: <strong>{m.operator}</strong></>}
              {m.installationDate && <> · Installed: {fmtDate(m.installationDate)}</>}
            </div>
            {readyToday(m) && (
              <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, marginTop: 3 }}>✓ READY TODAY</div>
            )}
          </div>

          {/* Status dropdown */}
          <select
            value={m.status}
            onChange={e => updateStatus(m.id, e.target.value)}
            style={{ ...inp, width: 150, padding: '5px 8px', fontSize: 12 }}
          >
            {MACHINE_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Active toggle */}
          <button style={{ ...ghostBtn, fontSize: 11, padding: '4px 10px' }} onClick={() => toggleActive(m)}>
            {m.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      ))}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 3 — Checklist Configuration
// ══════════════════════════════════════════════════════════════════
function ChecklistConfigSection({ deptId, checklist, onRefresh }) {
  const [newItem, setNewItem] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [adding, setAdding] = useState(false);

  const items = checklist?.items ?? [];

  const addItem = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await api(`/departments/${deptId}/checklist/items`, {
        method: 'POST', body: JSON.stringify({ itemText: newItem.trim(), isMandatory: mandatory }),
      });
      setNewItem('');
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const updateItem = async (iid, patch) => {
    try {
      await api(`/departments/${deptId}/checklist/items/${iid}`, { method: 'PATCH', body: JSON.stringify(patch) });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const deleteItem = async (iid) => {
    if (!window.confirm('Remove this checklist item?')) return;
    try {
      await api(`/departments/${deptId}/checklist/items/${iid}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const moveItem = async (idx, dir) => {
    const newOrder = [...items];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    try {
      await api(`/departments/${deptId}/checklist/items/reorder`, {
        method: 'PATCH', body: JSON.stringify({ orderedIds: newOrder.map(i => i.id) }),
      });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Card title={`Daily Startup Checklist (${items.filter(i => i.isActive).length} active items)`}>
      {/* Add row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add checklist item…"
          style={{ ...inp, flex: 1, minWidth: 200 }}
        />
        <label style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} />
          Mandatory
        </label>
        <button style={primaryBtn} onClick={addItem} disabled={adding || !newItem.trim()}>
          {adding ? '…' : '+ Add'}
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          No checklist items yet. Add items above so operators can complete the morning inspection.
        </div>
      )}

      {items.map((item, idx) => (
        <div key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          background: item.isActive ? '#fff' : '#f8fafc', borderRadius: 8,
          border: '1px solid #e2e8f0', marginBottom: 6, opacity: item.isActive ? 1 : 0.55,
        }}>
          <span style={{ color: '#94a3b8', fontSize: 11, width: 22, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
          <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{item.itemText}</span>

          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, flexShrink: 0,
            background: item.isMandatory ? '#fef3c7' : '#f1f5f9',
            color: item.isMandatory ? '#92400e' : '#64748b',
          }}>
            {item.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
          </span>

          {/* Controls */}
          <button style={{ ...ghostBtn, padding: '3px 8px', fontSize: 11 }}
            onClick={() => updateItem(item.id, { isMandatory: !item.isMandatory })}>
            {item.isMandatory ? 'Make Optional' : 'Make Mandatory'}
          </button>
          <button style={{ ...ghostBtn, padding: '3px 8px', fontSize: 11 }}
            onClick={() => updateItem(item.id, { isActive: !item.isActive })}>
            {item.isActive ? 'Disable' : 'Enable'}
          </button>
          <button style={{ ...ghostBtn, padding: '3px 6px', fontSize: 11 }} onClick={() => moveItem(idx, -1)} disabled={idx === 0}>↑</button>
          <button style={{ ...ghostBtn, padding: '3px 6px', fontSize: 11 }} onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>↓</button>
          <button style={{ ...dangerBtn, padding: '3px 8px', fontSize: 11 }} onClick={() => deleteItem(item.id)}>✕</button>
        </div>
      ))}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 4 — Today's Inspection
// ══════════════════════════════════════════════════════════════════
function InspectionSection({ deptId, checklist, readiness, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const session = readiness?.session;
  const items = (checklist?.items ?? []).filter(i => i.isActive);
  const completedIds = new Set((session?.completions ?? []).map(c => c.itemId));

  const mandatoryItems = items.filter(i => i.isMandatory);
  const completedMandatory = mandatoryItems.filter(i => completedIds.has(i.id)).length;
  const allMandatoryDone = mandatoryItems.length > 0 && completedMandatory === mandatoryItems.length;
  const progress = mandatoryItems.length > 0 ? Math.round((completedMandatory / mandatoryItems.length) * 100) : 100;

  const startSession = async () => {
    setBusy(true);
    try {
      await api(`/departments/${deptId}/checklist/today/start`, { method: 'POST' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const toggleItem = async (itemId) => {
    if (!session) return;
    setBusy(true);
    try {
      if (completedIds.has(itemId)) {
        await api(`/departments/${deptId}/checklist/today/complete/${itemId}`, {
          method: 'DELETE', body: JSON.stringify({ sessionId: session.id }),
        });
      } else {
        await api(`/departments/${deptId}/checklist/today/complete/${itemId}`, {
          method: 'POST', body: JSON.stringify({ sessionId: session.id }),
        });
      }
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const finishInspection = async () => {
    setBusy(true);
    try {
      await api(`/departments/${deptId}/checklist/today/finish`, { method: 'POST' });
      toast.success('Inspection complete — machines are now READY');
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const isReady = readiness?.ready;
  const noItems = items.length === 0;

  return (
    <Card title="Today's Inspection" defaultOpen>
      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
        borderRadius: 10, marginBottom: 16,
        background: isReady ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isReady ? '#bbf7d0' : '#fecaca'}`,
      }}>
        <span style={{ fontSize: 32 }}>{isReady ? '✅' : '🔒'}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: isReady ? '#16a34a' : '#dc2626' }}>
            {isReady ? 'MACHINES ARE READY — Production can begin' : 'NOT READY — Production is blocked'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{readiness?.reason}</div>
        </div>
      </div>

      {noItems ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          No checklist items configured. Add items in the "Daily Startup Checklist" section above.
        </div>
      ) : !session ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ color: '#64748b', marginBottom: 14, fontSize: 13 }}>
            Today's inspection has not been started yet.
          </div>
          <button style={{ ...primaryBtn, padding: '10px 28px', fontSize: 14 }} onClick={startSession} disabled={busy}>
            {busy ? 'Starting…' : '▶ Start Morning Inspection'}
          </button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {mandatoryItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 5 }}>
                <span>Mandatory items</span>
                <span style={{ fontWeight: 700 }}>{completedMandatory} / {mandatoryItems.length} completed ({progress}%)</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#16a34a' : '#2563eb', transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div style={{ marginBottom: 16 }}>
            {items.map(item => {
              const done = completedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => !busy && toggleItem(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 9, border: `1px solid ${done ? '#bbf7d0' : '#e2e8f0'}`,
                    background: done ? '#f0fdf4' : '#fff', marginBottom: 7,
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${done ? '#16a34a' : '#e2e8f0'}`,
                    background: done ? '#16a34a' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
                  </div>

                  <span style={{ flex: 1, fontSize: 13, color: done ? '#16a34a' : '#1e293b', textDecoration: done ? 'line-through' : 'none', fontWeight: done ? 500 : 400 }}>
                    {item.itemText}
                  </span>

                  {item.isMandatory && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: 99 }}>
                      MANDATORY
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Complete inspection button */}
          {!isReady && (
            <button
              style={{
                ...primaryBtn,
                padding: '11px 28px', fontSize: 14,
                background: allMandatoryDone ? '#16a34a' : '#94a3b8',
                cursor: allMandatoryDone && !busy ? 'pointer' : 'not-allowed',
              }}
              onClick={finishInspection}
              disabled={!allMandatoryDone || busy}
            >
              {busy ? 'Processing…' : allMandatoryDone ? '✓ Complete Inspection — Mark READY' : `Complete all ${mandatoryItems.length - completedMandatory} remaining mandatory items first`}
            </button>
          )}

          {isReady && (
            <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
              ✅ Inspection completed at {session.startedAt ? new Date(session.startedAt).toLocaleTimeString('en-IN') : '—'}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function DepartmentControlCenterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deptId = Number(id);

  const [dept, setDept] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const deptsList = await apiFetch('/departments?includeInactive=true').then(r => r.json());
      setDept(deptsList.find(d => d.id === deptId) ?? null);
      const det = await api(`/departments/${deptId}/detail`);
      setDetail(det);
    } catch (e) {
      toast.error('Failed to load department');
    } finally {
      setLoading(false);
    }
  }, [deptId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refresh = useCallback(() => {
    api(`/departments/${deptId}/detail`).then(setDetail).catch(() => {});
  }, [deptId]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>Loading…</div>;
  }

  const ready = detail?.readiness?.ready;

  return (
    <div style={{ padding: '24px 32px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ ...ghostBtn, marginBottom: 10 }}>← Back to Departments</button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
            {dept?.name ?? 'Department'}&nbsp;
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>{dept?.code}</span>
          </h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
            {detail?.ext?.deptType ?? 'Department'} — Control Center
          </div>
        </div>

        {/* Today's status */}
        <div style={{
          padding: '12px 22px', borderRadius: 12, textAlign: 'center', minWidth: 150,
          background: ready ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${ready ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: ready ? '#16a34a' : '#dc2626' }}>Today's Status</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: ready ? '#16a34a' : '#dc2626', marginTop: 3 }}>
            {ready ? '✅ READY' : '🔒 NOT READY'}
          </div>
        </div>
      </div>

      {detail && (
        <>
          {/* Section 4 first — operators see inspection status at the top */}
          <InspectionSection deptId={deptId} checklist={detail.checklist} readiness={detail.readiness} onRefresh={refresh} />
          <DeptInfoSection deptId={deptId} dept={dept} ext={detail.ext} onExtSaved={saved => setDetail(d => ({ ...d, ext: saved }))} />
          <MachinesSection deptId={deptId} machines={detail.machines} onRefresh={refresh} />
          <ChecklistConfigSection deptId={deptId} checklist={detail.checklist} onRefresh={refresh} />
        </>
      )}
    </div>
  );
}
