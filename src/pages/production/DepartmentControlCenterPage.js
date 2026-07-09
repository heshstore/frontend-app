import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';

// ── Design tokens (matches ERP theme) ────────────────────────────────────────
const C = {
  blue: '#2563eb', blueLt: '#eff6ff', border: '#e2e8f0',
  red: '#dc2626', redLt: '#fef2f2', green: '#16a34a', greenLt: '#f0fdf4',
  amber: '#d97706', amberLt: '#fffbeb', slate: '#64748b', bg: '#f8fafc',
  white: '#fff', text: '#1e293b', muted: '#94a3b8',
};
const inp = {
  padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, color: C.text, background: C.white, width: '100%', boxSizing: 'border-box',
};
const btn = (bg, color = '#fff') => ({
  padding: '7px 16px', background: bg, color, border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
});
const btnSm = (bg, color = '#fff') => ({ ...btn(bg, color), padding: '4px 10px', fontSize: 12 });
const outBtn = { ...btn(C.white, C.slate), border: `1px solid ${C.border}` };

// ── Helpers ───────────────────────────────────────────────────────────────────
const api = async (path, opts = {}) => {
  const res = await apiFetch(path, opts);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

const DEPT_TYPES = ['Production', 'Quality', 'Packing', 'Warehouse', 'Maintenance', 'Administration'];
const INSPECTION_TYPES = ['100%', 'Sampling', 'First Piece', 'Final Inspection'];
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const MACHINE_STATUSES = ['RUNNING', 'IDLE', 'BREAKDOWN', 'MAINTENANCE'];
const DOC_TYPES = ['SOP', 'MACHINE_MANUAL', 'MAINTENANCE_MANUAL', 'SAFETY_MANUAL', 'WORK_INSTRUCTION'];
const STATUS_COLOR = { RUNNING: C.green, IDLE: C.slate, BREAKDOWN: C.red, MAINTENANCE: C.amber };
const FREQ_COLOR = { DAILY: C.blue, WEEKLY: C.green, MONTHLY: C.amber, QUARTERLY: '#7c3aed', YEARLY: C.red };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '—'; }
function fmtMins(m) { if (!m) return '—'; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }

// ── Collapsible Section ───────────────────────────────────────────────────────
function Section({ title, badge, badgeColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, color: C.text,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          {badge != null && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: badgeColor ?? C.blueLt, color: badgeColor ? C.white : C.blue,
            }}>{badge}</span>
          )}
        </span>
        <span style={{ color: C.muted }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>{children}</div>}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, position: 'relative', transition: 'background .2s',
          background: checked ? C.blue : C.border, flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16,
          borderRadius: '50%', background: C.white, transition: 'left .2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: C.text }}>{label}</span>
    </label>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}
