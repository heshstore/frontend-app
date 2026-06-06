import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const API = '/marketing/whatsapp-engine/audience';

// ── Style tokens ───────────────────────────────────────────────────────────────
const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6, padding: '7px 14px',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});
const th = { padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 };
const td = { padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, verticalAlign: 'middle' };

// CSV template columns — Phone or Email required, rest optional
const CSV_TEMPLATE = 'Phone,Email,Name,Company,City,State,Country,Business Type,GST,Notes';
const CSV_EXAMPLE  = '\n919876543210,rahul@example.com,Rahul Sharma,Sharma Traders,Mumbai,Maharashtra,India,Retailer,,\n919123456789,,Priya Patel,Patel Wholesale,Delhi,Delhi,India,Wholesaler,GST123456789,';

const REPLY_CHIP = {
  none:         { label: '—',            bg: 'transparent', color: '#9ca3af' },
  replied:      { label: 'Replied',       bg: '#dcfce7',     color: '#166534' },
  lead_created: { label: 'Lead Created',  bg: '#dbeafe',     color: '#1d4ed8' },
  opted_out:    { label: 'Opted Out',     bg: '#fee2e2',     color: '#991b1b' },
};

// ── CSV parser — supports old (4-col) and new (10-col) formats ───────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  // Skip header row if first field doesn't look like a phone or email
  const first = lines[0]?.split(',')[0]?.trim() ?? '';
  const isHeader = !/^\d/.test(first) && !first.includes('@') && first.length < 20;
  const startIdx = isHeader ? 1 : 0;
  const rows = [];
  for (let i = startIdx; i < lines.length; i++) {
    const p = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    const phone = p[0]?.replace(/[^\d+]/g, '') || '';
    const email = p[1]?.includes('@') ? p[1] : '';
    if (!phone && !email) continue;
    // Support both 4-column (old) and 10-column (new) format
    if (p.length <= 4) {
      rows.push({ phone: phone || null, name: p[1] || '', city: p[2] || '', business_type: p[3] || '' });
    } else {
      rows.push({
        phone:         phone || null,
        email:         email || p[1] || '',
        name:          p[2] || '',
        customer_name: p[2] || '',
        company:       p[3] || '',
        city:          p[4] || '',
        state:         p[5] || '',
        country:       p[6] || '',
        business_type: p[7] || '',
        gst:           p[8] || '',
        notes:         p[9] || '',
      });
    }
  }
  return rows;
}

// ── Download template helper ───────────────────────────────────────────────────
function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE + CSV_EXAMPLE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'promo_contacts_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Add Contact Modal — expanded fields, phone OR email required ───────────────
function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    phone: '', mobile_2: '', email: '', customer_name: '', company: '',
    address: '', city: '', state: '', country: '', gst: '',
    business_type: '', source: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    const phone = form.phone.replace(/[^\d+]/g, '');
    const email = form.email.trim();
    if (!phone && !email) { setErr('Phone or email is required'); return; }
    setBusy(true); setErr('');
    try {
      const payload = {
        ...form,
        phone:  phone || null,
        email:  email || null,
        name:   form.customer_name || null,
      };
      const r = await apiFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); throw new Error(d?.message || `Error ${r.status}`); }
      onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const inp = (label, key, type = 'text', hint = '') => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={hint}
        style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }} />
    </div>
  );

  const section = (label) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>{label}</div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 420, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#111827' }}>Add Contact</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>Phone or email required. All other fields optional.</div>

        {section('Phone')}
        {inp('Mobile 1 (with country code)', 'phone', 'tel', '919876543210')}
        {inp('Mobile 2', 'mobile_2', 'tel', '919876543211')}

        {section('Contact')}
        {inp('Email', 'email', 'email', 'email@example.com')}
        {inp('Contact Name', 'customer_name', 'text', 'Full name')}
        {inp('Company', 'company', 'text', 'Company / firm')}

        {section('Location')}
        {inp('Address', 'address', 'text', 'Street / area')}
        {inp('City', 'city', 'text', 'City')}
        {inp('State', 'state', 'text', 'State')}
        {inp('Country', 'country', 'text', 'Country')}

        {section('Business')}
        {inp('Business Type', 'business_type', 'text', 'Retailer, Wholesaler…')}
        {inp('GST', 'gst', 'text', 'GST123456789')}
        {inp('Source', 'source', 'text', 'How did you get this contact?')}
        {inp('Notes', 'notes', 'text', 'Any notes')}

        {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy)} onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Import Modal — with conflict resolution ────────────────────────────────────
