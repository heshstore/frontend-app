import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../components/layout/PageLayout';

// ── Constants ─────────────────────────────────────────────────────────────────

const AREAS = [
  'CRM / Telecaller', 'WhatsApp Campaign', 'WhatsApp Inbox',
  'Finance / Collections', 'Dispatch', 'Production',
  'Infrastructure', 'Navigation / General',
];

const ROLES = ['Telecaller', 'Accounts', 'Dispatch / Warehouse', 'WhatsApp Operator', 'Manager', 'Admin'];

const STORAGE_KEY = 'pilot_ops_log_v1';

const SEV = {
  HIGH:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', dot: '#dc2626', label: 'HIGH — Blocks work' },
  MEDIUM: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', dot: '#d97706', label: 'MEDIUM — Slows work' },
  LOW:    { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', dot: '#16a34a', label: 'LOW — Minor friction' },
};

const AREA_ICONS = {
  'CRM / Telecaller':      '📞',
  'WhatsApp Campaign':     '📣',
  'WhatsApp Inbox':        '📥',
  'Finance / Collections': '💰',
  'Dispatch':              '🚚',
  'Production':            '⚙️',
  'Infrastructure':        '🖥️',
  'Navigation / General':  '🗺',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadLog() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveLog(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function nowISO() { return new Date().toISOString(); }

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function exportLog(entries) {
  const lines = ['# Operations Log Export', `Generated: ${new Date().toLocaleString('en-IN')}`, '', '---', ''];
  const open     = entries.filter(e => !e.resolved);
  const resolved = entries.filter(e => e.resolved);

  lines.push(`## Open (${open.length})`);
  const bySev = { HIGH: [], MEDIUM: [], LOW: [] };
  open.forEach(e => bySev[e.severity]?.push(e));
  for (const sev of ['HIGH', 'MEDIUM', 'LOW']) {
    if (!bySev[sev].length) continue;
    lines.push(`### ${sev}`);
    bySev[sev].forEach(e => {
      lines.push(`- [${e.area}] ${e.description}`);
      lines.push(`  Reporter: ${e.role}${e.owner ? ` | Owner: ${e.owner}` : ''} · ${fmtTime(e.at)}`);
      if (e.steps) lines.push(`  Steps: ${e.steps}`);
    });
    lines.push('');
  }

  if (resolved.length > 0) {
    lines.push(`## Resolved (${resolved.length})`);
    resolved.forEach(e => {
      lines.push(`- [${e.area}] ${e.description}`);
      lines.push(`  Resolved ${fmtTime(e.resolved_at)}${e.resolution_note ? ` — ${e.resolution_note}` : ''}`);
    });
    lines.push('');
  }

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).catch(() => {});
  return text;
}

// ── Severity picker ───────────────────────────────────────────────────────────

function SevPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(SEV).map(([key, s]) => (
        <button
          key={key} type="button" onClick={() => onChange(key)}
          style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: value === key ? s.bg : '#f8fafc',
            color: value === key ? s.color : '#6b7280',
            border: `2px solid ${value === key ? s.border : '#e2e8f0'}`,
          }}
        >
          <span style={{ color: s.dot, marginRight: 5 }}>●</span>{s.label}
        </button>
      ))}
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, onDelete, onResolve, onReopen }) {
  const s = SEV[entry.severity] || SEV.LOW;
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const submitResolve = () => {
    onResolve(entry.id, resolveNote.trim());
    setShowResolveInput(false);
    setResolveNote('');
  };

  return (
    <div style={{
      background: entry.resolved ? '#f8fafc' : s.bg,
      border: `1px solid ${entry.resolved ? '#e2e8f0' : s.border}`,
      borderLeft: `4px solid ${entry.resolved ? '#9ca3af' : s.dot}`,
      borderRadius: 8, padding: '12px 14px', marginBottom: 8,
      opacity: entry.resolved ? 0.75 : 1,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {entry.resolved ? (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#166534', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
              ✓ RESOLVED
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, background: s.dot, color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
              {entry.severity}
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: entry.resolved ? '#6b7280' : s.color }}>
            {AREA_ICONS[entry.area]} {entry.area}
          </span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{entry.role}</span>
          {entry.owner && (
            <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
              → {entry.owner}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtTime(entry.at)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {!entry.resolved && (
            <button
              onClick={() => setShowResolveInput(v => !v)}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: '#dcfce7', color: '#166534', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              title="Mark as resolved"
            >
              ✓ Resolve
            </button>
          )}
          {entry.resolved && (
            <button
              onClick={() => onReopen(entry.id)}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: '#f3f4f6', color: '#6b7280', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Reopen
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af', lineHeight: 1, padding: 0 }}
            title="Delete"
          >✕</button>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5 }}>{entry.description}</div>

      {entry.steps && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 5, fontStyle: 'italic' }}>Steps: {entry.steps}</div>
      )}

      {/* Resolution info (if resolved) */}
      {entry.resolved && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#166534' }}>
          Resolved {fmtTime(entry.resolved_at)}
          {entry.resolution_note && <> — <em>{entry.resolution_note}</em></>}
        </div>
      )}

      {/* Inline resolve input */}
      {showResolveInput && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
            placeholder="Resolution note (optional)"
            style={{ flex: 1, minWidth: 180, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
            onKeyDown={e => { if (e.key === 'Enter') submitResolve(); if (e.key === 'Escape') setShowResolveInput(false); }}
            autoFocus
          />
          <button onClick={submitResolve} style={{ padding: '6px 12px', borderRadius: 6, background: '#166534', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Confirm
          </button>
          <button onClick={() => setShowResolveInput(false)} style={{ padding: '6px 10px', borderRadius: 6, background: '#f3f4f6', color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ entries }) {
  const open     = entries.filter(e => !e.resolved);
  const resolved = entries.filter(e => e.resolved);
  const counts   = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  open.forEach(e => { counts[e.severity] = (counts[e.severity] || 0) + 1; });
  const areaCounts = {};
  open.forEach(e => { areaCounts[e.area] = (areaCounts[e.area] || 0) + 1; });
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'stretch' }}>
      {Object.entries(SEV).map(([key, s]) => (
        <div key={key} style={{
          background: counts[key] > 0 ? s.bg : '#f8fafc',
          border: `1px solid ${counts[key] > 0 ? s.border : '#e2e8f0'}`,
          borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 72,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: counts[key] > 0 ? s.dot : '#9ca3af' }}>{counts[key]}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: counts[key] > 0 ? s.color : '#9ca3af' }}>{key}</div>
        </div>
      ))}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{resolved.length}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Resolved</div>
      </div>
      {topArea && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: '#0369a1', fontSize: 11, marginBottom: 2 }}>Top issue area</div>
          <div style={{ fontWeight: 700, color: '#0c4a6e' }}>{AREA_ICONS[topArea[0]]} {topArea[0]}</div>
          <div style={{ color: '#0369a1', fontSize: 11 }}>{topArea[1]} open</div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OperationsLog() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    area: AREAS[0], role: ROLES[0], severity: 'MEDIUM',
    description: '', steps: '', owner: '',
  });
  const [filterArea, setFilterArea]     = useState('ALL');
  const [filterSev, setFilterSev]       = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [showForm, setShowForm]         = useState(true);
  const [exported, setExported]         = useState(false);
  const [cleared, setCleared]           = useState(false);

  useEffect(() => { setEntries(loadLog()); }, []);

  const add = useCallback(() => {
    if (!form.description.trim()) return;
    const entry = {
      id: Date.now(), at: nowISO(), resolved: false,
      ...form,
      description: form.description.trim(),
      steps: form.steps.trim(),
      owner: form.owner.trim(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveLog(updated);
    setForm(f => ({ ...f, description: '', steps: '', owner: '' }));
    setFilterStatus('OPEN');
  }, [entries, form]);

  const remove = useCallback((id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveLog(updated);
  }, [entries]);

  const resolve = useCallback((id, note) => {
    const updated = entries.map(e =>
      e.id === id ? { ...e, resolved: true, resolved_at: nowISO(), resolution_note: note } : e
    );
    setEntries(updated);
    saveLog(updated);
  }, [entries]);

  const reopen = useCallback((id) => {
    const updated = entries.map(e =>
      e.id === id ? { ...e, resolved: false, resolved_at: null, resolution_note: '' } : e
    );
    setEntries(updated);
    saveLog(updated);
  }, [entries]);

  const doExport = () => {
    exportLog(entries);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const doClear = () => {
    if (!window.confirm(`Clear all ${entries.length} entries? This cannot be undone.\n\nExport first to keep a copy.`)) return;
    setEntries([]);
    saveLog([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const filtered = entries.filter(e =>
    (filterArea   === 'ALL'      || e.area === filterArea) &&
    (filterSev    === 'ALL'      || e.severity === filterSev) &&
    (filterStatus === 'ALL'      ||
     (filterStatus === 'OPEN'     && !e.resolved) ||
     (filterStatus === 'RESOLVED' && e.resolved))
  );

  const openCount     = entries.filter(e => !e.resolved).length;
  const resolvedCount = entries.filter(e => e.resolved).length;

  const inp = {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 13, boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
  };

  const lbl = (text, sub) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
      {text}{sub && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>{sub}</span>}
    </label>
  );

  return (
    <PageLayout
      title="Operations Log"
      subtitle="Log and track operational incidents, friction, and workflow issues"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {cleared  && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Cleared</span>}
          {exported && <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 600 }}>✓ Copied to clipboard</span>}
          <button onClick={doExport} disabled={entries.length === 0} style={{
            padding: '7px 14px', background: entries.length ? '#0d6efd' : '#e5e7eb',
            color: entries.length ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 700, cursor: entries.length ? 'pointer' : 'not-allowed',
          }}>
            Export ({entries.length})
          </button>
          {entries.length > 0 && (
            <button onClick={doClear} style={{
              padding: '7px 14px', background: '#fee2e2', color: '#991b1b',
              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Clear All
            </button>
          )}
        </div>
      }
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Stats */}
        {entries.length > 0 && <StatsBar entries={entries} />}

        {/* Add form */}
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
          <button
            onClick={() => setShowForm(f => !f)}
            style={{
              width: '100%', padding: '12px 16px', background: '#f8fafc', border: 'none',
              borderBottom: showForm ? '1px solid #dee2e6' : 'none',
              textAlign: 'left', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#111827',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span>+ Log New Incident</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{showForm ? '▲ collapse' : '▼ expand'}</span>
          </button>

          {showForm && (
            <div style={{ padding: 16 }}>
              {/* Row 1: Area + Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  {lbl('Operational area')}
                  <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} style={inp}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('Reporter role')}
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Severity */}
              <div style={{ marginBottom: 12 }}>
                {lbl('Severity')}
                <SevPicker value={form.severity} onChange={v => setForm(f => ({ ...f, severity: v }))} />
              </div>

              {/* Row 3: Description */}
              <div style={{ marginBottom: 10 }}>
                {lbl('What happened?', '(be specific — what were they trying to do, what went wrong)')}
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder='e.g. "Telecaller clicked Done on a follow-up but the card did not advance. Had to scroll back manually."'
                  rows={3}
                  style={{ ...inp, resize: 'vertical', minHeight: 70 }}
                />
              </div>

              {/* Row 4: Steps + Owner */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  {lbl('Steps to reproduce', '(optional)')}
                  <input
                    type="text"
                    value={form.steps}
                    onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                    placeholder='e.g. "Follow-ups → Overdue → click Done"'
                    style={inp}
                  />
                </div>
                <div>
                  {lbl('Assigned to', '(optional)')}
                  <input
                    type="text"
                    value={form.owner}
                    onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder='e.g. "Bhavin" or "Engineering"'
                    style={inp}
                  />
                </div>
              </div>

              <button
                onClick={add}
                disabled={!form.description.trim()}
                style={{
                  padding: '10px 20px',
                  background: form.description.trim() ? '#0d6efd' : '#e5e7eb',
                  color: form.description.trim() ? '#fff' : '#9ca3af',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
                  cursor: form.description.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Log Incident
              </button>
            </div>
          )}
        </div>

        {/* Filter row */}
        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Filter:</span>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
              {[['OPEN', `Open (${openCount})`], ['RESOLVED', `Resolved (${resolvedCount})`], ['ALL', 'All']].map(([key, label]) => (
                <button
                  key={key} onClick={() => setFilterStatus(key)}
                  style={{
                    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: filterStatus === key ? '#fff' : 'transparent',
                    color: filterStatus === key ? '#111827' : '#6b7280',
                    boxShadow: filterStatus === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
              <option value="ALL">All severities</option>
              {Object.keys(SEV).map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
              <option value="ALL">All areas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {(filterArea !== 'ALL' || filterSev !== 'ALL') && (
              <button onClick={() => { setFilterArea('ALL'); setFilterSev('ALL'); }} style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff',
                fontSize: 12, cursor: 'pointer', color: '#6b7280',
              }}>✕ Clear</button>
            )}
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
              {filtered.length} of {entries.length} shown
            </span>
          </div>
        )}

        {/* Entry list */}
        {filtered.length === 0 && entries.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No incidents logged yet</div>
            <div style={{ fontSize: 13 }}>Log operational friction, confusion, or incidents as they happen during daily operations.</div>
          </div>
        )}

        {filtered.length === 0 && entries.length > 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No entries match the current filters.
          </div>
        )}

        {filtered.map(e => (
          <EntryCard key={e.id} entry={e} onDelete={remove} onResolve={resolve} onReopen={reopen} />
        ))}

        {filtered.length > 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'} — stored in browser localStorage — use Export to save permanently
          </div>
        )}
      </div>
    </PageLayout>
  );
}