function GridRow({ children, cols = 3 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 4 }}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── S1+S2+S3+S12+S13: Extension form ─────────────────────────────────────────
function ExtensionSection({ deptId, ext, onSaved }) {
  const [form, setForm] = useState(ext);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(ext); }, [ext]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api(`/departments/${deptId}/extension`, { method: 'PATCH', body: JSON.stringify(form) });
      onSaved(saved);
      toast.success('Saved');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (!form) return null;
  return (
    <>
      <Section title="Basic Information" defaultOpen>
        <GridRow>
          <Field label="Description">
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
              style={{ ...inp, height: 72, resize: 'vertical' }} />
          </Field>
          <Field label="Department Type">
            <select value={form.deptType ?? 'Production'} onChange={e => set('deptType', e.target.value)} style={inp}>
              {DEPT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </GridRow>
      </Section>

      <Section title="Capacity Planning">
        <GridRow cols={4}>
          <Field label="Working Hours / Day">
            <input type="number" value={form.workingHoursPerDay ?? 8} onChange={e => set('workingHoursPerDay', e.target.value)} style={inp} />
          </Field>
          <Field label="No. of Machines">
            <input type="number" value={form.noMachines ?? 0} onChange={e => set('noMachines', e.target.value)} style={inp} />
          </Field>
          <Field label="No. of Operators">
            <input type="number" value={form.noOperators ?? 0} onChange={e => set('noOperators', e.target.value)} style={inp} />
          </Field>
          <Field label="Efficiency %">
            <input type="number" value={form.efficiencyPct ?? 85} onChange={e => set('efficiencyPct', e.target.value)} style={inp} />
          </Field>
          <Field label="OEE Target %">
            <input type="number" value={form.oeeTargetPct ?? 80} onChange={e => set('oeeTargetPct', e.target.value)} style={inp} />
          </Field>
        </GridRow>
      </Section>

      <Section title="Department Ownership">
        <GridRow>
          <Field label="Department Manager">
            <input value={form.managerName ?? ''} onChange={e => set('managerName', e.target.value)} style={inp} placeholder="Name" />
          </Field>
          <Field label="Supervisor">
            <input value={form.supervisorName ?? ''} onChange={e => set('supervisorName', e.target.value)} style={inp} placeholder="Name" />
          </Field>
          <Field label="Team Leader">
            <input value={form.teamLeaderName ?? ''} onChange={e => set('teamLeaderName', e.target.value)} style={inp} placeholder="Name" />
          </Field>
        </GridRow>
      </Section>

      <Section title="Quality Rules">
        <GridRow cols={2}>
          <Field label="Require QC">
            <Toggle checked={!!form.requireQc} onChange={v => set('requireQc', v)} label="QC required before dispatch" />
          </Field>
          <Field label="Inspection Type">
            <select value={form.inspectionType ?? ''} onChange={e => set('inspectionType', e.target.value)} style={inp}>
              <option value="">— Select —</option>
              {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </GridRow>
      </Section>

      <Section title="Department Rules">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Toggle checked={!!form.allowParallelJobs} onChange={v => set('allowParallelJobs', v)} label="Allow Parallel Jobs" />
          <Toggle checked={!!form.requireSupervisorApproval} onChange={v => set('requireSupervisorApproval', v)} label="Require Supervisor Approval (checklist)" />
          <Toggle checked={!!form.requireQcRule} onChange={v => set('requireQcRule', v)} label="Require QC Checkpoint" />
          <Toggle checked={!!form.allowSkipProcess} onChange={v => set('allowSkipProcess', v)} label="Allow Skip Process" />
          <Toggle checked={!!form.allowOvertime} onChange={v => set('allowOvertime', v)} label="Allow Overtime" />
        </div>
      </Section>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btn(C.blue)} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </>
  );
}

