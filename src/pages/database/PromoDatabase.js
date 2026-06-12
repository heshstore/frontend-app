import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const API = '/marketing/whatsapp-engine/audience';
const MAX_UPLOAD_ROWS = 5000;
const IMPORT_TIMEOUT_MS = 120_000;
const DEFAULT_LIMIT = 50;
const DEBOUNCE_MS = 320;

// ── Mobile detection ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 700);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6, padding: '7px 14px',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});
const iconBtn = (color = '#475569') => ({
  background: 'none', border: '1px solid #e2e8f0', borderRadius: 5,
  cursor: 'pointer', padding: '4px 8px', fontSize: 11, color, fontWeight: 600,
});
const th = { padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, verticalAlign: 'middle' };
const sel = { padding: '7px 9px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' };

// ── Status derivation ─────────────────────────────────────────────────────────
function deriveStatus(c) {
  if (c.opt_out)                                        return { label: 'Opted Out',      bg: '#fee2e2', color: '#991b1b' };
  if (c.customer_id)                                    return { label: 'Customer',        bg: '#dbeafe', color: '#1d4ed8' };
  if (c.reply_status === 'LEAD_CREATED')                return { label: 'Lead',            bg: '#d1fae5', color: '#065f46' };
  if (c.reply_status === 'REPLIED')                     return { label: 'Replied',         bg: '#cffafe', color: '#155e75' };
  if (c.wa_registration_status === 'NOT_REGISTERED')    return { label: 'Not on WA',       bg: '#fff7ed', color: '#c2410c' };
  if (c.cooldown_until && new Date(c.cooldown_until) > new Date()) return { label: 'Cooldown', bg: '#fef9c3', color: '#854d0e' };
  if (c.is_test_contact)                                return { label: 'TEST',            bg: '#fef9c3', color: '#854d0e' };
  return { label: 'Active', bg: '#f3f4f6', color: '#374151' };
}

function StatusChip({ contact }) {
  const s = deriveStatus(contact);
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDt(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ts; }
}
function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ts; }
}
function contactDisplayName(c) { return c.customer_name || c.name || ''; }

// ── CSV template ──────────────────────────────────────────────────────────────
const CSV_TEMPLATE = 'Phone,Email,Name,Company,City,State,Country,Business Type,GST,Notes';
const CSV_EXAMPLE  = '\n919876543210,rahul@example.com,Rahul Sharma,Sharma Traders,Mumbai,Maharashtra,India,Retailer,,\n919123456789,,Priya Patel,Patel Wholesale,Delhi,Delhi,India,Wholesaler,GST123456789,';

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE + CSV_EXAMPLE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'promo_contacts_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0]?.split(',')[0]?.trim() ?? '';
  const isHeader = !/^\d/.test(first) && !first.includes('@') && first.length < 20;
  const startIdx = isHeader ? 1 : 0;
  const rows = [];
  for (let i = startIdx; i < lines.length; i++) {
    const p = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    const phone = p[0]?.replace(/[^\d+]/g, '') || '';
    const email = p[1]?.includes('@') ? p[1] : '';
    if (!phone && !email) continue;
    if (p.length <= 4) {
      rows.push({ phone: phone || null, name: p[1] || '', city: p[2] || '', business_type: p[3] || '' });
    } else {
      rows.push({ phone: phone || null, email: email || p[1] || '', name: p[2] || '', customer_name: p[2] || '', company: p[3] || '', city: p[4] || '', state: p[5] || '', country: p[6] || '', business_type: p[7] || '', gst: p[8] || '', notes: p[9] || '' });
    }
  }
  return rows;
}

