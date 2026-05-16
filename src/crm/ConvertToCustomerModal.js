import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { useCurrentUser } from '../utils/useCurrentUser';
import { SOURCE_LABELS } from './crmSourceLabels';

const CUSTOMER_TYPES = ['Retail Shop','Chain Store','Eye Hospital','Eye Clinics','Brands','Cr Labs','Grinder','Wholesaler'];

export default function ConvertToCustomerModal({ lead, prefillData, onClose }) {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();

  const [form, setForm] = useState({
    companyName:  prefillData?.companyName || lead.name || '',
    contactName:  prefillData?.contactName || lead.name || '',
    mobile1:      prefillData?.mobile1    || lead.phone || '',
    email:        prefillData?.email      || lead.email || '',
    customerType: 'Retail Shop',
    tag:          '',
    address:      '',
    city:         lead.city  || '',
    state:        lead.state || '',
    pincode:      '',
    country:      lead.country || 'India',
    country_code: '+91',
    gstNumber:    '',
  });

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [dupCustomer,  setDupCustomer]  = useState(null);  // { id, companyName, mobile1, email }
  const [dupChecking,  setDupChecking]  = useState(false);
  const [gstDupWarn,   setGstDupWarn]   = useState('');
  const gstTimerRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // On mount: check for duplicate customer by email
  useEffect(() => {
    const emailToCheck = lead.email || '';
    if (!emailToCheck) return;
    setDupChecking(true);
    apiFetch(`/customers/search?q=${encodeURIComponent(emailToCheck)}`)
      .then((r) => r.json())
      .then((results) => {
        if (Array.isArray(results) && results.length > 0) {
          const match = results.find(
            (c) => c.email && c.email.toLowerCase() === emailToCheck.toLowerCase()
          );
          if (match) setDupCustomer(match);
        }
      })
      .catch(() => {})
      .finally(() => setDupChecking(false));
  }, [lead.email]);

  // GST duplicate check (debounced)
  const handleGstChange = useCallback((val) => {
    set('gstNumber', val.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    setGstDupWarn('');
    if (gstTimerRef.current) clearTimeout(gstTimerRef.current);
    if (val.length >= 15) {
      gstTimerRef.current = setTimeout(async () => {
        try {
          const r = await apiFetch(`/customers/search?q=${encodeURIComponent(val)}`);
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            const match = data.find((c) => c.gstNumber === val.toUpperCase());
            if (match) setGstDupWarn(`GST belongs to existing customer: ${match.companyName}`);
          }
        } catch {}
      }, 600);
    }
  }, []);

  const handleContinueWithExisting = () => {
    if (!dupCustomer) return;
    navigate(`/quotation?customerId=${dupCustomer.id}&leadId=${lead.id}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.city) { setError('City is required. Please enter the customer\'s city.'); return; }
    if (gstDupWarn) { setError(gstDupWarn + '. Use "Continue with existing" instead.'); return; }

    setLoading(true);
    try {
      const res = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          createdBy: currentUser?.id ? String(currentUser.id) : undefined,
          // lead_source traceability embedded in tag if not set by user
          tag: form.tag || (SOURCE_LABELS[lead.source] ? `${SOURCE_LABELS[lead.source]} Lead` : 'CRM Lead'),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Failed to create customer. Please check all fields.');
        return;
      }
      const customerId = data.id;
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
        maxWidth: 520, maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Create Customer from Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.textMuted }}>×</button>
        </div>

        {/* Lead source context badge */}
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 6, padding: '7px 12px', marginBottom: 12, fontSize: 12, color: '#1e40af' }}>
          From lead: <strong>{lead.name}</strong>
          {lead.source && <> · Source: <strong>{SOURCE_LABELS[lead.source] || lead.source}</strong></>}
          {lead.product_interest && <> · Interest: <em>{lead.product_interest}</em></>}
        </div>

        {/* Duplicate customer found — email match */}
        {dupChecking && (
          <div style={{ padding: '6px 12px', background: '#f9fafb', borderRadius: 6, marginBottom: 12, fontSize: 12, color: theme.textMuted }}>
            Checking for existing customer...
          </div>
        )}
        {dupCustomer && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#854d0e', marginBottom: 4 }}>
              Existing customer found (matched by email)
            </div>
            <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 8 }}>
              <strong>{dupCustomer.companyName}</strong> · {dupCustomer.mobile1 || '—'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleContinueWithExisting}
                style={{ padding: '7px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Continue with existing →
              </button>
              <button
                type="button"
                onClick={() => setDupCustomer(null)}
                style={{ padding: '7px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, color: theme.textMuted, cursor: 'pointer' }}
              >
                Ignore, create new
              </button>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>
          Fields prefilled from lead. Fill in required fields <span style={req}>*</span>. Address/billing details must be entered manually.
        </p>

        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Company / Firm Name <span style={req}>*</span></label>
            <input style={inp} required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Firm or company name" />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Customer Type <span style={req}>*</span></label>
              <select style={inp} required value={form.customerType} onChange={(e) => set('customerType', e.target.value)}>
                {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Tag <span style={{ fontSize: 10, color: theme.textMuted }}>(optional)</span></label>
              <input
                style={inp} value={form.tag}
                onChange={(e) => set('tag', e.target.value)}
                placeholder={`e.g. ${SOURCE_LABELS[lead.source] || 'Lead'}`}
              />
            </div>
            <div>
              <label style={lbl}>GST Number <span style={{ fontSize: 10, color: theme.textMuted }}>(optional)</span></label>
              <input
                style={{ ...inp, ...(gstDupWarn ? { borderColor: '#dc3545' } : {}) }}
                value={form.gstNumber}
                onChange={(e) => handleGstChange(e.target.value)}
                maxLength={15}
                placeholder="15-char GST"
              />
              {gstDupWarn && <div style={{ fontSize: 11, color: '#dc3545', marginTop: 3 }}>{gstDupWarn}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Address</label>
            <input style={inp} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, building, area" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>City <span style={req}>*</span></label>
              <input style={inp} required value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" />
            </div>
            <div>
              <label style={lbl}>Pincode</label>
              <input style={inp} value={form.pincode} onChange={(e) => set('pincode', e.target.value)} maxLength={6} placeholder="6-digit" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>State</label>
              <input style={inp} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="State" />
            </div>
            <div>
              <label style={lbl}>Country</label>
              <input style={inp} value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: theme.textMuted }}>
            Address, billing, credit and shipping details must be completed in the full customer profile after creation.
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
              {loading ? 'Saving...' : 'Save Customer & Open Quotation →'}
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