// ── S4+S5: Checklist + Production Lock ───────────────────────────────────────
function ChecklistSection({ deptId, checklist, session, readiness, onRefresh }) {
  const [newItem, setNewItem] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const deleteItem = async (iid) => {
    try {
      await api(`/departments/${deptId}/checklist/items/${iid}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const toggleItem = async (iid, current) => {
    try {
      await api(`/departments/${deptId}/checklist/items/${iid}`, {
        method: 'PATCH', body: JSON.stringify({ isMandatory: !current }),
      });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const startSession = async () => {
    setBusy(true);
    try {
      await api(`/departments/${deptId}/checklist/today/start`, { method: 'POST' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const toggleComplete = async (itemId) => {
    if (!session) return;
    setBusy(true);
    try {
      const completedIds = new Set((session.completions || []).map(c => c.itemId));
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

  const approve = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await api(`/departments/${deptId}/checklist/today/approve`, {
        method: 'POST', body: JSON.stringify({ sessionId: session.id }),
      });
      toast.success('Checklist approved — Department is READY');
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const completedIds = new Set((session?.completions || []).map(c => c.itemId));
  const items = checklist?.items ?? [];
  const totalMandatory = items.filter(i => i.isMandatory && i.isActive).length;
  const completedMandatory = items.filter(i => i.isMandatory && i.isActive && completedIds.has(i.id)).length;
  const progress = totalMandatory > 0 ? Math.round((completedMandatory / totalMandatory) * 100) : 100;

  return (
    <>
      <Section
        title="Daily Machine Startup Checklist"
        badge={`${items.filter(i => i.isActive).length} items`}
        defaultOpen
      >
        {/* Add item */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add checklist item…"
            style={{ ...inp, flex: 1, minWidth: 200 }}
          />
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} />
            Mandatory
          </label>
          <button style={btn(C.blue)} onClick={addItem} disabled={adding || !newItem.trim()}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
            No checklist items yet. Add items above.
          </div>
        ) : (
          <div>
            {items.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: item.isActive ? C.white : '#f8fafc', borderRadius: 8,
                border: `1px solid ${C.border}`, marginBottom: 6, opacity: item.isActive ? 1 : 0.5,
              }}>
                <span style={{ color: C.muted, fontSize: 12, width: 20 }}>{idx + 1}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{item.itemText}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                  background: item.isMandatory ? '#fef3c7' : C.bg, color: item.isMandatory ? '#92400e' : C.slate,
                }}>
                  {item.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                </span>
                <button style={btnSm(C.bg, C.slate)} onClick={() => toggleItem(item.id, item.isMandatory)}>
                  {item.isMandatory ? 'Make Optional' : 'Make Mandatory'}
                </button>
                <button style={btnSm(C.bg, C.slate)} onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Production Lock — Today's Status"
        badge={readiness?.ready ? 'READY' : 'NOT READY'}
        badgeColor={readiness?.ready ? C.green : C.red}
        defaultOpen
      >
        {/* Status banner */}
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 16,
          background: readiness?.ready ? C.greenLt : C.redLt,
          border: `1px solid ${readiness?.ready ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>{readiness?.ready ? '✅' : '🔒'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: readiness?.ready ? C.green : C.red }}>
              {readiness?.ready ? 'MACHINE READY — Production can begin' : 'NOT READY — Production blocked'}
            </div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{readiness?.reason}</div>
          </div>
        </div>

        {/* Progress */}
        {totalMandatory > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.slate, marginBottom: 4 }}>
              <span>Mandatory items completed</span>
              <span>{completedMandatory} / {totalMandatory} ({progress}%)</span>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? C.green : C.blue, transition: 'width .3s' }} />
            </div>
          </div>
        )}

        {/* Start session */}
        {!session && items.length > 0 && (
          <button style={btn(C.blue)} onClick={startSession} disabled={busy}>
            {busy ? 'Starting…' : '▶ Start Today\'s Checklist'}
          </button>
        )}

        {/* Checklist execution */}
        {session && (
          <div>
            <div style={{ fontSize: 12, color: C.slate, marginBottom: 10 }}>
              Started: {fmtDate(session.startedAt)}
              {session.approvedAt && ` · Approved: ${fmtDate(session.approvedAt)}`}
            </div>
            {items.filter(i => i.isActive).map(item => {
              const done = completedIds.has(item.id);
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 8, border: `1px solid ${done ? '#bbf7d0' : C.border}`,
                  background: done ? C.greenLt : C.white, marginBottom: 6, cursor: 'pointer',
                }} onClick={() => toggleComplete(item.id)}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, border: `2px solid ${done ? C.green : C.border}`,
                    background: done ? C.green : C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {done && <span style={{ color: C.white, fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: done ? C.green : C.text, textDecoration: done ? 'line-through' : 'none' }}>
                    {item.itemText}
                  </span>
                  {item.isMandatory && <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>MANDATORY</span>}
                </div>
              );
            })}

            {session.isComplete && !session.approvedAt && (
              <button style={{ ...btn(C.green), marginTop: 10 }} onClick={approve} disabled={busy}>
                ✓ Supervisor Approve — Mark READY
              </button>
            )}
          </div>
        )}
      </Section>
    </>
  );
}

