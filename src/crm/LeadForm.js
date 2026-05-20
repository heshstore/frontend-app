import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { toast } from '../utils/toast';
import { trackLeadSubmit } from '../lib/analytics';

// Manual / high-trust sources — phone is optional for these
const MANUAL_SOURCES = new Set([
  'WALK_IN', 'REFERRAL', 'EXHIBITION', 'FIELD_VISIT',
  'OLD_CUSTOMER', 'DEALER_REFERENCE', 'BUSINESS_CARD', 'IMPORTED', 'DIRECT',
]);

const SOURCES = [
  // High-trust manual
  { value: 'WALK_IN',          label: 'Walk-In (Showroom)',     group: 'manual' },
  { value: 'REFERRAL',         label: 'Reference',              group: 'manual' },
  { value: 'OLD_CUSTOMER',     label: 'Old Customer Re-enquiry', group: 'manual' },
  { value: 'EXHIBITION',       label: 'Exhibition / Event',      group: 'manual' },
  { value: 'FIELD_VISIT',      label: 'Field Visit',             group: 'manual' },
  { value: 'DEALER_REFERENCE', label: 'Dealer Reference',        group: 'manual' },
  { value: 'BUSINESS_CARD',    label: 'Business Card',           group: 'manual' },
  { value: 'DIRECT',           label: 'Direct / Manual Entry',   group: 'manual' },
  { value: 'IMPORTED',         label: 'Imported List',           group: 'manual' },
  // Digital / auto-captured
  { value: 'INDIAMART',        label: 'IndiaMart',               group: 'digital' },
  { value: 'META',             label: 'Facebook',                group: 'digital' },
  { value: 'GOOGLE',           label: 'Google',                  group: 'digital' },
  { value: 'WHATSAPP',         label: 'WhatsApp',                group: 'digital' },
  { value: 'SHOPIFY',          label: 'Website',                 group: 'digital' },
];

// Hint text shown below phone field based on source
const PHONE_HINTS = {
  WALK_IN:          'Mobile optional for walk-in leads — enter if shared.',
  REFERRAL:         'Mobile optional — ask for it during first call.',
  EXHIBITION:       'Mobile optional — enter if business card was shared.',
  FIELD_VISIT:      'Mobile optional — enter if available.',
  OLD_CUSTOMER:     'Mobile optional — check customer records first.',
  DEALER_REFERENCE: 'Mobile optional for dealer references.',
  BUSINESS_CARD:    'Enter number from business card if available.',
  IMPORTED:         'Mobile optional for imported records.',
};

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function sentenceCaseWords(s) {
  if (!s) return s;
  return s.trim().toLowerCase().replace(/(^\w|\.\s+\w)/g, (c) => c.toUpperCase());
}

function normalizePhone(raw) {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.slice(-10);
}

