import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6,
  padding: '6px 13px', fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap', transition: 'opacity .15s',
});

const th = {
  padding: '10px 12px', background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left', fontWeight: 600,
  color: '#475569', fontSize: 12, whiteSpace: 'nowrap',
};

const td = {
  padding: '9px 12px', borderBottom: '1px solid #f1f5f9',
  fontSize: 13, verticalAlign: 'middle',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
};

function AddSingleModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ phone: '', name: '', city: '', business_type: '', source: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.phone.trim()) { setErr('Phone is required'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: form.source || undefined,
          name: form.name || undefined,
          city: form.city || undefined,
          business_type: form.business_type || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      onAdded();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const lbl = (text) => <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{text}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Add Contact</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>{lbl('Phone *')}<input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91XXXXXXXXXX" /></div>
          <div>{lbl('Name')}<input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Contact name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{lbl('City')}<input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div>{lbl('Business Type')}<input style={inputStyle} value={form.business_type} onChange={e => set('business_type', e.target.value)} /></div>
          </div>
          <div>{lbl('Source')}<input style={inputStyle} value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. TRADE_SHOW, REFERRAL" /></div>
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 12, color: '#dc3545', background: '#fff5f5', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
          <button style={btn('#0d6efd', '#fff', busy)} disabled={busy} onClick={submit}>{busy ? 'Adding…' : 'Add Contact'}</button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ onClose, onImported }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setErr('Paste at least one phone number'); return; }
    const rows = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      const row = { phone: parts[0] };
      if (parts[1]) row.name = parts[1];
      if (parts[2]) row.city = parts[2];
      if (parts[3]) row.business_type = parts[3];
      return row;
    });
    setBusy(true); setErr(null);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/audience/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      const d = await r.json();
      setResult(d);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Bulk Import</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
          One contact per line: <code>+91XXXXXXXXXX, Name, City, BusinessType</code><br />
          Only phone is required. Existing phones are updated.
        </div>
        {result ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>Import complete</div>
            <div>Upserted: <strong>{result.upserted ?? 0}</strong></div>
            <div style={{ marginTop: 12 }}>
              <button style={btn('#0d6efd')} onClick={() => { onImported(); onClose(); }}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              style={{ ...inputStyle, height: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`+919876543210, Ramesh Patel, Surat, Trader\n+918765432109, Anita Shah, Ahmedabad, Retailer`}
            />
            {err && <div style={{ marginTop: 10, fontSize: 12, color: '#dc3545', background: '#fff5f5', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button style={btn('#f3f4f6', '#374151')} onClick={onClose}>Cancel</button>
              <button style={btn('#0d6efd', '#fff', busy)} disabled={busy} onClick={submit}>{busy ? 'Importing…' : 'Import'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const REPLY_BADGE = {
  replied:      { bg: '#dcfce7', color: '#166534' },
  lead_created: { bg: '#e0f2fe', color: '#0369a1' },
  opted_out:    { bg: '#fee2e2', color: '#991b1b' },
};

function HealthPanel({ health }) {
  if (!health) return null;
  const { total, opted_out, in_cooldown, eligible, score_distribution } = health;
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Audience Health</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: 'Total', value: total, color: '#0f172a' },
          { label: 'Eligible', value: eligible, color: '#166534' },
          { label: 'Opted Out', value: opted_out, color: '#991b1b' },
          { label: 'In Cooldown', value: in_cooldown, color: '#854d0e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{pct(value)}%</div>
          </div>
        ))}
      </div>
      {score_distribution && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quality Score Distribution</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {score_distribution.map(({ bucket, count }) => (
              <div key={bucket} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>{count}</span>
                <span style={{ color: '#64748b', marginLeft: 4 }}>{bucket}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WaAudience() {
  const [audience, setAudience] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 50;

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const [r, hr] = await Promise.all([
        apiFetch(`/marketing/whatsapp-engine/audience?limit=${PAGE_SIZE}&offset=${(p - 1) * PAGE_SIZE}`),
        apiFetch('/marketing/whatsapp-engine/audience/stats/health'),
      ]);
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      const rows = Array.isArray(d) ? d : (d.audience ?? d.items ?? []);
      setAudience(rows);
      setTotal(d.total ?? rows.length);
      if (hr.ok) setHealth(await hr.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const optOut = async (id, phone) => {
    if (!window.confirm(`Opt out ${phone}? They will no longer receive messages.`)) return;
    setBusyId(id + ':optout');
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/audience/${id}/optout`, { method: 'PATCH' });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      flash(`${phone} opted out`);
      load(page);
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusyId(null);
    }
  };

  const toggleTest = async (id, current) => {
    setBusyId(id + ':test');
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/audience/${id}/test-contact`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_test: !current }),
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      flash(`Contact ${!current ? 'marked as' : 'removed from'} test contacts`);
      load(page);
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusyId(null);
    }
  };

  const deleteContact = async (id, phone) => {
    if (!window.confirm(`Delete ${phone} from audience? This cannot be undone.`)) return;
    setBusyId(id + ':del');
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/audience/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      flash(`${phone} deleted`);
      load(page);
    } catch (e) {
      flash(e.message, true);
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = search
    ? audience.filter(a =>
        (a.phone || '').includes(search) ||
        (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.source || '').toLowerCase().includes(search.toLowerCase())
      )
    : audience;

  return (
    <PageLayout
      title="Audience"
      subtitle={`Marketing contact list · ${total} total contacts`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>{feedback.msg}</span>}
          <button style={btn('#6366f1')} onClick={() => setShowBulk(true)}>Bulk Import</button>
          <button style={btn('#0d6efd')} onClick={() => setShowAdd(true)}>+ Add Contact</button>
          <button style={btn('#6b7280', '#fff', loading)} onClick={() => load(page)} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      }
    >
      {showAdd && <AddSingleModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(1); setPage(1); flash('Contact added'); }} />}
      {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onImported={() => { load(1); setPage(1); }} />}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HealthPanel health={health} />

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={() => load(page)}>Retry</button>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Search phone, name, city, source…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 280 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading audience…</div>
        ) : audience.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No contacts yet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Import your audience to start targeting.</div>
            <button style={btn('#6366f1')} onClick={() => setShowBulk(true)}>Bulk Import</button>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={th}>Phone</th>
                      <th style={th}>Name</th>
                      <th style={th}>City</th>
                      <th style={th}>Business Type</th>
                      <th style={th}>Source</th>
                      <th style={th}>Quality</th>
                      <th style={th}>WA Valid</th>
                      <th style={th}>Reply Status</th>
                      <th style={th}>Test</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const rb = REPLY_BADGE[a.reply_status];
                      const isBusy = (suffix) => busyId === a.id + suffix;
                      return (
                        <tr key={a.id} style={{ opacity: a.opt_out ? 0.5 : 1, background: a.is_test_contact ? '#fffbeb' : '#fff' }}>
                          <td style={td}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.phone}</span>
                          </td>
                          <td style={td}>{a.name || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                          <td style={td}>{a.city || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                          <td style={td}>{a.business_type || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                          <td style={td}>
                            {a.source
                              ? <span style={{ fontSize: 11, background: '#f0f9ff', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{a.source}</span>
                              : <span style={{ color: '#9ca3af' }}>—</span>}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: Number(a.quality_score) >= 70 ? '#166534' : Number(a.quality_score) >= 40 ? '#d97706' : '#dc2626' }}>
                              {Number(a.quality_score ?? 0).toFixed(0)}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: a.is_whatsapp_valid ? '#166534' : '#991b1b' }}>
                              {a.is_whatsapp_valid ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td style={td}>
                            {rb
                              ? <span style={{ background: rb.bg, color: rb.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{a.reply_status.replace('_', ' ').toUpperCase()}</span>
                              : a.opt_out
                              ? <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>OPTED OUT</span>
                              : <span style={{ color: '#9ca3af', fontSize: 12 }}>none</span>}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <button
                              style={{
                                background: a.is_test_contact ? '#fef9c3' : '#f8fafc',
                                color: a.is_test_contact ? '#854d0e' : '#6b7280',
                                border: `1px solid ${a.is_test_contact ? '#fcd34d' : '#e2e8f0'}`,
                                borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              }}
                              disabled={isBusy(':test')}
                              onClick={() => toggleTest(a.id, a.is_test_contact)}
                            >
                              {a.is_test_contact ? 'TEST' : 'mark'}
                            </button>
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {!a.opt_out && (
                                <button style={btn('#fee2e2', '#991b1b', isBusy(':optout'))} disabled={isBusy(':optout')} onClick={() => optOut(a.id, a.phone)}>
                                  Opt Out
                                </button>
                              )}
                              <button style={btn('#f3f4f6', '#374151', isBusy(':del'))} disabled={isBusy(':del')} onClick={() => deleteContact(a.id, a.phone)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center', fontSize: 13 }}>
                <button style={btn('#f3f4f6', '#374151', page <= 1)} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ color: '#6b7280' }}>Page {page} of {totalPages} · {total} contacts</span>
                <button style={btn('#f3f4f6', '#374151', page >= totalPages)} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
