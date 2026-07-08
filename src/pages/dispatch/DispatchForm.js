import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';
import PageLayout from '../../components/layout/PageLayout';

const TRANSPORT_TYPES = ['Courier', 'Transport', 'Bus', 'Train', 'Air'];

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#d1d5db' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 10,
  padding: '14px 0', fontSize: 16, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  minHeight: 52, touchAction: 'manipulation', width: '100%',
  transition: 'background 0.15s',
});

const inputStyle = {
  width: '100%', padding: '13px 14px', fontSize: 15,
  border: '1px solid #d1d5db', borderRadius: 10,
  outline: 'none', fontFamily: 'inherit', color: '#111827',
  boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function DispatchForm() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const order     = location.state?.order;

  const [transportType, setTransportType] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes]                   = useState('');
  const [busy, setBusy]                     = useState(false);
  const [error, setError]                   = useState(null);

  if (!order) {
    return (
      <PageLayout title="Create Dispatch" onBack={() => navigate('/dispatch')}>
        <p style={{ color: '#dc2626', marginTop: 20 }}>No order selected. Go back and select an order.</p>
      </PageLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transportType) { setError('Please select a transport type.'); return; }
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch('/dispatch/create', {
        method: 'POST',
        body: JSON.stringify({
          order_id:       order.id,
          transport_type: transportType,
          tracking_number: trackingNumber.trim() || undefined,
          notes:           notes.trim()          || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Dispatch creation failed');
      // Idempotent response: a prior dispatch already existed for this order.
      if (data.tracking_number && trackingNumber.trim() && data.tracking_number !== trackingNumber.trim()) {
        toast.info(`This order was already dispatched with tracking number "${data.tracking_number}". No duplicate was created.`);
      }
      navigate('/dispatch/list', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout title="Create Dispatch" onBack={() => navigate(-1)}>
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Order summary card */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1d4ed8', marginBottom: 2 }}>
          {order.order_no || `ORD${String(order.id).padStart(4, '0')}`}
        </div>
        <div style={{ fontSize: 13, color: '#374151' }}>{order.customer_name}</div>
        {order.customer_phone && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>📞 {order.customer_phone}</div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #fca5a5', borderRadius: 10, padding: 14, marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Transport type — large tap targets */}
        <Field label="Transport Type *">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TRANSPORT_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTransportType(t)}
                style={{
                  padding: '14px 10px', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${transportType === t ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: 10, cursor: 'pointer', minHeight: 52,
                  background: transportType === t ? '#eff6ff' : '#fff',
                  color: transportType === t ? '#2563eb' : '#374151',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tracking Number">
          <input
            style={inputStyle}
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            placeholder="e.g. 123456789012"
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
          />
        </Field>

        <Field label="Notes">
          <textarea
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Fragile, handle with care…"
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
          />
        </Field>

        <button type="submit" disabled={busy || !transportType} style={btn('#16a34a', '#fff', busy || !transportType)}>
          {busy ? 'Creating…' : '📦 Confirm Dispatch'}
        </button>
      </form>
    </div>
    </PageLayout>
  );
}