// ── S6: Maintenance ───────────────────────────────────────────────────────────
function MaintenanceSection({ deptId, maintenance, onRefresh }) {
  const [form, setForm] = useState({ frequency: 'DAILY', taskName: '', estimatedMinutes: 30, responsiblePerson: '' });
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const add = async () => {
    if (!form.taskName.trim()) return;
    setAdding(true);
    try {
      await api(`/departments/${deptId}/maintenance`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ frequency: 'DAILY', taskName: '', estimatedMinutes: 30, responsiblePerson: '' });
      setShowAdd(false);
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const complete = async (sid) => {
    try {
      await api(`/departments/${deptId}/maintenance/${sid}/complete`, { method: 'POST' });
      toast.success('Marked complete');
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (sid) => {
    try {
      await api(`/departments/${deptId}/maintenance/${sid}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const byFreq = FREQUENCIES.reduce((m, f) => {
    m[f] = (maintenance ?? []).filter(s => s.frequency === f);
    return m;
  }, {});

  return (
    <Section title="Preventive Maintenance Schedule" badge={maintenance?.length ?? 0}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={btn(C.blue)} onClick={() => setShowAdd(s => !s)}>
          {showAdd ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <GridRow cols={4}>
            <Field label="Frequency">
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inp}>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Task Name">
              <input value={form.taskName} onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))} style={inp} placeholder="e.g. Check oil level" />
            </Field>
            <Field label="Estimated (min)">
              <input type="number" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: +e.target.value }))} style={inp} />
            </Field>
            <Field label="Responsible Person">
              <input value={form.responsiblePerson} onChange={e => setForm(f => ({ ...f, responsiblePerson: e.target.value }))} style={inp} placeholder="Name" />
            </Field>
          </GridRow>
          <button style={btn(C.blue)} onClick={add} disabled={adding}>{adding ? 'Adding…' : 'Add Task'}</button>
        </div>
      )}

      {FREQUENCIES.map(freq => {
        const tasks = byFreq[freq];
        if (!tasks.length) return null;
        return (
          <div key={freq} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FREQ_COLOR[freq], marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {freq}
            </div>
            {tasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, marginBottom: 6,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.taskName}</div>
                  <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
                    {fmtMins(t.estimatedMinutes)}
                    {t.responsiblePerson && ` · ${t.responsiblePerson}`}
                    {t.lastCompletedAt && ` · Last done: ${fmtDate(t.lastCompletedAt)}`}
                  </div>
                </div>
                <button style={btnSm(C.greenLt, C.green)} onClick={() => complete(t.id)}>✓ Done</button>
                <button style={btnSm(C.bg, C.slate)} onClick={() => remove(t.id)}>✕</button>
              </div>
            ))}
          </div>
        );
      })}

      {(!maintenance || maintenance.length === 0) && !showAdd && (
        <div style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>No maintenance schedules configured.</div>
      )}
    </Section>
  );
}

// ── S7: Machines ──────────────────────────────────────────────────────────────
function MachinesSection({ deptId, machines, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', machineType: '', model: '', serialNumber: '', machineRefId: '', installationDate: '', capacity: '', capacityUnit: '' });
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      await api(`/departments/${deptId}/machines`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', machineType: '', model: '', serialNumber: '', machineRefId: '', installationDate: '', capacity: '', capacityUnit: '' });
      setShowAdd(false);
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const setStatus = async (mid, status) => {
    try {
      await api(`/departments/${deptId}/machines/${mid}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (mid) => {
    try {
      await api(`/departments/${deptId}/machines/${mid}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Section title="Machines" badge={machines?.length ?? 0}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={btn(C.blue)} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Machine'}</button>
      </div>

      {showAdd && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <GridRow cols={3}>
            <Field label="Machine Name *">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Laser Cutter 1" />
            </Field>
            <Field label="Machine ID">
              <input value={form.machineRefId} onChange={e => setForm(f => ({ ...f, machineRefId: e.target.value }))} style={inp} placeholder="e.g. M-001" />
            </Field>
            <Field label="Type">
              <input value={form.machineType} onChange={e => setForm(f => ({ ...f, machineType: e.target.value }))} style={inp} placeholder="e.g. CNC" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} style={inp} />
            </Field>
            <Field label="Serial Number">
              <input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} style={inp} />
            </Field>
            <Field label="Installation Date">
              <input type="date" value={form.installationDate} onChange={e => setForm(f => ({ ...f, installationDate: e.target.value }))} style={inp} />
            </Field>
            <Field label="Capacity">
              <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} style={inp} />
            </Field>
            <Field label="Capacity Unit">
              <input value={form.capacityUnit} onChange={e => setForm(f => ({ ...f, capacityUnit: e.target.value }))} style={inp} placeholder="e.g. SQFT/hr" />
            </Field>
          </GridRow>
          <button style={btn(C.blue)} onClick={add} disabled={adding}>{adding ? 'Adding…' : 'Add Machine'}</button>
        </div>
      )}

      {(machines ?? []).map(m => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          border: `1px solid ${C.border}`, borderRadius: 10, background: C.white, marginBottom: 8,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: STATUS_COLOR[m.status] ?? C.muted,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name} {m.machineRefId && <span style={{ color: C.slate, fontWeight: 400 }}>({m.machineRefId})</span>}</div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
              {[m.machineType, m.model, m.serialNumber].filter(Boolean).join(' · ')}
              {m.capacity && ` · ${m.capacity}${m.capacityUnit ?? ''}`}
            </div>
          </div>
          <select
            value={m.status}
            onChange={e => setStatus(m.id, e.target.value)}
            style={{ ...inp, width: 130, padding: '5px 8px' }}
          >
            {MACHINE_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button style={btnSm(C.bg, C.slate)} onClick={() => remove(m.id)}>✕</button>
        </div>
      ))}

      {(!machines || machines.length === 0) && !showAdd && (
        <div style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>No machines added yet.</div>
      )}
    </Section>
  );
}

// ── S8: Skills ────────────────────────────────────────────────────────────────
function SkillsSection({ deptId, skills, onRefresh }) {
  const [newSkill, setNewSkill] = useState('');
  const add = async () => {
    if (!newSkill.trim()) return;
    try {
      await api(`/departments/${deptId}/skills`, { method: 'POST', body: JSON.stringify({ skillName: newSkill.trim() }) });
      setNewSkill('');
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (sid) => {
    try { await api(`/departments/${deptId}/skills/${sid}`, { method: 'DELETE' }); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <Section title="Department Skills" badge={skills?.length ?? 0}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add skill…" style={{ ...inp, flex: 1 }} />
        <button style={btn(C.blue)} onClick={add}>+ Add</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(skills ?? []).map(s => (
          <span key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            background: C.blueLt, borderRadius: 99, fontSize: 12, color: C.blue, fontWeight: 600,
          }}>
            {s.skillName}
            <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, fontSize: 14, lineHeight: 1 }}>×</button>
          </span>
        ))}
        {(!skills || skills.length === 0) && <span style={{ color: C.muted, fontSize: 13 }}>No skills added yet.</span>}
      </div>
    </Section>
  );
}

// ── S9: KPIs ──────────────────────────────────────────────────────────────────
function KpiSection({ deptId, kpis, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kpiName: '', targetValue: '', unit: '' });
  const add = async () => {
    if (!form.kpiName.trim()) return;
    try {
      await api(`/departments/${deptId}/kpis`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ kpiName: '', targetValue: '', unit: '' });
      setShowAdd(false);
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (kid) => {
    try { await api(`/departments/${deptId}/kpis/${kid}`, { method: 'DELETE' }); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <Section title="Department KPIs" badge={kpis?.length ?? 0}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={btn(C.blue)} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add KPI'}</button>
      </div>
      {showAdd && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={form.kpiName} onChange={e => setForm(f => ({ ...f, kpiName: e.target.value }))} placeholder="KPI Name" style={{ ...inp, flex: 2, minWidth: 150 }} />
          <input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} placeholder="Target" style={{ ...inp, flex: 1, minWidth: 80 }} />
          <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit (%, pcs…)" style={{ ...inp, flex: 1, minWidth: 80 }} />
          <button style={btn(C.blue)} onClick={add}>Add</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {(kpis ?? []).map(k => (
            <tr key={k.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '8px 4px', fontWeight: 600 }}>{k.kpiName}</td>
              <td style={{ padding: '8px 4px', color: C.slate }}>{k.targetValue != null ? `${k.targetValue} ${k.unit ?? ''}` : '—'}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                <button style={btnSm(C.bg, C.slate)} onClick={() => remove(k.id)}>✕</button>
              </td>
            </tr>
          ))}
          {(!kpis || kpis.length === 0) && (
            <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: C.muted }}>No KPIs configured.</td></tr>
          )}
        </tbody>
      </table>
    </Section>
  );
}

// ── S10: KRAs ─────────────────────────────────────────────────────────────────
function KraSection({ deptId, kras, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kraName: '', description: '' });
  const add = async () => {
    if (!form.kraName.trim()) return;
    try {
      await api(`/departments/${deptId}/kras`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ kraName: '', description: '' });
      setShowAdd(false);
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (kid) => {
    try { await api(`/departments/${deptId}/kras/${kid}`, { method: 'DELETE' }); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <Section title="Department KRAs" badge={kras?.length ?? 0}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={btn(C.blue)} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add KRA'}</button>
      </div>
      {showAdd && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input value={form.kraName} onChange={e => setForm(f => ({ ...f, kraName: e.target.value }))} placeholder="KRA Title" style={inp} />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" style={inp} />
          <div><button style={btn(C.blue)} onClick={add}>Add</button></div>
        </div>
      )}
      <div>
        {(kras ?? []).map(k => (
          <div key={k.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{k.kraName}</div>
              {k.description && <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{k.description}</div>}
            </div>
            <button style={btnSm(C.bg, C.slate)} onClick={() => remove(k.id)}>✕</button>
          </div>
        ))}
        {(!kras || kras.length === 0) && <div style={{ color: C.muted, textAlign: 'center', padding: '20px 0', fontSize: 13 }}>No KRAs configured.</div>}
      </div>
    </Section>
  );
}

// ── S11: Documents ────────────────────────────────────────────────────────────
function DocumentsSection({ deptId, documents, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ docType: 'SOP', docName: '', fileUrl: '' });
  const add = async () => {
    if (!form.docName.trim()) return;
    try {
      await api(`/departments/${deptId}/documents`, { method: 'POST', body: JSON.stringify(form) });
      setForm({ docType: 'SOP', docName: '', fileUrl: '' });
      setShowAdd(false);
      onRefresh();
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (did) => {
    try { await api(`/departments/${deptId}/documents/${did}`, { method: 'DELETE' }); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };
  const DOC_LABEL = { SOP: 'SOP', MACHINE_MANUAL: 'Machine Manual', MAINTENANCE_MANUAL: 'Maintenance Manual', SAFETY_MANUAL: 'Safety Manual', WORK_INSTRUCTION: 'Work Instruction' };
  return (
    <Section title="Department Documents" badge={documents?.length ?? 0}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button style={btn(C.blue)} onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Document'}</button>
      </div>
      {showAdd && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 140 }}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABEL[t]}</option>)}
          </select>
          <input value={form.docName} onChange={e => setForm(f => ({ ...f, docName: e.target.value }))} placeholder="Document name" style={{ ...inp, flex: 2, minWidth: 150 }} />
          <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="URL / link (optional)" style={{ ...inp, flex: 2, minWidth: 150 }} />
          <button style={btn(C.blue)} onClick={add}>Add</button>
        </div>
      )}
      <div>
        {(documents ?? []).map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{d.docName}</div>
              <div style={{ fontSize: 11, color: C.slate }}>{DOC_LABEL[d.docType] ?? d.docType} · {fmtDate(d.uploadedAt)}</div>
            </div>
            {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue }}>Open ↗</a>}
            <button style={btnSm(C.bg, C.slate)} onClick={() => remove(d.id)}>✕</button>
          </div>
        ))}
        {(!documents || documents.length === 0) && <div style={{ color: C.muted, textAlign: 'center', padding: '20px 0', fontSize: 13 }}>No documents added yet.</div>}
      </div>
    </Section>
  );
}

// ── S14: Dashboard ────────────────────────────────────────────────────────────
function DashboardSection({ dashboard }) {
  if (!dashboard) return null;
  const kpis = [
    { label: "Today's Jobs", value: dashboard.todayJobs, color: C.blue },
    { label: 'Completed', value: dashboard.completedJobs, color: C.green },
    { label: 'Pending', value: dashboard.pendingJobs, color: C.amber },
    { label: 'In Progress', value: dashboard.inProgressJobs, color: '#7c3aed' },
    { label: 'Running Machines', value: dashboard.runningMachines, color: C.green },
    { label: 'Idle Machines', value: dashboard.idleMachines, color: C.slate },
    { label: 'Under Maintenance', value: dashboard.maintenanceMachines, color: C.amber },
    { label: 'Breakdown', value: dashboard.breakdownMachines, color: C.red },
  ];
  return (
    <Section title="Dashboard Summary" defaultOpen>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value ?? 0}</div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DepartmentControlCenterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deptId = Number(id);

  const [dept, setDept] = useState(null);
  const [detail, setDetail] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDept = useCallback(async () => {
    try {
      const res = await apiFetch(`/departments?includeInactive=true`);
      const list = await res.json();
      const d = list.find(x => x.id === deptId);
      if (d) setDept(d);
    } catch { }
  }, [deptId]);

  const loadDetail = useCallback(async () => {
    try {
      const [det, dash] = await Promise.all([
        api(`/departments/${deptId}/detail`),
        api(`/departments/${deptId}/dashboard`),
      ]);
      setDetail(det);
      setDashboard(dash);
    } catch (e) {
      toast.error('Failed to load department detail');
    }
  }, [deptId]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDept(), loadDetail()]);
    setLoading(false);
  }, [loadDept, loadDetail]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => { loadDetail(); }, [loadDetail]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.slate, fontFamily: 'system-ui, sans-serif' }}>
        Loading department…
      </div>
    );
  }

  const ready = detail?.readiness?.ready;

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ ...outBtn, marginBottom: 10, fontSize: 12 }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>
            {dept?.name ?? 'Department'}
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: C.slate, fontWeight: 400, marginLeft: 10 }}>
              {dept?.code}
            </span>
          </h1>
          <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
            {detail?.ext?.deptType ?? 'Department'} Control Center
          </div>
        </div>

        {/* Today's status pill */}
        <div style={{
          padding: '12px 20px', borderRadius: 12, textAlign: 'center',
          background: ready ? C.greenLt : C.redLt,
          border: `2px solid ${ready ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ready ? C.green : C.red, textTransform: 'uppercase', letterSpacing: 1 }}>
            Today's Status
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ready ? C.green : C.red, marginTop: 2 }}>
            {ready ? '✅ READY' : '🔒 NOT READY'}
          </div>
        </div>
      </div>

      {/* Sections */}
      {detail && (
        <>
          <DashboardSection dashboard={dashboard} />
          <ExtensionSection deptId={deptId} ext={detail.ext} onSaved={(saved) => setDetail(d => ({ ...d, ext: saved }))} />
          <ChecklistSection
            deptId={deptId}
            checklist={detail.checklist}
            session={detail.readiness?.session}
            readiness={detail.readiness}
            onRefresh={refresh}
          />
          <MaintenanceSection deptId={deptId} maintenance={detail.maintenance} onRefresh={refresh} />
          <MachinesSection deptId={deptId} machines={detail.machines} onRefresh={refresh} />
          <SkillsSection deptId={deptId} skills={detail.skills} onRefresh={refresh} />
          <KpiSection deptId={deptId} kpis={detail.kpis} onRefresh={refresh} />
          <KraSection deptId={deptId} kras={detail.kras} onRefresh={refresh} />
          <DocumentsSection deptId={deptId} documents={detail.documents} onRefresh={refresh} />
        </>
      )}
    </div>
  );
}
