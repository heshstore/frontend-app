import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { toast } from '../utils/toast';

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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isManualSource = MANUAL_SOURCES.has(form.source);

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

  if (loading && isEditMode) {
    return <PageLayout title="Edit Lead"><p style={{ padding: 20 }}>Loading lead...</p></PageLayout>;
  }

  return (
    <PageLayout title={isEditMode ? 'Edit Lead' : 'New Lead'}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
            {error}
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

        {/* Product interest */}
        <div style={row}>
          <label style={lbl}>Product / Service Interest</label>
          <input
            style={inp} value={form.product_interest}
            onChange={(e) => set('product_interest', e.target.value)}
            onBlur={(e) => set('product_interest', sentenceCaseWords(e.target.value))}
            placeholder="What are they looking for?"
          />
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
            onClick={() => navigate(-1)}
            style={{ padding: '12px 20px', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </PageLayout>
  );
}