export default function LeadForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [form, setForm] = useState({
    name: params.get('name') || '',
    phone: params.get('phone') || '',
    email: params.get('email') || '',
    city: '',
    country: 'India',
    source: 'DIRECT',
    lead_priority: 'MEDIUM',
    product_interest: params.get('product') || '',
    requirement_note: '',
    notes: '',
    utm_source: '',
    utm_campaign: '',
    follow_up_date: '',
    assigned_to: '',
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Customer search state ──────────────────────────────────────────────────
  const [custQuery, setCustQuery]       = useState('');
  const [custResults, setCustResults]   = useState([]);
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [custLoading, setCustLoading]   = useState(false);
  const [prefillBanner, setPrefillBanner] = useState(null); // { name, leadRef }

  // ── Item search state ──────────────────────────────────────────────────────
  // itemMode: 'search' = show item picker, 'manual' = show free-text input
  const [itemMode, setItemMode]         = useState('search');
  const [itemQuery, setItemQuery]       = useState('');
  const [itemResults, setItemResults]   = useState([]);
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [itemLoading, setItemLoading]   = useState(false);

  useEffect(() => {
    apiFetch('/users/dropdown').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    setLoading(true);
    apiFetch(`/crm/leads/${id}`)
      .then((r) => r.json())
      .then((lead) => {
        setForm({
          name: lead.name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          city: lead.city || '',
          country: lead.country || 'India',
          source: lead.source || 'DIRECT',
          lead_priority: lead.lead_priority || 'MEDIUM',
          product_interest: lead.product_interest || '',
          requirement_note: lead.requirement_note || '',
          notes: lead.notes || '',
          utm_source: lead.utm_source || '',
          utm_campaign: lead.utm_campaign || '',
          follow_up_date: lead.follow_up_date ? lead.follow_up_date.slice(0, 16) : '',
          assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
        });
      })
      .catch(() => setError('Failed to load lead data.'))
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  // ── Customer search debounce ──────────────────────────────────────────────
  useEffect(() => {
    if (!custQuery || custQuery.length < 2) {
      setCustResults([]);
      setShowCustDrop(false);
      return;
    }
    const t = setTimeout(async () => {
      setCustLoading(true);
      try {
        const r = await apiFetch(`/crm/leads?search=${encodeURIComponent(custQuery)}`);
        const d = await r.json();
        const results = Array.isArray(d) ? d.slice(0, 6) : [];
        setCustResults(results);
        setShowCustDrop(true);
      } catch {
        setCustResults([]);
      } finally {
        setCustLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [custQuery]);

  // ── Item search debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (!itemQuery || itemQuery.length < 2) {
      setItemResults([]);
      setShowItemDrop(false);
      return;
    }
    const t = setTimeout(async () => {
      setItemLoading(true);
      try {
        const r = await apiFetch(`/items/search?q=${encodeURIComponent(itemQuery)}`);
        const d = await r.json();
        setItemResults(Array.isArray(d) ? d.slice(0, 8) : []);
        setShowItemDrop(true);
      } catch {
        setItemResults([]);
      } finally {
        setItemLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [itemQuery]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isManualSource = MANUAL_SOURCES.has(form.source);

  // Pre-fill form with details from an existing CRM lead — creates new opportunity
  function handleCustSelect(lead) {
    setForm((f) => ({
      ...f,
      name:  lead.name  || f.name,
      phone: lead.phone ? normalizePhone(lead.phone) : f.phone,
      email: lead.email || f.email,
      city:  lead.city  || f.city,
    }));
    setPrefillBanner({ name: lead.name, leadRef: lead.lead_ref });
    setCustQuery('');
    setShowCustDrop(false);
  }

  // Fill product_interest from selected catalog item, switch to manual view
  function handleItemSelect(item) {
    const label = item.name + (item.sku ? ` (${item.sku})` : '');
    set('product_interest', label);
    setItemQuery('');
    setShowItemDrop(false);
    setItemMode('manual');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Phone validation: required for digital sources, optional for manual sources
    const phone = form.phone ? normalizePhone(form.phone) : '';
    if (form.phone && phone.length !== 10) {
      setError('Phone number must be 10 digits. Please check the number and try again.');
      return;
    }
    if (!isManualSource && !phone) {
      setError('Phone number is required for this source type.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: sentenceCaseWords(form.name),
        phone: phone || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        notes: form.notes ? form.notes.charAt(0).toUpperCase() + form.notes.slice(1) : undefined,
        requirement_note: form.requirement_note || undefined,
        product_interest: form.product_interest ? sentenceCaseWords(form.product_interest) : undefined,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
        follow_up_date: form.follow_up_date || undefined,
        utm_source: form.utm_source || undefined,
        utm_campaign: form.utm_campaign || undefined,
      };

      if (isEditMode) {
        const res = await apiFetch(`/crm/leads/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message || 'Failed to update lead. Please check all fields and try again.');
          return;
        }
        toast.success('Lead updated');
        navigate(`/crm/leads/${id}`);
        return;
      }

      const res = await apiFetch('/crm/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Failed to create lead. Please check all fields and try again.');
        return;
      }
      const lead = data?.lead ?? data;
      trackLeadSubmit({ source: form.source || 'DIRECT', utm_source: form.utm_source, utm_campaign: form.utm_campaign });
      if (data?.warning === 'duplicate_phone') {
        toast.warn(`Lead created. Note: Another lead with phone ${phone} already exists — please check before contacting.`);
      }
      navigate(`/crm/leads/${lead.id}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 6,
    border: `1px solid ${theme.border}`, fontSize: 14,
    boxSizing: 'border-box', background: '#fff', color: theme.text,
  };
  const lbl = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: theme.textMuted, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };
  const row = { marginBottom: 14 };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

  const dropStyle = {
    position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 2,
    background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 6,
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden',
  };
  const dropItemStyle = {
    padding: '9px 12px', cursor: 'pointer',
    borderBottom: `1px solid ${theme.border}`, fontSize: 13,
  };

  if (loading && isEditMode) {
    return <PageLayout title="Edit Lead"><p style={{ padding: 20 }}>Loading lead...</p></PageLayout>;
  }

  return (
    <PageLayout title={isEditMode ? 'Edit Lead' : 'New Lead'} onBack={() => navigate(location.state?.from || '/crm/leads')}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ── Customer search — new lead only ──────────────────────────────── */}
        {!isEditMode && (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: 8 }}>
            <div style={{ ...lbl, marginBottom: 6, color: '#374151' }}>
              Check Existing Customer
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: '#9ca3af', fontSize: 11 }}>
                — same customer + different product = new opportunity
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, background: '#fff' }}
                value={custQuery}
                onChange={(e) => { setCustQuery(e.target.value); setShowCustDrop(false); }}
                onBlur={() => setTimeout(() => setShowCustDrop(false), 150)}
                placeholder="Type name, phone, or email to check CRM records..."
                autoComplete="off"
              />
              {custLoading && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af' }}>
                  searching…
                </span>
              )}
              {showCustDrop && (
                <div style={dropStyle}>
                  {custResults.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                      No existing records — this will be a new customer entry.
                    </div>
                  ) : (
                    <>
                      {custResults.map((r) => (
                        <div
                          key={r.id}
                          onMouseDown={() => handleCustSelect(r)}
                          style={dropItemStyle}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                          <div style={{ fontWeight: 600, color: '#111827' }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {r.phone && <span>📞 {r.phone}</span>}
                            {r.email && <span>{r.email}</span>}
                            {r.product_interest && <span style={{ fontStyle: 'italic', color: '#374151' }}>{r.product_interest}</span>}
                            {r.lead_ref && <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{r.lead_ref}</span>}
                          </div>
                        </div>
                      ))}
                      <div
                        onMouseDown={() => { setCustQuery(''); setShowCustDrop(false); }}
                        style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', cursor: 'pointer', textAlign: 'center', background: '#f9fafb' }}
                      >
                        Not found — create new customer →
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {prefillBanner && (
              <div style={{
                marginTop: 8, padding: '7px 12px', background: '#f0fdf4',
                border: '1px solid #86efac', borderRadius: 6, fontSize: 12, color: '#166534',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>
                  Pre-filled from <strong>{prefillBanner.name}</strong>
                  {prefillBanner.leadRef && <span style={{ fontFamily: 'monospace', marginLeft: 6, color: '#15803d' }}>{prefillBanner.leadRef}</span>}
                  {' '}— creating new opportunity. Edit fields below as needed.
                </span>
                <button
                  type="button"
                  onClick={() => setPrefillBanner(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Source + Priority — FIRST so phone hint is context-aware */}
        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>Lead Source *</label>
            <select style={inp} required value={form.source} onChange={(e) => set('source', e.target.value)}>
              <optgroup label="— Manual / High Trust —">
                {SOURCES.filter(s => s.group === 'manual').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="— Digital / Auto-Captured —">
                {SOURCES.filter(s => s.group === 'digital').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Priority</label>
            <select style={inp} value={form.lead_priority} onChange={(e) => set('lead_priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Source category info banner */}
        {isManualSource ? (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6,
            padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#166534',
          }}>
            <strong>High-trust lead</strong> — Phone is optional. Lead will be marked PARTIAL and held for manual follow-up until mobile is added.
            {form.source === 'OLD_CUSTOMER' && ' Priority auto-elevated to HIGH.'}
            {form.source === 'REFERRAL' && ' Priority auto-elevated to HIGH.'}
          </div>
        ) : (
          <div style={{
            background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 6,
            padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1e40af',
          }}>
            <strong>Digital lead</strong> — Phone is required for telecaller auto-assignment.
          </div>
        )}

        {/* Name + Phone */}
        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>Name *</label>
            <input
              style={inp} required value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={(e) => set('name', sentenceCaseWords(e.target.value))}
              placeholder="Contact or company name"
            />
          </div>
          <div style={row}>
            <label style={lbl}>
              Phone {isManualSource ? <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span> : '*'}
            </label>
            <input
              style={inp}
              required={!isManualSource}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={(e) => e.target.value && set('phone', normalizePhone(e.target.value))}
              placeholder={isManualSource ? 'Enter if available' : '10-digit mobile number'}
              maxLength={15}
            />
            {PHONE_HINTS[form.source] && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                {PHONE_HINTS[form.source]}
              </div>
            )}
          </div>
        </div>

        {/* City + Country */}
        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>City</label>
            <input
              style={inp} value={form.city}
              onChange={(e) => set('city', e.target.value)}
              onBlur={(e) => set('city', sentenceCaseWords(e.target.value))}
              placeholder="e.g. Mumbai"
            />
          </div>
          <div style={row}>
            <label style={lbl}>Country</label>
            <input
              style={inp} value={form.country}
              onChange={(e) => set('country', e.target.value)}
              onBlur={(e) => set('country', sentenceCaseWords(e.target.value))}
              placeholder="e.g. India"
            />
          </div>
        </div>

        {/* Email */}
        <div style={row}>
          <label style={lbl}>Email</label>
          <input
            style={inp} type="email" value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        {/* ── Product / Service Interest — dual-mode ────────────────────────── */}
        <div style={row}>
          <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Product / Service Interest</span>
            {!isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setItemMode((m) => (m === 'search' ? 'manual' : 'search'));
                  setItemQuery('');
                  setShowItemDrop(false);
                }}
                style={{
                  fontSize: 10, color: theme.primary, background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', fontWeight: 400,
                  padding: 0, textTransform: 'none', letterSpacing: 0,
                }}
              >
                {itemMode === 'search' ? 'Enter manually instead' : 'Search catalog'}
              </button>
            )}
          </label>

          {/* Mode A — catalog search (new lead only) */}
          {!isEditMode && itemMode === 'search' ? (
            <div style={{ position: 'relative' }}>
              <input
                style={inp}
                value={itemQuery}
                onChange={(e) => { setItemQuery(e.target.value); setShowItemDrop(false); }}
                onBlur={() => setTimeout(() => setShowItemDrop(false), 150)}
                placeholder="Search by product name or SKU..."
                autoComplete="off"
              />
              {itemLoading && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af' }}>
                  searching…
                </span>
              )}
              {showItemDrop && itemResults.length > 0 && (
                <div style={dropStyle}>
                  {itemResults.map((item, i) => (
                    <div
                      key={i}
                      onMouseDown={() => handleItemSelect(item)}
                      style={dropItemStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <span style={{ fontWeight: 600, color: '#111827' }}>{item.name}</span>
                      {item.sku && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                          {item.sku}
                        </span>
                      )}
                      {item.category && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showItemDrop && itemResults.length === 0 && !itemLoading && (
                <div style={{ ...dropStyle, padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                  No matching items — switch to manual entry for custom requirements.
                </div>
              )}
              {/* Show selected value below search box */}
              {form.product_interest && (
                <div style={{ marginTop: 5, fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ {form.product_interest}</span>
                  <button
                    type="button"
                    onClick={() => { set('product_interest', ''); setItemQuery(''); }}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Mode B — manual free-text (edit mode always uses this) */
            <input
              style={inp}
              value={form.product_interest}
              onChange={(e) => set('product_interest', e.target.value)}
              onBlur={(e) => set('product_interest', sentenceCaseWords(e.target.value))}
              placeholder={isEditMode ? 'Product or service interest' : 'Describe the requirement (OEM, custom, consulting...)'}
            />
          )}
        </div>

        {/* Requirement note */}
        <div style={row}>
          <label style={lbl}>Requirement Details</label>
          <textarea
            style={{ ...inp, minHeight: 72, resize: 'vertical' }}
            value={form.requirement_note}
            onChange={(e) => set('requirement_note', e.target.value)}
            placeholder="Specific quantities, specs, or requirements shared by the lead"
          />
        </div>

        {/* Notes */}
        <div style={row}>
          <label style={lbl}>Internal Notes</label>
          <textarea
            style={{ ...inp, minHeight: 64, resize: 'vertical' }}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional context (not visible to lead)"
          />
        </div>

        {/* Assign + Follow-up */}
        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>Assign To</label>
            <select style={inp} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Auto (Round Robin)</option>
              {users
                .filter((u) => ['Tele calling Executive', 'Territory Manager', 'Field Executive', 'Sales Manager'].includes(u.role))
                .map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Follow-up Date</label>
            <input
              style={inp} type="datetime-local" value={form.follow_up_date}
              onChange={(e) => set('follow_up_date', e.target.value)}
            />
          </div>
        </div>

        {/* UTM tracking */}
        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>UTM Source</label>
            <input style={inp} value={form.utm_source} onChange={(e) => set('utm_source', e.target.value)} placeholder="e.g. facebook" />
          </div>
          <div style={row}>
            <label style={lbl}>UTM Campaign</label>
            <input style={inp} value={form.utm_campaign} onChange={(e) => set('utm_campaign', e.target.value)} placeholder="e.g. summer2025" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, padding: '12px', background: theme.primary, color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Lead' : 'Save Lead'}
          </button>
          <button
            type="button"
            onClick={() => navigate(location.state?.from || '/crm/leads')}
            style={{ padding: '12px 20px', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </PageLayout>
  );
}
