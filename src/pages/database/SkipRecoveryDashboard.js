import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const API = '/marketing/whatsapp-engine/skip-recovery';
const DEBOUNCE_MS = 320;

// ── Helpers ───────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 700);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color:  disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6, padding: '7px 14px',
  fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});
const th = { padding: '9px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, verticalAlign: 'middle' };
const sel = { padding: '7px 9px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' };

const REASON_META = {
  missing_contact_info: { label: 'Missing Contact Info', color: '#6b7280', bg: '#f3f4f6', recoverable: true },
  invalid_phone:        { label: 'Invalid Phone',         color: '#d97706', bg: '#fef9c3', recoverable: true },
  junk_rejected:        { label: 'Junk Rejected',         color: '#b91c1c', bg: '#fee2e2', recoverable: false },
  crm_protected:        { label: 'CRM Protected',         color: '#1d4ed8', bg: '#dbeafe', recoverable: false },
  crm_linked:           { label: 'CRM Linked',            color: '#7c3aed', bg: '#ede9fe', recoverable: false },
};

function ReasonChip({ code }) {
  const m = REASON_META[code] ?? { label: code, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ background: m.bg, color: m.color, padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function RecoverabilityBadge({ code }) {
  const recoverable = REASON_META[code]?.recoverable ?? false;
  return recoverable
    ? <span style={{ color: '#059669', fontWeight: 700, fontSize: 10 }}>✓ Recoverable</span>
    : <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 10 }}>✗ Permanent</span>;
}

function fmtDt(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ts; }
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function SummaryCards({ summary, onFilterByReason }) {
  const cards = [
    { label: 'Total Skipped',       value: summary.total,                color: '#374151', sub: 'all time' },
    { label: 'Recoverable',         value: summary.recoverable,          color: '#059669', sub: 'can be fixed',   code: null, filter: 'recoverable' },
    { label: 'Non-Recoverable',     value: summary.non_recoverable,      color: '#9ca3af', sub: 'permanent',     code: null, filter: 'non_recoverable' },
    { label: 'Invalid Phone',       value: summary.invalid_phone,        color: '#d97706', sub: 'fixable',       code: 'invalid_phone' },
    { label: 'Missing Info',        value: summary.missing_contact_info, color: '#6b7280', sub: 'no phone/email', code: 'missing_contact_info' },
    { label: 'CRM Protected',       value: summary.crm_protected,        color: '#1d4ed8', sub: 'customer DB',   code: 'crm_protected' },
    { label: 'Junk Rejected',       value: summary.junk_rejected,        color: '#b91c1c', sub: 'bad geo',       code: 'junk_rejected' },
    { label: 'Already Recovered',   value: summary.already_recovered,    color: '#10b981', sub: 'moved to DB',   code: null },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
      {cards.map(({ label, value, color, sub, code }) => (
        <div key={label}
          onClick={() => code && onFilterByReason(code)}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', textAlign: 'center', cursor: code ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => { if (code) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? 0}</div>
          <div style={{ fontSize: 10, color: '#374151', fontWeight: 600, marginTop: 2 }}>{label}</div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Recover Modal ─────────────────────────────────────────────────────────────
function RecoverModal({ record, onClose, onRecovered }) {
  const [form, setForm] = useState({
    phone:         record.phone         ?? '',
    email:         record.email         ?? '',
    company:       record.company       ?? '',
    name:          record.name          ?? '',
    city:          record.city          ?? '',
    business_type: record.business_type ?? '',
  });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');
  const [done, setDone]   = useState(null);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await apiFetch(`${API}/${record.id}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, confirm_production: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || `Recovery failed (${r.status})`);
      setDone(d);
      onRecovered();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inp = (label, key, hint = '') => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
      <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={hint}
        style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }} />
    </div>
  );

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 360, maxWidth: '95vw', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#059669', marginBottom: 8 }}>Contact Recovered</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
            {form.phone || form.email} has been added to the Promotional Database.
          </div>
          <button style={{ ...btn('#0d6efd'), width: '100%' }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 400, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Recover Contact</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Original skip reason:</div>
        <div style={{ marginBottom: 12 }}><ReasonChip code={record.reason_code} /></div>
        <div style={{ fontSize: 11, color: '#6b7280', background: '#f8fafc', borderRadius: 6, padding: '6px 10px', marginBottom: 16 }}>
          {record.reason}
        </div>
        {inp('Phone', 'phone', '919876543210')}
        {inp('Email', 'email', 'contact@example.com')}
        {inp('Company', 'company')}
        {inp('Contact Name', 'name')}
        {inp('City', 'city')}
        {inp('Business Type', 'business_type')}
        {err && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 10 }}>{err}</div>}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', marginBottom: 14, fontSize: 11, color: '#92400e' }}>
          Contact will be added to the Promotional Database. Phone will be normalized to E.164 format.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#059669', '#fff', busy)} onClick={submit} disabled={busy}>
            {busy ? 'Adding…' : 'Add to Promotional DB'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function TableRow({ record, onRecover }) {
  const meta = REASON_META[record.reason_code] ?? {};
  return (
    <tr style={{ background: record.recovered ? '#f0fdf4' : '#fff' }}>
      <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{record.row_number ?? '—'}</span></td>
      <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{record.phone || '—'}</span></td>
      <td style={{ ...td, maxWidth: 130 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: 11 }}>{record.email || '—'}</span></td>
      <td style={{ ...td, maxWidth: 130 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: 600 }}>{record.company || '—'}</span></td>
      <td style={td}>{record.name || '—'}</td>
      <td style={td}>{record.city || '—'}</td>
      <td style={td}><ReasonChip code={record.reason_code} /></td>
      <td style={td}><RecoverabilityBadge code={record.reason_code} /></td>
      <td style={td}>{fmtDt(record.imported_at)}</td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        {record.recovered
          ? <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>✓ Done</span>
          : meta.recoverable
            ? <button style={{ ...btn('#059669', '#fff'), padding: '4px 10px', fontSize: 11 }} onClick={() => onRecover(record)}>Recover</button>
            : <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>
        }
      </td>
    </tr>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────
function MobileCard({ record, onRecover }) {
  const meta = REASON_META[record.reason_code] ?? {};
  return (
    <div style={{ background: record.recovered ? '#f0fdf4' : '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{record.phone || record.email || '—'}</div>
          {record.company && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{record.company}</div>}
        </div>
        <ReasonChip code={record.reason_code} />
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
        {record.city && <span>{record.city} · </span>}
        {record.name && <span>{record.name}</span>}
        <span style={{ color: '#9ca3af', marginLeft: 4 }}>Row {record.row_number ?? '?'}</span>
        <span style={{ color: '#9ca3af', marginLeft: 4 }}>· {fmtDt(record.imported_at)}</span>
      </div>
      {record.recovered
        ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>✓ Recovered</span>
        : meta.recoverable
          ? <button style={{ ...btn('#059669', '#fff'), padding: '5px 12px', fontSize: 11 }} onClick={() => onRecover(record)}>Recover</button>
          : <span style={{ fontSize: 11, color: '#9ca3af' }}>Non-recoverable ({meta.label})</span>
      }
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{total.toLocaleString()} records · page {page} of {pages || 1}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select value={limit} onChange={e => onLimit(parseInt(e.target.value, 10))} style={{ ...sel, fontSize: 11, padding: '4px 6px' }}>
          {[50, 100, 250].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        {['«','‹','›','»'].map((ch, i) => {
          const tgt = [1, page - 1, page + 1, pages][i];
          const dis = i < 2 ? page <= 1 : page >= pages;
          return <button key={ch} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, cursor: dis ? 'not-allowed' : 'pointer', padding: '4px 8px', fontSize: 11, color: dis ? '#d1d5db' : '#475569' }} disabled={dis} onClick={() => onPage(tgt)}>{ch}</button>;
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SkipRecoveryDashboard() {
  const isMobile = useIsMobile();

  const [summary,  setSummary]  = useState(null);
  const [records,  setRecords]  = useState([]);
  const [pag,      setPag]      = useState({ total: 0, page: 1, limit: 50, pages: 1 });
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filterRC, setFilterRC] = useState('');
  const [filterRec,setFilterRec]= useState('');
  const [feedback, setFeedback] = useState(null);
  const [recover,  setRecover]  = useState(null);

  const searchRef  = useRef('');
  const debRef     = useRef(null);

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadSummary = useCallback(async () => {
    const r = await apiFetch(`${API}/summary`);
    if (r.ok) setSummary(await r.json());
  }, []);

  const loadRecords = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q:           overrides.q           ?? searchRef.current,
        reason_code: overrides.reason_code ?? filterRC,
        recovered:   overrides.recovered   ?? filterRec,
        page:        String(overrides.page  ?? pag.page),
        limit:       String(overrides.limit ?? pag.limit),
      });
      for (const [k, v] of [...params.entries()]) { if (!v) params.delete(k); }
      const r = await apiFetch(`${API}/search?${params}`);
      if (r.ok) {
        const d = await r.json();
        setRecords(d.data ?? []);
        setPag({ total: d.total, page: d.page, limit: d.limit, pages: d.pages });
      }
    } finally { setLoading(false); }
  }, [filterRC, filterRec, pag.page, pag.limit]);

  useEffect(() => {
    loadSummary();
    loadRecords({ page: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = v => {
    setSearch(v); searchRef.current = v;
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => loadRecords({ q: v, page: 1 }), DEBOUNCE_MS);
  };

  const applyRC = v => { setFilterRC(v);  loadRecords({ reason_code: v, page: 1 }); };
  const applyRec = v => { setFilterRec(v); loadRecords({ recovered: v,   page: 1 }); };

  const clearFilters = () => {
    setSearch(''); setFilterRC(''); setFilterRec(''); searchRef.current = '';
    loadRecords({ q: '', reason_code: '', recovered: '', page: 1 });
  };

  const handlePage  = p => loadRecords({ page: p });
  const handleLimit = l => { setPag(prev => ({ ...prev, limit: l })); loadRecords({ limit: l, page: 1 }); };

  const downloadCsv = async (params = {}) => {
    const qs = new URLSearchParams(params);
    const r  = await apiFetch(`${API}/export?${qs}`);
    const csv = await r.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'skipped_contacts.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = search || filterRC || filterRec;

  return (
    <PageLayout
      title="Skip Recovery"
      subtitle="Skipped contacts from CSV imports — search, recover, export"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && <span style={{ fontSize: 12, fontWeight: 600, color: feedback.isError ? '#dc3545' : '#166534' }}>{feedback.msg}</span>}
          <button style={btn('#f3f4f6', '#374151')} onClick={() => downloadCsv()}>⬇ All CSV</button>
          <button style={btn('#059669')} onClick={() => downloadCsv({ recoverable_only: 'true' })}>⬇ Recoverable</button>
          <button style={btn('#d97706')} onClick={() => downloadCsv({ reason_code: 'invalid_phone' })}>⬇ Invalid Phone</button>
        </div>
      }
    >
      {recover && (
        <RecoverModal
          record={recover}
          onClose={() => setRecover(null)}
          onRecovered={() => { loadSummary(); loadRecords({}); flash('Contact added to Promotional DB'); }}
        />
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Summary cards */}
        {summary && (
          <SummaryCards summary={summary} onFilterByReason={code => { setFilterRC(code); loadRecords({ reason_code: code, page: 1 }); }} />
        )}

        {/* Recoverability legend */}
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 11, color: '#166534' }}>
          <strong>Recoverable:</strong> Missing Info &amp; Invalid Phone — user can supply the correct data.&nbsp;&nbsp;
          <strong>Non-recoverable:</strong> Junk Rejected (bad geo), CRM Protected, CRM Linked — system cannot override.
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search phone, email, company, name…"
            value={search} onChange={e => handleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
          />
          <select value={filterRC} onChange={e => applyRC(e.target.value)} style={sel}>
            <option value="">All Reasons</option>
            {Object.entries(REASON_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterRec} onChange={e => applyRec(e.target.value)} style={sel}>
            <option value="">All Status</option>
            <option value="false">Pending</option>
            <option value="true">Recovered</option>
          </select>
          {hasFilters && (
            <button style={btn('#f3f4f6', '#374151')} onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {/* Records */}
        {loading && !records.length ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading skip records…</div>
        ) : records.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            {hasFilters
              ? 'No records match your filters.'
              : 'No skipped contacts yet. Skip records appear automatically after CSV imports.'}
          </div>
        ) : isMobile ? (
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{pag.total.toLocaleString()} records · page {pag.page} of {pag.pages}</div>
            {records.map(r => <MobileCard key={r.id} record={r} onRecover={setRecover} />)}
            <Pagination {...pag} onPage={handlePage} onLimit={handleLimit} />
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    {['Row', 'Phone', 'Email', 'Company', 'Name', 'City', 'Skip Reason', 'Recoverable', 'Imported', 'Action'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => <TableRow key={r.id} record={r} onRecover={setRecover} />)}
                </tbody>
              </table>
            </div>
            <Pagination {...pag} onPage={handlePage} onLimit={handleLimit} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
