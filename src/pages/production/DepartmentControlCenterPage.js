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

const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function inspectedToday(lastInspectedAt) {
  if (!lastInspectedAt) return false;
  return new Date(lastInspectedAt).toISOString().slice(0, 10) === todayStr();
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#1e293b', background: '#fff', boxSizing: 'border-box',
};
const primaryBtn = { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const ghostBtn = { padding: '7px 14px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, cursor: 'pointer' };
const dangerBtn = { ...ghostBtn, color: '#dc2626', borderColor: '#fecaca' };
const successBtn = { ...primaryBtn, background: '#16a34a' };

const DEPT_TYPES = ['Production', 'Packing', 'Quality', 'Warehouse', 'Administration'];
// READY is not in this list — only settable via inspection
const OPERATIONAL_STATUSES = ['IDLE', 'RUNNING', 'BREAKDOWN', 'MAINTENANCE'];

const STATUS_STYLE = {
  RUNNING:     { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  IDLE:        { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  BREAKDOWN:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  MAINTENANCE: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
};

function OperationalBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.IDLE;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function InspectionBadge({ lastInspectedAt }) {
  const valid = inspectedToday(lastInspectedAt);
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: valid ? '#f0fdf4' : '#fffbeb',
      color: valid ? '#16a34a' : '#d97706',
      border: `1px solid ${valid ? '#bbf7d0' : '#fde68a'}`,
    }}>
      {valid ? '✓ Inspected today' : '⚠ Not inspected'}
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

// ── Inspect modal ─────────────────────────────────────────────────────────────
function InspectModal({ machine, deptId, checklist, session, onClose, onDone }) {
  const [result, setResult] = useState('PASS');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const items = (checklist?.items ?? []).filter(i => i.isActive);
  const completedIds = new Set((session?.completions ?? []).map(c => c.itemId));
  const mandatoryItems = items.filter(i => i.isMandatory);
  const completedMandatory = mandatoryItems.filter(i => completedIds.has(i.id)).length;

  const checklistSnapshot = {
    version: checklist?.id ?? null,
    items: items.map(i => ({
      id: i.id,
      text: i.itemText,
      mandatory: i.isMandatory,
      completed: completedIds.has(i.id),
    })),
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api(`/departments/${deptId}/machines/${machine.id}/inspect`, {
        method: 'POST',
        body: JSON.stringify({ result, remarks: remarks.trim() || undefined, checklistSnapshot }),
      });
      toast.success(`${machine.name} inspection recorded — ${result}`);
      onDone();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 460, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#1e293b' }}>Inspect Machine</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{machine.name} {machine.machineRefId ? `(${machine.machineRefId})` : ''}</div>

        {/* Checklist summary */}
        {items.length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Department Checklist</div>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: completedIds.has(item.id) ? '#16a34a' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {completedIds.has(item.id) && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: '#475569', textDecoration: completedIds.has(item.id) ? 'line-through' : 'none' }}>
                  {item.itemText}
                  {item.isMandatory && <span style={{ color: '#d97706', marginLeft: 4, fontSize: 10, fontWeight: 700 }}>*</span>}
                </span>
              </div>
            ))}
            {mandatoryItems.length > 0 && (
              <div style={{ fontSize: 11, color: completedMandatory === mandatoryItems.length ? '#16a34a' : '#d97706', marginTop: 8, fontWeight: 600 }}>
                {completedMandatory}/{mandatoryItems.length} mandatory items completed
              </div>
            )}
          </div>
        )}

        {/* Result */}
        <div style={{ marginBottom: 14 }}>
          <Label>Inspection Result *</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['PASS', 'FAIL'].map(r => (
              <button
                key={r}
                onClick={() => setResult(r)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  borderColor: result === r ? (r === 'PASS' ? '#16a34a' : '#dc2626') : '#e2e8f0',
                  background: result === r ? (r === 'PASS' ? '#f0fdf4' : '#fef2f2') : '#fff',
                  color: result === r ? (r === 'PASS' ? '#16a34a' : '#dc2626') : '#94a3b8',
                }}
              >
                {r === 'PASS' ? '✓ PASS' : '✗ FAIL'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Label>Remarks (optional)</Label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            style={{ ...inp, height: 70, resize: 'vertical' }}
            placeholder="Any observations, issues, or notes…"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={ghostBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...primaryBtn, background: result === 'PASS' ? '#16a34a' : '#dc2626' }}
            onClick={submit} disabled={busy}
          >
            {busy ? 'Recording…' : `Record ${result}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History drawer ────────────────────────────────────────────────────────────
function HistoryDrawer({ machine, deptId, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/departments/${deptId}/machines/${machine.id}/events?limit=50`)
      .then(r => setEvents(r?.items ?? []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [machine.id, deptId]);

  const ACTION_LABEL = {
    INSPECTION: 'Inspection',
    STATUS_CHANGE: 'Status Changed',
    ACTIVATION: 'Activated',
    DEACTIVATION: 'Deactivated',
    BREAKDOWN: 'Breakdown Reported',
    MAINTENANCE_STARTED: 'Maintenance Started',
    MAINTENANCE_COMPLETED: 'Maintenance Completed',
  };

  const ACTION_COLOR = {
    INSPECTION: '#2563eb',
    STATUS_CHANGE: '#7c3aed',
    ACTIVATION: '#16a34a',
    DEACTIVATION: '#dc2626',
    BREAKDOWN: '#dc2626',
    MAINTENANCE_STARTED: '#d97706',
    MAINTENANCE_COMPLETED: '#16a34a',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: '#fff', width: 420, maxWidth: '95vw', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Machine History</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{machine.name}</div>
          </div>
          <button style={{ ...ghostBtn, padding: '5px 10px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          {loading && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>Loading…</div>}
          {!loading && events.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>No history recorded yet.</div>
          )}
          {events.map(ev => {
            const color = ACTION_COLOR[ev.action] ?? '#64748b';
            const label = ACTION_LABEL[ev.action] ?? ev.action;
            const result = ev.metadata?.result;
            const remarks = ev.description;
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: 4 }} />
                  <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 4 }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                    {result && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: result === 'PASS' ? '#f0fdf4' : '#fef2f2',
                        color: result === 'PASS' ? '#16a34a' : '#dc2626',
                      }}>
                        {result}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {new Date(ev.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {ev.performed_by_name && ` · ${ev.performed_by_name}`}
                  </div>
                  {remarks && <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>{remarks}</div>}
                  {ev.old_value?.status && ev.new_value?.status && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {ev.old_value.status} → {ev.new_value.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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
const EMPTY_MACHINE = { name: '', machineRefId: '', model: '', serialNumber: '', installationDate: '' };

function MachinesSection({ deptId, machines, checklist, session, readiness, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_MACHINE);
  const [saving, setSaving] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [statusBusy, setStatusBusy] = useState({});

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

  const changeStatus = async (machineId, status) => {
    setStatusBusy(b => ({ ...b, [machineId]: true }));
    try {
      await api(`/departments/${deptId}/machines/${machineId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setStatusBusy(b => ({ ...b, [machineId]: false })); }
  };

  const readinessMap = {};
  (readiness?.machines ?? []).forEach(m => { readinessMap[m.id] = m; });

  return (
    <>
      {inspectTarget && (
        <InspectModal
          machine={inspectTarget}
          deptId={deptId}
          checklist={checklist}
          session={session}
          onClose={() => setInspectTarget(null)}
          onDone={() => { setInspectTarget(null); onRefresh(); }}
        />
      )}
      {historyTarget && (
        <HistoryDrawer
          machine={historyTarget}
          deptId={deptId}
          onClose={() => setHistoryTarget(null)}
        />
      )}

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
            </Grid>
            <div style={{ marginTop: 12 }}>
              <button style={primaryBtn} onClick={addMachine} disabled={saving}>{saving ? 'Adding…' : 'Add Machine'}</button>
            </div>
          </div>
        )}

        {(!machines || machines.length === 0) && !showAdd && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>No machines added yet.</div>
        )}

        {(machines ?? []).map(m => {
          const ri = readinessMap[m.id];
          const isAvailable = ri?.available;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              border: `1px solid ${isAvailable ? '#bbf7d0' : '#e2e8f0'}`,
              background: isAvailable ? '#f0fdf4' : '#fff',
              borderRadius: 10, marginBottom: 8,
            }}>
              {/* Machine info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {m.name}
                  {m.machineRefId && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{m.machineRefId}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <OperationalBadge status={m.status} />
                  <InspectionBadge lastInspectedAt={m.lastInspectedAt} />
                  {m.lastInspectedAt && (
                    <span>Last: {fmtTime(m.lastInspectedAt)}</span>
                  )}
                </div>
              </div>

              {/* Status dropdown */}
              <select
                value={m.status}
                disabled={statusBusy[m.id]}
                onChange={e => changeStatus(m.id, e.target.value)}
                style={{ ...inp, width: 140, padding: '5px 8px', fontSize: 12, flexShrink: 0 }}
              >
                {OPERATIONAL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>

              {/* Inspect */}
              <button
                style={{ ...successBtn, padding: '6px 12px', fontSize: 11, flexShrink: 0 }}
                onClick={() => setInspectTarget(m)}
              >
                Inspect
              </button>

              {/* History */}
              <button
                style={{ ...ghostBtn, padding: '6px 10px', fontSize: 11, flexShrink: 0 }}
                onClick={() => setHistoryTarget(m)}
              >
                History
              </button>
            </div>
          );
        })}
      </Card>
    </>
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
          No checklist items yet. Add items above for the morning inspection.
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
          <button style={{ ...ghostBtn, padding: '3px 8px', fontSize: 11 }}
            onClick={() => updateItem(item.id, { isMandatory: !item.isMandatory })}>
            {item.isMandatory ? 'Optional' : 'Mandatory'}
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
// SECTION 4 — Today's Inspection (per machine)
// ══════════════════════════════════════════════════════════════════
function TodayInspectionSection({ deptId, machines, checklist, session, readiness, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);

  const items = (checklist?.items ?? []).filter(i => i.isActive);
  const completedIds = new Set((session?.completions ?? []).map(c => c.itemId));

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

  const totalMachines = machines?.length ?? 0;
  const inspectedCount = readiness?.readyCount ?? 0;

  return (
    <>
      {inspectTarget && (
        <InspectModal
          machine={inspectTarget}
          deptId={deptId}
          checklist={checklist}
          session={session}
          onClose={() => setInspectTarget(null)}
          onDone={() => { setInspectTarget(null); onRefresh(); }}
        />
      )}

      <Card title="Today's Inspection" defaultOpen>
        {/* Department readiness banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
          borderRadius: 10, marginBottom: 16,
          background: readiness?.ready ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${readiness?.ready ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <span style={{ fontSize: 28 }}>{readiness?.ready ? '✅' : '🔒'}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: readiness?.ready ? '#16a34a' : '#dc2626' }}>
              {readiness?.ready
                ? `${inspectedCount} of ${totalMachines} machine${totalMachines !== 1 ? 's' : ''} ready for production`
                : 'Department NOT READY — Production blocked'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{readiness?.reason}</div>
          </div>
        </div>

        {/* Checklist session area — shared context for all machines */}
        {items.length > 0 && (
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 10 }}>
              Department Checklist — complete before inspecting each machine
            </div>
            {!session ? (
              <button style={primaryBtn} onClick={startSession} disabled={busy}>
                {busy ? 'Starting…' : '▶ Start Inspection Session'}
              </button>
            ) : (
              items.map(item => {
                const done = completedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => !busy && toggleItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 8, border: `1px solid ${done ? '#bbf7d0' : '#e2e8f0'}`,
                      background: done ? '#f0fdf4' : '#fff', marginBottom: 6, cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${done ? '#16a34a' : '#e2e8f0'}`,
                      background: done ? '#16a34a' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: done ? '#16a34a' : '#1e293b', textDecoration: done ? 'line-through' : 'none' }}>
                      {item.itemText}
                    </span>
                    {item.isMandatory && !done && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>*</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Per-machine inspection row */}
        {totalMachines === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
            No machines configured. Add machines in the Machines section.
          </div>
        )}

        {(machines ?? []).map(m => {
          const valid = inspectedToday(m.lastInspectedAt);
          const blocked = m.status === 'BREAKDOWN' || m.status === 'MAINTENANCE';
          const available = valid && !blocked;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              border: `1px solid ${available ? '#bbf7d0' : '#e2e8f0'}`,
              background: available ? '#f0fdf4' : '#fff',
              borderRadius: 10, marginBottom: 8,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: available ? '#16a34a' : (blocked ? '#dc2626' : '#d97706') }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                  {m.name}
                  {m.machineRefId && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginLeft: 6, fontWeight: 400 }}>{m.machineRefId}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <OperationalBadge status={m.status} />
                  <InspectionBadge lastInspectedAt={m.lastInspectedAt} />
                  {m.lastInspectedAt && <span>at {fmtTime(m.lastInspectedAt)}</span>}
                  {blocked && <span style={{ color: '#dc2626', fontWeight: 600 }}>— production blocked</span>}
                </div>
              </div>

              <button
                style={{
                  ...successBtn, padding: '7px 14px', fontSize: 12, flexShrink: 0,
                  opacity: valid ? 0.7 : 1,
                }}
                onClick={() => setInspectTarget(m)}
              >
                {valid ? 'Re-inspect' : 'Inspect'}
              </button>
            </div>
          );
        })}
      </Card>
    </>
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

  const readiness = detail?.readiness;

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

        {/* Today's readiness chip */}
        <div style={{
          padding: '12px 22px', borderRadius: 12, textAlign: 'center', minWidth: 160,
          background: readiness?.ready ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${readiness?.ready ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: readiness?.ready ? '#16a34a' : '#dc2626' }}>
            Today's Status
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: readiness?.ready ? '#16a34a' : '#dc2626', marginTop: 3 }}>
            {readiness?.ready ? '✅ READY' : '🔒 NOT READY'}
          </div>
          {readiness && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {readiness.readyCount ?? 0}/{readiness.totalCount ?? 0} machines
            </div>
          )}
        </div>
      </div>

      {detail && (
        <>
          <TodayInspectionSection
            deptId={deptId}
            machines={detail.machines}
            checklist={detail.checklist}
            session={detail.todaySession ?? null}
            readiness={detail.readiness}
            onRefresh={refresh}
          />
          <DeptInfoSection deptId={deptId} dept={dept} ext={detail.ext} onExtSaved={saved => setDetail(d => ({ ...d, ext: saved }))} />
          <MachinesSection
            deptId={deptId}
            machines={detail.machines}
            checklist={detail.checklist}
            session={detail.todaySession ?? null}
            readiness={detail.readiness}
            onRefresh={refresh}
          />
          <ChecklistConfigSection deptId={deptId} checklist={detail.checklist} onRefresh={refresh} />
        </>
      )}
    </div>
  );
}
