import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

const SOURCES = ['MANUAL','INDIAMART','META_ADS','GOOGLE_ADS','SHOPIFY','WHATSAPP','DIRECT_CALL'];
const SOURCE_LABELS = {
  MANUAL:'Manual', INDIAMART:'IndiaMart', META_ADS:'Meta Ads',
  GOOGLE_ADS:'Google Ads', SHOPIFY:'Shopify', WHATSAPP:'WhatsApp', DIRECT_CALL:'Direct Call',
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
  const [form, setForm] = useState({
    name: params.get('name') || '',
    phone: params.get('phone') || '',
    email: params.get('email') || '',
    source: params.get('source') || 'MANUAL',
    lead_priority: 'MEDIUM',
    product_interest: params.get('product') || '',
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const phone = normalizePhone(form.phone);
    if (phone.length !== 10) {
      setError('Phone number must be 10 digits. Please check the number and try again.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: sentenceCaseWords(form.name),
        phone,
        notes: form.notes ? form.notes.charAt(0).toUpperCase() + form.notes.slice(1).toLowerCase() : undefined,
        product_interest: form.product_interest ? sentenceCaseWords(form.product_interest) : undefined,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      };
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
        alert(`Lead created. Note: Another lead with phone ${phone} already exists — please check before contacting.`);
      }
      navigate(`/crm/leads/${lead.id}`);
    } catch (err) {
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

  return (
    <PageLayout title="New Lead">
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

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
            <label style={lbl}>Phone *</label>
            <input
              style={inp} required value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={(e) => set('phone', normalizePhone(e.target.value))}
              placeholder="10-digit mobile number"
              maxLength={15}
            />
          </div>
        </div>

        <div style={row}>
          <label style={lbl}>Email</label>
          <input
            style={inp} type="email" value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>Lead Source *</label>
            <select style={inp} required value={form.source} onChange={(e) => set('source', e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Priority</label>
            <select style={inp} value={form.lead_priority} onChange={(e) => set('lead_priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={row}>
          <label style={lbl}>Product / Service Interest</label>
          <input
            style={inp} value={form.product_interest}
            onChange={(e) => set('product_interest', e.target.value)}
            onBlur={(e) => set('product_interest', sentenceCaseWords(e.target.value))}
            placeholder="What are they looking for?"
          />
        </div>

        <div style={row}>
          <label style={lbl}>Notes</label>
          <textarea
            style={{ ...inp, minHeight: 80, resize: 'vertical' }}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any additional context about this lead"
          />
        </div>

        <div style={grid2}>
          <div style={row}>
            <label style={lbl}>Assign To</label>
            <select style={inp} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Auto (Round Robin)</option>
              {users
                .filter((u) => ['Tele calling Executive','Territory Manager','Field Executive','Sales Manager'].includes(u.role))
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
            {loading ? 'Saving...' : 'Save Lead'}
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
