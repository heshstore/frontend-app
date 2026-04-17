import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

const CUSTOMER_TYPES = ['Retail Shop','Chain Store','Eye Hospital','Eye Clinics','Brands','Cr Labs','Grinder','Wholesaler'];

export default function ConvertToCustomerModal({ lead, prefillData, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: prefillData?.companyName || lead.name || '',
    contactName: prefillData?.contactName || lead.name || '',
    mobile1: prefillData?.mobile1 || lead.phone || '',
    email: prefillData?.email || lead.email || '',
    customerType: 'Retail Shop',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    country_code: '+91',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.city) { setError('City is required. Please enter the customer\'s city.'); return; }

    setLoading(true);
    try {
      const res = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Failed to create customer. Please check all fields.');
        return;
      }
      const customerId = data.id;
      // Navigate to quotation form with pre-filled customer and lead reference
      navigate(`/quotation?customerId=${customerId}&leadId=${lead.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 11px', borderRadius: 6,
    border: `1px solid ${theme.border}`, fontSize: 14,
    boxSizing: 'border-box', background: '#fff',
  };
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: theme.textMuted, marginBottom: 3,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };
  const req = { color: '#dc3545' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: 24, width: '100%',
        maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Create Customer from Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.textMuted }}>×</button>
        </div>

        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>
          Fields prefilled from lead data. Fill in missing required fields marked with <span style={req}>*</span>.
        </p>

        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Company / Firm Name <span style={req}>*</span></label>
            <input style={inp} required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Contact Person</label>
              <input style={inp} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Mobile <span style={req}>*</span></label>
              <input style={inp} required value={form.mobile1} onChange={(e) => set('mobile1', e.target.value)} maxLength={10} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Customer Type <span style={req}>*</span></label>
            <select style={inp} required value={form.customerType} onChange={(e) => set('customerType', e.target.value)}>
              {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Address</label>
            <input style={inp} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>City <span style={req}>*</span></label>
              <input style={inp} required value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Pincode</label>
              <input style={inp} value={form.pincode} onChange={(e) => set('pincode', e.target.value)} maxLength={6} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>State</label>
              <input style={inp} value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Country</label>
              <input style={inp} value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '11px', background: theme.primary, color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Save & Open Quotation'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '11px 18px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