// Stages: 'pick' → 'checking' → 'resolve' (if conflicts) → 'importing' → 'done'
function ImportModal({ onClose, onDone }) {
  const [stage,     setStage]     = useState('pick');   // pick | resolve | done
  const [rows,      setRows]      = useState([]);
  const [conflicts, setConflicts] = useState([]);        // [{phone, existing, newRow}]
  // resolutions: Map<phone, 'skip'|'update'|'merge'>
  const [resolutions, setResolutions] = useState({});
  const [result,    setResult]    = useState(null);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState('');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setErr('No valid rows found. Check format.'); return; }
      setRows(parsed); setErr('');
    };
    reader.readAsText(file);
  };

  // Step 1: Check for conflicts before committing anything.
  const checkAndProceed = async () => {
    if (!rows.length) return;
    setBusy(true); setErr('');
    try {
      const r = await apiFetch(`${API}/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: rows.map(r => r.phone) }),
      });
      const existing = await r.json();   // [{phone, id, name, city, business_type, customer_id}]
      if (!Array.isArray(existing) || !existing.length) {
        // No conflicts → import directly
        await doImport(rows);
        return;
      }
      const existingMap = Object.fromEntries(existing.map(e => [e.phone, e]));
      const found = rows
        .filter(row => existingMap[row.phone])
        .map(row => ({ phone: row.phone, existing: existingMap[row.phone], newRow: row }));
      // Default resolution: skip if customer-linked, ask otherwise
      const defaults = {};
      found.forEach(c => {
        defaults[c.phone] = c.existing.customer_id ? 'skip' : 'skip';
      });
      setConflicts(found);
      setResolutions(defaults);
      setStage('resolve');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  // Step 2: Apply resolutions and submit.
  const applyAndImport = async () => {
    const conflictPhones = new Set(conflicts.map(c => c.phone));
    const clean = rows.filter(r => !conflictPhones.has(r.phone));

    const resolved = conflicts.flatMap(c => {
      const res = resolutions[c.phone];
      if (res === 'skip') return [];
      if (res === 'update') return [c.newRow];
      if (res === 'merge') {
        // Keep existing values for non-empty fields; fill gaps with new data.
        return [{
          phone:         c.phone,
          name:          c.newRow.name          || c.existing.name          || '',
          city:          c.newRow.city          || c.existing.city          || '',
          business_type: c.newRow.business_type || c.existing.business_type || '',
        }];
      }
      return [];
    });

    await doImport([...clean, ...resolved]);
  };

  const doImport = async (finalRows) => {
    setBusy(true); setErr('');
    try {
      const r = await apiFetch(`${API}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: finalRows }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'Import failed');
      setResult(d);
      setStage('done');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const setRes = (phone, value) => setResolutions(prev => ({ ...prev, [phone]: value }));

  // ── Stage: done ──────────────────────────────────────────────────────────────
  if (stage === 'done' && result) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 380, maxWidth: '95vw' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Import Complete</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[{ label: 'Created', value: result.created, color: '#166534' }, { label: 'Updated', value: result.updated, color: '#1d4ed8' }, { label: 'Skipped', value: (result.errors?.length ?? 0) + conflicts.filter(c => resolutions[c.phone] === 'skip').length, color: '#9ca3af' }].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {result.errors?.filter(e => e.reason.includes('customer')).length > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#1d4ed8' }}>
              {result.errors.filter(e => e.reason.includes('customer')).length} contact(s) skipped — linked to Customer DB (protected).
            </div>
          )}
          <button style={{ ...btn('#0d6efd'), width: '100%' }} onClick={() => { onDone(); onClose(); }}>Done</button>
        </div>
      </div>
    );
  }

  // ── Stage: resolve conflicts ─────────────────────────────────────────────────
  if (stage === 'resolve') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Resolve Conflicts</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
            {conflicts.length} phone number{conflicts.length !== 1 ? 's' : ''} already exist. Choose what to do with each.
          </div>

          {conflicts.map(c => {
            const isCustomerLinked = !!c.existing.customer_id;
            const res = resolutions[c.phone];
            return (
              <div key={c.phone} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10, background: isCustomerLinked ? '#f0f9ff' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{c.phone}</span>
                  {isCustomerLinked && (
                    <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                      CUSTOMER LINKED — protected
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11 }}>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: 3 }}>Existing</div>
                    <div style={{ color: '#6b7280' }}>{c.existing.name || '—'} · {c.existing.city || '—'} · {c.existing.business_type || '—'}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '6px 8px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: 3 }}>From CSV</div>
                    <div style={{ color: '#6b7280' }}>{c.newRow.name || '—'} · {c.newRow.city || '—'} · {c.newRow.business_type || '—'}</div>
                  </div>
                </div>
                {isCustomerLinked ? (
                  <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Will be skipped — Customer DB takes priority.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ key: 'skip', label: 'Skip', color: '#6b7280', bg: '#f3f4f6' }, { key: 'update', label: 'Update', color: '#1d4ed8', bg: '#dbeafe' }, { key: 'merge', label: 'Merge', color: '#166534', bg: '#dcfce7' }].map(({ key, label, color, bg }) => (
                      <button key={key} onClick={() => setRes(c.phone, key)} style={{ ...btn(res === key ? bg : '#f9fafb', res === key ? color : '#6b7280'), border: `1px solid ${res === key ? bg : '#e2e8f0'}`, padding: '4px 12px', fontSize: 11 }}>
                        {label}
                      </button>
                    ))}
                    {res && <span style={{ fontSize: 10, color: '#9ca3af', alignSelf: 'center' }}>
                      {res === 'skip' ? 'Keep existing, ignore CSV row' : res === 'update' ? 'Replace all fields with CSV data' : 'Fill empty fields only from CSV'}
                    </span>}
                  </div>
                )}
              </div>
            );
          })}

          {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
            <button style={btn('#0d6efd', '#fff', busy)} onClick={applyAndImport} disabled={busy}>
              {busy ? 'Importing…' : 'Confirm & Import'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage: pick file ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Import CSV</div>
          <button style={btn('#f3f4f6', '#374151')} onClick={downloadTemplate}>⬇ Template</button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
          Column order: <code>Phone, Name, City, Business Type</code><br />
          Phone must include country code (e.g. <code>919876543210</code>). Header row is optional.
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: '#f9fafb' }}
        >
          {rows.length > 0
            ? <><div style={{ fontSize: 18, color: '#166534', fontWeight: 700 }}>✓ {rows.length} rows ready</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Click to change file</div></>
            : <><div style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Click to choose CSV file</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>.csv or .txt</div></>
          }
        </div>
        {rows.length > 0 && (
          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Preview (first 3):</div>
            {rows.slice(0, 3).map((r, i) => (
              <div key={i} style={{ color: '#6b7280', marginBottom: 2 }}>{r.phone} — {r.name || '—'} — {r.city || '—'}</div>
            ))}
            {rows.length > 3 && <div style={{ color: '#9ca3af' }}>…and {rows.length - 3} more</div>}
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy || !rows.length)} onClick={checkAndProceed} disabled={busy || !rows.length}>
            {busy ? 'Checking…' : `Next: Check ${rows.length} contacts`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Row (lazy-loaded) ──────────────────────────────────────────────────
function HistoryRow({ contactId }) {
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API}/${contactId}/history`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (!cancelled) { setHistory(Array.isArray(d) ? d : []); setBusy(false); } })
      .catch(() => { if (!cancelled) { setHistory([]); setBusy(false); } });
    return () => { cancelled = true; };
  }, [contactId]);

  if (busy) return <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>Loading history…</div>;
  if (!history?.length) return <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>No messages sent yet.</div>;

  return (
    <div style={{ padding: '8px 12px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Promotion History ({history.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['Campaign', 'Sent At', 'Status', 'Replied'].map(h => (
              <th key={h} style={{ ...th, fontSize: 10, padding: '5px 8px', background: '#f1f5f9' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i}>
              <td style={{ ...td, padding: '5px 8px', fontSize: 11 }}>{h.campaign_name || '—'}</td>
              <td style={{ ...td, padding: '5px 8px', fontSize: 11, color: '#6b7280' }}>
                {h.sent_at ? new Date(h.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </td>
              <td style={{ ...td, padding: '5px 8px' }}>
                <span style={{ background: h.status === 'read' ? '#dcfce7' : h.status === 'sent' ? '#dbeafe' : h.status === 'failed' ? '#fee2e2' : '#f3f4f6', color: h.status === 'read' ? '#166534' : h.status === 'sent' ? '#1d4ed8' : h.status === 'failed' ? '#991b1b' : '#6b7280', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                  {h.status?.toUpperCase() || '—'}
                </span>
              </td>
              <td style={{ ...td, padding: '5px 8px', color: h.reply_received ? '#166534' : '#9ca3af', fontWeight: h.reply_received ? 700 : 400 }}>
                {h.reply_received ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Contact Row ────────────────────────────────────────────────────────────────
function ContactRow({ contact, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [busy,     setBusy]     = useState(false);

  const doAction = async (action, payload) => {
    setBusy(true);
    try { await onAction(contact.id, action, payload); }
    finally { setBusy(false); }
  };

  const chip = REPLY_CHIP[contact.reply_status] ?? REPLY_CHIP.none;

  return (
    <>
      <tr style={{ background: contact.is_test_contact ? '#fffbeb' : '#fff' }}>
        <td style={td}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{contact.phone}</div>
          {contact.customer_id && (
            <div style={{ fontSize: 10, color: '#1d4ed8', background: '#dbeafe', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>
              Customer Linked
            </div>
          )}
          {contact.is_test_contact && (
            <div style={{ fontSize: 10, color: '#854d0e', background: '#fef9c3', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginTop: 2, marginLeft: 2 }}>
              TEST
            </div>
          )}
        </td>
        <td style={td}>{contact.name || <span style={{ color: '#9ca3af' }}>—</span>}</td>
        <td style={td}>{contact.city || <span style={{ color: '#9ca3af' }}>—</span>}</td>
        <td style={td}>{contact.business_type || <span style={{ color: '#9ca3af' }}>—</span>}</td>
        <td style={td}>
          <span style={{ background: chip.bg, color: chip.color, padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{chip.label}</span>
        </td>
        <td style={td}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button
              style={{ ...btn('#f3f4f6', '#374151'), padding: '3px 8px', fontSize: 11 }}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? '▲ History' : '▼ History'}
            </button>
            {!contact.customer_id && (
              <button
                style={{ ...btn('#eff6ff', '#1d4ed8', busy), padding: '3px 8px', fontSize: 11 }}
                onClick={() => doAction('move-to-customer')} disabled={busy}
                title="Create a customer record from this contact"
              >
                → Customer
              </button>
            )}
            {!contact.opt_out && (
              <button
                style={{ ...btn('#fff7ed', '#c2410c', busy), padding: '3px 8px', fontSize: 11 }}
                onClick={() => { if (window.confirm('Mark as opted out?')) doAction('opt-out'); }} disabled={busy}
              >
                Opt Out
              </button>
            )}
            <button
              style={{ ...btn('#fff5f5', '#991b1b', busy), padding: '3px 8px', fontSize: 11 }}
              onClick={() => { if (window.confirm(`Delete ${contact.phone}?`)) doAction('delete'); }} disabled={busy}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <HistoryRow contactId={contact.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PromoDatabase() {
  const [contacts,   setContacts]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [feedback,   setFeedback]   = useState(null);

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch(API),
        apiFetch(`${API}/stats/health`),
      ]);
      if (listRes.ok) setContacts(await listRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch { /* swallow */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (id, action) => {
    try {
      if (action === 'opt-out') {
        const r = await apiFetch(`${API}/${id}/optout`, { method: 'PATCH' });
        if (!r.ok) throw new Error('Failed');
        flash('Contact opted out');
      } else if (action === 'delete') {
        const r = await apiFetch(`${API}/${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error('Failed');
        flash('Contact deleted');
      } else if (action === 'move-to-customer') {
        const contact = contacts.find(c => c.id === id);
        if (!contact) return;
        const body = {
          contactName: contact.name || 'Unknown',
          companyName: contact.business_type || contact.name || 'Unknown',
          mobile1: contact.phone,
          city: contact.city || '',
          source: 'WHATSAPP',
        };
        const r = await apiFetch('/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!r.ok) {
          flash(d?.message || 'Customer creation failed', true);
          return;
        }
        // Link customer_id back to promotional contact
        await apiFetch(`${API}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: d.id }),
        });
        flash(`Customer created: ${contact.name || contact.phone}`);
      }
      await load();
    } catch (e) { flash(e.message || 'Action failed', true); }
  }, [contacts, load]);

  const filtered = search.trim()
    ? contacts.filter(c =>
        c.phone?.includes(search) ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase()) ||
        c.business_type?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  return (
    <PageLayout
      title="Promotional DB"
      subtitle="Contacts for WhatsApp promotional campaigns"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && (
            <span style={{ fontSize: 12, fontWeight: 600, color: feedback.isError ? '#dc3545' : '#166534' }}>
              {feedback.msg}
            </span>
          )}
          <button style={btn('#f3f4f6', '#374151')} onClick={downloadTemplate}>⬇ CSV Template</button>
          <button style={btn('#0d6efd')} onClick={() => setShowImport(true)}>⬆ Import CSV</button>
          <button style={btn('#16a34a')} onClick={() => setShowAdd(true)}>+ Add Contact</button>
        </div>
      }
    >
      {showAdd    && <AddModal    onClose={() => setShowAdd(false)}    onSaved={() => { setShowAdd(false); load(); flash('Contact added'); }} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={load} />}

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
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

        {/* Customer DB priority banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '9px 14px', marginBottom: 16, fontSize: 12, color: '#1d4ed8' }}>
          <strong>Customer DB takes priority.</strong> Customer-linked contacts are protected — imports cannot overwrite them. Duplicate phones trigger a conflict resolution step.
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Search phone, name, city, business type…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
          />
          {search && <button style={btn('#f3f4f6', '#374151')} onClick={() => setSearch('')}>✕ Clear</button>}
        </div>

        {loading && !contacts.length ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading contacts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            {search ? 'No contacts match your search.' : 'No contacts yet. Import a CSV or add manually.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#6b7280' }}>
              {filtered.length} contact{filtered.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Phone', 'Name', 'City', 'Business Type', 'Status', 'Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(contact => (
                    <ContactRow key={contact.id} contact={contact} onAction={handleAction} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
