import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import {
  FormSection, FormCard, FormGrid, FormField, FormActions,
  inputStyle, selectStyle, textareaStyle,
} from "./components/ui/FormComponents";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";

const CUSTOMER_TYPES = ['Retailer', 'Wholesaler', 'Hospital', 'Chain Store', 'Retail Shops', 'Hospitals & Clinics', 'Cr Lab', 'Grinders', 'Brands'];

export default function EditCustomer() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lifecycle, setLifecycle] = useState(null);
  const [finance, setFinance] = useState(null);

  const [form, setForm] = useState({
    companyName:  '',
    contactName:  '',
    mobile1:      '',
    mobile2:      '',
    countryCode1: '+91',
    countryCode2: '+91',
    email:        '',
    address:      '',
    city:         '',
    state:        '',
    pincode:      '',
    gstNumber:    '',
    customerType: '',
    tag:          '',
    creditLimit:  '',
    credit_days:  '',
    stopPaymentReminder: false,
  });

  useEffect(() => {
    apiFetch(`/after-sales/customers/${id}/lifecycle`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setLifecycle)
      .catch(() => setLifecycle(null));
  }, [id]);

  useEffect(() => {
    apiFetch(`/finance-ops/customers/${id}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setFinance)
      .catch(() => setFinance(null));
  }, [id]);

  useEffect(() => {
    apiFetch(`/customers/${id}`)
      .then(res => res.json())
      .then(data => {
        setForm({
          companyName:  data.companyName  || '',
          contactName:  data.contactName  || '',
          email:        data.email        || '',
          address:      data.address      || '',
          city:         data.city         || '',
          state:        data.state        || '',
          pincode:      data.pincode      || '',
          gstNumber:    data.gstNumber    || '',
          customerType: data.customerType || '',
          tag:          data.tag          || '',
          creditLimit:  data.creditLimit  ?? '',
          credit_days:  data.credit_days  ?? '',
          stopPaymentReminder: !!data.stopPaymentReminder,
          mobile1: data.mobile1?.replace(/^\+?\d{0,3}(?=\d{10}$)/, '').slice(-10) || '',
          mobile2: data.mobile2?.replace(/^\+?\d{0,3}(?=\d{10}$)/, '').slice(-10) || '',
          countryCode1: data.mobile1 && data.mobile1.length > 10 ? data.mobile1.slice(0, data.mobile1.length - 10) : '+91',
          countryCode2: data.mobile2 && data.mobile2.length > 10 ? data.mobile2.slice(0, data.mobile2.length - 10) : '+91',
        });
      })
      .catch(() => toast.error('Failed to load customer'));
  }, [id]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          companyName:  form.companyName,
          contactName:  form.contactName,
          mobile1:      form.countryCode1 + form.mobile1,
          mobile2:      form.mobile2 ? form.countryCode2 + form.mobile2 : '',
          email:        form.email,
          address:      form.address,
          city:         form.city,
          state:        form.state,
          pincode:      form.pincode,
          gstNumber:    form.gstNumber,
          customerType: form.customerType,
          tag:          form.tag,
          creditLimit:  Number(form.creditLimit || 0),
          credit_days:  Number(form.credit_days || 0),
          stopPaymentReminder: form.stopPaymentReminder,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Update failed'); return; }
      toast.success('Customer updated');
      navigate('/customers');
    } catch {
      toast.error('Server error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const codeStyle = {
    ...inputStyle,
    width: 72,
    flexShrink: 0,
    background: '#f9fafb',
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: 600,
  };

  return (
    <PageLayout title="Edit customer">
      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>

        {/* ── Basic info ─────────────────────────────────────── */}
        <FormSection title="Basic info">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="Company name" required colSpan={2}>
                <input name="companyName" value={form.companyName} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Contact person">
                <input name="contactName" value={form.contactName} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Tag" required>
                <input name="tag" value={form.tag} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Customer type" colSpan={2}>
                <select name="customerType" value={form.customerType} onChange={handleChange} style={selectStyle}>
                  <option value="">Select type</option>
                  {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Contact ────────────────────────────────────────── */}
        <FormSection title="Contact">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="Mobile" required>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input name="countryCode1" value={form.countryCode1} onChange={handleChange} style={codeStyle} />
                  <input name="mobile1" value={form.mobile1} onChange={handleChange} maxLength={10} placeholder="10 digits" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </FormField>
              <FormField label="Mobile 2">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input name="countryCode2" value={form.countryCode2} onChange={handleChange} style={codeStyle} />
                  <input name="mobile2" value={form.mobile2} onChange={handleChange} maxLength={10} placeholder="Optional" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </FormField>
              <FormField label="Email" colSpan={2}>
                <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} />
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Location ───────────────────────────────────────── */}
        <FormSection title="Location">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="City">
                <input name="city" value={form.city} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Pincode">
                <input name="pincode" value={form.pincode} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="State">
                <input name="state" value={form.state} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Address" colSpan={2}>
                <textarea name="address" value={form.address} onChange={handleChange} style={textareaStyle} />
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {/* ── Business ───────────────────────────────────────── */}
        <FormSection title="Business">
          <FormCard>
            <FormGrid cols={2} minColWidth={200}>
              <FormField label="GST number" colSpan={2}>
                <input
                  name="gstNumber"
                  value={form.gstNumber}
                  maxLength={15}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  }))}
                  placeholder="15-character GSTIN"
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Credit limit (₹)" help="0 = no credit">
                <input name="creditLimit" type="number" min="0" value={form.creditLimit} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Credit days" help="Payment due in N days">
                <input name="credit_days" type="number" min="0" value={form.credit_days} onChange={handleChange} style={inputStyle} />
              </FormField>
              <FormField label="Payment reminders" colSpan={2}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.stopPaymentReminder}
                    onChange={(e) => setForm(prev => ({ ...prev, stopPaymentReminder: e.target.checked }))}
                  />
                  Stop Payment Reminder — never send payment reminders to staff or this customer
                </label>
              </FormField>
            </FormGrid>
          </FormCard>
        </FormSection>

        {finance && (
          <FormSection title="Finance (operational)">
            <FormCard>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
                Receivables and receipts from finance ops — not full accounting.
              </p>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                <strong>Overdue (receivable rows):</strong>{' '}
                ₹{Number(finance.overdueAmount || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Receivables</div>
              <div style={{ fontSize: 12, maxHeight: 120, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(finance.receivables || []).slice(0, 12).map((r) => (
                  <div key={r.id} style={{ marginBottom: 4 }}>
                    Order #{r.order_id} {r.order_no} · {r.status} · out ₹{Number(r.outstanding_amount || 0).toLocaleString('en-IN')}
                  </div>
                ))}
                {!(finance.receivables || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
              <div style={{ fontWeight: 700, margin: '12px 0 6px', fontSize: 13 }}>Recent receipts (log)</div>
              <div style={{ fontSize: 12, maxHeight: 100, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(finance.payments || []).slice(0, 10).map((p) => (
                  <div key={p.id} style={{ marginBottom: 4 }}>
                    {p.payment_date} · {p.payment_mode} · ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                  </div>
                ))}
                {!(finance.payments || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
            </FormCard>
          </FormSection>
        )}

        {lifecycle && (
          <FormSection title="After-sales & delivery (read-only)">
            <FormCard>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
                Orders, dispatches, service tickets, and AMC contracts linked to this customer.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Recent orders</div>
              <div style={{ fontSize: 12, maxHeight: 140, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(lifecycle.orders || []).slice(0, 15).map((o) => (
                  <div key={o.id} style={{ marginBottom: 4 }}>#{o.id} {o.order_no} · {o.status} · ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}</div>
                ))}
                {!(lifecycle.orders || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
              <div style={{ fontWeight: 700, margin: '12px 0 6px', fontSize: 13 }}>Dispatch documents</div>
              <div style={{ fontSize: 12, maxHeight: 120, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(lifecycle.dispatches || []).slice(0, 12).map((d) => (
                  <div key={d.id} style={{ marginBottom: 4 }}>{d.dispatch_number} · {d.status}{d.delivered_at ? ` · delivered ${new Date(d.delivered_at).toLocaleDateString('en-IN')}` : ''}</div>
                ))}
                {!(lifecycle.dispatches || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
              <div style={{ fontWeight: 700, margin: '12px 0 6px', fontSize: 13 }}>Service tickets</div>
              <div style={{ fontSize: 12, maxHeight: 120, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(lifecycle.tickets || []).slice(0, 15).map((t) => (
                  <div key={t.id} style={{ marginBottom: 4 }}>{t.ticketNumber} · {t.serviceType} · {t.status} · item #{t.itemId}</div>
                ))}
                {!(lifecycle.tickets || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
              <div style={{ fontWeight: 700, margin: '12px 0 6px', fontSize: 13 }}>AMC contracts</div>
              <div style={{ fontSize: 12, maxHeight: 100, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {(lifecycle.amcContracts || []).map((a) => (
                  <div key={a.id} style={{ marginBottom: 4 }}>#{a.id} {a.startDate} → {a.endDate} · {a.status}</div>
                ))}
                {!(lifecycle.amcContracts || []).length && <span style={{ color: '#94a3b8' }}>None</span>}
              </div>
            </FormCard>
          </FormSection>
        )}

        <FormActions saveLabel="Update customer" loading={loading} />
      </form>
    </PageLayout>
  );
}