// ── Add / Edit Contact Modal ───────────────────────────────────────────────────
function ContactFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    phone: '', mobile_2: '', email: '', customer_name: '', company: '',
    address: '', city: '', state: '', country: '', gst: '',
    business_type: '', source: '', notes: '',
    ...(initial ?? {}),
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    const phone = (form.phone || '').replace(/[^\d+]/g, '');
    const email = (form.email || '').trim();
    if (!phone && !email) { setErr('Phone or email is required'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { ...form, phone: phone || null, email: email || null, name: form.customer_name || null };
      if (isEdit) {
        const r = await apiFetch(`${API}/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) { const d = await r.json(); throw new Error(d?.message || `Error ${r.status}`); }
      } else {
        const r = await apiFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) { const d = await r.json(); throw new Error(d?.message || `Error ${r.status}`); }
      }
      onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const inp = (label, key, type = 'text', hint = '') => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={hint}
        style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }} />
    </div>
  );
  const section = (label) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>{label}</div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#111827' }}>{isEdit ? 'Edit Contact' : 'Add Contact'}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>Phone or email required. All other fields optional.</div>
        {section('Contact Info')}
        {inp('Phone', 'phone', 'tel', '919876543210')}
        {inp('Alt Phone', 'mobile_2', 'tel')}
        {inp('Email', 'email', 'email', 'name@example.com')}
        {inp('Contact Name', 'customer_name', 'text', 'Full name')}
        {inp('Company', 'company')}
        {section('Location')}
        {inp('City', 'city')}
        {inp('State', 'state')}
        {inp('Country', 'country')}
        {section('Business')}
        {inp('Business Type', 'business_type', 'text', 'Retailer / Wholesaler…')}
        {inp('GST Number', 'gst')}
        {inp('Source', 'source', 'text', 'CSV Import / Trade Show…')}
        {section('Notes')}
        <div style={{ marginBottom: 10 }}>
          <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy)} onClick={submit} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Import Modal (unchanged logic, refreshed done-stage) ──────────────────────
function ImportModal({ onClose, onDone }) {
  const [stage, setStage] = useState('pick');
  const [rows, setRows] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [envInfo, setEnvInfo] = useState(null);
  const [prodConfirm, setProdConfirm] = useState(false);
  const fileRef = useRef(null);
  const BATCH = 400;

  useEffect(() => { apiFetch('/health/environment').then(r => r.json()).then(setEnvInfo).catch(() => {}); }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setErr('No valid rows found. Check format.'); return; }
      if (parsed.length > MAX_UPLOAD_ROWS) { setErr(`${parsed.length} rows — max ${MAX_UPLOAD_ROWS}. Split and re-import.`); return; }
      setRows(parsed); setErr('');
    };
    reader.readAsText(file);
  };

  const checkAndProceed = async () => {
    if (!rows.length) return;
    setBusy(true); setErr('');
    try {
      const phones = rows.map(r => r.phone);
      const existing = [];
      for (let i = 0; i < phones.length; i += BATCH) {
        const r = await apiFetch(`${API}/check-conflicts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phones: phones.slice(i, i + BATCH) }), timeoutMs: IMPORT_TIMEOUT_MS });
        const batch = await r.json();
        if (!r.ok) throw new Error(batch?.message || 'Conflict check failed');
        if (Array.isArray(batch)) existing.push(...batch);
      }
      if (!existing.length) { await doImport(rows); return; }
      const existingMap = Object.fromEntries(existing.map(e => [e.phone, e]));
      const found = rows.filter(row => existingMap[row.phone]).map(row => ({ phone: row.phone, existing: existingMap[row.phone], newRow: row }));
      const defaults = {};
      found.forEach(c => { defaults[c.phone] = 'skip'; });
      setConflicts(found); setResolutions(defaults); setStage('resolve');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const applyAndImport = async () => {
    const conflictPhones = new Set(conflicts.map(c => c.phone));
    const clean = rows.filter(r => !conflictPhones.has(r.phone));
    const resolved = conflicts.flatMap(c => {
      const res = resolutions[c.phone];
      if (res === 'skip') return [];
      if (res === 'update') return [c.newRow];
      if (res === 'merge') return [{ phone: c.phone, name: c.newRow.name || c.existing.name || '', city: c.newRow.city || c.existing.city || '', business_type: c.newRow.business_type || c.existing.business_type || '' }];
      return [];
    });
    await doImport([...clean, ...resolved]);
  };

  const doImport = async (finalRows) => {
    setBusy(true); setErr('');
    try {
      const totals = {
        created: 0, updated: 0, errors: [],
        new_contacts: 0, updated_contacts: 0, merged_contacts: 0,
        duplicate_phones_removed: 0, duplicate_emails_detected: 0,
        skipped_contacts: 0, email_duplicate_warnings: [],
        geo_valid: 0, geo_partial: 0, junk_rejected: 0, geo_corrections: [],
        skip_reasons: [],
        skip_reason_breakdown: { missing_contact_info: 0, invalid_phone: 0, junk_rejected: 0, crm_protected: 0, crm_linked: 0 },
      };
      for (let i = 0; i < finalRows.length; i += BATCH) {
        const r = await apiFetch(`${API}/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: finalRows.slice(i, i + BATCH), confirm_production: envInfo?.environment === 'PRODUCTION' ? prodConfirm : false }), timeoutMs: IMPORT_TIMEOUT_MS });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.message || `Import failed (batch ${Math.floor(i / BATCH) + 1})`);
        totals.created += d.created ?? 0;
        totals.updated += d.updated ?? 0;
        totals.new_contacts += d.new_contacts ?? 0;
        totals.updated_contacts += d.updated_contacts ?? 0;
        totals.merged_contacts += d.merged_contacts ?? 0;
        totals.duplicate_phones_removed += d.duplicate_phones_removed ?? 0;
        totals.duplicate_emails_detected += d.duplicate_emails_detected ?? 0;
        totals.skipped_contacts += d.skipped_contacts ?? d.rows_skipped ?? 0;
        totals.geo_valid += d.geo_valid ?? 0;
        totals.geo_partial += d.geo_partial ?? 0;
        totals.junk_rejected += d.junk_rejected ?? 0;
        if (Array.isArray(d.email_duplicate_warnings)) totals.email_duplicate_warnings.push(...d.email_duplicate_warnings);
        if (Array.isArray(d.errors)) totals.errors.push(...d.errors);
        if (Array.isArray(d.geo_corrections)) totals.geo_corrections.push(...d.geo_corrections);
        if (Array.isArray(d.skip_reasons)) totals.skip_reasons.push(...d.skip_reasons);
        if (d.skip_reason_breakdown) {
          for (const k of Object.keys(d.skip_reason_breakdown)) {
            totals.skip_reason_breakdown[k] = (totals.skip_reason_breakdown[k] ?? 0) + (d.skip_reason_breakdown[k] ?? 0);
          }
        }
      }
      setResult(totals); setStage('done');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const setRes = (phone, value) => setResolutions(prev => ({ ...prev, [phone]: value }));

  if (stage === 'done' && result) {
    const totalSkipped = (result.skipped_contacts ?? 0) + conflicts.filter(c => resolutions[c.phone] === 'skip').length;
    const bd = result.skip_reason_breakdown ?? {};
    const skipRows = result.skip_reasons ?? [];
    const downloadSkippedCsv = () => {
      const header = 'Row Number,Name,Phone,Skip Reason\n';
      const csvRows = [
        ...skipRows.map(r => [r.row_number, r.name ?? '', r.phone ?? '', r.reason].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
        ...conflicts.filter(c => resolutions[c.phone] === 'skip').map((c, i) => [`conflict-${i + 1}`, c.existing.name ?? '', c.phone, 'Conflict resolved as skip'].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ];
      if (!csvRows.length) return;
      const blob = new Blob([header + csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'skipped_contacts.csv'; a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Import Complete</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'New', value: result.new_contacts, color: '#166534' },
              { label: 'Updated', value: result.updated_contacts, color: '#1d4ed8' },
              { label: 'Merged', value: result.merged_contacts, color: '#0891b2' },
              { label: 'Dup Phones', value: result.duplicate_phones_removed, color: '#d97706' },
              { label: 'Dup Emails', value: result.duplicate_emails_detected, color: '#dc2626' },
              { label: 'Skipped', value: totalSkipped, color: '#9ca3af' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '10px 6px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value ?? 0}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {totalSkipped > 0 && (
            <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#374151', marginBottom: 6 }}>Skipped Breakdown</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <tbody>
                  {[
                    { label: 'Missing phone/email', key: 'missing_contact_info', color: '#6b7280' },
                    { label: 'Invalid phone format', key: 'invalid_phone', color: '#d97706' },
                    { label: 'Junk quality', key: 'junk_rejected', color: '#b91c1c' },
                    { label: 'Customer DB protected', key: 'crm_protected', color: '#1d4ed8' },
                    { label: 'Linked to customer', key: 'crm_linked', color: '#7c3aed' },
                  ].filter(row => (bd[row.key] ?? 0) > 0).map(row => (
                    <tr key={row.key}>
                      <td style={{ padding: '2px 0', color: '#6b7280' }}>{row.label}</td>
                      <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 700, color: row.color }}>{bd[row.key]}</td>
                    </tr>
                  ))}
                  {conflicts.filter(c => resolutions[c.phone] === 'skip').length > 0 && (
                    <tr><td style={{ padding: '2px 0', color: '#6b7280' }}>Conflict — skipped</td><td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 700, color: '#9ca3af' }}>{conflicts.filter(c => resolutions[c.phone] === 'skip').length}</td></tr>
                  )}
                </tbody>
              </table>
              {skipRows.length > 0 && (
                <button onClick={downloadSkippedCsv} style={{ marginTop: 8, background: 'none', border: '1px solid #cbd5e1', borderRadius: 5, cursor: 'pointer', padding: '4px 10px', fontSize: 11, color: '#475569', width: '100%' }}>
                  Download Skipped Contacts CSV ({skipRows.length + conflicts.filter(c => resolutions[c.phone] === 'skip').length} rows)
                </button>
              )}
            </div>
          )}
          {result.geo_corrections?.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '7px 10px', marginBottom: 10, fontSize: 11, color: '#166534' }}>
              {result.geo_corrections.length} geo correction(s) applied.
            </div>
          )}
          <button style={{ ...btn('#0d6efd'), width: '100%' }} onClick={() => { onDone(); onClose(); }}>Done</button>
        </div>
      </div>
    );
  }

  if (stage === 'resolve') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Resolve Conflicts</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>{conflicts.length} phone number{conflicts.length !== 1 ? 's' : ''} already exist. Choose what to do.</div>
          {conflicts.map(c => {
            const isCustomerLinked = !!c.existing.customer_id;
            const res = resolutions[c.phone];
            return (
              <div key={c.phone} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 10, background: isCustomerLinked ? '#f0f9ff' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{c.phone}</span>
                  {isCustomerLinked && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>CUSTOMER LINKED — protected</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, fontSize: 11 }}>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6 }}><div style={{ fontWeight: 700, color: '#374151', marginBottom: 3 }}>Existing</div><div style={{ color: '#6b7280' }}>{c.existing.name || '—'} · {c.existing.city || '—'}</div></div>
                  <div style={{ background: '#f0fdf4', padding: '6px 8px', borderRadius: 6 }}><div style={{ fontWeight: 700, color: '#374151', marginBottom: 3 }}>From CSV</div><div style={{ color: '#6b7280' }}>{c.newRow.name || '—'} · {c.newRow.city || '—'}</div></div>
                </div>
                {isCustomerLinked ? <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Will be skipped — Customer DB takes priority.</div> : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ key: 'skip', label: 'Skip', color: '#6b7280', bg: '#f3f4f6' }, { key: 'update', label: 'Update', color: '#1d4ed8', bg: '#dbeafe' }, { key: 'merge', label: 'Merge', color: '#166534', bg: '#dcfce7' }].map(({ key, label, color, bg }) => (
                      <button key={key} onClick={() => setRes(c.phone, key)} style={{ ...btn(res === key ? bg : '#f9fafb', res === key ? color : '#6b7280'), border: `1px solid ${res === key ? bg : '#e2e8f0'}`, padding: '4px 10px', fontSize: 11 }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
            <button style={btn('#0d6efd', '#fff', busy)} onClick={applyAndImport} disabled={busy}>{busy ? 'Importing…' : 'Confirm & Import'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Import CSV</div>
          <button style={btn('#f3f4f6', '#374151')} onClick={downloadTemplate}>⬇ Template</button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
          Columns: <code>Phone, Email, Name, Company, City, State, Country, Business Type, GST, Notes</code><br />
          Phone must include country code (e.g. <code>919876543210</code>). Header row optional.
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
        <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: 28, textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: '#f9fafb' }}>
          {rows.length > 0
            ? <><div style={{ fontSize: 18, color: '#166534', fontWeight: 700 }}>✓ {rows.length} rows ready</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Click to change file</div></>
            : <><div style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Click to choose CSV file</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>.csv or .txt</div></>}
        </div>
        {rows.length > 0 && (
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Preview (first 3):</div>
            {rows.slice(0, 3).map((r, i) => <div key={i} style={{ color: '#6b7280', marginBottom: 2 }}>{r.phone || r.email} — {r.name || r.company || '—'} — {r.city || '—'}</div>)}
            {rows.length > 3 && <div style={{ color: '#9ca3af' }}>…and {rows.length - 3} more</div>}
          </div>
        )}
        {envInfo && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 6, fontSize: 12, background: envInfo.environment === 'PRODUCTION' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${envInfo.environment === 'PRODUCTION' ? '#fecaca' : '#bbf7d0'}` }}>
            <div style={{ fontWeight: 700, color: envInfo.environment === 'PRODUCTION' ? '#b91c1c' : '#166534' }}>Environment: {envInfo.environment} · DB {envInfo.database_status}</div>
            {envInfo.environment === 'PRODUCTION' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, cursor: 'pointer', color: '#7f1d1d' }}>
                <input type="checkbox" checked={prodConfirm} onChange={e => setProdConfirm(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I confirm this import targets the <strong>production</strong> promotional database ({envInfo.promotional_db_count ?? '?'} records).</span>
              </label>
            )}
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy || !rows.length || (envInfo?.environment === 'PRODUCTION' && !prodConfirm))} onClick={checkAndProceed} disabled={busy || !rows.length || (envInfo?.environment === 'PRODUCTION' && !prodConfirm)}>
            {busy ? 'Checking…' : `Next: Check ${rows.length} contacts`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Drawer ────────────────────────────────────────────────────────────
function HistoryDrawer({ contact, onClose }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API}/${contact.id}/history`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setData(d); setBusy(false); } })
      .catch(() => { if (!cancelled) { setData(null); setBusy(false); } });
    return () => { cancelled = true; };
  }, [contact.id]);

  const logs = data?.logs ?? [];
  const meta = data?.contact ?? {};

  const statusColor = (s) => {
    if (s === 'read')       return { bg: '#d1fae5', color: '#065f46' };
    if (s === 'delivered')  return { bg: '#dbeafe', color: '#1d4ed8' };
    if (s === 'sent')       return { bg: '#e0f2fe', color: '#0369a1' };
    if (s === 'replied')    return { bg: '#cffafe', color: '#155e75' };
    if (s === 'failed')     return { bg: '#fee2e2', color: '#991b1b' };
    if (s === 'skipped')    return { bg: '#f3f4f6', color: '#6b7280' };
    return { bg: '#f3f4f6', color: '#6b7280' };
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9990 }} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 9995, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{contactDisplayName(contact) || contact.phone || '—'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>{contact.phone || contact.email || ''}</div>
            {contact.company && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{contact.company}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {busy ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading history…</div>
          ) : (
            <>
              {/* Timeline */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Timeline</div>

              <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Import event */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff', boxShadow: '0 0 0 2px #3b82f6' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>Imported to Promo DB</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtDate(contact.created_at)}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Source: {contact.source || 'CSV Import'}</div>
                </div>

                {/* Campaign logs */}
                {logs.length === 0 && !contact.opt_out && (
                  <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>No promotional messages sent yet.</div>
                )}
                {logs.map((log, i) => {
                  const sc = statusColor(log.status);
                  return (
                    <div key={i} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: log.reply_received ? '#16a34a' : '#94a3b8', border: '2px solid #fff', boxShadow: `0 0 0 2px ${log.reply_received ? '#16a34a' : '#94a3b8'}` }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{log.campaign_name || 'Promotional Message'}</div>
                        <span style={{ ...sc, padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{log.status?.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Sent: {fmtDt(log.sent_at)}</div>
                      {log.delivered_at && <div style={{ fontSize: 10, color: '#94a3b8' }}>Delivered: {fmtDt(log.delivered_at)}</div>}
                      {log.read_at && <div style={{ fontSize: 10, color: '#059669' }}>Read: {fmtDt(log.read_at)}</div>}
                      {log.reply_received && (
                        <div style={{ marginTop: 4, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 5, padding: '4px 8px', fontSize: 10, color: '#166534' }}>
                          <span style={{ fontWeight: 700 }}>Replied: </span>{log.reply_message || '(reply recorded)'}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Lead created event */}
                {(contact.reply_status === 'LEAD_CREATED' || meta.reply_status === 'LEAD_CREATED') && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#d97706', border: '2px solid #fff', boxShadow: '0 0 0 2px #d97706' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Lead Created</div>
                    {contact.last_reply_at && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtDate(contact.last_reply_at)}</div>}
                  </div>
                )}

                {/* Opt-out event */}
                {(contact.opt_out || meta.opt_out) && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#dc2626', border: '2px solid #fff', boxShadow: '0 0 0 2px #dc2626' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Opted Out</div>
                  </div>
                )}
              </div>

              {/* Contact meta */}
              <div style={{ marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Details</div>
                {[
                  ['Phone',         contact.phone],
                  ['Email',         contact.email],
                  ['Company',       contact.company],
                  ['City',          contact.city],
                  ['Business Type', contact.business_type],
                  ['Source',        contact.source],
                  ['Geo Quality',   contact.geo_quality],
                  ['Quality Score', contact.quality_score != null ? `${contact.quality_score}/100` : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#94a3b8' }}>{label}</span>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Stats summary */}
              <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: '#374151' }}>{logs.length}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>Messages</div></div>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{logs.filter(l => l.reply_received).length}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>Replies</div></div>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>{logs.filter(l => l.read_at).length}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>Read</div></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Desktop Table Row ─────────────────────────────────────────────────────────
function DesktopRow({ contact, onAction }) {
  const [busy, setBusy] = useState(false);

  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <tr style={{ background: contact.is_test_contact ? '#fffbeb' : '#fff' }}>
      {/* Phone */}
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#111827' }}>{contact.phone || '—'}</div>
        {contact.customer_id && <div style={{ fontSize: 9, color: '#1d4ed8', background: '#dbeafe', padding: '1px 4px', borderRadius: 4, display: 'inline-block', marginTop: 1 }}>CRM</div>}
      </td>
      {/* Email */}
      <td style={{ ...td, maxWidth: 140 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: contact.email ? '#374151' : '#d1d5db' }}>{contact.email || '—'}</div>
      </td>
      {/* Company */}
      <td style={{ ...td, maxWidth: 150 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#111827' }}>{contact.company || <span style={{ color: '#d1d5db' }}>—</span>}</div>
      </td>
      {/* Contact Name */}
      <td style={{ ...td, maxWidth: 130 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactDisplayName(contact) || <span style={{ color: '#d1d5db' }}>—</span>}</div>
      </td>
      {/* City */}
      <td style={td}>{contact.city || <span style={{ color: '#d1d5db' }}>—</span>}</td>
      {/* Business Type */}
      <td style={{ ...td, maxWidth: 120 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.business_type || <span style={{ color: '#d1d5db' }}>—</span>}</div>
      </td>
      {/* Status */}
      <td style={td}><StatusChip contact={contact} /></td>
      {/* Actions */}
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
          <button style={iconBtn('#475569')} onClick={() => onAction('history', contact)} title="History">📋</button>
          <button style={iconBtn('#1d4ed8')} onClick={() => onAction('edit', contact)} title="Edit">✏️</button>
          {!contact.opt_out && (
            <button style={iconBtn('#c2410c')} disabled={busy} onClick={() => { if (window.confirm('Mark as opted out?')) act(() => onAction('opt-out', contact)); }} title="Opt Out">⛔</button>
          )}
          {!contact.customer_id && (
            <button style={iconBtn('#166534')} disabled={busy} onClick={() => { if (window.confirm(`Create customer from ${contact.phone || contact.email}?`)) act(() => onAction('move-to-customer', contact)); }} title="→ Customer">👤</button>
          )}
          <button style={iconBtn('#991b1b')} disabled={busy} onClick={() => { if (window.confirm(`Delete ${contact.phone || contact.email}?`)) act(() => onAction('delete', contact)); }} title="Delete">🗑</button>
        </div>
      </td>
    </tr>
  );
}

// ── Mobile Contact Card ───────────────────────────────────────────────────────
function MobileCard({ contact, onAction }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const s = deriveStatus(contact);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.company || contactDisplayName(contact) || contact.phone || '—'}
          </div>
          {contact.company && contactDisplayName(contact) && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{contactDisplayName(contact)}</div>
          )}
        </div>
        <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{s.label}</span>
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
        {contact.phone     && <div><span style={{ color: '#9ca3af' }}>📱 </span>{contact.phone}</div>}
        {contact.email     && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#9ca3af' }}>✉ </span>{contact.email}</div>}
        {contact.city      && <div><span style={{ color: '#9ca3af' }}>📍 </span>{contact.city}</div>}
        {contact.business_type && <div><span style={{ color: '#9ca3af' }}>🏢 </span>{contact.business_type}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button style={{ ...btn('#f3f4f6', '#374151'), padding: '5px 10px', fontSize: 11 }} onClick={() => onAction('history', contact)}>History</button>
        <button style={{ ...btn('#eff6ff', '#1d4ed8'), padding: '5px 10px', fontSize: 11 }} onClick={() => onAction('edit', contact)}>Edit</button>
        {!contact.opt_out && (
          <button style={{ ...btn('#fff7ed', '#c2410c', busy), padding: '5px 10px', fontSize: 11 }} disabled={busy} onClick={() => { if (window.confirm('Mark as opted out?')) act(() => onAction('opt-out', contact)); }}>Opt Out</button>
        )}
        {!contact.customer_id && (
          <button style={{ ...btn('#f0fdf4', '#166534', busy), padding: '5px 10px', fontSize: 11 }} disabled={busy} onClick={() => { if (window.confirm(`Create customer?`)) act(() => onAction('move-to-customer', contact)); }}>→ Customer</button>
        )}
        <button style={{ ...btn('#fff5f5', '#991b1b', busy), padding: '5px 10px', fontSize: 11 }} disabled={busy} onClick={() => { if (window.confirm(`Delete?`)) act(() => onAction('delete', contact)); }}>Delete</button>
      </div>
    </div>
  );
}

// ── Pagination Controls ───────────────────────────────────────────────────────
function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {total.toLocaleString()} contacts · page {page} of {pages || 1}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select value={limit} onChange={e => onLimit(parseInt(e.target.value, 10))} style={{ ...sel, fontSize: 11, padding: '4px 6px' }}>
          {[50, 100, 250].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button style={{ ...iconBtn('#475569'), opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => onPage(1)}>«</button>
        <button style={{ ...iconBtn('#475569'), opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
        <span style={{ fontSize: 11, color: '#374151', minWidth: 24, textAlign: 'center' }}>{page}</span>
        <button style={{ ...iconBtn('#475569'), opacity: page >= pages ? 0.4 : 1 }} disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
        <button style={{ ...iconBtn('#475569'), opacity: page >= pages ? 0.4 : 1 }} disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PromoDatabase() {
  const isMobile  = useIsMobile();
  const navigate  = useNavigate();

  const [contacts,   setContacts]   = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: DEFAULT_LIMIT, pages: 1 });
  const [stats,      setStats]      = useState(null);
  const [filterOpts, setFilterOpts] = useState({ cities: [], business_types: [] });
  const [loading,    setLoading]    = useState(true);
  const [feedback,   setFeedback]   = useState(null);

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterCity,   setFilterCity]   = useState('');
  const [filterBiz,    setFilterBiz]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [historyContact, setHistoryContact] = useState(null);
  const [editContact,    setEditContact]    = useState(null);
  const [showAdd,        setShowAdd]        = useState(false);
  const [showImport,     setShowImport]     = useState(false);

  const searchRef = useRef('');
  const debounceRef = useRef(null);

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q:             params.q             ?? searchRef.current,
        city:          params.city          ?? filterCity,
        business_type: params.business_type ?? filterBiz,
        status:        params.status        ?? filterStatus,
        page:          String(params.page   ?? pagination.page),
        limit:         String(params.limit  ?? pagination.limit),
      });
      // Remove empty params
      for (const [k, v] of [...qs.entries()]) { if (!v) qs.delete(k); }

      const [listRes, statsRes, optsRes] = await Promise.all([
        apiFetch(`${API}/search?${qs}`),
        apiFetch(`${API}/stats/health`),
        apiFetch(`${API}/filter-options`),
      ]);
      if (listRes.ok) {
        const d = await listRes.json();
        setContacts(d.data ?? []);
        setPagination({ total: d.total, page: d.page, limit: d.limit, pages: d.pages });
      }
      if (statsRes.ok)  setStats(await statsRes.json());
      if (optsRes.ok)   setFilterOpts(await optsRes.json());
    } catch { /* swallow */ } finally { setLoading(false); }
  }, [filterCity, filterBiz, filterStatus, pagination.page, pagination.limit]);

  // Initial load
  useEffect(() => { load({ page: 1 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = (v) => {
    setSearch(v);
    searchRef.current = v;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load({ q: v, page: 1 }), DEBOUNCE_MS);
  };

  // Filter change — reset to page 1
  const applyFilter = (key, val) => {
    if (key === 'city')   { setFilterCity(val);   load({ city: val,   page: 1 }); }
    if (key === 'biz')    { setFilterBiz(val);    load({ business_type: val, page: 1 }); }
    if (key === 'status') { setFilterStatus(val); load({ status: val, page: 1 }); }
  };

  const clearFilters = () => {
    setSearch(''); setFilterCity(''); setFilterBiz(''); setFilterStatus('');
    searchRef.current = '';
    load({ q: '', city: '', business_type: '', status: '', page: 1 });
  };

  const handlePage  = (p) => load({ page: p });
  const handleLimit = (l) => { setPagination(prev => ({ ...prev, limit: l })); load({ limit: l, page: 1 }); };

  const hasFilters = search || filterCity || filterBiz || filterStatus;

  const handleAction = useCallback(async (action, contact) => {
    try {
      if (action === 'history') { setHistoryContact(contact); return; }
      if (action === 'edit')    { setEditContact(contact);    return; }
      if (action === 'opt-out') {
        const r = await apiFetch(`${API}/${contact.id}/optout`, { method: 'PATCH' });
        if (!r.ok) throw new Error('Failed to opt out');
        flash('Contact opted out'); load({});
      } else if (action === 'delete') {
        const r = await apiFetch(`${API}/${contact.id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error('Delete failed');
        flash('Contact deleted'); load({});
      } else if (action === 'move-to-customer') {
        const body = { contactName: contactDisplayName(contact) || 'Unknown', companyName: contact.company || contact.business_type || contactDisplayName(contact) || 'Unknown', mobile1: contact.phone, city: contact.city || '', source: 'WHATSAPP' };
        const r = await apiFetch('/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) { flash(d?.message || 'Customer creation failed', true); return; }
        await apiFetch(`${API}/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: d.id }) });
        flash(`Customer created: ${contactDisplayName(contact) || contact.phone}`); load({});
      }
    } catch (e) { flash(e.message || 'Action failed', true); }
  }, [load]);

  const activeFilterCount = [filterCity, filterBiz, filterStatus].filter(Boolean).length;

  return (
    <PageLayout
      title="Promotional DB"
      subtitle="Contacts for WhatsApp promotional campaigns"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && <span style={{ fontSize: 12, fontWeight: 600, color: feedback.isError ? '#dc3545' : '#166534' }}>{feedback.msg}</span>}
          <button style={btn('#f3f4f6', '#374151')} onClick={downloadTemplate}>⬇ Template</button>
          <button style={{ ...btn('#f3f4f6', '#374151'), border: '1px solid #e2e8f0' }} onClick={() => navigate('/database/skip-recovery')}>↩ Skip Recovery</button>
          <button style={btn('#0d6efd')} onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button style={btn('#16a34a')} onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      }
    >
      {showAdd        && <ContactFormModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load({}); flash('Contact added'); }} />}
      {showImport     && <ImportModal onClose={() => setShowImport(false)} onDone={() => load({ page: 1 })} />}
      {editContact    && <ContactFormModal initial={editContact} onClose={() => setEditContact(null)} onSaved={() => { setEditContact(null); load({}); flash('Contact saved'); }} />}
      {historyContact && <HistoryDrawer contact={historyContact} onClose={() => setHistoryContact(null)} />}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Total',     value: stats.total,      color: '#111827' },
              { label: 'Eligible',  value: stats.eligible,   color: '#166534' },
              { label: 'Opted Out', value: stats.opted_out,  color: '#991b1b' },
              { label: 'Cooldown',  value: stats.in_cooldown, color: '#d97706' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? '—'}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Customer DB banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#1d4ed8' }}>
          <strong>Customer DB takes priority.</strong> Customer-linked contacts are protected — imports cannot overwrite them.
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search phone, email, company, name, city, business type…"
            value={search} onChange={e => handleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
          />
          <select value={filterCity}   onChange={e => applyFilter('city',   e.target.value)} style={sel}>
            <option value="">All Cities</option>
            {filterOpts.cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterBiz}    onChange={e => applyFilter('biz',    e.target.value)} style={sel}>
            <option value="">All Types</option>
            {filterOpts.business_types.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterStatus} onChange={e => applyFilter('status', e.target.value)} style={sel}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="opted_out">Opted Out</option>
            <option value="customer_linked">Customer Linked</option>
            <option value="lead">Lead Created</option>
            <option value="replied">Replied</option>
            <option value="cooldown">Cooldown</option>
            <option value="not_on_whatsapp">Not on WA</option>
          </select>
          {hasFilters && (
            <button style={btn('#f3f4f6', '#374151')} onClick={clearFilters}>✕ Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</button>
          )}
        </div>

        {/* Table / Cards */}
        {loading && !contacts.length ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            {hasFilters ? 'No contacts match your filters.' : 'No contacts yet. Import a CSV or add manually.'}
          </div>
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
              {pagination.total.toLocaleString()} contacts · showing page {pagination.page} of {pagination.pages}
            </div>
            {contacts.map(c => <MobileCard key={c.id} contact={c} onAction={handleAction} />)}
            <Pagination {...pagination} onPage={handlePage} onLimit={handleLimit} />
          </div>
        ) : (
          /* ── Desktop table ── */
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    {['Phone', 'Email', 'Company', 'Contact Name', 'City', 'Business Type', 'Status', 'Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => <DesktopRow key={c.id} contact={c} onAction={handleAction} />)}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPage={handlePage} onLimit={handleLimit} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
